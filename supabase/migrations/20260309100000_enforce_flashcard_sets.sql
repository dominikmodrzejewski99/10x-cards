-- Tworzenie domyślnego zestawu "Nieprzypisane" dla użytkowników z luźnymi fiszkami
INSERT INTO public.flashcard_sets (user_id, name, description)
SELECT DISTINCT user_id, 'Nieprzypisane', 'Fiszki bez zestawu'
FROM public.flashcards
WHERE set_id IS NULL;

-- Przypisanie luźnych fiszek do domyślnego zestawu użytkownika
UPDATE public.flashcards f
SET set_id = (
  SELECT id FROM public.flashcard_sets
  WHERE user_id = f.user_id AND name = 'Nieprzypisane'
  LIMIT 1
)
WHERE f.set_id IS NULL;

-- Wymuszenie NOT NULL na set_id
ALTER TABLE public.flashcards ALTER COLUMN set_id SET NOT NULL;

-- Zmiana FK z ON DELETE SET NULL na ON DELETE CASCADE
ALTER TABLE public.flashcards
  DROP CONSTRAINT flashcards_set_id_fkey,
  ADD CONSTRAINT flashcards_set_id_fkey
    FOREIGN KEY (set_id) REFERENCES public.flashcard_sets(id) ON DELETE CASCADE;
