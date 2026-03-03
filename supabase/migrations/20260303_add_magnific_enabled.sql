-- Add magnific_enabled flag to profiles table
ALTER TABLE profiles
ADD COLUMN magnific_enabled BOOLEAN DEFAULT false;

-- To make things easier for existing admins, we can auto-enable it for them
UPDATE profiles
SET magnific_enabled = true
WHERE is_admin = true;
