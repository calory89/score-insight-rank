
-- Create analyses table for storing user property analyses
CREATE TABLE public.analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Property info
  address TEXT,
  city TEXT,
  country TEXT,
  price TEXT,
  currency TEXT DEFAULT '€',
  image_url TEXT,
  property_type TEXT,
  size_sqm NUMERIC,
  year_built INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  
  -- Scores
  global_score INTEGER,
  roi_potential INTEGER,
  market_stability INTEGER,
  demand_strength INTEGER,
  risk_level INTEGER,
  liquidity_outlook INTEGER,
  
  -- Classification
  market_classification TEXT, -- Emerging / Stable / Overpriced / Premium Zone
  verdict TEXT, -- Strong / Moderate / Risky
  market_rank INTEGER,
  market_total INTEGER,
  percentile INTEGER,
  
  -- AI Analysis (structured JSON)
  pros JSONB DEFAULT '[]'::jsonb,
  cons JSONB DEFAULT '[]'::jsonb,
  red_flags JSONB DEFAULT '[]'::jsonb,
  opportunity_signals JSONB DEFAULT '[]'::jsonb,
  
  -- Subscores explanations
  score_explanations JSONB DEFAULT '{}'::jsonb,
  
  -- AI summary
  primary_insight TEXT,
  ai_summary TEXT,
  why_not_90 JSONB DEFAULT '[]'::jsonb,
  
  -- Scenario simulation
  projected_roi_low NUMERIC,
  projected_roi_high NUMERIC,
  downside_scenario NUMERIC,
  upside_scenario NUMERIC,
  
  -- Historical data (for charts)
  price_history JSONB DEFAULT '[]'::jsonb,
  yield_trend JSONB DEFAULT '[]'::jsonb,
  
  -- Alternatives
  alternatives JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- Users can only see their own analyses
CREATE POLICY "Users can view own analyses" ON public.analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own analyses" ON public.analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own analyses" ON public.analyses
  FOR DELETE USING (auth.uid() = user_id);
