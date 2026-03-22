-- Add optional language fields to flashcards
ALTER TABLE public.flashcards
  ADD COLUMN front_language varchar(5) DEFAULT NULL,
  ADD COLUMN back_language varchar(5) DEFAULT NULL;

COMMENT ON COLUMN public.flashcards.front_language IS 'ISO language code for front side (en, pl, de, es, fr) or NULL';
COMMENT ON COLUMN public.flashcards.back_language IS 'ISO language code for back side (en, pl, de, es, fr) or NULL';
