-- agent_brand: only expose public brand rows for agents who opted into the directory and are verified
DROP POLICY IF EXISTS "Agent brand readable by slug (public)" ON public.agent_brand;
CREATE POLICY "Agent brand readable for opted-in verified agents"
ON public.agent_brand FOR SELECT
USING (
  slug IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.agents a
    WHERE a.user_id = agent_brand.user_id
      AND a.verified = true
      AND a.badge_directory_optin = true
  )
);

-- page_visits: use the role system instead of an identity-specific check
DROP POLICY IF EXISTS "Admin can read visits" ON public.page_visits;
CREATE POLICY "Admin can read visits"
ON public.page_visits FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- votes: stop exposing voter fingerprints; expose aggregated counts through a function
DROP POLICY IF EXISTS "Anyone can read votes" ON public.votes;
CREATE POLICY "Users can read their own votes"
ON public.votes FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "Admins can read votes"
ON public.votes FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.vote_counts()
RETURNS TABLE(analysis_id uuid, votes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.analysis_id, count(*)::bigint AS votes
  FROM public.votes v
  GROUP BY v.analysis_id
$$;
GRANT EXECUTE ON FUNCTION public.vote_counts() TO anon, authenticated;

-- subscriptions: read-only for users; writes only via service role (Stripe / referral functions)
DROP POLICY IF EXISTS "Service can manage subscriptions" ON public.subscriptions;

-- referrals: rows are created exclusively by the apply-referral function (service role)
DROP POLICY IF EXISTS "Users can insert referrals" ON public.referrals;

-- ticket_messages: users cannot mark their own messages as support/admin replies
DROP POLICY IF EXISTS "Users can create messages on own tickets" ON public.ticket_messages;
CREATE POLICY "Users can create messages on own tickets"
ON public.ticket_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = ticket_messages.ticket_id
      AND (t.user_id = auth.uid() OR public.is_admin(auth.uid()))
  )
  AND (ticket_messages.is_admin = false OR public.is_admin(auth.uid()))
);