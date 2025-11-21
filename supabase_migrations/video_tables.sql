-- Create video_quota table
CREATE TABLE IF NOT EXISTS video_quota (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  used INTEGER DEFAULT 0,
  quota INTEGER DEFAULT 10,
  last_reset TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create video_generations table
CREATE TABLE IF NOT EXISTS video_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id TEXT NOT NULL,
  source_image TEXT NOT NULL,
  model TEXT NOT NULL,
  duration INTEGER NOT NULL,
  aspect_ratio TEXT NOT NULL,
  prompt TEXT,
  status TEXT DEFAULT 'pending',
  video_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create function to increment video usage
CREATE OR REPLACE FUNCTION increment_video_usage(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE video_quota
  SET used = used + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- If no row was updated, insert a new one
  IF NOT FOUND THEN
    INSERT INTO video_quota (user_id, used, quota)
    VALUES (p_user_id, 1, 10);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_quota_user_id ON video_quota(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_user_id ON video_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_task_id ON video_generations(task_id);
CREATE INDEX IF NOT EXISTS idx_video_generations_status ON video_generations(status);

-- Enable Row Level Security
ALTER TABLE video_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_generations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for video_quota
CREATE POLICY "Users can view their own video quota"
  ON video_quota FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own video quota"
  ON video_quota FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video quota"
  ON video_quota FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for video_generations
CREATE POLICY "Users can view their own video generations"
  ON video_generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video generations"
  ON video_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video generations"
  ON video_generations FOR UPDATE
  USING (auth.uid() = user_id);
