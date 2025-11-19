-- Table for user custom reference images
CREATE TABLE user_reference_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX idx_user_reference_images_user_id ON user_reference_images(user_id);

-- RLS Policies
ALTER TABLE user_reference_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reference images"
  ON user_reference_images FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reference images"
  ON user_reference_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reference images"
  ON user_reference_images FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reference images"
  ON user_reference_images FOR DELETE
  USING (auth.uid() = user_id);
