-- Obsługa anonimowych użytkowników: email może być null

ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;

-- Aktualizacja create_user_record: generuj placeholder email dla anonimowych
CREATE OR REPLACE FUNCTION public.create_user_record(
  user_id uuid,
  user_email text,
  user_created_at timestamptz,
  user_updated_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
  user_exists boolean;
  resolved_email text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = user_id
  ) INTO user_exists;

  IF NOT user_exists THEN
    RAISE EXCEPTION 'Użytkownik o ID % nie istnieje w tabeli auth.users', user_id;
  END IF;

  resolved_email := COALESCE(NULLIF(user_email, ''), 'anon-' || user_id::text || '@anonymous.local');

  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = user_id
  ) INTO user_exists;

  IF NOT user_exists THEN
    INSERT INTO public.users (id, email, encrypted_password, created_at, updated_at)
    VALUES (user_id, resolved_email, 'managed-by-supabase-auth', user_created_at, user_updated_at)
    RETURNING to_jsonb(users.*) INTO result;
  ELSE
    SELECT to_jsonb(users.*) INTO result FROM public.users WHERE id = user_id;
  END IF;

  RETURN result;
END;
$$;

-- Aktualizacja create_user_and_flashcards (bulk): obsługa anonimowych
CREATE OR REPLACE FUNCTION public.create_user_and_flashcards(
  user_id uuid,
  flashcards jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  user_exists boolean;
  user_email text;
BEGIN
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

  WITH inserted_flashcards AS (
    INSERT INTO public.flashcards (front, back, source, user_id, generation_id, set_id, created_at, updated_at)
    SELECT
      (jsonb_array_elements(flashcards)->>'front')::text,
      (jsonb_array_elements(flashcards)->>'back')::text,
      (jsonb_array_elements(flashcards)->>'source')::text,
      user_id,
      (jsonb_array_elements(flashcards)->>'generation_id')::bigint,
      (jsonb_array_elements(flashcards)->>'set_id')::bigint,
      (jsonb_array_elements(flashcards)->>'created_at')::timestamptz,
      (jsonb_array_elements(flashcards)->>'updated_at')::timestamptz
    RETURNING *
  )
  SELECT jsonb_agg(to_jsonb(f)) INTO result FROM inserted_flashcards f;

  RETURN result;
END;
$$;

-- Aktualizacja create_user_and_flashcard (single): obsługa anonimowych
CREATE OR REPLACE FUNCTION public.create_user_and_flashcard(
  user_id uuid,
  flashcard jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  user_exists boolean;
  user_email text;
BEGIN
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
    INSERT INTO public.flashcards (front, back, source, user_id, generation_id, set_id, created_at, updated_at)
    VALUES (
      (flashcard->>'front')::text,
      (flashcard->>'back')::text,
      (flashcard->>'source')::text,
      user_id,
      (flashcard->>'generation_id')::bigint,
      (flashcard->>'set_id')::bigint,
      (flashcard->>'created_at')::timestamptz,
      (flashcard->>'updated_at')::timestamptz
    )
    RETURNING *
  )
  SELECT to_jsonb(f) INTO result FROM inserted_flashcard f;

  RETURN result;
END;
$$;
