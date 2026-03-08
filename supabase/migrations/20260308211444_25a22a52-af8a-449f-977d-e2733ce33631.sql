
-- Performance indexes for key query patterns
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON public.analyses (user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_country ON public.analyses (country);
CREATE INDEX IF NOT EXISTS idx_analyses_city ON public.analyses (city);
CREATE INDEX IF NOT EXISTS idx_analyses_global_score_desc ON public.analyses (global_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at_desc ON public.analyses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_slug ON public.analyses (slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON public.page_visits (session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_created_at_desc ON public.page_visits (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_user_analysis ON public.favorites (user_id, analysis_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist (user_id);
CREATE INDEX IF NOT EXISTS idx_game_scores_user_id ON public.game_scores (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
