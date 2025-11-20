-- Add quota columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS generation_quota INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS generations_used INTEGER DEFAULT 0;

-- Update the handle_new_user function to include default quota
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, generation_quota, generations_used)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    20, -- Default quota
    0   -- Initial usage
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
