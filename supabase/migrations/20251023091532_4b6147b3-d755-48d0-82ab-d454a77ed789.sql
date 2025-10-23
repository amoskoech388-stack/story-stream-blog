-- Drop the restrictive policy
DROP POLICY IF EXISTS "Anyone can view published posts" ON public.posts;

-- Create a PERMISSIVE policy that allows anyone to view posts
CREATE POLICY "Anyone can view published posts"
ON public.posts
FOR SELECT
TO public
USING (true);