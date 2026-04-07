-- ══════════════════════════════════════
-- Friends Enhancements: sent requests, leaderboard, deck sharing
-- ══════════════════════════════════════

-- ── RPC: get_pending_requests (missing — called by frontend but never created) ──
CREATE OR REPLACE FUNCTION public.get_pending_requests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_result jsonb;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COALESCE(jsonb_agg(req), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'friendship_id', f.id,
      'user_id', f.requester_id,
      'email_masked', mask_email(u.email),
      'created_at', f.created_at
    ) AS req
    FROM friendships f
    JOIN users u ON u.id = f.requester_id
    WHERE f.addressee_id = v_caller_id
    AND f.status = 'pending'
    ORDER BY f.created_at DESC
  ) sub;

  RETURN v_result;
END;
$$;

-- ── RPC: get_sent_requests ──
CREATE OR REPLACE FUNCTION public.get_sent_requests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_result jsonb;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT COALESCE(jsonb_agg(req), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'friendship_id', f.id,
      'user_id', f.addressee_id,
      'email_masked', mask_email(u.email),
      'status', f.status,
      'created_at', f.created_at
    ) AS req
    FROM friendships f
    JOIN users u ON u.id = f.addressee_id
    WHERE f.requester_id = v_caller_id
    AND f.status IN ('pending', 'rejected')
    ORDER BY f.created_at DESC
  ) sub;

  RETURN v_result;
END;
$$;

-- ── RPC: cancel_friend_request ──
CREATE OR REPLACE FUNCTION public.cancel_friend_request(p_friendship_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  DELETE FROM friendships
  WHERE id = p_friendship_id
  AND requester_id = v_caller_id
  AND status IN ('pending', 'rejected');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or cannot be cancelled';
  END IF;

  -- Clean up the notification sent to the addressee
  DELETE FROM notifications
  WHERE type = 'friend_request'
  AND from_user_id = v_caller_id
  AND data->>'friendship_id' = p_friendship_id::text;
END;
$$;

-- ── RPC: get_friends_leaderboard ──
CREATE OR REPLACE FUNCTION public.get_friends_leaderboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_result jsonb;
  v_week_start date;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Monday of the current week (ISO week)
  v_week_start := date_trunc('week', current_date)::date;

  SELECT COALESCE(jsonb_agg(entry), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'user_id', uid,
      'email_masked', masked_email,
      'current_streak', streak,
      'total_cards_reviewed', total_cards,
      'cards_this_week', week_cards,
      'is_current_user', is_me
    ) AS entry
    FROM (
      -- Current user
      SELECT
        u.id AS uid,
        mask_email(u.email) AS masked_email,
        COALESCE(up.current_streak, 0) AS streak,
        COALESCE(up.total_cards_reviewed, 0) AS total_cards,
        (SELECT count(*) FROM flashcard_reviews fr
         WHERE fr.user_id = u.id AND fr.last_reviewed_at >= v_week_start) AS week_cards,
        true AS is_me
      FROM users u
      LEFT JOIN user_preferences up ON up.user_id = u.id
      WHERE u.id = v_caller_id

      UNION ALL

      -- Friends
      SELECT
        u.id AS uid,
        mask_email(u.email) AS masked_email,
        COALESCE(up.current_streak, 0) AS streak,
        COALESCE(up.total_cards_reviewed, 0) AS total_cards,
        (SELECT count(*) FROM flashcard_reviews fr
         WHERE fr.user_id = u.id AND fr.last_reviewed_at >= v_week_start) AS week_cards,
        false AS is_me
      FROM (
        SELECT CASE WHEN requester_id = v_caller_id THEN addressee_id ELSE requester_id END AS friend_id
        FROM friendships
        WHERE status = 'accepted'
        AND (requester_id = v_caller_id OR addressee_id = v_caller_id)
      ) friends
      JOIN users u ON u.id = friends.friend_id
      LEFT JOIN user_preferences up ON up.user_id = u.id
    ) all_entries
    ORDER BY streak DESC, total_cards DESC
  ) sub;

  RETURN v_result;
END;
$$;

-- ══════════════════════════════════════
-- Deck sharing to friends
-- ══════════════════════════════════════

-- ── Update notifications type constraint to include deck_shared ──
ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('friend_request', 'friend_accepted', 'nudge', 'deck_shared'));

-- ── Deck shares table ──
CREATE TABLE public.deck_shares (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id        integer NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  from_user_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  to_user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deck_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own deck shares"
  ON public.deck_shares FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can delete own sent shares"
  ON public.deck_shares FOR DELETE
  USING (auth.uid() = from_user_id);

CREATE INDEX idx_deck_shares_to_user ON public.deck_shares(to_user_id, status);
CREATE INDEX idx_deck_shares_from_user ON public.deck_shares(from_user_id);

-- ── RPC: share_deck_to_friend ──
CREATE OR REPLACE FUNCTION public.share_deck_to_friend(p_set_id integer, p_friend_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_share_id uuid;
  v_set flashcard_sets%ROWTYPE;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify accepted friendship
  IF NOT EXISTS (
    SELECT 1 FROM friendships
    WHERE status = 'accepted'
    AND (
      (requester_id = v_caller_id AND addressee_id = p_friend_user_id)
      OR (addressee_id = v_caller_id AND requester_id = p_friend_user_id)
    )
  ) THEN
    RAISE EXCEPTION 'Not friends';
  END IF;

  -- Verify set belongs to caller
  SELECT * INTO v_set FROM flashcard_sets WHERE id = p_set_id AND user_id = v_caller_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Set not found';
  END IF;

  -- Check not already shared (pending)
  IF EXISTS (
    SELECT 1 FROM deck_shares
    WHERE set_id = p_set_id AND from_user_id = v_caller_id AND to_user_id = p_friend_user_id
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Deck already shared to this friend';
  END IF;

  -- Delete old non-pending shares to allow re-sharing
  DELETE FROM deck_shares
  WHERE set_id = p_set_id AND from_user_id = v_caller_id AND to_user_id = p_friend_user_id
  AND status IN ('accepted', 'rejected');

  -- Create deck share record
  INSERT INTO deck_shares (set_id, from_user_id, to_user_id)
  VALUES (p_set_id, v_caller_id, p_friend_user_id)
  RETURNING id INTO v_share_id;

  -- Create notification
  INSERT INTO notifications (user_id, type, from_user_id, data)
  VALUES (
    p_friend_user_id,
    'deck_shared',
    v_caller_id,
    jsonb_build_object(
      'deck_share_id', v_share_id,
      'set_name', v_set.name,
      'from_email', mask_email((SELECT email FROM users WHERE id = v_caller_id))
    )
  );

  RETURN v_share_id;
END;
$$;

-- ── RPC: accept_deck_share ──
CREATE OR REPLACE FUNCTION public.accept_deck_share(p_deck_share_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_share deck_shares%ROWTYPE;
  v_original_set flashcard_sets%ROWTYPE;
  v_new_set_id integer;
  v_card_count integer;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_share FROM deck_shares
  WHERE id = p_deck_share_id AND to_user_id = v_caller_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deck share not found';
  END IF;

  SELECT * INTO v_original_set FROM flashcard_sets WHERE id = v_share.set_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original set no longer exists';
  END IF;

  SELECT count(*) INTO v_card_count FROM flashcards WHERE set_id = v_share.set_id;
  IF v_card_count = 0 THEN
    RAISE EXCEPTION 'Original set has no flashcards';
  END IF;

  -- Copy the set
  INSERT INTO flashcard_sets (user_id, name, description, tags)
  VALUES (v_caller_id, '[Shared] ' || v_original_set.name, v_original_set.description, v_original_set.tags)
  RETURNING id INTO v_new_set_id;

  -- Copy all flashcards
  INSERT INTO flashcards (front, back, front_image_url, back_audio_url, front_language, back_language, source, position, user_id, set_id)
  SELECT front, back, front_image_url, back_audio_url, front_language, back_language, 'manual', position, v_caller_id, v_new_set_id
  FROM flashcards
  WHERE set_id = v_share.set_id;

  -- Mark share as accepted
  UPDATE deck_shares SET status = 'accepted' WHERE id = p_deck_share_id;

  RETURN v_new_set_id;
END;
$$;
