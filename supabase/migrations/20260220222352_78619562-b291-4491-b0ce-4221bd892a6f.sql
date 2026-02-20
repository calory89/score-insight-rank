
-- Add confidence_level and data_source to analyses table
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS confidence_level text DEFAULT 'high';
ALTER TABLE public.analyses ADD COLUMN IF NOT EXISTS data_source text DEFAULT 'scraped';
