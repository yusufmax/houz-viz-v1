-- Add user_display_name column to generation_history table
ALTER TABLE generation_history 
ADD COLUMN user_display_name TEXT;

-- Optional: Create an index if you plan to search/filter by this
CREATE INDEX idx_generation_history_user_display_name ON generation_history(user_display_name);
