-- 1. Backfill historical generations using model information from metadata
UPDATE public.generation_history
SET 
    model_name = COALESCE(metadata->>'model', 'gemini-3-pro-image-preview'),
    estimated_cost = CASE 
        WHEN metadata->>'model' IN ('gemini-2.5-flash-image', 'gemini-2.5-flash') THEN 0.0401
        WHEN metadata->>'model' = 'gemini-3-pro-image-preview' AND metadata->>'resolution' = '4K' THEN 0.2411
        WHEN metadata->>'model' = 'gemini-3-pro-image-preview' THEN 0.1351
        ELSE 0.2411 
    END
WHERE (model_name IS NULL OR estimated_cost = 0);

-- 2. Restructure metadata: Remove bloated base64 images and redundant data
-- This removes 'sourceImage' and 'styleReferenceImage' ONLY if they contain base64 data
-- It also removes the redundant 'prompt' from metadata since it's already a top-level column.
UPDATE public.generation_history
SET metadata = (
    CASE 
        WHEN metadata->>'sourceImage' LIKE 'data:image%' THEN metadata - 'sourceImage'
        ELSE metadata
    END
) - 'prompt' - 'url';

UPDATE public.generation_history
SET metadata = (
    CASE 
        WHEN metadata->>'styleReferenceImage' LIKE 'data:image%' THEN metadata - 'styleReferenceImage'
        ELSE metadata
    END
)
WHERE metadata ? 'styleReferenceImage';

-- Optional: If you want to see the total estimated cost after running this:
-- SELECT SUM(estimated_cost) as total_historical_cost FROM public.generation_history;
