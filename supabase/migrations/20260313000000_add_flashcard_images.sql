-- Add front_image_url column to flashcards table
ALTER TABLE flashcards ADD COLUMN front_image_url text DEFAULT NULL;

-- Create storage bucket for flashcard images (2MB max file size)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'flashcard-images',
  'flashcard-images',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for flashcard-images bucket
-- Users can read their own files (files stored in {userId}/ folder)
CREATE POLICY "Users can read own flashcard images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'flashcard-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload to their own folder
CREATE POLICY "Users can upload own flashcard images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'flashcard-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files
CREATE POLICY "Users can delete own flashcard images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'flashcard-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access for displaying images (bucket is public)
CREATE POLICY "Public read access for flashcard images"
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'flashcard-images');
