-- Expand language options: add German, Spanish, French, Ukrainian
ALTER TABLE user_preferences
  DROP CONSTRAINT IF EXISTS user_preferences_language_check;

ALTER TABLE user_preferences
  ADD CONSTRAINT user_preferences_language_check
  CHECK (language IN ('pl', 'en', 'de', 'es', 'fr', 'uk'));
