-- Enable RLS on projects table if not already enabled
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to ensure clean slate (avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON public.projects;

-- Re-create policies

-- 1. SELECT: Users can view their own projects
CREATE POLICY "Users can view their own projects" ON public.projects
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. INSERT: Users can insert their own projects
CREATE POLICY "Users can insert their own projects" ON public.projects
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE: Users can update their own projects
CREATE POLICY "Users can update their own projects" ON public.projects
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. DELETE: Users can delete their own projects
CREATE POLICY "Users can delete their own projects" ON public.projects
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
