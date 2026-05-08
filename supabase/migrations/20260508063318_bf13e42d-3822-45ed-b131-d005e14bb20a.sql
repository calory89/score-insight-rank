-- ============================================
-- RealHunt v2 — Off-plan ranking platform schema
-- ============================================

-- Admin check function (reuses email pattern)
CREATE OR REPLACE FUNCTION public.is_realhunt_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND email = 'rrppspain@gmail.com'
  )
$$;

-- ============ COUNTRIES ============
CREATE TABLE public.countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  iso_code text NOT NULL,
  flag_emoji text,
  region text,
  golden_visa_eligible boolean DEFAULT false,
  active boolean DEFAULT true,
  project_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read countries" ON public.countries FOR SELECT USING (true);
CREATE POLICY "Admin manage countries" ON public.countries FOR ALL USING (public.is_realhunt_admin(auth.uid())) WITH CHECK (public.is_realhunt_admin(auth.uid()));

-- ============ DEVELOPERS ============
CREATE TABLE public.developers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  country_id uuid REFERENCES public.countries(id),
  founded_year integer,
  projects_delivered integer DEFAULT 0,
  reputation_notes text,
  website text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.developers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read developers" ON public.developers FOR SELECT USING (true);
CREATE POLICY "Admin manage developers" ON public.developers FOR ALL USING (public.is_realhunt_admin(auth.uid())) WITH CHECK (public.is_realhunt_admin(auth.uid()));

-- ============ PROJECTS ============
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  country_id uuid NOT NULL REFERENCES public.countries(id),
  developer_id uuid NOT NULL REFERENCES public.developers(id),
  city text,
  district text,
  ticket_min_eur integer,
  ticket_max_eur integer,
  unit_types text[],
  delivery_quarter text,
  construction_pct integer,
  status text,
  asset_tags text[],
  golden_visa_eligible boolean DEFAULT false,
  hero_image_url text,
  gallery_image_urls text[],
  video_url text,
  description text,
  risk_flags text[],
  is_owned_by_realhunt boolean DEFAULT false,
  conflict_disclosure text,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read projects" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Admin manage projects" ON public.projects FOR ALL USING (public.is_realhunt_admin(auth.uid())) WITH CHECK (public.is_realhunt_admin(auth.uid()));
CREATE INDEX idx_projects_country ON public.projects(country_id);
CREATE INDEX idx_projects_developer ON public.projects(developer_id);
CREATE INDEX idx_projects_active ON public.projects(active);
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PROJECT SCORES ============
CREATE TABLE public.project_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  dim_developer_reputation numeric(3,1),
  dim_delivery_certainty numeric(3,1),
  dim_legal_protection numeric(3,1),
  dim_location_fundamentals numeric(3,1),
  dim_investment_economics numeric(3,1),
  weighted_score numeric(3,1),
  rank_in_country integer,
  rank_global integer,
  notes text,
  computed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.project_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read scores" ON public.project_scores FOR SELECT USING (true);
CREATE POLICY "Admin manage scores" ON public.project_scores FOR ALL USING (public.is_realhunt_admin(auth.uid())) WITH CHECK (public.is_realhunt_admin(auth.uid()));
CREATE INDEX idx_project_scores_project ON public.project_scores(project_id);
CREATE INDEX idx_project_scores_weighted ON public.project_scores(weighted_score DESC);

-- ============ COMMISSION TERMS ============
CREATE TABLE public.commission_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  base_pct numeric(4,2),
  base_pct_top_tier numeric(4,2),
  flat_eur integer,
  bonus_text text,
  payment_milestones text,
  escrow_protected boolean DEFAULT false,
  display_string text
);
ALTER TABLE public.commission_terms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read commissions" ON public.commission_terms FOR SELECT USING (true);
CREATE POLICY "Admin manage commissions" ON public.commission_terms FOR ALL USING (public.is_realhunt_admin(auth.uid())) WITH CHECK (public.is_realhunt_admin(auth.uid()));
CREATE INDEX idx_commission_project ON public.commission_terms(project_id);

-- ============ AGENTS ============
CREATE SEQUENCE IF NOT EXISTS public.agent_number_seq START 1;
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  whatsapp text,
  primary_country_id uuid REFERENCES public.countries(id),
  active_markets text[],
  years_experience integer,
  approx_closes_per_year integer,
  verified boolean DEFAULT false,
  verified_at timestamptz,
  badge_directory_optin boolean DEFAULT false,
  agent_number integer UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents view own" ON public.agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Agents update own" ON public.agents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public read directory optin" ON public.agents FOR SELECT USING (badge_directory_optin = true AND verified = true);
CREATE POLICY "Admin view all agents" ON public.agents FOR SELECT USING (public.is_realhunt_admin(auth.uid()));
CREATE POLICY "Admin manage agents" ON public.agents FOR ALL USING (public.is_realhunt_admin(auth.uid())) WITH CHECK (public.is_realhunt_admin(auth.uid()));

-- ============ AGENT APPLICATIONS ============
CREATE TABLE public.agent_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  whatsapp text,
  primary_country text,
  active_markets text[],
  years_experience integer,
  one_closed_transaction text,
  linkedin_url text,
  status text DEFAULT 'pending',
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can apply" ON public.agent_applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin view applications" ON public.agent_applications FOR SELECT USING (public.is_realhunt_admin(auth.uid()));
CREATE POLICY "Admin update applications" ON public.agent_applications FOR UPDATE USING (public.is_realhunt_admin(auth.uid()));

-- ============ DOSSIER DOWNLOADS ============
CREATE TABLE public.dossier_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  downloaded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.dossier_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents view own downloads" ON public.dossier_downloads FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.agents WHERE agents.id = dossier_downloads.agent_id AND agents.user_id = auth.uid())
);
CREATE POLICY "Agents insert own downloads" ON public.dossier_downloads FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.agents WHERE agents.id = dossier_downloads.agent_id AND agents.user_id = auth.uid())
);
CREATE POLICY "Admin view all downloads" ON public.dossier_downloads FOR SELECT USING (public.is_realhunt_admin(auth.uid()));

-- ============ SLOT RESERVATIONS ============
CREATE TABLE public.slot_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  client_alias text,
  notes text,
  status text DEFAULT 'requested',
  reserved_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.slot_reservations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents manage own reservations" ON public.slot_reservations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.agents WHERE agents.id = slot_reservations.agent_id AND agents.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.agents WHERE agents.id = slot_reservations.agent_id AND agents.user_id = auth.uid())
);
CREATE POLICY "Admin view reservations" ON public.slot_reservations FOR SELECT USING (public.is_realhunt_admin(auth.uid()));

-- ============ PIPELINE ENTRIES ============
CREATE TABLE public.pipeline_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage text DEFAULT 'interested',
  client_alias text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pipeline_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents manage own pipeline" ON public.pipeline_entries FOR ALL USING (
  EXISTS (SELECT 1 FROM public.agents WHERE agents.id = pipeline_entries.agent_id AND agents.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.agents WHERE agents.id = pipeline_entries.agent_id AND agents.user_id = auth.uid())
);
CREATE TRIGGER update_pipeline_updated_at BEFORE UPDATE ON public.pipeline_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SAVED SEARCHES ============
CREATE TABLE public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  name text NOT NULL,
  filters jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents manage own searches" ON public.saved_searches FOR ALL USING (
  EXISTS (SELECT 1 FROM public.agents WHERE agents.id = saved_searches.agent_id AND agents.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.agents WHERE agents.id = saved_searches.agent_id AND agents.user_id = auth.uid())
);