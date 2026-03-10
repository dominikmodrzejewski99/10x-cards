-- Migracja bezpieczeństwa: naprawia krytyczne problemy w funkcjach RPC
-- 1. Naprawia cartesian product z jsonb_array_elements
-- 2. Dodaje walidację auth.uid() do SECURITY DEFINER
-- 3. Dodaje SET search_path do SECURITY DEFINER
-- 4. Naprawia FK flashcard_sets.user_id -> public.users
-- 5. Dodaje ON DELETE CASCADE do brakujących FK

-- =============================================================
-- 1. Naprawione create_user_record z search_path (już miał)
-- =============================================================
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
  -- Walidacja: caller musi być właścicielem user_id
  IF auth.uid() IS DISTINCT FROM user_id THEN
    RAISE EXCEPTION 'Unauthorized: user_id does not match authenticated user';
  END IF;

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

-- =============================================================
-- 2. Naprawione create_user_and_flashcards (bulk)
--    - CTE zamiast wielokrotnego jsonb_array_elements (fix cartesian product)
--    - auth.uid() check
--    - search_path pinning
-- =============================================================
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
  -- Walidacja: caller musi być właścicielem user_id
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

  -- Naprawiony INSERT: użycie CTE zamiast wielokrotnego jsonb_array_elements
  -- (poprzednia wersja powodowała iloczyn kartezjański N^7)
  WITH elements AS (
    SELECT jsonb_array_elements(flashcards) AS elem
  ),
  inserted_flashcards AS (
    INSERT INTO public.flashcards (front, back, source, user_id, generation_id, set_id, created_at, updated_at)
    SELECT
      (elem->>'front')::text,
      (elem->>'back')::text,
      (elem->>'source')::text,
      user_id,
      (elem->>'generation_id')::bigint,
      (elem->>'set_id')::bigint,
      (elem->>'created_at')::timestamptz,
      (elem->>'updated_at')::timestamptz
    FROM elements
    RETURNING *
  )
  SELECT jsonb_agg(to_jsonb(f)) INTO result FROM inserted_flashcards f;

  RETURN result;
END;
$$;

-- =============================================================
-- 3. Naprawione create_user_and_flashcard (single)
--    - auth.uid() check
--    - search_path pinning
-- =============================================================
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
  -- Walidacja: caller musi być właścicielem user_id
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

-- =============================================================
-- 4. Naprawienie FK flashcard_sets.user_id: auth.users -> public.users
-- =============================================================
ALTER TABLE public.flashcard_sets
  DROP CONSTRAINT IF EXISTS flashcard_sets_user_id_fkey;

ALTER TABLE public.flashcard_sets
  ADD CONSTRAINT flashcard_sets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- =============================================================
-- 5. Dodanie ON DELETE CASCADE do brakujących FK
-- =============================================================

-- flashcards.user_id
ALTER TABLE public.flashcards
  DROP CONSTRAINT IF EXISTS flashcards_user_id_fkey;

ALTER TABLE public.flashcards
  ADD CONSTRAINT flashcards_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- flashcard_reviews.user_id
ALTER TABLE public.flashcard_reviews
  DROP CONSTRAINT IF EXISTS flashcard_reviews_user_id_fkey;

ALTER TABLE public.flashcard_reviews
  ADD CONSTRAINT flashcard_reviews_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- generation.user_id
ALTER TABLE public.generation
  DROP CONSTRAINT IF EXISTS generation_user_id_fkey;

ALTER TABLE public.generation
  ADD CONSTRAINT generation_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- generation_error_logs.user_id
ALTER TABLE public.generation_error_logs
  DROP CONSTRAINT IF EXISTS generation_error_logs_user_id_fkey;

ALTER TABLE public.generation_error_logs
  ADD CONSTRAINT generation_error_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- =============================================================
-- 6. Dodanie CHECK constraint na ease_factor
-- =============================================================
ALTER TABLE public.flashcard_reviews
  ADD CONSTRAINT flashcard_reviews_ease_factor_min
  CHECK (ease_factor >= 1.3);
