BEGIN;
-- Additive release. Personal data is exposed only through permission-checked RPCs.
CREATE TABLE IF NOT EXISTS public.listing_checks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), deal_id uuid NOT NULL REFERENCES public.community_deals(id),
 actor uuid NOT NULL, scope text NOT NULL, source_url text NOT NULL, note text NOT NULL,
 before_values jsonb NOT NULL DEFAULT '{}', after_values jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.listing_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.listing_checks FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.rh_quality_queue() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin only' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.priority DESC,q.created_at),'[]') FROM (
 SELECT d.id,d.slug,d.title,d.sqm,d.bedrooms,d.country,d.location_name,d.source_url,d.verified_at,d.created_at,
 (CASE WHEN d.sqm IS NULL THEN 1 ELSE 0 END + CASE WHEN d.bedrooms IS NULL THEN 1 ELSE 0 END + CASE WHEN d.verified_at IS NULL OR d.verified_at<now()-interval '30 days' THEN 2 ELSE 0 END + CASE WHEN cardinality(d.image_urls)=0 THEN 3 ELSE 0 END) AS priority,
 left(coalesce(f.caption_en,f.caption,d.why_great),6000) AS source_text,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('scope',c.scope,'note',c.note,'at',c.created_at) ORDER BY c.created_at DESC),'[]') FROM listing_checks c WHERE c.deal_id=d.id) AS checks
 FROM community_deals d LEFT JOIN ig_finds f ON f.id=d.find_id WHERE d.status='approved'
 ORDER BY priority DESC,d.created_at LIMIT 250) q);
END $$;
CREATE OR REPLACE FUNCTION public.rh_check_listing(p_id uuid,p_sqm integer,p_bedrooms integer,p_scope text,p_source text,p_note text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE d community_deals; a jsonb;
BEGIN
 IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin only' USING ERRCODE='42501'; END IF;
 IF p_scope NOT IN ('facts','price_availability','photos','source') OR p_source !~ '^https?://' OR length(trim(p_note))<10 THEN RAISE EXCEPTION 'Choose a check, source URL and evidence note (10 characters minimum)'; END IF;
 IF p_sqm IS NOT NULL AND (p_sqm<=0 OR p_sqm>1000000) OR p_bedrooms IS NOT NULL AND (p_bedrooms<0 OR p_bedrooms>100) THEN RAISE EXCEPTION 'Invalid property dimensions'; END IF;
 SELECT * INTO d FROM community_deals WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found'; END IF;
 a=jsonb_build_object('sqm',coalesce(p_sqm,d.sqm),'bedrooms',coalesce(p_bedrooms,d.bedrooms));
 INSERT INTO listing_checks(deal_id,actor,scope,source_url,note,before_values,after_values) VALUES(d.id,auth.uid(),p_scope,p_source,trim(p_note),jsonb_build_object('sqm',d.sqm,'bedrooms',d.bedrooms),a);
 UPDATE community_deals SET sqm=coalesce(p_sqm,sqm),bedrooms=coalesce(p_bedrooms,bedrooms),verified_at=CASE WHEN p_scope='price_availability' THEN now() ELSE verified_at END,verified_note=CASE WHEN p_scope='price_availability' THEN p_note ELSE verified_note END,updated_at=now() WHERE id=p_id;
 RETURN jsonb_build_object('ok',true);
END $$;
CREATE TABLE IF NOT EXISTS public.buyer_preferences(user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,frequency text NOT NULL DEFAULT 'weekly' CHECK(frequency IN ('daily','weekly','off')),changes text[] NOT NULL DEFAULT ARRAY['new','price_drop'],updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE buyer_preferences ENABLE ROW LEVEL SECURITY; REVOKE ALL ON buyer_preferences FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.rh_buyer_preferences(p_frequency text DEFAULT NULL,p_changes text[] DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE='42501'; END IF;
 IF p_frequency IS NOT NULL THEN
  IF p_frequency NOT IN ('daily','weekly','off') OR NOT coalesce(p_changes,ARRAY[]::text[])<@ARRAY['new','price_drop','availability'] THEN RAISE EXCEPTION 'Invalid preferences'; END IF;
  INSERT INTO buyer_preferences(user_id,frequency,changes) VALUES(auth.uid(),p_frequency,coalesce(p_changes,ARRAY[]::text[])) ON CONFLICT(user_id) DO UPDATE SET frequency=excluded.frequency,changes=excluded.changes,updated_at=now();
  UPDATE alerts SET frequency=p_frequency,active=p_frequency<>'off',updated_at=now() WHERE user_id=auth.uid();
 END IF;
 RETURN coalesce((SELECT to_jsonb(p)-'user_id' FROM buyer_preferences p WHERE user_id=auth.uid()),jsonb_build_object('frequency','weekly','changes',ARRAY['new','price_drop']));
END $$;
CREATE OR REPLACE FUNCTION public.rh_notifications(p_mark_read boolean DEFAULT false) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE='42501'; END IF;
 IF p_mark_read THEN UPDATE notifications SET read=true WHERE user_id=auth.uid() AND NOT read; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(n) ORDER BY n.created_at DESC),'[]') FROM (SELECT id,type,title,body,metadata,read,created_at FROM notifications WHERE user_id=auth.uid() ORDER BY created_at DESC LIMIT 50)n);
END $$;
CREATE TABLE IF NOT EXISTS public.board_members(board_id uuid NOT NULL REFERENCES community_boards(id) ON DELETE CASCADE,user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,joined_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(board_id,user_id));
CREATE TABLE IF NOT EXISTS public.board_invites(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),board_id uuid NOT NULL REFERENCES community_boards(id) ON DELETE CASCADE,created_by uuid NOT NULL,expires_at timestamptz NOT NULL DEFAULT now()+interval '7 days',revoked boolean NOT NULL DEFAULT false);
CREATE TABLE IF NOT EXISTS public.board_discussion(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),board_id uuid NOT NULL REFERENCES community_boards(id) ON DELETE CASCADE,user_id uuid NOT NULL,body text NOT NULL CHECK(length(body) BETWEEN 1 AND 2000),created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY; ALTER TABLE board_invites ENABLE ROW LEVEL SECURITY; ALTER TABLE board_discussion ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON board_members,board_invites,board_discussion FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.rh_board_workspace(p_slug text,p_action text DEFAULT 'read',p_value text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE b community_boards; token uuid; own boolean; member boolean;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to collaborate' USING ERRCODE='42501'; END IF;
 SELECT * INTO b FROM community_boards WHERE slug=p_slug FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Board not found'; END IF;
 own=b.user_id=auth.uid();
 IF p_action='join' THEN
  IF NOT EXISTS(SELECT 1 FROM board_invites WHERE id=p_value::uuid AND board_id=b.id AND NOT revoked AND expires_at>now()) THEN RAISE EXCEPTION 'Invite expired or revoked'; END IF;
  INSERT INTO board_members(board_id,user_id) VALUES(b.id,auth.uid()) ON CONFLICT DO NOTHING;
 END IF;
 member=own OR EXISTS(SELECT 1 FROM board_members WHERE board_id=b.id AND user_id=auth.uid());
 IF NOT member THEN RAISE EXCEPTION 'Only invited members can open the private discussion' USING ERRCODE='42501'; END IF;
 IF p_action='invite' THEN
  IF NOT own THEN RAISE EXCEPTION 'Only the owner can invite' USING ERRCODE='42501'; END IF;
  INSERT INTO board_invites(board_id,created_by) VALUES(b.id,auth.uid()) RETURNING id INTO token;
 ELSIF p_action='revoke' THEN
  IF NOT own THEN RAISE EXCEPTION 'Only the owner can revoke' USING ERRCODE='42501'; END IF;
  UPDATE board_invites SET revoked=true WHERE board_id=b.id;
 ELSIF p_action='remove_member' THEN
  IF NOT own THEN RAISE EXCEPTION 'Only the owner can remove members' USING ERRCODE='42501'; END IF;
  DELETE FROM board_members WHERE board_id=b.id AND user_id=p_value::uuid AND user_id<>b.user_id;
  UPDATE board_invites SET revoked=true WHERE board_id=b.id;
 ELSIF p_action='toggle_home' THEN
  IF NOT EXISTS(SELECT 1 FROM community_deals WHERE id=p_value::uuid AND status='approved') THEN RAISE EXCEPTION 'Home unavailable';END IF;
  IF p_value::uuid=ANY(coalesce(b.deal_ids,ARRAY[]::uuid[])) THEN b.deal_ids=array_remove(b.deal_ids,p_value::uuid);
  ELSE IF cardinality(b.deal_ids)>=100 THEN RAISE EXCEPTION 'A board can hold up to 100 homes';END IF;b.deal_ids=array_append(b.deal_ids,p_value::uuid);END IF;
  UPDATE community_boards SET deal_ids=b.deal_ids,updated_at=now() WHERE id=b.id;
 ELSIF p_action='comment' THEN
  IF length(trim(p_value)) NOT BETWEEN 1 AND 2000 OR NOT community_limit('board-comment:'||auth.uid(),30,3600) THEN RAISE EXCEPTION 'Comment invalid or too many comments'; END IF;
  INSERT INTO board_discussion(board_id,user_id,body) VALUES(b.id,auth.uid(),trim(p_value));
 ELSIF p_action NOT IN ('read','join') THEN RAISE EXCEPTION 'Unknown action'; END IF;
 RETURN jsonb_build_object('mine',own,'invite',token,'members',(SELECT count(*)+1 FROM board_members WHERE board_id=b.id AND user_id<>b.user_id),'people',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(h.handle,'Member'))),'[]') FROM board_members m LEFT JOIN community_hunters h ON h.user_id=m.user_id WHERE m.board_id=b.id AND m.user_id<>b.user_id),'homes',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',d.id,'title',d.title,'slug',d.slug)),'[]') FROM community_deals d WHERE d.id=ANY(b.deal_ids) AND d.status='approved'),'comments',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',c.id,'body',c.body,'at',c.created_at,'author',coalesce(h.handle,'Member'),'mine',c.user_id=auth.uid()) ORDER BY c.created_at),'[]') FROM board_discussion c LEFT JOIN community_hunters h ON h.user_id=c.user_id WHERE c.board_id=b.id));
END $$;
CREATE TABLE IF NOT EXISTS public.network_cases(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),introduction_id uuid NOT NULL REFERENCES introductions(id),opened_by uuid NOT NULL,reason text NOT NULL,status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','dismissed')),resolution text,assigned_to uuid,deadline date NOT NULL DEFAULT current_date+7,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.network_case_notes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),case_id uuid NOT NULL REFERENCES network_cases(id),actor uuid NOT NULL,body text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE network_cases ENABLE ROW LEVEL SECURITY; ALTER TABLE network_case_notes ENABLE ROW LEVEL SECURITY;REVOKE ALL ON network_cases,network_case_notes FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.rh_network_cases(p_intro uuid DEFAULT NULL,p_action text DEFAULT 'read',p_case uuid DEFAULT NULL,p_text text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i introductions; c network_cases; admin boolean=is_admin(auth.uid()); cid uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE='42501'; END IF;
 IF p_intro IS NOT NULL THEN
  SELECT * INTO i FROM introductions WHERE id=p_intro;
  IF NOT FOUND OR NOT(admin OR EXISTS(SELECT 1 FROM network_developers WHERE user_id=auth.uid() AND id IN(i.from_developer,i.to_developer))) THEN RAISE EXCEPTION 'Not permitted' USING ERRCODE='42501'; END IF;
 END IF;
 IF p_action='open' THEN
  IF i.id IS NULL OR length(trim(p_text)) NOT BETWEEN 10 AND 4000 OR NOT community_limit('network-case:'||auth.uid(),10,86400) THEN RAISE EXCEPTION 'Provide an introduction and a reason'; END IF;
  INSERT INTO network_cases(introduction_id,opened_by,reason) VALUES(i.id,auth.uid(),trim(p_text)) RETURNING id INTO cid;
 ELSIF p_action IN ('comment','resolved','dismissed','reviewing') THEN
  SELECT * INTO c FROM network_cases WHERE id=p_case FOR UPDATE;
  IF NOT FOUND OR i.id IS NULL OR c.introduction_id<>i.id THEN RAISE EXCEPTION 'Case not found'; END IF;
  IF length(trim(p_text)) NOT BETWEEN 3 AND 4000 THEN RAISE EXCEPTION 'Explain this update'; END IF;
  IF p_action<>'comment' AND NOT admin THEN RAISE EXCEPTION 'Admin only' USING ERRCODE='42501'; END IF;
  INSERT INTO network_case_notes(case_id,actor,body) VALUES(c.id,auth.uid(),trim(p_text));
  IF p_action<>'comment' THEN UPDATE network_cases SET status=p_action,resolution=p_text,assigned_to=auth.uid(),updated_at=now() WHERE id=c.id; END IF;
 ELSIF p_action<>'read' THEN RAISE EXCEPTION 'Unknown action'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(z) ORDER BY z.created_at DESC),'[]') FROM (
 SELECT case_row.*,intro_row.prior_contact_at,intro_row.protection_checked_at,intro_row.commission_pct_snapshot,intro_row.source_share_pct_snapshot,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('body',n.body,'at',n.created_at) ORDER BY n.created_at),'[]') FROM network_case_notes n WHERE n.case_id=case_row.id) AS notes
 FROM network_cases case_row JOIN introductions intro_row ON intro_row.id=case_row.introduction_id
 WHERE (p_intro IS NULL OR intro_row.id=p_intro) AND (admin OR EXISTS(SELECT 1 FROM network_developers WHERE user_id=auth.uid() AND id IN(intro_row.from_developer,intro_row.to_developer))) LIMIT 100)z);
END $$;
CREATE TABLE IF NOT EXISTS public.lead_sharing_history(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,developer_id uuid NOT NULL,fp text NOT NULL,shared boolean NOT NULL,actor uuid,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE lead_sharing_history ENABLE ROW LEVEL SECURITY;REVOKE ALL ON lead_sharing_history FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.rh_log_sharing() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.shared IS DISTINCT FROM OLD.shared THEN INSERT INTO lead_sharing_history(developer_id,fp,shared,actor) VALUES(NEW.developer_id,NEW.fp,NEW.shared,auth.uid()); END IF; RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS rh_log_sharing ON lead_fingerprints;
CREATE TRIGGER rh_log_sharing AFTER INSERT OR UPDATE OF shared ON lead_fingerprints FOR EACH ROW EXECUTE FUNCTION rh_log_sharing();
CREATE OR REPLACE FUNCTION public.rh_network_health() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE admin boolean=is_admin(auth.uid());
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('admin',admin,'overdue',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT i.id,i.status,i.created_at,i.next_action_at,d.company AS responsible,coalesce(i.buyer_country,'Unknown') AS country,i.buyer_budget,d.price_from,
 CASE WHEN i.buyer_country IS NULL THEN 'Country missing' WHEN i.buyer_country=d.country THEN 'Country matches' ELSE 'Country differs; check buyer flexibility' END AS location_match,
 CASE WHEN i.buyer_budget IS NULL OR d.price_from IS NULL THEN 'Budget comparison unavailable' WHEN i.buyer_budget>=d.price_from THEN 'Budget covers starting price' ELSE 'Starting price exceeds budget' END AS budget_match
 FROM introductions i JOIN network_developers d ON d.id=i.to_developer WHERE i.status NOT IN('sold','lost') AND (i.next_action_at<current_date OR i.status='proposed' AND i.created_at<now()-interval '48 hours') AND (admin OR d.user_id=auth.uid()) ORDER BY i.created_at LIMIT 100)x),'sharing',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM (SELECT left(h.fp,6)||'…'||right(h.fp,4) AS contact,h.shared,h.created_at FROM lead_sharing_history h JOIN network_developers d ON d.id=h.developer_id WHERE admin OR d.user_id=auth.uid() ORDER BY h.created_at DESC LIMIT 100)x));
END $$;
REVOKE ALL ON FUNCTION rh_quality_queue(),rh_check_listing(uuid,integer,integer,text,text,text),rh_buyer_preferences(text,text[]),rh_notifications(boolean),rh_board_workspace(text,text,text),rh_network_cases(uuid,text,uuid,text),rh_network_health() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION rh_quality_queue(),rh_check_listing(uuid,integer,integer,text,text,text),rh_buyer_preferences(text,text[]),rh_notifications(boolean),rh_board_workspace(text,text,text),rh_network_cases(uuid,text,uuid,text),rh_network_health() TO authenticated;
COMMIT;
