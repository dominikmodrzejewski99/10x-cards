-- Add UI language preference to user_preferences
ALTER TABLE user_preferences
  ADD COLUMN language varchar(5) NOT NULL DEFAULT 'pl'
  CHECK (language IN ('pl', 'en'));
