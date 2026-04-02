-- Public Sets Library: schema changes + RPC functions

-- ── Schema changes ──
ALTER TABLE public.flashcard_sets
  ADD COLUMN is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN copy_count integer NOT NULL DEFAULT 0,
  ADD COLUMN published_at timestamptz;

CREATE INDEX flashcard_sets_public_idx
  ON public.flashcard_sets (is_public, published_at DESC)
  WHERE is_public = true;

-- ── RLS: authenticated users can view public sets ──
CREATE POLICY "Authenticated users can view public sets"
  ON public.flashcard_sets
  FOR SELECT
  TO authenticated
  USING (is_public = true);

-- ── RLS: authenticated users can view flashcards of public sets ──
CREATE POLICY "Authenticated users can view flashcards of public sets"
  ON public.flashcards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flashcard_sets
      WHERE flashcard_sets.id = flashcards.set_id
      AND flashcard_sets.is_public = true
    )
  );

-- ── RPC: publish_set ──
CREATE OR REPLACE FUNCTION public.publish_set(p_set_id integer)
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

  UPDATE flashcard_sets
  SET is_public = true, published_at = now(), updated_at = now()
  WHERE id = p_set_id AND user_id = v_caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Set not found or not owned by user';
  END IF;
END;
$$;

-- ── RPC: unpublish_set ──
CREATE OR REPLACE FUNCTION public.unpublish_set(p_set_id integer)
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

  UPDATE flashcard_sets
  SET is_public = false, updated_at = now()
  WHERE id = p_set_id AND user_id = v_caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Set not found or not owned by user';
  END IF;
END;
$$;

-- ── RPC: copy_public_set ──
CREATE OR REPLACE FUNCTION public.copy_public_set(p_set_id integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_original_set flashcard_sets%ROWTYPE;
  v_new_set_id integer;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_original_set FROM flashcard_sets WHERE id = p_set_id AND is_public = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Public set not found';
  END IF;

  IF v_original_set.user_id = v_caller_id THEN
    RAISE EXCEPTION 'Cannot copy your own set';
  END IF;

  INSERT INTO flashcard_sets (user_id, name, description)
  VALUES (v_caller_id, v_original_set.name, v_original_set.description)
  RETURNING id INTO v_new_set_id;

  INSERT INTO flashcards (front, back, front_image_url, back_audio_url, front_language, back_language, source, position, user_id, set_id)
  SELECT front, back, front_image_url, back_audio_url, front_language, back_language, 'manual', position, v_caller_id, v_new_set_id
  FROM flashcards
  WHERE set_id = p_set_id;

  UPDATE flashcard_sets
  SET copy_count = copy_count + 1
  WHERE id = p_set_id;

  RETURN v_new_set_id;
END;
$$;

-- ── RPC: browse_public_sets ──
CREATE OR REPLACE FUNCTION public.browse_public_sets(
  p_search text DEFAULT '',
  p_sort text DEFAULT 'popular',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_result jsonb;
  v_total integer;
  v_offset integer;
  v_search text;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_offset := (p_page - 1) * p_page_size;
  v_search := '%' || COALESCE(NULLIF(trim(p_search), ''), '') || '%';

  -- Count total matching
  SELECT count(*) INTO v_total
  FROM flashcard_sets
  WHERE is_public = true
  AND (v_search = '%%' OR name ILIKE v_search OR description ILIKE v_search);

  -- Fetch page
  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', fs.id,
      'name', fs.name,
      'description', fs.description,
      'card_count', (SELECT count(*) FROM flashcards WHERE set_id = fs.id),
      'author_email_masked', mask_email(u.email),
      'copy_count', fs.copy_count,
      'published_at', fs.published_at
    ) AS row_data
    FROM flashcard_sets fs
    JOIN users u ON u.id = fs.user_id
    WHERE fs.is_public = true
    AND (v_search = '%%' OR fs.name ILIKE v_search OR fs.description ILIKE v_search)
    ORDER BY
      CASE WHEN p_sort = 'popular' THEN fs.copy_count END DESC NULLS LAST,
      CASE WHEN p_sort = 'newest' THEN fs.published_at END DESC NULLS LAST,
      CASE WHEN p_sort = 'most_cards' THEN (SELECT count(*) FROM flashcards WHERE set_id = fs.id) END DESC NULLS LAST,
      fs.published_at DESC
    LIMIT p_page_size OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'sets', v_result,
    'total', v_total
  );
END;
$$;
