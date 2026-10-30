
-- Portfolio properties table
CREATE TABLE public.portfolio_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  purchase_price numeric NOT NULL,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  currency text NOT NULL DEFAULT '€',
  status text NOT NULL DEFAULT 'purchased',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, analysis_id)
);

ALTER TABLE public.portfolio_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portfolio" ON public.portfolio_properties FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own portfolio" ON public.portfolio_properties FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolio" ON public.portfolio_properties FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portfolio" ON public.portfolio_properties FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_portfolio_user ON public.portfolio_properties(user_id);

-- User achievements table
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_key text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public can view achievements" ON public.user_achievements FOR SELECT USING (true);

CREATE INDEX idx_achievements_user ON public.user_achievements(user_id);

-- Update trigger for portfolio
CREATE TRIGGER update_portfolio_updated_at BEFORE UPDATE ON public.portfolio_properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
