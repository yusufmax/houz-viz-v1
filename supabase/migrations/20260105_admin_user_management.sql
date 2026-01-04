-- Create banned_emails table to prevent re-registration
CREATE TABLE IF NOT EXISTS public.banned_emails (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on banned_emails
ALTER TABLE public.banned_emails ENABLE ROW LEVEL SECURITY;

-- Only admins can see banned emails
CREATE POLICY "Admins can view banned emails"
ON public.banned_emails
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
);

-- Internal function to delete all data for a user
-- This is SECURITY DEFINER to allow it to delete from auth.users
CREATE OR REPLACE FUNCTION public.delete_user_complete(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Only allow admins to call this
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    ) THEN
        RAISE EXCEPTION 'Only administrators can delete users.';
    END IF;

    -- Delete from application tables
    DELETE FROM public.generation_history WHERE user_id = target_user_id;
    DELETE FROM public.user_prompts WHERE user_id = target_user_id;
    DELETE FROM public.user_reference_images WHERE user_id = target_user_id;
    DELETE FROM public.credit_requests WHERE user_id = target_user_id;
    DELETE FROM public.profiles WHERE id = target_user_id;
    
    -- Finally delete from auth.users
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Internal function to ban a user
CREATE OR REPLACE FUNCTION public.ban_user_complete(target_user_id UUID)
RETURNS VOID AS $$
DECLARE
    target_email TEXT;
BEGIN
    -- Only allow admins to call this
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    ) THEN
        RAISE EXCEPTION 'Only administrators can ban users.';
    END IF;

    -- Get email from auth.users
    SELECT email INTO target_email FROM auth.users WHERE id = target_user_id;
    
    IF target_email IS NOT NULL THEN
        -- Add to blacklist
        INSERT INTO public.banned_emails (email) VALUES (target_email)
        ON CONFLICT (email) DO NOTHING;
        
        -- Wipe all data (including the user itself)
        PERFORM public.delete_user_complete(target_user_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to check if email is banned during sign up
CREATE OR REPLACE FUNCTION public.check_banned_email()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.banned_emails
        WHERE email = NEW.email
    ) THEN
        RAISE EXCEPTION 'This email has been permanently banned from HOUZ.AI';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users (requires superuser or bypass, usually handled by Supabase)
-- In a standard migration, we might need to handle this carefully if running via client.
-- However, creating it in public schema and attaching to auth.users is the standard approach.
DROP TRIGGER IF EXISTS tr_check_banned_email ON auth.users;
CREATE TRIGGER tr_check_banned_email
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.check_banned_email();
