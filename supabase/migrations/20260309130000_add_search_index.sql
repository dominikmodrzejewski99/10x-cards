CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS flashcards_front_trgm_idx
  ON public.flashcards USING gin (front gin_trgm_ops);

CREATE INDEX IF NOT EXISTS flashcards_back_trgm_idx
  ON public.flashcards USING gin (back gin_trgm_ops);

CREATE INDEX IF NOT EXISTS flashcards_user_set_idx
  ON public.flashcards (user_id, set_id);
