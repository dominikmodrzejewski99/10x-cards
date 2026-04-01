-- ══════════════════════════════════════
-- Friends & Competition: friendships + notifications
-- ══════════════════════════════════════

-- ── Friendships table ──
CREATE TABLE public.friendships (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  addressee_id  uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX idx_friendships_status ON public.friendships(status);

-- Users see friendships where they are requester or addressee
CREATE POLICY "Users see own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Users can only send requests (insert as requester, status must be pending)
CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id AND status = 'pending');

-- Addressee can update status (accept/reject)
CREATE POLICY "Addressee can respond to requests"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = addressee_id)
  WITH CHECK (status IN ('accepted', 'rejected'));

-- Either party can delete (unfriend or cancel request)
CREATE POLICY "Either party can delete friendship"
  ON public.friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ── Notifications table ──
CREATE TABLE public.notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type         text NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'nudge')),
  from_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  data         jsonb NOT NULL DEFAULT '{}',
  read         boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_notifications_user ON public.notifications(user_id, read, created_at DESC);

-- Users see only their own notifications
CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- No INSERT policy — inserts happen via SECURITY DEFINER RPCs only

-- ── Update user_preferences RLS: allow friends to see stats ──
CREATE POLICY "Friends can see stats"
  ON public.user_preferences FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND addressee_id = user_preferences.user_id)
        OR (addressee_id = auth.uid() AND requester_id = user_preferences.user_id)
      )
    )
  );

-- ── Helper: mask email for privacy ──
CREATE OR REPLACE FUNCTION public.mask_email(email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  at_pos integer;
  local_part text;
  domain_part text;
BEGIN
  IF email IS NULL OR email = '' THEN
    RETURN '***';
  END IF;
  at_pos := position('@' in email);
  IF at_pos <= 1 THEN
    RETURN '***';
  END IF;
  local_part := left(email, at_pos - 1);
  domain_part := substring(email from at_pos);
  IF length(local_part) <= 2 THEN
    RETURN local_part || '...' || domain_part;
  END IF;
  RETURN left(local_part, 2) || '...' || domain_part;
END;
$$;

-- ── RPC: send_friend_request ──
CREATE OR REPLACE FUNCTION public.send_friend_request(target_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_target_user users%ROWTYPE;
  v_existing friendships%ROWTYPE;
  v_friendship friendships%ROWTYPE;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check caller is not anonymous
  IF EXISTS (SELECT 1 FROM users WHERE id = v_caller_id AND email LIKE 'anon-%@anonymous.local') THEN
    RAISE EXCEPTION 'Anonymous users cannot add friends';
  END IF;

  -- Find target user by email
  SELECT * INTO v_target_user FROM users WHERE lower(email) = lower(target_email);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Cannot add self
  IF v_target_user.id = v_caller_id THEN
    RAISE EXCEPTION 'Cannot send request to yourself';
  END IF;

  -- Cannot add anonymous user
  IF v_target_user.email LIKE 'anon-%@anonymous.local' THEN
    RAISE EXCEPTION 'Cannot add anonymous users';
  END IF;

  -- Check for existing friendship (either direction)
  SELECT * INTO v_existing FROM friendships
  WHERE (requester_id = v_caller_id AND addressee_id = v_target_user.id)
     OR (requester_id = v_target_user.id AND addressee_id = v_caller_id);

  IF FOUND THEN
    IF v_existing.status = 'accepted' THEN
      RAISE EXCEPTION 'Already friends';
    ELSIF v_existing.status = 'pending' THEN
      RAISE EXCEPTION 'Request already pending';
    ELSIF v_existing.status = 'rejected' THEN
      -- Allow re-requesting after rejection: delete old and create new
      DELETE FROM friendships WHERE id = v_existing.id;
    END IF;
  END IF;

  -- Create friendship
  INSERT INTO friendships (requester_id, addressee_id, status)
  VALUES (v_caller_id, v_target_user.id, 'pending')
  RETURNING * INTO v_friendship;

  -- Create notification for target user
  INSERT INTO notifications (user_id, type, from_user_id, data)
  VALUES (
    v_target_user.id,
    'friend_request',
    v_caller_id,
    jsonb_build_object('friendship_id', v_friendship.id, 'from_email', mask_email((SELECT email FROM users WHERE id = v_caller_id)))
  );

  RETURN jsonb_build_object(
    'friendship_id', v_friendship.id,
    'status', v_friendship.status
  );
END;
$$;

-- ── RPC: respond_to_friend_request ──
CREATE OR REPLACE FUNCTION public.respond_to_friend_request(p_friendship_id uuid, p_response text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_friendship friendships%ROWTYPE;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_response NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Response must be accepted or rejected';
  END IF;

  -- Fetch friendship (caller must be addressee)
  SELECT * INTO v_friendship FROM friendships
  WHERE id = p_friendship_id AND addressee_id = v_caller_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found';
  END IF;

  -- Update status
  UPDATE friendships
  SET status = p_response, updated_at = now()
  WHERE id = p_friendship_id;

  -- If accepted, notify the requester
  IF p_response = 'accepted' THEN
    INSERT INTO notifications (user_id, type, from_user_id, data)
    VALUES (
      v_friendship.requester_id,
      'friend_accepted',
      v_caller_id,
      jsonb_build_object('friendship_id', v_friendship.id, 'from_email', mask_email((SELECT email FROM users WHERE id = v_caller_id)))
    );
  END IF;
END;
$$;

-- ── RPC: get_friend_stats ──
CREATE OR REPLACE FUNCTION public.get_friend_stats(p_friend_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_prefs user_preferences%ROWTYPE;
  v_email text;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify accepted friendship exists
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

  SELECT * INTO v_prefs FROM user_preferences WHERE user_id = p_friend_user_id;
  SELECT mask_email(email) INTO v_email FROM users WHERE id = p_friend_user_id;

  RETURN jsonb_build_object(
    'user_id', p_friend_user_id,
    'email_masked', COALESCE(v_email, '***'),
    'current_streak', COALESCE(v_prefs.current_streak, 0),
    'longest_streak', COALESCE(v_prefs.longest_streak, 0),
    'total_sessions', COALESCE(v_prefs.total_sessions, 0),
    'total_cards_reviewed', COALESCE(v_prefs.total_cards_reviewed, 0),
    'last_study_date', v_prefs.last_study_date
  );
END;
$$;

-- ── RPC: get_friends_list ──
-- Returns all accepted friends with their stats
CREATE OR REPLACE FUNCTION public.get_friends_list()
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

  SELECT COALESCE(jsonb_agg(friend_data), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'friendship_id', f.id,
      'user_id', CASE WHEN f.requester_id = v_caller_id THEN f.addressee_id ELSE f.requester_id END,
      'email_masked', mask_email(u.email),
      'current_streak', COALESCE(up.current_streak, 0),
      'last_study_date', up.last_study_date,
      'total_cards_reviewed', COALESCE(up.total_cards_reviewed, 0)
    ) AS friend_data
    FROM friendships f
    JOIN users u ON u.id = CASE WHEN f.requester_id = v_caller_id THEN f.addressee_id ELSE f.requester_id END
    LEFT JOIN user_preferences up ON up.user_id = u.id
    WHERE f.status = 'accepted'
    AND (f.requester_id = v_caller_id OR f.addressee_id = v_caller_id)
    ORDER BY COALESCE(up.current_streak, 0) DESC
  ) sub;

  RETURN v_result;
END;
$$;

-- ── RPC: send_nudge ──
CREATE OR REPLACE FUNCTION public.send_nudge(p_friend_user_id uuid)
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

  -- Rate limit: max 1 nudge per friend per 24h
  IF EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = p_friend_user_id
    AND from_user_id = v_caller_id
    AND type = 'nudge'
    AND created_at > now() - interval '24 hours'
  ) THEN
    RAISE EXCEPTION 'Nudge already sent in last 24 hours';
  END IF;

  -- Create nudge notification
  INSERT INTO notifications (user_id, type, from_user_id, data)
  VALUES (
    p_friend_user_id,
    'nudge',
    v_caller_id,
    jsonb_build_object('from_email', mask_email((SELECT email FROM users WHERE id = v_caller_id)))
  );
END;
$$;
