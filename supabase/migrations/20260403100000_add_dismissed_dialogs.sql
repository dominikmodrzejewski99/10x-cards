-- Add dismissed_dialogs column to user_preferences
-- Stores an array of dialog keys that the user has chosen to suppress
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS dismissed_dialogs text[] NOT NULL DEFAULT '{}';
