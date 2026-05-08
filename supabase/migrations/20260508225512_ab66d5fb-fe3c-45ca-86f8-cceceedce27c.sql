
-- Agent brand settings (one row per agent)
CREATE TABLE IF NOT EXISTS public.agent_brand (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name TEXT,
  agency_name TEXT,
  phone_e164 TEXT,
  whatsapp_e164 TEXT,
  email TEXT,
  logo_url TEXT,
  accent_hex TEXT DEFAULT '#B8924A',
  slug TEXT UNIQUE,
  bio TEXT,
  website_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_brand ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agent brand readable by owner"
  ON public.agent_brand FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Agent brand readable by slug (public)"
  ON public.agent_brand FOR SELECT
  USING (slug IS NOT NULL);

CREATE POLICY "Agent inserts own brand"
  ON public.agent_brand FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Agent updates own brand"
  ON public.agent_brand FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Agent deletes own brand"
  ON public.agent_brand FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_agent_brand_updated_at
  BEFORE UPDATE ON public.agent_brand
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Short share links for WhatsApp / SMS distribution
CREATE TABLE IF NOT EXISTS public.short_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  target_url TEXT NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  analysis_id UUID,
  click_count INTEGER NOT NULL DEFAULT 0,
  last_clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Short links publicly readable"
  ON public.short_links FOR SELECT
  USING (true);

CREATE POLICY "Owners create short links"
  ON public.short_links FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Owners delete short links"
  ON public.short_links FOR DELETE
  USING (auth.uid() = owner_user_id);

CREATE INDEX IF NOT EXISTS idx_short_links_slug ON public.short_links(slug);
CREATE INDEX IF NOT EXISTS idx_short_links_owner ON public.short_links(owner_user_id);
