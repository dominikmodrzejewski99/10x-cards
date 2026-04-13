-- Partner Program — M1: Author attribution
-- Adds immutable author tracking to flashcard_sets so that royalties can be
-- paid to the ORIGINAL author even after a set has been copied to a learner.
--
-- Design notes:
-- - original_author_id propagates unchanged through copy_public_set(). This is
--   load-bearing: without propagation, copying a set erases the partner's
--   economic claim on their content.
-- - source_set_id points at the set a copy was made from (NULL for originals).
--   Lets us trace the copy graph for debugging/fraud investigation.
-- - A BEFORE INSERT trigger defaults original_author_id = user_id so that all
--   new sets created outside the public-library copy flow are still attributed.
-- - NOT NULL is added AFTER backfill to avoid breaking existing rows.

-- ── Schema changes ──
-- Note: FK to public.users (not auth.users) because the 20260402100000 seed
-- creates a system user "team@memlo.app" with id 00000000-...-001 in
-- public.users but NOT in auth.users. That row is the author of all seeded
-- public sets, so the FK must accept it.
ALTER TABLE public.flashcard_sets
  ADD COLUMN original_author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN source_set_id integer REFERENCES public.flashcard_sets(id) ON DELETE SET NULL;

-- Backfill: existing sets are self-authored (owner = author)
UPDATE public.flashcard_sets
SET original_author_id = user_id
WHERE original_author_id IS NULL;

-- Now enforce NOT NULL
ALTER TABLE public.flashcard_sets
  ALTER COLUMN original_author_id SET NOT NULL;

-- ── Trigger: auto-populate original_author_id on INSERT if not provided ──
-- Keeps the invariant "every set has an author" without forcing every INSERT
-- site (services, tests, imports) to remember this new column.
CREATE OR REPLACE FUNCTION public.set_original_author_on_flashcard_set()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.original_author_id IS NULL THEN
    NEW.original_author_id := NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER flashcard_sets_set_original_author
  BEFORE INSERT ON public.flashcard_sets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_original_author_on_flashcard_set();

-- ── Indexes ──
-- For partner dashboard: "all sets I authored" (including copies made by others)
CREATE INDEX flashcard_sets_original_author_idx
  ON public.flashcard_sets (original_author_id);

-- For copy graph traversal
CREATE INDEX flashcard_sets_source_set_idx
  ON public.flashcard_sets (source_set_id)
  WHERE source_set_id IS NOT NULL;

-- ── Update copy_public_set to propagate original_author_id and source_set_id ──
-- This is the ONLY production path that creates a set with a different author
-- than owner. All other paths use the trigger above.
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

  -- Propagate original_author_id (NOT user_id of source — authorship is immutable
  -- across the copy chain), tags (from the 20260402 migration that also
  -- redefined this RPC), and record source_set_id for the copy graph.
  INSERT INTO flashcard_sets (
    user_id, name, description, tags, original_author_id, source_set_id
  )
  VALUES (
    v_caller_id,
    v_original_set.name,
    v_original_set.description,
    v_original_set.tags,
    v_original_set.original_author_id,
    v_original_set.id
  )
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
