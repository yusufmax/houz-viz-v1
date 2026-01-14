-- Fix old Supabase Cloud links to new self-hosted domain in generation_history

UPDATE public.generation_history
SET image_url = REPLACE(image_url, 'https://xturujrazwolejhixgbm.supabase.co', 'https://db.houzai.uz')
WHERE image_url LIKE '%xturujrazwolejhixgbm.supabase.co%';

-- Verify the changes
SELECT count(*) as fixed_count FROM public.generation_history WHERE image_url LIKE '%db.houzai.uz%';
