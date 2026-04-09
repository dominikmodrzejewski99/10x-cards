-- Basic CHECK constraints for flashcard_sets
-- name: must be non-empty after trimming
ALTER TABLE public.flashcard_sets
  ADD CONSTRAINT flashcard_sets_name_not_blank
  CHECK (length(trim(name)) >= 1);

-- tags: max 10 tags
ALTER TABLE public.flashcard_sets
  ADD CONSTRAINT flashcard_sets_tags_max_count
  CHECK (cardinality(tags) <= 10);

-- tags: each tag must be 1-30 chars (no blanks)
CREATE OR REPLACE FUNCTION public.check_tags_valid(tags text[])
RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM unnest(tags) AS t
    WHERE length(trim(t)) < 1 OR length(t) > 30
  );
$$;

ALTER TABLE public.flashcard_sets
  ADD CONSTRAINT flashcard_sets_tags_valid
  CHECK (check_tags_valid(tags));
