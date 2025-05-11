-- Funkcja do tworzenia rekordu użytkownika w tabeli users
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
BEGIN
  -- Sprawdzamy, czy użytkownik istnieje w tabeli auth.users
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = user_id
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE EXCEPTION 'Użytkownik o ID % nie istnieje w tabeli auth.users', user_id;
  END IF;
  
  -- Sprawdzamy, czy użytkownik istnieje w tabeli users
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = user_id
  ) INTO user_exists;
  
  -- Jeśli użytkownik nie istnieje w tabeli users, tworzymy go
  IF NOT user_exists THEN
    INSERT INTO public.users (id, email, encrypted_password, created_at, updated_at)
    VALUES (user_id, user_email, 'managed-by-supabase-auth', user_created_at, user_updated_at)
    RETURNING to_jsonb(users.*) INTO result;
  ELSE
    SELECT to_jsonb(users.*) INTO result FROM public.users WHERE id = user_id;
  END IF;
  
  RETURN result;
END;
$$;
