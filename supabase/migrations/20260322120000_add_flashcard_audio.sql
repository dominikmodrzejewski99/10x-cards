-- Add back_audio_url column to flashcards table
ALTER TABLE flashcards ADD COLUMN back_audio_url text DEFAULT NULL;

-- Create storage bucket for flashcard audio (2MB max, audio MIME types)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'flashcard-audio',
  'flashcard-audio',
  true,
  2097152,
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: authenticated users can read own audio
CREATE POLICY "Users can read own flashcard audio"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'flashcard-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: authenticated users can upload to own folder
CREATE POLICY "Users can upload own flashcard audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'flashcard-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: authenticated users can update own audio
CREATE POLICY "Users can update own flashcard audio"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'flashcard-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: authenticated users can delete own audio
CREATE POLICY "Users can delete own flashcard audio"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'flashcard-audio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: public read access (bucket is public)
CREATE POLICY "Public read access for flashcard audio"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'flashcard-audio');
