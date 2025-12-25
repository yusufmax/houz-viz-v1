-- Allow admins to view all generation history
CREATE POLICY "Admins can view all history" 
ON public.generation_history FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Also ensure admins can view all profiles (necessary for the user list and checks)
-- Drop existing SELECT policy if it exists to avoid conflicts, though we usually just add a new one or modify
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
TO authenticated
USING (true);

-- Admins can also delete history records if needed (for the delete user flow)
CREATE POLICY "Admins can delete all history" 
ON public.generation_history FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  )
);
