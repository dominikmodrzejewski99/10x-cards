-- Automatic daily cleanup of anonymous user accounts older than 24 hours.
-- Anonymous users have is_anonymous = true in auth.users and
-- email like 'anon-%@anonymous.local' in public.users.
--
-- Uses pg_cron (enabled by default on Supabase) to schedule daily execution.

-- 1. Create the cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_anonymous_users()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _user_id uuid;
  _deleted_count integer := 0;
BEGIN
  FOR _user_id IN
    SELECT au.id
    FROM auth.users au
    WHERE au.is_anonymous = true
      AND au.created_at < NOW() - INTERVAL '24 hours'
  LOOP
    -- Delete all user data from public tables
    DELETE FROM public.flashcard_sets WHERE user_id = _user_id;
    DELETE FROM public.user_preferences WHERE user_id = _user_id;
    DELETE FROM public.language_test_results WHERE user_id = _user_id;
    DELETE FROM public.users WHERE id = _user_id;

    -- Delete from auth.users
    DELETE FROM auth.users WHERE id = _user_id;

    _deleted_count := _deleted_count + 1;
  END LOOP;

  RAISE LOG 'cleanup_anonymous_users: deleted % anonymous accounts', _deleted_count;
  RETURN _deleted_count;
END;
$$;

-- Only superuser/service role should call this — revoke from all app roles
REVOKE ALL ON FUNCTION public.cleanup_anonymous_users() FROM anon, authenticated;

-- 2. Schedule daily execution at 03:00 UTC via pg_cron
-- pg_cron is enabled by default on Supabase (Settings > Extensions)
SELECT cron.schedule(
  'cleanup-anonymous-users',
  '0 3 * * *',
  $$SELECT public.cleanup_anonymous_users()$$
);
