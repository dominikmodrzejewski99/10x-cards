SET search_path = public, pg_temp;

-- Extend flashcards.source CHECK constraint to include 'test'
ALTER TABLE flashcards DROP CONSTRAINT flashcards_source_check;
ALTER TABLE flashcards ADD CONSTRAINT flashcards_source_check
  CHECK (source IN ('ai-full', 'ai-edited', 'manual', 'test'));

-- Extend front column for test-generated flashcards (sentences can be long)
ALTER TABLE flashcards ALTER COLUMN front TYPE varchar(500);

-- Create language test results table
CREATE TABLE language_test_results (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  total_score INTEGER NOT NULL,
  max_score INTEGER NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  category_breakdown JSONB NOT NULL,
  wrong_answers JSONB NOT NULL,
  generated_set_id BIGINT REFERENCES flashcard_sets(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE language_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own test results"
  ON language_test_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own test results"
  ON language_test_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own test results"
  ON language_test_results FOR UPDATE
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_language_test_results_user_id ON language_test_results(user_id);

-- Updated_at trigger
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON language_test_results
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
