-- Add position column for manual ordering of flashcards within a set
ALTER TABLE flashcards ADD COLUMN position integer;

-- Initialize position from existing order (by id ascending within each set)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY set_id ORDER BY id ASC) AS rn
  FROM flashcards
)
UPDATE flashcards SET position = ranked.rn
FROM ranked WHERE flashcards.id = ranked.id;

-- Set NOT NULL after backfill
ALTER TABLE flashcards ALTER COLUMN position SET NOT NULL;
ALTER TABLE flashcards ALTER COLUMN position SET DEFAULT 0;

-- Index for efficient ordering within a set
CREATE INDEX idx_flashcards_set_position ON flashcards (set_id, position);
