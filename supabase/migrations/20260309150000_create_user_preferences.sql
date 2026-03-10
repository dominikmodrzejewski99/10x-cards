-- User preferences table (per-account settings + streak)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  theme varchar(10) NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
  onboarding_completed boolean NOT NULL DEFAULT false,
  -- Streak data
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_study_date date,
  total_sessions integer NOT NULL DEFAULT 0,
  total_cards_reviewed integer NOT NULL DEFAULT 0,
  --
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
  ON public.user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Function to get or create preferences (avoids race conditions)
CREATE OR REPLACE FUNCTION public.get_or_create_preferences(p_user_id uuid)
RETURNS public.user_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result public.user_preferences;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT * INTO result FROM public.user_preferences WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_preferences (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING * INTO result;

    IF NOT FOUND THEN
      SELECT * INTO result FROM public.user_preferences WHERE user_id = p_user_id;
    END IF;
  END IF;

  RETURN result;
END;
$$;

-- Function to record a study session and update streak
CREATE OR REPLACE FUNCTION public.record_study_session(p_user_id uuid, p_cards_reviewed integer)
RETURNS public.user_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result public.user_preferences;
  today date := current_date;
  yesterday date := current_date - 1;
  prefs public.user_preferences;
  new_streak integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Get or create preferences
  SELECT * INTO prefs FROM public.user_preferences WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.user_preferences (user_id) VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    SELECT * INTO prefs FROM public.user_preferences WHERE user_id = p_user_id;
  END IF;

  -- Calculate streak
  IF prefs.last_study_date = today THEN
    -- Already studied today, just add cards
    new_streak := prefs.current_streak;
  ELSIF prefs.last_study_date = yesterday THEN
    new_streak := prefs.current_streak + 1;
  ELSE
    new_streak := 1;
  END IF;

  UPDATE public.user_preferences
  SET
    current_streak = new_streak,
    longest_streak = GREATEST(longest_streak, new_streak),
    last_study_date = today,
    total_sessions = total_sessions + 1,
    total_cards_reviewed = total_cards_reviewed + p_cards_reviewed,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING * INTO result;

  RETURN result;
END;
$$;
