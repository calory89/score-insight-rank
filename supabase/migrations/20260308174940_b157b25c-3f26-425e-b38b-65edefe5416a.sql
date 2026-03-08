-- Performance indexes for key queries
CREATE INDEX IF NOT EXISTS idx_analyses_user_created ON public.analyses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_global_score ON public.analyses (global_score DESC) WHERE global_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analyses_country ON public.analyses (country);
CREATE INDEX IF NOT EXISTS idx_page_visits_created ON public.page_visits (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_visits_session ON public.page_visits (session_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_unique ON public.profiles (user_id);