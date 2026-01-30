-- Run this in your Supabase SQL Editor to fix the reference images table
ALTER TABLE user_reference_images ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_user_reference_images_is_default ON user_reference_images(is_default);

-- Update RLS policies to handle is_default
DROP POLICY IF EXISTS "Users can view own or default reference images" ON user_reference_images;
CREATE POLICY "Users can view own or default reference images"
  ON user_reference_images FOR SELECT
  USING (auth.uid() = user_id OR is_default = true);
