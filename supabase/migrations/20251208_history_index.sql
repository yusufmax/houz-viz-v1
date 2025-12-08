-- Add index for user_id and created_at to speed up history fetches
CREATE INDEX IF NOT EXISTS idx_generation_history_user_created 
ON public.generation_history (user_id, created_at DESC);
