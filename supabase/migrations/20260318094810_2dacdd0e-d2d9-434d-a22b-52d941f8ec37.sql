
-- Allow all authenticated users to view all profiles (needed for leaderboard & friend search)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Add email column to profiles for friend search
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
