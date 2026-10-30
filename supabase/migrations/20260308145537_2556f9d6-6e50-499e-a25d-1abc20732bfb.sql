
CREATE TABLE public.game_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  score integer NOT NULL,
  total_rounds integer NOT NULL DEFAULT 10,
  played_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.game_scores ENABLE ROW LEVEL SECURITY;

-- Anyone can view leaderboard
CREATE POLICY "Anyone can view game scores"
  ON public.game_scores FOR SELECT
  USING (true);

-- Logged-in users can insert own scores
CREATE POLICY "Users can insert own game scores"
  ON public.game_scores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
