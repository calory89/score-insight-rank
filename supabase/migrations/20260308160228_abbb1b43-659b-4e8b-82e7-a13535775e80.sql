
CREATE INDEX IF NOT EXISTS idx_analyses_global_score ON public.analyses (global_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_analyses_user_id_created_at ON public.analyses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_city ON public.analyses (city);
CREATE INDEX IF NOT EXISTS idx_analyses_country ON public.analyses (country);
CREATE INDEX IF NOT EXISTS idx_game_scores_played_at ON public.game_scores (played_at DESC);
