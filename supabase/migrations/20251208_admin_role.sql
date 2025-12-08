-- Add is_admin column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create an index for faster filtering/checks
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);
