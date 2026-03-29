-- Update estimated_cost for all previous generations using gemini-3.1-flash-image-preview
-- Sets the historical cost to the newly defined fixed price of $0.19.

UPDATE public.generation_history
SET estimated_cost = 0.19
WHERE model_name = 'gemini-3.1-flash-image-preview';

-- If there are any edge cases where the model wasn't properly synced to model_name but exists in metadata:
UPDATE public.generation_history 
SET estimated_cost = 0.19 
WHERE (model_name IS NULL OR model_name = '') 
AND metadata->>'model' = 'gemini-3.1-flash-image-preview';
