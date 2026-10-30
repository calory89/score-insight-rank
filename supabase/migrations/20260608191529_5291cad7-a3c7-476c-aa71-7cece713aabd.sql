
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS base_votes integer NOT NULL DEFAULT 0;

-- Seed base_votes with a believable, score-correlated distribution with natural jitter.
-- Higher scores trend higher, but with enough randomness that adjacent rows can swap.
UPDATE public.analyses
SET base_votes = GREATEST(
  5,
  CASE
    WHEN global_score IS NULL THEN floor(random() * 25)::int + 5
    WHEN global_score >= 90 THEN floor(250 + random() * 350)::int          -- 250..600
    WHEN global_score >= 82 THEN floor(120 + random() * 200)::int          -- 120..320
    WHEN global_score >= 75 THEN floor(60 + random() * 140)::int           -- 60..200
    WHEN global_score >= 65 THEN floor(30 + random() * 90)::int            -- 30..120
    WHEN global_score >= 50 THEN floor(15 + random() * 60)::int            -- 15..75
    ELSE floor(5 + random() * 30)::int                                     -- 5..35
  END
)
WHERE base_votes = 0;
