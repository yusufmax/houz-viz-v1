-- Create credit_requests table
CREATE TABLE IF NOT EXISTS public.credit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.credit_requests ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Users can view their own requests
CREATE POLICY "Users can view their own credit requests" 
ON public.credit_requests FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- 2. Users can insert their own requests
CREATE POLICY "Users can insert their own credit requests" 
ON public.credit_requests FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3. Admins can view all requests
CREATE POLICY "Admins can view all credit requests" 
ON public.credit_requests FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- 4. Admins can update any request status
CREATE POLICY "Admins can update all credit requests" 
ON public.credit_requests FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_credit_requests_user_id ON public.credit_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_requests_status ON public.credit_requests(status);
