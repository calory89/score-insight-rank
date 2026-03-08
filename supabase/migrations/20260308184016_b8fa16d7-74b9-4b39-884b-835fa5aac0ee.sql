
-- Watchlist table for tracking properties
CREATE TABLE public.watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  url text NOT NULL,
  initial_price text,
  initial_score integer,
  latest_price text,
  latest_score integer,
  price_delta text,
  score_delta integer,
  last_checked_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, url)
);

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist" ON public.watchlist
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist" ON public.watchlist
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watchlist" ON public.watchlist
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist" ON public.watchlist
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
