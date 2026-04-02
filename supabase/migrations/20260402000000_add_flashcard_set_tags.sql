-- Add tags column to flashcard_sets
ALTER TABLE public.flashcard_sets
  ADD COLUMN tags text[] NOT NULL DEFAULT '{}';

-- GIN index for array containment/overlap queries
CREATE INDEX flashcard_sets_tags_idx
  ON public.flashcard_sets USING GIN (tags);

-- ── Update browse_public_sets to include tags and support tag filtering ──
CREATE OR REPLACE FUNCTION public.browse_public_sets(
  p_search text DEFAULT '',
  p_sort text DEFAULT 'popular',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 12,
  p_tags text[] DEFAULT '{}'
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

  SELECT count(*) INTO v_total
  FROM flashcard_sets
  WHERE is_public = true
  AND (v_search = '%%' OR name ILIKE v_search OR description ILIKE v_search)
  AND (p_tags = '{}' OR tags @> p_tags);

  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', fs.id,
      'name', fs.name,
      'description', fs.description,
      'card_count', (SELECT count(*) FROM flashcards WHERE set_id = fs.id),
      'author_email_masked', mask_email(u.email),
      'copy_count', fs.copy_count,
      'published_at', fs.published_at,
      'tags', fs.tags
    ) AS row_data
    FROM flashcard_sets fs
    JOIN users u ON u.id = fs.user_id
    WHERE fs.is_public = true
    AND (v_search = '%%' OR fs.name ILIKE v_search OR fs.description ILIKE v_search)
    AND (p_tags = '{}' OR fs.tags @> p_tags)
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

-- ── Update copy_public_set to copy tags ──
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

  INSERT INTO flashcard_sets (user_id, name, description, tags)
  VALUES (v_caller_id, v_original_set.name, v_original_set.description, v_original_set.tags)
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

-- ── RPC: get popular tags from public sets ──
CREATE OR REPLACE FUNCTION public.get_popular_public_tags(p_limit integer DEFAULT 20)
RETURNS text[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_tags text[];
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT ARRAY(
    SELECT tag
    FROM (
      SELECT unnest(tags) AS tag
      FROM flashcard_sets
      WHERE is_public = true
    ) sub
    GROUP BY tag
    ORDER BY count(*) DESC
    LIMIT p_limit
  ) INTO v_tags;

  RETURN v_tags;
END;
$$;
