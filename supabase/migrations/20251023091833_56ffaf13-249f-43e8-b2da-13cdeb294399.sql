-- Fix tags table - allow anonymous users to view tags
DROP POLICY IF EXISTS "Anyone can view tags" ON public.tags;
CREATE POLICY "Anyone can view tags"
ON public.tags
FOR SELECT
TO anon, authenticated
USING (true);

-- Fix profiles table - allow anonymous users to view profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- Fix post_tags table - allow anonymous users to view post tags
DROP POLICY IF EXISTS "Anyone can view post tags" ON public.post_tags;
CREATE POLICY "Anyone can view post tags"
ON public.post_tags
FOR SELECT
TO anon, authenticated
USING (true);