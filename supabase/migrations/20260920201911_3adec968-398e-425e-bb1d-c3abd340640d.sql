-- ============ WEEKS ============
CREATE TABLE public.community_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  starts_at timestamptz NOT NULL UNIQUE,
  ends_at timestamptz NOT NULL,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_weeks TO anon, authenticated;
GRANT ALL ON public.community_weeks TO service_role;
ALTER TABLE public.community_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Weeks are public" ON public.community_weeks FOR SELECT USING (true);

-- Inaugural edition. Boundary is Sep 21 00:00 UTC inclusive to Sep 28 00:00 UTC exclusive,
-- but launch-day (Sun Sep 20 UTC) activity is explicitly folded into this first edition.
INSERT INTO public.community_weeks (label, starts_at, ends_at)
VALUES ('Sep 21-28, 2026', '2026-09-20 00:00:00+00', '2026-09-28 00:00:00+00');

-- ============ DEALS ============
CREATE TABLE public.community_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  source_url text NOT NULL,
  source_key text NOT NULL,
  source_domain text,
  image_urls text[] NOT NULL DEFAULT '{}',
  video_url text,
  price_eur integer,
  currency text NOT NULL DEFAULT 'EUR',
  country text,
  location_name text,
  sqm integer,
  bedrooms integer,
  category text NOT NULL DEFAULT 'other',
  why_great text,
  find_id uuid REFERENCES public.ig_finds(id) ON DELETE SET NULL,
  submitted_by uuid,
  hunter_handle text,
  status text NOT NULL DEFAULT 'pending',
  reject_reason text,
  is_editorial_pick boolean NOT NULL DEFAULT false,
  pick_note text,
  approved_at timestamptz,
  week_id uuid REFERENCES public.community_weeks(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_deals_status_chk CHECK (status IN ('pending','approved','rejected')),
  CONSTRAINT community_deals_category_chk CHECK (category IN ('beach','village','city','land','renovation','new_build','other'))
);
CREATE UNIQUE INDEX community_deals_source_key_idx ON public.community_deals (source_key);
CREATE INDEX community_deals_status_idx ON public.community_deals (status, approved_at DESC);
CREATE INDEX community_deals_week_idx ON public.community_deals (week_id);
CREATE INDEX community_deals_owner_idx ON public.community_deals (submitted_by);

GRANT SELECT, INSERT, UPDATE ON public.community_deals TO authenticated;
GRANT SELECT ON public.community_deals TO anon;
GRANT ALL ON public.community_deals TO service_role;
ALTER TABLE public.community_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved deals are public" ON public.community_deals
  FOR SELECT USING (status = 'approved');
CREATE POLICY "Hunters see their own submissions" ON public.community_deals
  FOR SELECT TO authenticated USING (submitted_by = auth.uid());
CREATE POLICY "Admins see every submission" ON public.community_deals
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Hunters submit their own deals" ON public.community_deals
  FOR INSERT TO authenticated WITH CHECK (submitted_by = auth.uid() AND status = 'pending' AND is_editorial_pick = false);
CREATE POLICY "Hunters edit their own pending deals" ON public.community_deals
  FOR UPDATE TO authenticated USING (submitted_by = auth.uid() AND status = 'pending')
  WITH CHECK (submitted_by = auth.uid() AND status = 'pending' AND is_editorial_pick = false);

-- Server-controlled fields can never be set from the browser.
CREATE OR REPLACE FUNCTION public.community_deal_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admin boolean := false;
BEGIN
  IF auth.uid() IS NOT NULL THEN admin := public.is_admin(auth.uid()); END IF;
  NEW.source_key := regexp_replace(lower(regexp_replace(NEW.source_url, '^https?://(www\.)?', '')), '[/?#].*$', '');
  NEW.source_key := regexp_replace(lower(NEW.source_url), '^https?://(www\.)?', '');
  NEW.source_key := rtrim(split_part(NEW.source_key, '#', 1), '/');
  NEW.source_domain := split_part(NEW.source_key, '/', 1);
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    IF NOT admin THEN
      NEW.status := 'pending'; NEW.is_editorial_pick := false; NEW.approved_at := NULL;
      NEW.week_id := NULL; NEW.pick_note := NULL; NEW.reject_reason := NULL;
    END IF;
  ELSE
    IF NOT admin AND current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
      NEW.status := OLD.status; NEW.is_editorial_pick := OLD.is_editorial_pick;
      NEW.approved_at := OLD.approved_at; NEW.week_id := OLD.week_id;
      NEW.pick_note := OLD.pick_note; NEW.reject_reason := OLD.reject_reason;
      NEW.submitted_by := OLD.submitted_by; NEW.slug := OLD.slug;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER community_deal_guard_trg BEFORE INSERT OR UPDATE ON public.community_deals
  FOR EACH ROW EXECUTE FUNCTION public.community_deal_guard();

-- ============ VOTES (server-write only) ============
CREATE TABLE public.community_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.community_deals(id) ON DELETE CASCADE,
  week_id uuid REFERENCES public.community_weeks(id),
  voter_key text NOT NULL,
  user_id uuid,
  value smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_votes_value_chk CHECK (value IN (-1, 1))
);
CREATE UNIQUE INDEX community_votes_one_per_visitor ON public.community_votes (deal_id, voter_key);
CREATE UNIQUE INDEX community_votes_one_per_user ON public.community_votes (deal_id, user_id) WHERE user_id IS NOT NULL;
CREATE INDEX community_votes_week_idx ON public.community_votes (week_id, deal_id);
CREATE INDEX community_votes_rate_idx ON public.community_votes (voter_key, created_at DESC);
GRANT ALL ON public.community_votes TO service_role;
ALTER TABLE public.community_votes ENABLE ROW LEVEL SECURITY;
-- No policies: browsers can never read or write raw votes. All access is through
-- SECURITY DEFINER functions and the edge function that owns rate limiting.

-- ============ SAVES / COMMENTS / REPORTS / VIEWS ============
CREATE TABLE public.community_saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.community_deals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_saves TO authenticated;
GRANT ALL ON public.community_saves TO service_role;
ALTER TABLE public.community_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own saves" ON public.community_saves FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Save for yourself" ON public.community_saves FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Remove your save" ON public.community_saves FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.community_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.community_deals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_comments_body_chk CHECK (char_length(btrim(body)) BETWEEN 2 AND 1200),
  CONSTRAINT community_comments_status_chk CHECK (status IN ('published','hidden'))
);
CREATE INDEX community_comments_deal_idx ON public.community_comments (deal_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.community_comments TO authenticated;
GRANT SELECT ON public.community_comments TO anon;
GRANT ALL ON public.community_comments TO service_role;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published comments are public" ON public.community_comments FOR SELECT USING (status = 'published');
CREATE POLICY "Authors see their own comments" ON public.community_comments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Comment as yourself" ON public.community_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'published');
CREATE POLICY "Authors edit their own comments" ON public.community_comments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND status = 'published');
CREATE POLICY "Admins moderate comments" ON public.community_comments FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid REFERENCES public.community_deals(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.community_comments(id) ON DELETE CASCADE,
  reporter_id uuid,
  reason text NOT NULL,
  detail text,
  status text NOT NULL DEFAULT 'open',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_reports_status_chk CHECK (status IN ('open','actioned','dismissed')),
  CONSTRAINT community_reports_reason_chk CHECK (char_length(btrim(reason)) BETWEEN 2 AND 80)
);
GRANT SELECT, INSERT, UPDATE ON public.community_reports TO authenticated;
GRANT ALL ON public.community_reports TO service_role;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Report as yourself" ON public.community_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid() AND status = 'open');
CREATE POLICY "See your own reports" ON public.community_reports FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY "Admins read reports" ON public.community_reports FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins resolve reports" ON public.community_reports FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.community_views (
  deal_id uuid NOT NULL REFERENCES public.community_deals(id) ON DELETE CASCADE,
  voter_key text NOT NULL,
  viewed_on date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  PRIMARY KEY (deal_id, voter_key, viewed_on)
);
GRANT ALL ON public.community_views TO service_role;
ALTER TABLE public.community_views ENABLE ROW LEVEL SECURITY;

-- ============ WINNER ARCHIVE ============
CREATE TABLE public.community_week_winners (
  week_id uuid NOT NULL REFERENCES public.community_weeks(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL REFERENCES public.community_deals(id) ON DELETE CASCADE,
  rank integer NOT NULL,
  up_votes integer NOT NULL,
  down_votes integer NOT NULL,
  net_score integer NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (week_id, deal_id)
);
CREATE INDEX community_week_winners_rank_idx ON public.community_week_winners (week_id, rank);
GRANT SELECT ON public.community_week_winners TO anon, authenticated;
GRANT ALL ON public.community_week_winners TO service_role;
ALTER TABLE public.community_week_winners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Winners are public" ON public.community_week_winners FOR SELECT USING (true);

-- ============ ANONYMOUS IDENTITY SECRET ============
INSERT INTO public.app_secrets (key, value)
VALUES ('community_vote_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- ============ WEEK HELPERS ============
CREATE OR REPLACE FUNCTION public.community_current_week()
RETURNS public.community_weeks LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.community_weeks; nxt public.community_weeks;
BEGIN
  SELECT * INTO w FROM public.community_weeks WHERE starts_at <= now() AND ends_at > now() ORDER BY starts_at DESC LIMIT 1;
  IF FOUND THEN RETURN w; END IF;
  -- Roll forward deterministic 7-day editions from the last known one.
  SELECT * INTO w FROM public.community_weeks ORDER BY ends_at DESC LIMIT 1;
  WHILE w.ends_at <= now() LOOP
    INSERT INTO public.community_weeks (label, starts_at, ends_at)
    VALUES (
      to_char(w.ends_at, 'Mon DD') || '-' || to_char(w.ends_at + interval '7 days', 'DD, YYYY'),
      w.ends_at, w.ends_at + interval '7 days'
    )
    ON CONFLICT (starts_at) DO NOTHING;
    SELECT * INTO nxt FROM public.community_weeks WHERE starts_at = w.ends_at;
    w := nxt;
  END LOOP;
  RETURN w;
END $$;
GRANT EXECUTE ON FUNCTION public.community_current_week() TO anon, authenticated, service_role;

-- Archive a finished edition. Stable forever: later vote changes cannot rewrite it.
CREATE OR REPLACE FUNCTION public.community_close_week(p_week uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.community_weeks; n integer;
BEGIN
  SELECT * INTO w FROM public.community_weeks WHERE id = p_week;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'unknown week'); END IF;
  IF w.ends_at > now() THEN RETURN jsonb_build_object('ok', false, 'error', 'week still open'); END IF;
  IF w.closed_at IS NOT NULL THEN RETURN jsonb_build_object('ok', true, 'already_closed', true); END IF;

  INSERT INTO public.community_week_winners (week_id, deal_id, rank, up_votes, down_votes, net_score)
  SELECT w.id, t.deal_id, row_number() OVER (
           ORDER BY (t.up - t.down) DESC, t.up DESC, t.first_vote ASC, t.deal_id ASC
         ), t.up, t.down, t.up - t.down
  FROM (
    SELECT v.deal_id,
           count(*) FILTER (WHERE v.value = 1)::int  AS up,
           count(*) FILTER (WHERE v.value = -1)::int AS down,
           min(v.created_at) AS first_vote
    FROM public.community_votes v
    WHERE v.week_id = w.id
    GROUP BY v.deal_id
  ) t
  ON CONFLICT (week_id, deal_id) DO NOTHING;

  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE public.community_weeks SET closed_at = now() WHERE id = w.id;
  RETURN jsonb_build_object('ok', true, 'archived', n);
END $$;
REVOKE ALL ON FUNCTION public.community_close_week(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.community_close_week(uuid) TO service_role;

-- ============ READ MODEL ============
-- Honest aggregates: weekly net score, lifetime totals, the viewer's own vote.
CREATE OR REPLACE FUNCTION public.community_rankings(
  p_scope text DEFAULT 'week',
  p_country text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_voter text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.community_weeks; rows jsonb; total integer;
BEGIN
  SELECT * INTO w FROM public.community_weeks WHERE starts_at <= now() AND ends_at > now() ORDER BY starts_at DESC LIMIT 1;
  p_limit := least(greatest(coalesce(p_limit, 50), 1), 100);
  p_offset := greatest(coalesce(p_offset, 0), 0);

  WITH base AS (
    SELECT d.* FROM public.community_deals d
    WHERE d.status = 'approved'
      AND (p_country IS NULL OR d.country = p_country)
      AND (p_category IS NULL OR d.category = p_category)
  ), agg AS (
    SELECT b.id,
      coalesce(sum(CASE WHEN v.value = 1 AND v.week_id = w.id THEN 1 ELSE 0 END), 0)::int AS week_up,
      coalesce(sum(CASE WHEN v.value = -1 AND v.week_id = w.id THEN 1 ELSE 0 END), 0)::int AS week_down,
      coalesce(sum(CASE WHEN v.value = 1 THEN 1 ELSE 0 END), 0)::int AS life_up,
      coalesce(sum(CASE WHEN v.value = -1 THEN 1 ELSE 0 END), 0)::int AS life_down,
      min(v.created_at) FILTER (WHERE v.week_id = w.id) AS first_week_vote,
      count(*) FILTER (WHERE v.created_at > now() - interval '24 hours')::int AS votes_24h,
      max(CASE WHEN p_voter IS NOT NULL AND v.voter_key = p_voter THEN v.value END)::int AS my_vote
    FROM base b LEFT JOIN public.community_votes v ON v.deal_id = b.id
    GROUP BY b.id
  ), joined AS (
    SELECT b.*, a.week_up, a.week_down, a.life_up, a.life_down, a.votes_24h, a.my_vote,
           (a.week_up - a.week_down) AS week_net, (a.life_up - a.life_down) AS life_net,
           coalesce(a.first_week_vote, b.approved_at, b.created_at) AS tiebreak,
           (SELECT count(*) FROM public.community_views cv WHERE cv.deal_id = b.id)::int AS views,
           (SELECT count(*) FROM public.community_comments c WHERE c.deal_id = b.id AND c.status = 'published')::int AS comments
    FROM base b JOIN agg a ON a.id = b.id
  ), ranked AS (
    SELECT j.*, row_number() OVER (
      ORDER BY CASE WHEN p_scope = 'all' THEN j.life_net ELSE j.week_net END DESC,
               CASE WHEN p_scope = 'all' THEN j.life_up ELSE j.week_up END DESC,
               j.tiebreak ASC, j.id ASC
    ) AS rank FROM joined j
  )
  SELECT count(*) INTO total FROM ranked;

  WITH base AS (
    SELECT d.* FROM public.community_deals d
    WHERE d.status = 'approved'
      AND (p_country IS NULL OR d.country = p_country)
      AND (p_category IS NULL OR d.category = p_category)
  ), agg AS (
    SELECT b.id,
      coalesce(sum(CASE WHEN v.value = 1 AND v.week_id = w.id THEN 1 ELSE 0 END), 0)::int AS week_up,
      coalesce(sum(CASE WHEN v.value = -1 AND v.week_id = w.id THEN 1 ELSE 0 END), 0)::int AS week_down,
      coalesce(sum(CASE WHEN v.value = 1 THEN 1 ELSE 0 END), 0)::int AS life_up,
      coalesce(sum(CASE WHEN v.value = -1 THEN 1 ELSE 0 END), 0)::int AS life_down,
      min(v.created_at) FILTER (WHERE v.week_id = w.id) AS first_week_vote,
      count(*) FILTER (WHERE v.created_at > now() - interval '24 hours')::int AS votes_24h,
      max(CASE WHEN p_voter IS NOT NULL AND v.voter_key = p_voter THEN v.value END)::int AS my_vote
    FROM base b LEFT JOIN public.community_votes v ON v.deal_id = b.id
    GROUP BY b.id
  ), joined AS (
    SELECT b.*, a.week_up, a.week_down, a.life_up, a.life_down, a.votes_24h, a.my_vote,
           (a.week_up - a.week_down) AS week_net, (a.life_up - a.life_down) AS life_net,
           coalesce(a.first_week_vote, b.approved_at, b.created_at) AS tiebreak,
           (SELECT count(*) FROM public.community_views cv WHERE cv.deal_id = b.id)::int AS views,
           (SELECT count(*) FROM public.community_comments c WHERE c.deal_id = b.id AND c.status = 'published')::int AS comments
    FROM base b JOIN agg a ON a.id = b.id
  ), ranked AS (
    SELECT j.*, row_number() OVER (
      ORDER BY CASE WHEN p_scope = 'all' THEN j.life_net ELSE j.week_net END DESC,
               CASE WHEN p_scope = 'all' THEN j.life_up ELSE j.week_up END DESC,
               j.tiebreak ASC, j.id ASC
    ) AS rank FROM joined j
  )
  SELECT coalesce(jsonb_agg(to_jsonb(r) - 'source_key' - 'submitted_by' ORDER BY r.rank), '[]'::jsonb)
  INTO rows FROM (SELECT * FROM ranked ORDER BY rank LIMIT p_limit OFFSET p_offset) r;

  RETURN jsonb_build_object(
    'week', to_jsonb(w), 'scope', p_scope, 'total', coalesce(total, 0), 'rows', rows
  );
END $$;
GRANT EXECUTE ON FUNCTION public.community_rankings(text, text, text, text, integer, integer) TO anon, authenticated, service_role;

-- Single deal for the detail page, same honest aggregates.
CREATE OR REPLACE FUNCTION public.community_deal(p_slug text, p_voter text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.community_weeks; out jsonb;
BEGIN
  SELECT * INTO w FROM public.community_weeks WHERE starts_at <= now() AND ends_at > now() ORDER BY starts_at DESC LIMIT 1;
  SELECT to_jsonb(d) - 'source_key' - 'submitted_by' || jsonb_build_object(
    'week_up',   (SELECT count(*) FROM public.community_votes v WHERE v.deal_id = d.id AND v.value = 1  AND v.week_id = w.id),
    'week_down', (SELECT count(*) FROM public.community_votes v WHERE v.deal_id = d.id AND v.value = -1 AND v.week_id = w.id),
    'life_up',   (SELECT count(*) FROM public.community_votes v WHERE v.deal_id = d.id AND v.value = 1),
    'life_down', (SELECT count(*) FROM public.community_votes v WHERE v.deal_id = d.id AND v.value = -1),
    'views',     (SELECT count(*) FROM public.community_views cv WHERE cv.deal_id = d.id),
    'my_vote',   (SELECT v.value FROM public.community_votes v WHERE v.deal_id = d.id AND p_voter IS NOT NULL AND v.voter_key = p_voter)
  ) INTO out
  FROM public.community_deals d WHERE d.slug = p_slug AND d.status = 'approved';
  RETURN out;
END $$;
GRANT EXECUTE ON FUNCTION public.community_deal(text, text) TO anon, authenticated, service_role;

-- Public hunter profile: approved submissions plus honest totals.
CREATE OR REPLACE FUNCTION public.community_hunter(p_handle text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE out jsonb;
BEGIN
  SELECT jsonb_build_object(
    'handle', p_handle,
    'approved', count(*),
    'net_votes', coalesce(sum((SELECT coalesce(sum(v.value), 0) FROM public.community_votes v WHERE v.deal_id = d.id)), 0),
    'deals', coalesce(jsonb_agg(jsonb_build_object(
        'slug', d.slug, 'title', d.title, 'image_urls', d.image_urls, 'price_eur', d.price_eur,
        'country', d.country, 'location_name', d.location_name,
        'net', (SELECT coalesce(sum(v.value), 0) FROM public.community_votes v WHERE v.deal_id = d.id)
      ) ORDER BY d.approved_at DESC NULLS LAST), '[]'::jsonb)
  ) INTO out
  FROM public.community_deals d
  WHERE d.status = 'approved' AND d.hunter_handle = p_handle;
  RETURN out;
END $$;
GRANT EXECUTE ON FUNCTION public.community_hunter(text) TO anon, authenticated, service_role;

-- ============ WRITE PATH (service role only) ============
-- Atomic: one row per (deal, visitor). A direction change updates in place, a repeat is a no-op.
CREATE OR REPLACE FUNCTION public.community_cast_vote(
  p_deal uuid, p_voter text, p_user uuid, p_value smallint
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.community_weeks; removed boolean := false;
BEGIN
  IF p_value NOT IN (-1, 0, 1) THEN RAISE EXCEPTION 'bad value'; END IF;
  PERFORM 1 FROM public.community_deals WHERE id = p_deal AND status = 'approved';
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'unknown deal'); END IF;
  w := public.community_current_week();

  IF p_value = 0 THEN
    DELETE FROM public.community_votes WHERE deal_id = p_deal AND voter_key = p_voter;
    removed := true;
  ELSE
    INSERT INTO public.community_votes (deal_id, week_id, voter_key, user_id, value)
    VALUES (p_deal, w.id, p_voter, p_user, p_value)
    ON CONFLICT (deal_id, voter_key) DO UPDATE
      SET value = EXCLUDED.value, user_id = coalesce(EXCLUDED.user_id, public.community_votes.user_id), updated_at = now()
      WHERE public.community_votes.value IS DISTINCT FROM EXCLUDED.value;
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'cleared', removed,
    'my_vote', (SELECT v.value FROM public.community_votes v WHERE v.deal_id = p_deal AND v.voter_key = p_voter),
    'week_up',   (SELECT count(*) FROM public.community_votes v WHERE v.deal_id = p_deal AND v.value = 1  AND v.week_id = w.id),
    'week_down', (SELECT count(*) FROM public.community_votes v WHERE v.deal_id = p_deal AND v.value = -1 AND v.week_id = w.id),
    'life_up',   (SELECT count(*) FROM public.community_votes v WHERE v.deal_id = p_deal AND v.value = 1),
    'life_down', (SELECT count(*) FROM public.community_votes v WHERE v.deal_id = p_deal AND v.value = -1)
  );
END $$;
REVOKE ALL ON FUNCTION public.community_cast_vote(uuid, text, uuid, smallint) FROM public;
GRANT EXECUTE ON FUNCTION public.community_cast_vote(uuid, text, uuid, smallint) TO service_role;

-- Sign-in merge: the anonymous vote becomes the account vote, never both.
CREATE OR REPLACE FUNCTION public.community_merge_votes(p_user uuid, p_anon text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE moved integer := 0; dropped integer := 0; ukey text := 'u:' || p_user::text;
BEGIN
  IF p_user IS NULL OR p_anon IS NULL OR p_anon = ukey THEN RETURN jsonb_build_object('ok', true, 'moved', 0); END IF;
  -- Where the account already voted, the account vote wins and the anonymous row goes.
  DELETE FROM public.community_votes a
  USING public.community_votes b
  WHERE a.voter_key = p_anon AND b.voter_key = ukey AND a.deal_id = b.deal_id;
  GET DIAGNOSTICS dropped = ROW_COUNT;
  UPDATE public.community_votes SET voter_key = ukey, user_id = p_user, updated_at = now()
  WHERE voter_key = p_anon;
  GET DIAGNOSTICS moved = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'moved', moved, 'dropped', dropped);
END $$;
REVOKE ALL ON FUNCTION public.community_merge_votes(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.community_merge_votes(uuid, text) TO service_role;

-- De-duplicated view counter (once per visitor per UTC day).
CREATE OR REPLACE FUNCTION public.community_record_view(p_deal uuid, p_voter text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.community_views (deal_id, voter_key) VALUES (p_deal, p_voter)
  ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.community_record_view(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.community_record_view(uuid, text) TO service_role;

-- Moderation, admin only, credits the submitting hunter and enters the deal once.
CREATE OR REPLACE FUNCTION public.community_moderate_deal(
  p_deal uuid, p_action text, p_reason text DEFAULT NULL, p_pick boolean DEFAULT NULL, p_pick_note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.community_weeks; d public.community_deals;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  SELECT * INTO d FROM public.community_deals WHERE id = p_deal;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'unknown deal'); END IF;

  IF p_action = 'approve' THEN
    w := public.community_current_week();
    UPDATE public.community_deals
      SET status = 'approved', reject_reason = NULL,
          approved_at = coalesce(approved_at, now()),
          week_id = coalesce(week_id, w.id)   -- enters a competition exactly once
      WHERE id = p_deal;
  ELSIF p_action = 'reject' THEN
    UPDATE public.community_deals SET status = 'rejected', reject_reason = p_reason WHERE id = p_deal;
  ELSIF p_action = 'pick' THEN
    UPDATE public.community_deals SET is_editorial_pick = coalesce(p_pick, true), pick_note = p_pick_note WHERE id = p_deal;
  ELSE
    RETURN jsonb_build_object('ok', false, 'error', 'unknown action');
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;
GRANT EXECUTE ON FUNCTION public.community_moderate_deal(uuid, text, text, boolean, text) TO authenticated, service_role;

-- Admin moderation queue (submissions + open reports).
CREATE OR REPLACE FUNCTION public.community_moderation_queue()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  RETURN jsonb_build_object(
    'pending', (SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY d.created_at), '[]'::jsonb)
                FROM public.community_deals d WHERE d.status = 'pending'),
    'reports', (SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at), '[]'::jsonb)
                FROM public.community_reports r WHERE r.status = 'open')
  );
END $$;
GRANT EXECUTE ON FUNCTION public.community_moderation_queue() TO authenticated, service_role;

CREATE TRIGGER community_comments_updated BEFORE UPDATE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();