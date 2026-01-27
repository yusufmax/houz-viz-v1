-- Add display_name column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Index it? Maybe not strictly necessary unless searching by it, but good practice if used in UI often.
-- CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);

-- Allow users to update their own display_name (if RLS is strict)
-- Check existing policies. Usually 'Users can update own profile' covers all columns or specific ones.
-- The existing policy "Users can update own profile" usually uses `USING (auth.uid() = id)`. 
-- So simply adding the column is likely enough if the policy is generic.
