-- Create a new public bucket for generated images
INSERT INTO storage.buckets (id, name, public)
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public viewing
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'generated-images' );

-- Policy to allow authenticated users to upload
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'generated-images' );

-- Policy to allow users to update their own images (optional, but good for management)
CREATE POLICY "Users can update own images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'generated-images' AND auth.uid() = owner )
WITH CHECK ( bucket_id = 'generated-images' AND auth.uid() = owner );

-- Policy to allow users to delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'generated-images' AND auth.uid() = owner );
