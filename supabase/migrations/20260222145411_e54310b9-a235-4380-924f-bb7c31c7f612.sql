
-- Create error_logs table for tracking analysis failures
CREATE TABLE public.error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID,
  user_email TEXT,
  url TEXT,
  error_type TEXT NOT NULL DEFAULT 'analysis_error',
  error_message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Only admin can view error logs
CREATE POLICY "Admin can view all error logs"
ON public.error_logs
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Edge functions (service role) can insert error logs
CREATE POLICY "Service role can insert error logs"
ON public.error_logs
FOR INSERT
WITH CHECK (true);

-- Index for quick lookups
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_error_type ON public.error_logs(error_type);
