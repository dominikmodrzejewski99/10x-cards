-- Share links for flashcard set sharing
CREATE TABLE public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id integer NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- No UPDATE policy — share links are immutable once created
CREATE POLICY share_links_insert ON public.share_links
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY share_links_select ON public.share_links
  FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY share_links_delete ON public.share_links
  FOR DELETE USING (auth.uid() = created_by);

CREATE INDEX share_links_created_by_idx ON public.share_links(created_by);
CREATE INDEX share_links_set_id_idx ON public.share_links(set_id);

CREATE OR REPLACE FUNCTION public.accept_share_link(link_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_link share_links%ROWTYPE;
  v_original_set flashcard_sets%ROWTYPE;
  v_new_set_id integer;
  v_card_count integer;
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Fetch and validate link (bypasses RLS via SECURITY DEFINER)
  SELECT * INTO v_link FROM share_links WHERE id = link_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Share link not found';
  END IF;
  IF v_link.expires_at < now() THEN
    RAISE EXCEPTION 'Share link has expired';
  END IF;

  -- Fetch original set
  SELECT * INTO v_original_set FROM flashcard_sets WHERE id = v_link.set_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original set not found';
  END IF;

  -- Check flashcards exist
  SELECT count(*) INTO v_card_count FROM flashcards WHERE set_id = v_link.set_id;
  IF v_card_count = 0 THEN
    RAISE EXCEPTION 'Original set has no flashcards';
  END IF;

  -- Copy the set
  INSERT INTO flashcard_sets (user_id, name, description)
  VALUES (v_caller_id, '[Shared] ' || v_original_set.name, v_original_set.description)
  RETURNING id INTO v_new_set_id;

  -- Copy all flashcards
  INSERT INTO flashcards (front, back, front_image_url, back_audio_url, front_language, back_language, source, position, user_id, set_id)
  SELECT front, back, front_image_url, back_audio_url, front_language, back_language, 'manual', position, v_caller_id, v_new_set_id
  FROM flashcards
  WHERE set_id = v_link.set_id;

  RETURN v_new_set_id;
END;
$$;

-- Clean up expired share links daily at 3 AM (pg_cron may not be available locally)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-expired-share-links',
      '0 3 * * *',
      'DELETE FROM public.share_links WHERE expires_at < now()'
    );
  END IF;
END $$;
