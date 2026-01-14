-- Allow authenticated users to upload files to 'generated-images' bucket
-- This resolves the "new row violates row-level security policy" error

INSERT INTO storage.buckets (id, name, public) 
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow public read access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'generated-images' );

-- Policy: Allow authenticated insert (upload) access
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'generated-images' );

-- Policy: Allow users to update/delete their own files (optional but good practice)
CREATE POLICY "User Update Own"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'generated-images' AND owner = auth.uid() );

CREATE POLICY "User Delete Own"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'generated-images' AND owner = auth.uid() );
