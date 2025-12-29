-- Add is_approved, is_rejected and email columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_rejected BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing users to be approved and visible in admin
UPDATE public.profiles SET 
  is_approved = true,
  is_rejected = false,
  is_admin_visible = true 
WHERE is_approved IS FALSE OR is_admin_visible IS FALSE;

-- Create indices for faster filtering/checks
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_profiles_is_rejected ON public.profiles(is_rejected);

-- Update the handle_new_user function to include is_approved, is_rejected, email, and is_admin_visible
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, is_approved, is_rejected, is_admin_visible, generation_quota, generations_used)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    false, -- New users are NOT approved by default
    false, -- New users are NOT rejected by default
    true,  -- New users ARE visible in admin by default
    0,     -- New users start with 0 credits until approved
    0      -- Initial usage
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
