-- 1. Ensure metadata column exists (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'generation_history' AND column_name = 'metadata') THEN
        ALTER TABLE public.generation_history ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Enable RLS
ALTER TABLE public.generation_history ENABLE ROW LEVEL SECURITY;

-- 3. Safely recreate policies (Drop first to avoid "already exists" error)
DROP POLICY IF EXISTS "Users can view their own history" ON public.generation_history;
CREATE POLICY "Users can view their own history" ON public.generation_history
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own history" ON public.generation_history;
CREATE POLICY "Users can insert their own history" ON public.generation_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own history" ON public.generation_history;
CREATE POLICY "Users can delete their own history" ON public.generation_history
    FOR DELETE USING (auth.uid() = user_id);
