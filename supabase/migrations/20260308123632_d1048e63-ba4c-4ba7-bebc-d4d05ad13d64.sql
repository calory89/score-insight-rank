CREATE TABLE public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone text,
  company text,
  estimated_searches text,
  message text,
  source text NOT NULL DEFAULT 'enterprise',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contact request" ON public.contact_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can view contact requests" ON public.contact_requests
  FOR SELECT USING (is_admin(auth.uid()));