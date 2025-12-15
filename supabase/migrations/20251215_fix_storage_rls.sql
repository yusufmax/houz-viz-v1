-- Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- Re-create policies for generated-images

-- 1. Public Access (SELECT)
CREATE POLICY "Public Access Generated Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'generated-images' );

-- 2. Authenticated Upload (INSERT)
-- Relaxed check to ensure it works. 
-- Note: 'owner' is automatically set to auth.uid() by Supabase for authenticated inserts.
CREATE POLICY "Authenticated Upload Generated Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'generated-images' );

-- 3. Update (Update own images)
CREATE POLICY "Authenticated Update Generated Images"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'generated-images' AND (auth.uid() = owner) );

-- 4. Delete (Delete own images)
CREATE POLICY "Authenticated Delete Generated Images"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'generated-images' AND (auth.uid() = owner) );
