-- Migration to add compressed_url to generation_history
ALTER TABLE generation_history ADD COLUMN IF NOT EXISTS compressed_url TEXT;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_generation_history_compressed_url ON generation_history(compressed_url);
