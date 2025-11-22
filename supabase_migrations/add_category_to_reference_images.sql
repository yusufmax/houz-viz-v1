-- Add category column to user_reference_images table
ALTER TABLE user_reference_images 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_user_reference_images_category ON user_reference_images(category);
