
-- Create page_visits table for tracking analytics
CREATE TABLE public.page_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID,
  path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  ip_country TEXT,
  ip_country_code TEXT,
  page_load_time_ms INTEGER,
  time_on_page_ms INTEGER,
  is_bounce BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (anonymous tracking)
CREATE POLICY "Anyone can insert visits" ON public.page_visits FOR INSERT WITH CHECK (true);

-- Only admin can read visits
CREATE POLICY "Admin can read visits" ON public.page_visits FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND email = 'rrppspain@gmail.com')
);

-- Allow updates for time_on_page tracking
CREATE POLICY "Anyone can update own session visits" ON public.page_visits FOR UPDATE USING (true);

-- Create index for fast queries
CREATE INDEX idx_page_visits_created_at ON public.page_visits (created_at DESC);
CREATE INDEX idx_page_visits_session ON public.page_visits (session_id);
CREATE INDEX idx_page_visits_path ON public.page_visits (path);
