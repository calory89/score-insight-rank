ALTER FUNCTION public.community_source_key(p_url text) SET search_path = public;
ALTER FUNCTION public.find_card_html(f ig_finds) SET search_path = public;
ALTER FUNCTION public.ig_finds_dup_guard() SET search_path = public;
ALTER FUNCTION public.intro_reveal_stamp() SET search_path = public;
ALTER FUNCTION public.rh_confirm_email_html(p_link text) SET search_path = public;

ALTER TABLE public.rh_stats_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read stats cache" ON public.rh_stats_cache FOR SELECT USING (true);
REVOKE INSERT, UPDATE, DELETE ON public.rh_stats_cache FROM anon, authenticated;