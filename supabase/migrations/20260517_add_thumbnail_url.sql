-- Add thumbnail_url column to generation_history for fast preview loading
ALTER TABLE generation_history ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;
