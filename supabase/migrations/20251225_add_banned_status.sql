-- Add is_banned column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Create an index for faster filtering/checks
CREATE INDEX IF NOT EXISTS idx_profiles_is_banned ON public.profiles(is_banned);
