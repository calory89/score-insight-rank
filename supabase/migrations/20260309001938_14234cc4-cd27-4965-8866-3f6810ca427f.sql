-- Feature flags table for dynamic feature control
CREATE TABLE public.feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin can manage feature flags"
  ON public.feature_flags FOR ALL
  USING (is_admin(auth.uid()));

-- Anyone can read feature flags (for client-side checks)
CREATE POLICY "Anyone can read feature flags"
  ON public.feature_flags FOR SELECT
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add index on error_logs.error_type for system health queries
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON public.error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs(created_at DESC);

-- Insert default feature flags
INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('onboarding_tour', true, 'Show onboarding tour for new users'),
  ('referral_bonus', true, 'Enable referral bonus system'),
  ('ai_suggestions', true, 'Enable AI-powered property suggestions'),
  ('price_alerts', false, 'Enable price drop notifications'),
  ('weekly_digest', false, 'Send weekly portfolio digest emails')
ON CONFLICT (key) DO NOTHING;