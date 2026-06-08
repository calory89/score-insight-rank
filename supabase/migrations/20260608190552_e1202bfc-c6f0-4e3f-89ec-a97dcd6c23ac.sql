CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  voter_fingerprint TEXT NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (analysis_id, voter_fingerprint)
);

CREATE INDEX idx_votes_analysis ON public.votes(analysis_id);
CREATE INDEX idx_votes_created_at ON public.votes(created_at DESC);

GRANT SELECT, INSERT ON public.votes TO anon;
GRANT SELECT, INSERT ON public.votes TO authenticated;
GRANT ALL ON public.votes TO service_role;

ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read votes"
  ON public.votes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can cast a vote"
  ON public.votes FOR INSERT
  WITH CHECK (true);
