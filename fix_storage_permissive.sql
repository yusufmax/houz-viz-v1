-- "Nuclear Option": Allow ANYONE (including guests) to upload to 'generated-images'
-- Use this if the "Authenticated" policy isn't working (e.g., if the user session isn't detected)

-- 1. Ensure Bucket Exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow Public Uploads (INSERT)
-- We drop the old "Authenticated" policy to avoid conflicts or confusion, 
-- though strict RLS usually requires at least one passing policy.
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Public Upload" ON storage.objects;

CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
TO public
WITH CHECK ( bucket_id = 'generated-images' );

-- 3. Allow Public Viewing (SELECT)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'generated-images' );

-- 4. Allow Public Updates (for overwriting own files if needed, simplified)
DROP POLICY IF EXISTS "Public Update" ON storage.objects;
CREATE POLICY "Public Update"
ON storage.objects FOR UPDATE
TO public
USING ( bucket_id = 'generated-images' );
