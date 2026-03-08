
-- Leads table for the AI Customer Acquisition Engine
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text,
  contact_name text,
  contact_email text,
  contact_phone text,
  website text,
  linkedin_url text,
  twitter_url text,
  industry text,
  company_size text,
  location text,
  source text DEFAULT 'manual',
  source_url text,
  lead_score integer DEFAULT 0,
  status text DEFAULT 'new',
  ai_summary text,
  ai_pain_points jsonb DEFAULT '[]'::jsonb,
  ai_recommended_approach text,
  ai_ideal_message text,
  tags jsonb DEFAULT '[]'::jsonb,
  notes text,
  last_contacted_at timestamptz,
  next_followup_at timestamptz,
  conversation_history jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_leads_user_id ON public.leads (user_id);
CREATE INDEX idx_leads_lead_score ON public.leads (lead_score DESC);
CREATE INDEX idx_leads_status ON public.leads (status);
CREATE INDEX idx_leads_industry ON public.leads (industry);
CREATE INDEX idx_leads_created_at ON public.leads (created_at DESC);

-- Updated_at trigger
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Admin can see all leads
CREATE POLICY "Admin can view all leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

-- Users can manage own leads
CREATE POLICY "Users can view own leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for leads
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
