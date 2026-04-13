-- Partner Program — M5: Admin payout export
-- Admin-facing RPCs that freeze a billing period, snapshot KYC data into
-- payout_ledger, and hand a structured dataset to the frontend for CSV
-- generation.
--
-- Design notes:
-- - Admin = user whose id is listed in partner_config under
--   'admin_user_ids' (comma-separated UUIDs). We do this instead of adding
--   a dedicated admin_users table because the admin set is tiny (Domino
--   himself, maybe a bookkeeper later) and putting it in config keeps the
--   "who can touch money?" question in one place.
-- - export_payouts is IDEMPOTENT: calling twice on the same period does
--   not create duplicate ledger entries. It's safe to retry if the
--   frontend crashes mid-export.
-- - Once exported, the period is FROZEN — aggregator refuses further runs
--   (enforced via csv_exported_at check in aggregate_partner_stats).
-- - pending_balance is zeroed by the amount we just moved into ledger
--   entries. If the user's balance exceeds what this period contributed
--   (carryover from prior periods), the excess remains.

-- ── Seed admin whitelist row (empty by default — Domino populates) ──
INSERT INTO public.partner_config (key, value_text, description) VALUES
  ('admin_user_ids', '', 'Comma-separated user UUIDs with admin access to payout export. Empty = nobody.')
ON CONFLICT (key) DO NOTHING;

-- ── Helper: is current user an admin? ──
CREATE OR REPLACE FUNCTION public.is_partner_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
  v_caller text;
  v_admin_ids text;
BEGIN
  v_caller := auth.uid()::text;
  IF v_caller IS NULL THEN RETURN false; END IF;

  SELECT value_text INTO v_admin_ids
  FROM partner_config WHERE key = 'admin_user_ids';

  IF v_admin_ids IS NULL OR v_admin_ids = '' THEN RETURN false; END IF;

  RETURN v_caller = ANY(string_to_array(v_admin_ids, ','));
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_partner_admin() TO authenticated;

-- ── RPC: list pending payouts for a period ──
-- Read-only. Joins partner_monthly_stats with partner_profile so the admin
-- sees which partners are ready to pay, plus who is missing KYC.
CREATE OR REPLACE FUNCTION public.admin_list_pending_payouts(p_period date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_period date;
  v_min_payout bigint;
  v_state_row jsonb;
  v_rows jsonb;
BEGIN
  IF NOT is_partner_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  v_period := COALESCE(p_period, date_trunc('month', now() - interval '1 month')::date);

  SELECT value_int INTO v_min_payout
  FROM partner_config WHERE key = 'min_payout_grosz';

  SELECT to_jsonb(mps) INTO v_state_row
  FROM monthly_payout_state mps WHERE period = v_period;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY pending_balance_grosz DESC), '[]'::jsonb)
  INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'partner_user_id', pp.user_id,
      'status', pp.status,
      'legal_name', pp.legal_name,
      'bank_account_iban', pp.bank_account_iban,
      'pending_balance_grosz', pp.pending_balance_grosz,
      'period_earnings_grosz', COALESCE(pms.capped_earnings_grosz, 0),
      'period_billable_uses', COALESCE(pms.billable_uses, 0),
      'period_concentration_flag', COALESCE(pms.concentration_flag, false),
      'ready_for_payout', pp.pending_balance_grosz >= v_min_payout
                          AND pp.status = 'active'
                          AND pp.legal_name IS NOT NULL
                          AND pp.bank_account_iban IS NOT NULL,
      'missing_kyc', pp.legal_name IS NULL OR pp.bank_account_iban IS NULL
    ) AS row_data,
    pp.pending_balance_grosz
    FROM partner_profile pp
    LEFT JOIN partner_monthly_stats pms
      ON pms.author_id = pp.user_id AND pms.period = v_period
    WHERE pp.pending_balance_grosz > 0
  ) sub;

  RETURN jsonb_build_object(
    'period', v_period,
    'min_payout_grosz', v_min_payout,
    'state', v_state_row,
    'partners', v_rows
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_pending_payouts(date) TO authenticated;

-- ── RPC: freeze a period and create payout ledger entries ──
-- Creates payout_ledger rows for every partner with pending_balance >=
-- min_payout_grosz AND complete KYC. Zeros their pending_balance by the
-- amount moved. Marks the period frozen so aggregator won't touch it.
CREATE OR REPLACE FUNCTION public.admin_export_payouts(p_period date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_min_payout bigint;
  v_already_frozen timestamptz;
  v_events_from_id bigint;
  v_events_to_id bigint;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_created_count integer := 0;
BEGIN
  IF NOT is_partner_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  v_caller_id := auth.uid();

  SELECT value_int INTO v_min_payout
  FROM partner_config WHERE key = 'min_payout_grosz';

  -- Idempotency: if already frozen, re-emit existing ledger. Do not create new rows.
  SELECT csv_exported_at INTO v_already_frozen
  FROM monthly_payout_state WHERE period = p_period;

  v_period_start := p_period::timestamptz;
  v_period_end := (p_period + interval '1 month')::timestamptz;

  SELECT MIN(id), MAX(id) INTO v_events_from_id, v_events_to_id
  FROM usage_events
  WHERE is_billable = true AND is_self_use = false
    AND occurred_at >= v_period_start AND occurred_at < v_period_end;

  IF v_already_frozen IS NULL THEN
    -- First export: create ledger entries for each eligible partner.
    INSERT INTO payout_ledger (
      partner_user_id, period, amount_grosz,
      events_from_id, events_to_id,
      legal_name_snapshot, bank_account_snapshot,
      status
    )
    SELECT
      pp.user_id,
      p_period,
      pp.pending_balance_grosz,
      v_events_from_id,
      v_events_to_id,
      pp.legal_name,
      pp.bank_account_iban,
      'exported'
    FROM partner_profile pp
    WHERE pp.pending_balance_grosz >= v_min_payout
      AND pp.status = 'active'
      AND pp.legal_name IS NOT NULL
      AND pp.bank_account_iban IS NOT NULL;

    GET DIAGNOSTICS v_created_count = ROW_COUNT;

    -- Zero the pending_balance for the partners we just created ledger entries for.
    UPDATE partner_profile pp
    SET pending_balance_grosz = 0,
        updated_at = now()
    WHERE pp.pending_balance_grosz >= v_min_payout
      AND pp.status = 'active'
      AND pp.legal_name IS NOT NULL
      AND pp.bank_account_iban IS NOT NULL;

    -- Freeze the period.
    INSERT INTO monthly_payout_state (period, global_budget_grosz, csv_exported_at, csv_export_by_user_id)
    VALUES (p_period, 0, now(), v_caller_id)
    ON CONFLICT (period) DO UPDATE
      SET csv_exported_at = now(),
          csv_export_by_user_id = v_caller_id;

    -- Mark export timestamp on each ledger row (redundant with status but
    -- useful for reporting).
    UPDATE payout_ledger
    SET exported_at = now()
    WHERE period = p_period AND exported_at IS NULL;
  END IF;

  -- Return ledger contents (including re-export scenario).
  RETURN jsonb_build_object(
    'period', p_period,
    'frozen_at', COALESCE(v_already_frozen, now()),
    'newly_created_count', v_created_count,
    'rows', (
      SELECT COALESCE(jsonb_agg(to_jsonb(pl) ORDER BY pl.amount_grosz DESC), '[]'::jsonb)
      FROM payout_ledger pl
      WHERE pl.period = p_period
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_export_payouts(date) TO authenticated;

-- ── RPC: mark a ledger row as 'paid' after the manual bank transfer ──
CREATE OR REPLACE FUNCTION public.admin_mark_payout_paid(p_ledger_id bigint, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_partner_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE payout_ledger
  SET status = 'paid',
      paid_at = now(),
      notes = COALESCE(p_notes, notes)
  WHERE id = p_ledger_id AND status = 'exported';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ledger row % not found or already paid', p_ledger_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_mark_payout_paid(bigint, text) TO authenticated;
