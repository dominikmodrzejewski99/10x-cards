-- Partner Program — M3: Payout infrastructure
-- Tables, aggregation logic, and nightly cron that turn raw usage_events into
-- payable monthly statistics.
--
-- Design notes:
-- - partner_profile holds KYC data needed to generate PIT-11 at year-end.
--   PESEL is required for Polish income-tax withholding. Bank account is
--   required to actually pay the partner.
-- - partner_monthly_stats is the billing ledger. Earnings are calculated as:
--     gross_earnings_grosz  = billable_uses × price_per_use × partner_share
--     capped_earnings_grosz = MIN(gross, per_partner_monthly_cap, remaining_global_budget)
-- - monthly_payout_state tracks the global budget for a period. Once
--   csv_exported_at is set, no more aggregation is allowed for that period —
--   freezing the ledger for accounting integrity.
-- - payout_ledger is an immutable record of every payout, tied to the range
--   of usage_events it covers. Append-only. Required for tax audit (5yr
--   retention in PL).

-- ── Partner profile (KYC + bank data) ──
CREATE TYPE partner_status AS ENUM ('none', 'pending', 'active', 'suspended');

-- FK to public.users (not auth.users) because the nightly aggregator auto-
-- creates a partner_profile row for every author with positive earnings,
-- and that includes the seeded system user "team@memlo.app" which exists
-- only in public.users.
CREATE TABLE public.partner_profile (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  status partner_status NOT NULL DEFAULT 'none',
  -- PIT-11 required fields (Polish income tax withholding)
  legal_name text,
  pesel text CHECK (pesel IS NULL OR pesel ~ '^[0-9]{11}$'),
  address_line1 text,
  address_line2 text,
  postal_code text,
  city text,
  tax_office text,
  -- Payout
  bank_account_iban text CHECK (bank_account_iban IS NULL OR bank_account_iban ~ '^PL[0-9]{26}$'),
  -- License agreement acceptance audit (hash of accepted document)
  license_version text,
  license_accepted_at timestamptz,
  license_acceptance_ip text,
  -- Rolling balance of unpaid earnings (in grosz). Paid out when it crosses
  -- min_payout_grosz from partner_config.
  pending_balance_grosz bigint NOT NULL DEFAULT 0,
  lifetime_earnings_grosz bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own partner profile"
  ON public.partner_profile FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own partner profile"
  ON public.partner_profile FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own partner profile"
  ON public.partner_profile FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- ── Monthly aggregates (billing ledger) ──
-- period = first day of the month (date type, not full timestamp, because
-- months are the natural billing unit and this avoids tz ambiguity).
CREATE TABLE public.partner_monthly_stats (
  -- Same reasoning as partner_profile: system user seeded in public.users
  -- can accumulate stats.
  author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period date NOT NULL,
  billable_uses bigint NOT NULL DEFAULT 0,
  unique_learners bigint NOT NULL DEFAULT 0,
  -- Earnings before caps
  gross_earnings_grosz bigint NOT NULL DEFAULT 0,
  -- Earnings after per-partner-cap and global-budget-cap applied
  capped_earnings_grosz bigint NOT NULL DEFAULT 0,
  -- Portion already moved to partner_profile.pending_balance
  accrued_to_balance_grosz bigint NOT NULL DEFAULT 0,
  -- Fraud flags (surfaces in admin dashboard)
  concentration_top_user_pct numeric(5,2),
  concentration_flag boolean NOT NULL DEFAULT false,
  computed_at timestamptz,
  PRIMARY KEY (author_id, period)
);

CREATE INDEX partner_monthly_stats_period_idx
  ON public.partner_monthly_stats (period, capped_earnings_grosz DESC);

ALTER TABLE public.partner_monthly_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own partner stats"
  ON public.partner_monthly_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = author_id);

-- ── Global period state (budget tracking) ──
CREATE TABLE public.monthly_payout_state (
  period date PRIMARY KEY,
  global_budget_grosz bigint NOT NULL,
  global_spent_grosz bigint NOT NULL DEFAULT 0,
  aggregator_last_run_at timestamptz,
  csv_exported_at timestamptz,
  csv_export_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- No RLS — admin-only via RPC. Regular users should never see aggregate budget state.
ALTER TABLE public.monthly_payout_state ENABLE ROW LEVEL SECURITY;

-- ── Payout ledger (immutable audit log) ──
CREATE TABLE public.payout_ledger (
  id bigserial PRIMARY KEY,
  partner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  period date NOT NULL,
  amount_grosz bigint NOT NULL CHECK (amount_grosz > 0),
  -- Range of usage_events.id this payout covers (for audit trail)
  events_from_id bigint,
  events_to_id bigint,
  -- Link to KYC snapshot — profile may be edited later, but we need the
  -- version-at-payout for tax documentation. Store denormalized.
  legal_name_snapshot text,
  bank_account_snapshot text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'exported', 'paid', 'failed')),
  exported_at timestamptz,
  paid_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payout_ledger_partner_idx ON public.payout_ledger (partner_user_id, period);
CREATE INDEX payout_ledger_status_idx ON public.payout_ledger (status, created_at);

ALTER TABLE public.payout_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own payouts"
  ON public.payout_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = partner_user_id);

-- ── Aggregation RPC: run nightly (or on demand) ──
-- Idempotent: can be re-run for the same period without double-counting.
-- Refuses to run for a period whose CSV has already been exported (frozen).
CREATE OR REPLACE FUNCTION public.aggregate_partner_stats(p_period date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_period date;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_price_per_use bigint;
  v_partner_share bigint;
  v_per_partner_cap bigint;
  v_global_budget bigint;
  v_min_payout bigint;
  v_global_spent bigint := 0;
  v_frozen timestamptz;
BEGIN
  -- Default to current month if not specified
  v_period := COALESCE(p_period, date_trunc('month', now())::date);
  v_period_start := v_period::timestamptz;
  v_period_end := (v_period + interval '1 month')::timestamptz;

  -- Check if period is frozen (CSV already exported)
  SELECT csv_exported_at INTO v_frozen
  FROM monthly_payout_state WHERE period = v_period;

  IF v_frozen IS NOT NULL THEN
    RAISE EXCEPTION 'Period % is frozen (CSV exported at %). Aggregation refused.', v_period, v_frozen;
  END IF;

  -- Load config
  SELECT value_int INTO v_price_per_use FROM partner_config WHERE key = 'price_per_use_grosz';
  SELECT value_int INTO v_partner_share FROM partner_config WHERE key = 'partner_share_percent';
  SELECT value_int INTO v_per_partner_cap FROM partner_config WHERE key = 'per_partner_monthly_cap_grosz';
  SELECT value_int INTO v_global_budget FROM partner_config WHERE key = 'monthly_global_budget_grosz';
  SELECT value_int INTO v_min_payout FROM partner_config WHERE key = 'min_payout_grosz';

  -- Ensure period state exists
  INSERT INTO monthly_payout_state (period, global_budget_grosz)
  VALUES (v_period, v_global_budget)
  ON CONFLICT (period) DO NOTHING;

  -- Recompute stats for this period.
  -- Per-partner earnings = billable_uses × price × share_percent / 100
  -- Capped at per_partner_monthly_cap_grosz.
  -- Collusion heuristic: what % of billable uses came from the single largest
  -- learner? >80% triggers a flag for admin review (not automatic freeze).
  WITH raw_stats AS (
    SELECT
      ue.author_id,
      count(*) AS billable_uses,
      count(DISTINCT ue.user_id) AS unique_learners
    FROM usage_events ue
    WHERE ue.is_billable = true
      AND ue.is_self_use = false
      AND ue.occurred_at >= v_period_start
      AND ue.occurred_at < v_period_end
    GROUP BY ue.author_id
  ),
  per_user_concentration AS (
    SELECT
      ue.author_id,
      ue.user_id,
      count(*) AS uses,
      row_number() OVER (PARTITION BY ue.author_id ORDER BY count(*) DESC) AS rnk
    FROM usage_events ue
    WHERE ue.is_billable = true
      AND ue.is_self_use = false
      AND ue.occurred_at >= v_period_start
      AND ue.occurred_at < v_period_end
    GROUP BY ue.author_id, ue.user_id
  ),
  top_user AS (
    SELECT author_id, uses AS top_user_uses
    FROM per_user_concentration WHERE rnk = 1
  ),
  computed AS (
    SELECT
      r.author_id,
      r.billable_uses,
      r.unique_learners,
      (r.billable_uses * v_price_per_use * v_partner_share / 100) AS gross_earnings_grosz,
      LEAST(
        r.billable_uses * v_price_per_use * v_partner_share / 100,
        v_per_partner_cap
      ) AS capped_earnings_grosz,
      ROUND(100.0 * t.top_user_uses / NULLIF(r.billable_uses, 0), 2) AS top_user_pct
    FROM raw_stats r
    LEFT JOIN top_user t ON t.author_id = r.author_id
  )
  INSERT INTO partner_monthly_stats (
    author_id, period, billable_uses, unique_learners,
    gross_earnings_grosz, capped_earnings_grosz,
    concentration_top_user_pct, concentration_flag, computed_at
  )
  SELECT
    author_id, v_period, billable_uses, unique_learners,
    gross_earnings_grosz, capped_earnings_grosz,
    top_user_pct,
    COALESCE(top_user_pct > 80, false),
    now()
  FROM computed
  ON CONFLICT (author_id, period) DO UPDATE SET
    billable_uses = EXCLUDED.billable_uses,
    unique_learners = EXCLUDED.unique_learners,
    gross_earnings_grosz = EXCLUDED.gross_earnings_grosz,
    capped_earnings_grosz = EXCLUDED.capped_earnings_grosz,
    concentration_top_user_pct = EXCLUDED.concentration_top_user_pct,
    concentration_flag = EXCLUDED.concentration_flag,
    computed_at = EXCLUDED.computed_at;

  -- Apply global budget cap: if sum(capped) > global_budget, scale proportionally.
  -- Pure pro-rata cut — same ratio for every partner, hits concentration-flagged
  -- partners equally (intentional: we don't let fraud starve honest partners).
  DECLARE
    v_total_capped bigint;
    v_scale_factor numeric;
  BEGIN
    SELECT COALESCE(sum(capped_earnings_grosz), 0) INTO v_total_capped
    FROM partner_monthly_stats WHERE period = v_period;

    IF v_total_capped > v_global_budget THEN
      v_scale_factor := v_global_budget::numeric / v_total_capped::numeric;
      UPDATE partner_monthly_stats
      SET capped_earnings_grosz = floor(capped_earnings_grosz * v_scale_factor)::bigint
      WHERE period = v_period;
      SELECT sum(capped_earnings_grosz) INTO v_global_spent
      FROM partner_monthly_stats WHERE period = v_period;
    ELSE
      v_global_spent := v_total_capped;
    END IF;
  END;

  -- Accrue newly-computed earnings into partner_profile.pending_balance.
  -- We only accrue the DELTA (new capped - already accrued) so re-runs are safe.
  UPDATE partner_profile pp
  SET pending_balance_grosz = pp.pending_balance_grosz + (pms.capped_earnings_grosz - pms.accrued_to_balance_grosz),
      lifetime_earnings_grosz = pp.lifetime_earnings_grosz + (pms.capped_earnings_grosz - pms.accrued_to_balance_grosz),
      updated_at = now()
  FROM partner_monthly_stats pms
  WHERE pp.user_id = pms.author_id
    AND pms.period = v_period
    AND pms.capped_earnings_grosz != pms.accrued_to_balance_grosz;

  -- Create profiles for authors that don't have one yet (so pending_balance
  -- accrues from day 1, even before they complete onboarding).
  INSERT INTO partner_profile (user_id, pending_balance_grosz, lifetime_earnings_grosz)
  SELECT pms.author_id, pms.capped_earnings_grosz, pms.capped_earnings_grosz
  FROM partner_monthly_stats pms
  WHERE pms.period = v_period
    AND pms.capped_earnings_grosz > 0
  ON CONFLICT (user_id) DO NOTHING;

  -- Mark accrued
  UPDATE partner_monthly_stats
  SET accrued_to_balance_grosz = capped_earnings_grosz
  WHERE period = v_period;

  -- Update global state
  UPDATE monthly_payout_state
  SET global_spent_grosz = v_global_spent,
      aggregator_last_run_at = now()
  WHERE period = v_period;

  RETURN jsonb_build_object(
    'period', v_period,
    'global_spent_grosz', v_global_spent,
    'global_budget_grosz', v_global_budget,
    'ran_at', now()
  );
END;
$$;

-- Admin-only execution
REVOKE EXECUTE ON FUNCTION public.aggregate_partner_stats(date) FROM authenticated;

-- ── Nightly cron at 02:30 UTC (30 min before cleanup_anonymous_users) ──
-- pg_cron is enabled by default on Supabase (Settings > Extensions)
SELECT cron.schedule(
  'aggregate-partner-stats',
  '30 2 * * *',
  $$SELECT public.aggregate_partner_stats()$$
);
