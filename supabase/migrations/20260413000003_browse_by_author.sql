-- Partner Program — M4: Author-aware browse + author profile RPC
-- Routes the "author" shown on public set cards through original_author_id
-- instead of user_id. For originals these are identical; for copies (which
-- currently can't be republished, but the data model allows it in future)
-- this preserves correct attribution.
--
-- Also adds get_author_public_sets so the partner profile page can list
-- everything a given author has published.

-- ── Update browse_public_sets to attribute via original_author_id ──
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
      -- Authorship: route via original_author_id, not user_id. For originals
      -- these match, but for future copy-then-republish scenarios this keeps
      -- attribution honest.
      'author_id', fs.original_author_id,
      'author_email_masked', mask_email(u.email),
      'copy_count', fs.copy_count,
      'published_at', fs.published_at,
      'tags', fs.tags
    ) AS row_data
    FROM flashcard_sets fs
    JOIN users u ON u.id = fs.original_author_id
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

-- ── Public author profile RPC ──
-- Returns the author's display info (masked email — we never expose raw
-- emails of public authors) plus all sets they have published. Visible to
-- any authenticated user; read access is through a SECURITY DEFINER so
-- callers don't need RLS on users.
CREATE OR REPLACE FUNCTION public.get_author_public_sets(p_author_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_author_email_masked text;
  v_sets jsonb;
  v_total_copies bigint;
  v_total_sets bigint;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT mask_email(email) INTO v_author_email_masked
  FROM users WHERE id = p_author_id;

  IF v_author_email_masked IS NULL THEN
    RAISE EXCEPTION 'Author not found';
  END IF;

  SELECT
    COALESCE(sum(copy_count), 0),
    count(*)
  INTO v_total_copies, v_total_sets
  FROM flashcard_sets
  WHERE original_author_id = p_author_id AND is_public = true;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY copy_count DESC), '[]'::jsonb) INTO v_sets
  FROM (
    SELECT jsonb_build_object(
      'id', fs.id,
      'name', fs.name,
      'description', fs.description,
      'card_count', (SELECT count(*) FROM flashcards WHERE set_id = fs.id),
      'author_id', fs.original_author_id,
      'author_email_masked', v_author_email_masked,
      'copy_count', fs.copy_count,
      'published_at', fs.published_at,
      'tags', fs.tags
    ) AS row_data,
    fs.copy_count AS copy_count
    FROM flashcard_sets fs
    WHERE fs.original_author_id = p_author_id AND fs.is_public = true
  ) sub;

  RETURN jsonb_build_object(
    'author_id', p_author_id,
    'author_email_masked', v_author_email_masked,
    'total_published_sets', v_total_sets,
    'total_copies', v_total_copies,
    'sets', v_sets
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_author_public_sets(uuid) TO authenticated;
