-- Partner Program — M2: Usage events + attribution RPC
-- Records every billable interaction with a card on /study so that partners
-- can be paid proportionally to how much their content is actually used.
--
-- Design notes:
-- - "Use" = one saved review (one insert into flashcard_reviews). We do NOT
--   count card flips — those are too easy to self-farm.
-- - is_self_use is a STORED generated column: partners do not earn when they
--   learn from their own sets. This rule is enforced at read time (payout
--   aggregator filters is_self_use = true) not at write time, so we keep a
--   complete event log.
-- - is_billable is computed in the RPC (not generated), because rate-limit
--   decisions require window queries that cannot sit in a column default.
-- - author_id is DENORMALIZED from flashcard_sets.original_author_id at write
--   time. Even if the author changes later (should never happen — it's NOT
--   NULL and has no update path), historical events remain attributable.
-- - INSERT is only allowed via the SECURITY DEFINER RPC. Direct insert is
--   blocked by RLS, which prevents clients from forging author_id or
--   bypassing rate limiting.

-- ── Schema ──
CREATE TABLE public.usage_events (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id integer NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
  set_id integer NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  -- FK to public.users (not auth.users) because author_id is denormalized
  -- from flashcard_sets.original_author_id, which can point at the system
  -- user "team@memlo.app" seeded in public.users only.
  author_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT 'review'
    CHECK (event_type IN ('review')),
  is_billable boolean NOT NULL DEFAULT true,
  not_billable_reason text
    CHECK (not_billable_reason IN ('self_use', 'rate_limit', 'budget_exhausted', 'author_capped') OR not_billable_reason IS NULL),
  client_session_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  is_self_use boolean GENERATED ALWAYS AS (user_id = author_id) STORED
);

-- Aggregation for payout: partner earnings in a given month
CREATE INDEX usage_events_author_month_idx
  ON public.usage_events (author_id, occurred_at)
  WHERE is_billable = true AND is_self_use = false;

-- Rate-limit window query (is this card over budget for this user in this hour?)
CREATE INDEX usage_events_user_card_recent_idx
  ON public.usage_events (user_id, flashcard_id, occurred_at DESC);

-- User-facing "your monthly usage" query
CREATE INDEX usage_events_user_month_idx
  ON public.usage_events (user_id, occurred_at);

-- Fraud heuristic queries (collusion detection)
CREATE INDEX usage_events_author_user_idx
  ON public.usage_events (author_id, user_id, occurred_at)
  WHERE is_self_use = false;

-- ── RLS: block direct inserts; reads via RPC only ──
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- No policies = no access for authenticated role. All reads/writes happen
-- through SECURITY DEFINER functions that enforce their own authorization.
-- This is the strongest posture for a billing-adjacent table: a compromised
-- client cannot forge events that cost real money.

-- ── Partner program config (tunable values) ──
-- Keeping these in a DB table instead of env vars means you can change them
-- without a deploy. For values that change rarely (price/use) this is mild
-- overkill, but given the user changed monetization direction 5 times in one
-- conversation, the flexibility is worth the table.
CREATE TABLE public.partner_config (
  key text PRIMARY KEY,
  value_int bigint,
  value_text text,
  description text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.partner_config (key, value_int, description) VALUES
  ('price_per_use_grosz', 1, 'Cost of one billable use, in Polish grosz (1/100 PLN)'),
  ('partner_share_percent', 70, 'Percentage of price_per_use_grosz that goes to the partner. Remainder is platform margin'),
  ('rate_limit_same_card_per_hour', 5, 'Max billable uses of the same card by the same user in a 1-hour window'),
  ('min_payout_grosz', 10000, 'Minimum earnings to trigger a payout, in grosz (10000 = 100 PLN)'),
  ('monthly_global_budget_grosz', 200000, 'Max total payouts across all partners per month, in grosz (200000 = 2000 PLN)'),
  ('per_partner_monthly_cap_grosz', 50000, 'Max payout to a single partner per month, in grosz (50000 = 500 PLN)');

-- Read-only for authenticated users (they need to see price_per_use for the UI)
ALTER TABLE public.partner_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read partner_config"
  ON public.partner_config FOR SELECT
  TO authenticated
  USING (true);

-- ── RPC: record_usage_event ──
-- Called from the client after a review is saved. Server-side attribution
-- prevents a compromised client from forging author_id or bypassing rate
-- limiting.
CREATE OR REPLACE FUNCTION public.record_usage_event(
  p_flashcard_id integer,
  p_client_session_id text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_set_id integer;
  v_author_id uuid;
  v_flashcard_owner_id uuid;
  v_rate_limit_count integer;
  v_rate_limit_threshold integer;
  v_is_billable boolean := true;
  v_not_billable_reason text := NULL;
  v_event_id bigint;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Resolve set_id and author_id server-side. Client cannot forge these.
  SELECT f.set_id, fs.original_author_id, f.user_id
    INTO v_set_id, v_author_id, v_flashcard_owner_id
  FROM flashcards f
  LEFT JOIN flashcard_sets fs ON fs.id = f.set_id
  WHERE f.id = p_flashcard_id;

  IF v_set_id IS NULL OR v_author_id IS NULL THEN
    -- Flashcard not in a set (legacy) or set has no author — skip silently.
    -- We do not RAISE here because the caller is /study and we don't want
    -- tracking failures to break the learning flow.
    RETURN NULL;
  END IF;

  -- Authorization: caller must be the owner of the flashcard (i.e., actually
  -- learning from it). This prevents a third party from inflating someone
  -- else's usage count.
  IF v_flashcard_owner_id != v_caller_id THEN
    RAISE EXCEPTION 'Cannot record usage for a flashcard you do not own';
  END IF;

  -- Rate limit check: same (user, flashcard) within the last hour.
  -- is_self_use is filtered OUT of the rate limit because we do not want
  -- to distort the per-partner rate-limit window based on the author's
  -- personal practice.
  SELECT value_int INTO v_rate_limit_threshold
  FROM partner_config WHERE key = 'rate_limit_same_card_per_hour';

  SELECT count(*) INTO v_rate_limit_count
  FROM usage_events
  WHERE user_id = v_caller_id
    AND flashcard_id = p_flashcard_id
    AND is_billable = true
    AND occurred_at > now() - interval '1 hour';

  IF v_rate_limit_count >= v_rate_limit_threshold THEN
    v_is_billable := false;
    v_not_billable_reason := 'rate_limit';
  END IF;

  -- Self-use: partners do not earn when learning from their own sets.
  -- The generated column handles this at read time, but we ALSO stamp the
  -- reason here so analytics dashboards can group not-billable events
  -- without joining on is_self_use.
  IF v_caller_id = v_author_id THEN
    v_is_billable := false;
    v_not_billable_reason := 'self_use';
  END IF;

  INSERT INTO usage_events (
    user_id, flashcard_id, set_id, author_id,
    event_type, is_billable, not_billable_reason, client_session_id
  )
  VALUES (
    v_caller_id, p_flashcard_id, v_set_id, v_author_id,
    'review', v_is_billable, v_not_billable_reason, p_client_session_id
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- Allow the function to be called by authenticated users
GRANT EXECUTE ON FUNCTION public.record_usage_event(integer, text) TO authenticated;
