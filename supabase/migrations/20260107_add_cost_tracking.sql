-- Migration to add model and cost tracking to generation history
ALTER TABLE public.generation_history ADD COLUMN IF NOT EXISTS model_name text;
ALTER TABLE public.generation_history ADD COLUMN IF NOT EXISTS estimated_cost numeric(10, 5) DEFAULT 0;

-- Comment on columns for clarity
COMMENT ON COLUMN public.generation_history.model_name IS 'The Gemini model used for generation';
COMMENT ON COLUMN public.generation_history.estimated_cost IS 'Estimated cost in USD based on Gemini API pricing';
