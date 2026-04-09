-- Add per-user daily generation limit enforcement
-- Default: 5 generations per day (adjustable via app_settings or constant)

CREATE OR REPLACE FUNCTION public.get_daily_generation_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT count(*)::integer
  FROM public.generation
  WHERE user_id = p_user_id
    AND created_at >= (now() AT TIME ZONE 'UTC')::date;
$$;

CREATE OR REPLACE FUNCTION public.insert_generation_with_limit(
  p_user_id uuid,
  p_model varchar,
  p_generated_count integer,
  p_source_text_hash varchar,
  p_generation_duration integer,
  p_source_text_length integer,
  p_daily_limit integer DEFAULT 5
)
RETURNS TABLE(id bigint, daily_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
  v_id bigint;
BEGIN
  -- Check caller owns the user_id
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: user_id mismatch';
  END IF;

  -- Count today's generations
  SELECT count(*)::integer INTO v_count
  FROM public.generation
  WHERE user_id = p_user_id
    AND created_at >= (now() AT TIME ZONE 'UTC')::date;

  IF v_count >= p_daily_limit THEN
    RAISE EXCEPTION 'Daily generation limit reached (% / %)', v_count, p_daily_limit
      USING ERRCODE = 'P0001';
  END IF;

  -- Insert generation record
  INSERT INTO public.generation (user_id, model, generated_count, source_text_hash, generation_duration, source_text_length)
  VALUES (p_user_id, p_model, p_generated_count, p_source_text_hash, p_generation_duration, p_source_text_length)
  RETURNING generation.id INTO v_id;

  RETURN QUERY SELECT v_id, v_count + 1;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_daily_generation_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_generation_with_limit(uuid, varchar, integer, varchar, integer, integer, integer) TO authenticated;
