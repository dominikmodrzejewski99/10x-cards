-- Delete user account and all associated data
-- Called from client-side via supabase.rpc('delete_user_account')
-- Uses SECURITY DEFINER to delete from auth.users which requires elevated privileges

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete all user data (CASCADE handles flashcards, generations, reviews, etc.)
  DELETE FROM public.flashcard_sets WHERE user_id = _user_id;
  DELETE FROM public.user_preferences WHERE user_id = _user_id;
  DELETE FROM public.language_test_results WHERE user_id = _user_id;
  DELETE FROM public.users WHERE id = _user_id;

  -- Delete auth user (requires SECURITY DEFINER)
  DELETE FROM auth.users WHERE id = _user_id;
END;
$$;

-- Only authenticated users can call this function
REVOKE ALL ON FUNCTION public.delete_user_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
