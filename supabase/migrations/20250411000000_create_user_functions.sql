-- Funkcja do tworzenia rekordu użytkownika w tabeli users i zapisywania fiszek
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
  -- Sprawdzamy, czy użytkownik istnieje w tabeli auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = user_id
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE EXCEPTION 'Użytkownik o ID % nie istnieje w tabeli auth.users', user_id;
  END IF;
  
  -- Pobieramy email użytkownika z tabeli auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;
  
  -- Sprawdzamy, czy użytkownik istnieje w tabeli users
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = user_id
  ) INTO user_exists;
  
  -- Jeśli użytkownik nie istnieje w tabeli users, tworzymy go
  IF NOT user_exists THEN
    INSERT INTO public.users (id, email, encrypted_password, created_at, updated_at)
    VALUES (user_id, user_email, 'managed-by-supabase-auth', NOW(), NOW());
  END IF;
  
  -- Zapisujemy fiszki
  WITH inserted_flashcards AS (
    INSERT INTO public.flashcards (front, back, source, user_id, generation_id, created_at, updated_at)
    SELECT 
      (jsonb_array_elements(flashcards)->>'front')::text,
      (jsonb_array_elements(flashcards)->>'back')::text,
      (jsonb_array_elements(flashcards)->>'source')::text,
      user_id,
      (jsonb_array_elements(flashcards)->>'generation_id')::bigint,
      (jsonb_array_elements(flashcards)->>'created_at')::timestamptz,
      (jsonb_array_elements(flashcards)->>'updated_at')::timestamptz
    RETURNING *
  )
  SELECT jsonb_agg(to_jsonb(f)) INTO result FROM inserted_flashcards f;
  
  RETURN result;
END;
$$;

-- Funkcja do tworzenia rekordu użytkownika w tabeli users i zapisywania pojedynczej fiszki
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
  -- Sprawdzamy, czy użytkownik istnieje w tabeli auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = user_id
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE EXCEPTION 'Użytkownik o ID % nie istnieje w tabeli auth.users', user_id;
  END IF;
  
  -- Pobieramy email użytkownika z tabeli auth.users
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;
  
  -- Sprawdzamy, czy użytkownik istnieje w tabeli users
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = user_id
  ) INTO user_exists;
  
  -- Jeśli użytkownik nie istnieje w tabeli users, tworzymy go
  IF NOT user_exists THEN
    INSERT INTO public.users (id, email, encrypted_password, created_at, updated_at)
    VALUES (user_id, user_email, 'managed-by-supabase-auth', NOW(), NOW());
  END IF;
  
  -- Zapisujemy fiszkę
  WITH inserted_flashcard AS (
    INSERT INTO public.flashcards (front, back, source, user_id, generation_id, created_at, updated_at)
    VALUES (
      (flashcard->>'front')::text,
      (flashcard->>'back')::text,
      (flashcard->>'source')::text,
      user_id,
      (flashcard->>'generation_id')::bigint,
      (flashcard->>'created_at')::timestamptz,
      (flashcard->>'updated_at')::timestamptz
    )
    RETURNING *
  )
  SELECT to_jsonb(f) INTO result FROM inserted_flashcard f;
  
  RETURN result;
END;
$$;
