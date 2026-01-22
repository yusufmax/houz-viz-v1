-- 🚨 NUCLEAR RESET SCRIPT 🚨
-- This script will:
-- 1. Find AND DROP ALL existing policies on 'storage.objects' to clean up the "9+" mess.
-- 2. Re-create a single, simple "Allow All" policy.

DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Loop through all policies on storage.objects
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    LOOP
        -- Execute DROP for each found policy
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Now that it's clean (0 policies), we add the ONE policy we need.

-- 1. Ensure Bucket Exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('generated-images', 'generated-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create ONE "Universal Access" Policy
-- Allows SELECT, INSERT, UPDATE, DELETE for EVERYONE (Anon + Authenticated)
CREATE POLICY "Universal Access"
ON storage.objects
FOR ALL
TO public
USING ( bucket_id = 'generated-images' )
WITH CHECK ( bucket_id = 'generated-images' );

-- Done. Universal Access applied.
