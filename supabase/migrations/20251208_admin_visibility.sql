-- Add is_admin_visible column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin_visible BOOLEAN DEFAULT false;

-- Create an index for faster filtering
CREATE INDEX IF NOT EXISTS idx_profiles_admin_visible ON public.profiles(is_admin_visible);
