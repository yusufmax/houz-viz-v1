-- Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admins to UPDATE any profile
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE
TO authenticated
USING (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
)
WITH CHECK (
  (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true
);

-- Ensure normal users can still update their OWN profile
-- (This might already exist, but good to ensure covers the bases or doesn't conflict)
-- If a policy "Users can update own profile" exists, this new admin policy adds to it (OR condition).
