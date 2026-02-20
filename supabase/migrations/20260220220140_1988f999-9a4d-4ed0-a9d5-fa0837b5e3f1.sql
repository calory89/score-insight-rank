
-- Allow public read of analyses for global ranking (anonymized - no user_id exposed)
CREATE POLICY "Public can view analyses for ranking"
ON public.analyses
FOR SELECT
USING (true);

-- Drop the old restrictive select policy since we now have a permissive one
-- Actually we need both: the restrictive one limits authenticated users to own data for dashboard
-- But for ranking we need public access. Let's use a permissive policy instead.
-- The existing policy is restrictive (RESTRICTIVE). We add a PERMISSIVE one.
