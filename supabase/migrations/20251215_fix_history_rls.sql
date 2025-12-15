-- Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Users can view their own history" ON public.generation_history;
DROP POLICY IF EXISTS "Users can insert their own history" ON public.generation_history;
DROP POLICY IF EXISTS "Users can update their own history" ON public.generation_history;
DROP POLICY IF EXISTS "Users can delete their own history" ON public.generation_history;

-- Enable RLS (just in case)
ALTER TABLE public.generation_history ENABLE ROW LEVEL SECURITY;

-- Re-create policies

-- 1. SELECT
CREATE POLICY "Users can view their own history" 
ON public.generation_history FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- 2. INSERT
CREATE POLICY "Users can insert their own history" 
ON public.generation_history FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. UPDATE
CREATE POLICY "Users can update their own history" 
ON public.generation_history FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4. DELETE
CREATE POLICY "Users can delete their own history" 
ON public.generation_history FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);
