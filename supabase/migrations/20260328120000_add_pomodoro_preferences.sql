-- Add Pomodoro timer preferences to user_preferences
-- Existing RLS policies cover new columns (row-level on user_id)
ALTER TABLE user_preferences
  ADD COLUMN pomodoro_work_duration integer NOT NULL DEFAULT 25,
  ADD COLUMN pomodoro_break_duration integer NOT NULL DEFAULT 5,
  ADD COLUMN pomodoro_long_break_duration integer NOT NULL DEFAULT 15,
  ADD COLUMN pomodoro_sessions_before_long_break integer NOT NULL DEFAULT 4,
  ADD COLUMN pomodoro_sound_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN pomodoro_notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN pomodoro_focus_reminder_dismissed boolean NOT NULL DEFAULT false;
