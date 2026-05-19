-- Add 4K resolution toggle per user (disabled by default)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS fourk_enabled BOOLEAN DEFAULT false;
