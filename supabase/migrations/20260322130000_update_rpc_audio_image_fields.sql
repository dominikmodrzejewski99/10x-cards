-- Update RPC functions to include front_image_url and back_audio_url columns

-- 1. Update create_user_and_flashcard (single)
CREATE OR REPLACE FUNCTION public.create_user_and_flashcard(
  user_id uuid,
  flashcard jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
  user_exists boolean;
  user_email text;
BEGIN
  IF auth.uid() IS DISTINCT FROM user_id THEN
    RAISE EXCEPTION 'Unauthorized: user_id does not match authenticated user';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = user_id
  ) INTO user_exists;

  IF NOT user_exists THEN
    RAISE EXCEPTION 'Użytkownik o ID % nie istnieje w tabeli auth.users', user_id;
  END IF;

  SELECT COALESCE(email, 'anon-' || user_id::text || '@anonymous.local')
  INTO user_email FROM auth.users WHERE id = user_id;

  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = user_id
  ) INTO user_exists;

  IF NOT user_exists THEN
    INSERT INTO public.users (id, email, encrypted_password, created_at, updated_at)
    VALUES (user_id, user_email, 'managed-by-supabase-auth', NOW(), NOW());
  END IF;

  WITH inserted_flashcard AS (
    INSERT INTO public.flashcards (front, back, front_image_url, back_audio_url, source, user_id, generation_id, set_id, front_language, back_language, created_at, updated_at)
    VALUES (
      (flashcard->>'front')::text,
      (flashcard->>'back')::text,
      (flashcard->>'front_image_url')::text,
      (flashcard->>'back_audio_url')::text,
      (flashcard->>'source')::text,
      user_id,
      (flashcard->>'generation_id')::bigint,
      (flashcard->>'set_id')::bigint,
      (flashcard->>'front_language')::varchar(5),
      (flashcard->>'back_language')::varchar(5),
      (flashcard->>'created_at')::timestamptz,
      (flashcard->>'updated_at')::timestamptz
    )
    RETURNING *
  )
  SELECT to_jsonb(f) INTO result FROM inserted_flashcard f;

  RETURN result;
END;
$$;

-- 2. Update create_user_and_flashcards (bulk)
CREATE OR REPLACE FUNCTION public.create_user_and_flashcards(
  user_id uuid,
  flashcards jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
  user_exists boolean;
  user_email text;
BEGIN
  IF auth.uid() IS DISTINCT FROM user_id THEN
    RAISE EXCEPTION 'Unauthorized: user_id does not match authenticated user';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = user_id
  ) INTO user_exists;

  IF NOT user_exists THEN
    RAISE EXCEPTION 'Użytkownik o ID % nie istnieje w tabeli auth.users', user_id;
  END IF;

  SELECT COALESCE(email, 'anon-' || user_id::text || '@anonymous.local')
  INTO user_email FROM auth.users WHERE id = user_id;

  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = user_id
  ) INTO user_exists;

  IF NOT user_exists THEN
    INSERT INTO public.users (id, email, encrypted_password, created_at, updated_at)
    VALUES (user_id, user_email, 'managed-by-supabase-auth', NOW(), NOW());
  END IF;

  WITH elements AS (
    SELECT jsonb_array_elements(flashcards) AS elem
  ),
  inserted_flashcards AS (
    INSERT INTO public.flashcards (front, back, front_image_url, back_audio_url, source, user_id, generation_id, set_id, front_language, back_language, created_at, updated_at)
    SELECT
      (elem->>'front')::text,
      (elem->>'back')::text,
      (elem->>'front_image_url')::text,
      (elem->>'back_audio_url')::text,
      (elem->>'source')::text,
      user_id,
      (elem->>'generation_id')::bigint,
      (elem->>'set_id')::bigint,
      (elem->>'front_language')::varchar(5),
      (elem->>'back_language')::varchar(5),
      (elem->>'created_at')::timestamptz,
      (elem->>'updated_at')::timestamptz
    FROM elements
    RETURNING *
  )
  SELECT jsonb_agg(to_jsonb(f)) INTO result FROM inserted_flashcards f;

  RETURN result;
END;
$$;
