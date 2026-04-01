-- Add last_active_at (from auth.users.last_sign_in_at) alongside last_study_date
-- so "inactive" status reflects login activity, while last review date is also visible

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
  v_last_active timestamptz;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

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
  SELECT last_sign_in_at INTO v_last_active FROM auth.users WHERE id = p_friend_user_id;

  RETURN jsonb_build_object(
    'user_id', p_friend_user_id,
    'email_masked', COALESCE(v_email, '***'),
    'current_streak', COALESCE(v_prefs.current_streak, 0),
    'longest_streak', COALESCE(v_prefs.longest_streak, 0),
    'total_sessions', COALESCE(v_prefs.total_sessions, 0),
    'total_cards_reviewed', COALESCE(v_prefs.total_cards_reviewed, 0),
    'last_study_date', v_prefs.last_study_date,
    'last_active_at', v_last_active
  );
END;
$$;

-- ── RPC: get_friends_list ──
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
      'last_active_at', au.last_sign_in_at,
      'total_cards_reviewed', COALESCE(up.total_cards_reviewed, 0)
    ) AS friend_data
    FROM friendships f
    JOIN users u ON u.id = CASE WHEN f.requester_id = v_caller_id THEN f.addressee_id ELSE f.requester_id END
    JOIN auth.users au ON au.id = u.id
    LEFT JOIN user_preferences up ON up.user_id = u.id
    WHERE f.status = 'accepted'
    AND (f.requester_id = v_caller_id OR f.addressee_id = v_caller_id)
    ORDER BY COALESCE(up.current_streak, 0) DESC
  ) sub;

  RETURN v_result;
END;
$$;
