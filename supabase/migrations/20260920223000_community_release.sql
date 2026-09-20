BEGIN;
SET LOCAL lock_timeout = '3s';
-- All community mutations go through a validated server API. No client-supplied identity.
REVOKE INSERT, UPDATE, DELETE ON public.community_deals, public.community_comments, public.community_reports, public.community_saves FROM anon, authenticated;
REVOKE SELECT ON public.community_comments, public.community_deals FROM anon, authenticated;
-- Public discovery data is projected by RPC, never exposes submitter auth IDs.
ALTER TABLE public.community_deals ADD CONSTRAINT community_price_positive CHECK(price_eur > 0) NOT VALID;
ALTER TABLE public.community_deals ADD CONSTRAINT community_area_positive CHECK(sqm IS NULL OR sqm > 0) NOT VALID;
ALTER TABLE public.community_deals ADD CONSTRAINT community_beds_valid CHECK(bedrooms IS NULL OR bedrooms BETWEEN 0 AND 1000) NOT VALID;
CREATE TABLE public.community_identities (
 token_hash text PRIMARY KEY, actor text NOT NULL, issued_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.community_limits (
 bucket text NOT NULL, window_at timestamptz NOT NULL, hits integer NOT NULL DEFAULT 1,
 PRIMARY KEY(bucket,window_at)
);
CREATE TABLE public.community_hunters (
 user_id uuid PRIMARY KEY, handle text UNIQUE NOT NULL, display_name text NOT NULL DEFAULT '',
 bio text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(handle ~ '^[a-z0-9_]{3,30}$'), CHECK(length(display_name)<=60), CHECK(length(bio)<=240)
);
CREATE TABLE public.community_week_votes (
 deal_id uuid NOT NULL REFERENCES public.community_deals(id), week_id uuid NOT NULL REFERENCES public.community_weeks(id),
 actor text NOT NULL, value smallint NOT NULL CHECK(value IN(-1,1)),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(deal_id,week_id,actor)
);
CREATE INDEX community_week_votes_rank ON public.community_week_votes(week_id,deal_id);
ALTER TABLE public.community_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_hunters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_week_votes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_identities, public.community_limits, public.community_hunters, public.community_week_votes FROM anon, authenticated;
GRANT ALL ON public.community_identities, public.community_limits, public.community_hunters, public.community_week_votes TO service_role;
INSERT INTO public.community_week_votes(deal_id,week_id,actor,value,created_at,updated_at)
 SELECT deal_id,week_id,voter_key,value,created_at,updated_at FROM public.community_votes WHERE week_id IS NOT NULL ON CONFLICT DO NOTHING;
ALTER TABLE public.community_week_winners ADD COLUMN snapshot jsonb;

CREATE OR REPLACE FUNCTION public.community_limit(p_key text,p_max int,p_seconds int)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE n int; t timestamptz := to_timestamp(floor(extract(epoch FROM now())/p_seconds)*p_seconds);
BEGIN
 INSERT INTO community_limits(bucket,window_at) VALUES(p_key,t)
 ON CONFLICT(bucket,window_at) DO UPDATE SET hits=community_limits.hits+1 RETURNING hits INTO n;
 RETURN n<=p_max;
END $$;
REVOKE ALL ON FUNCTION public.community_limit(text,int,int) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.community_source_key(p_url text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE u text; host text;
BEGIN
 u:=btrim(p_url);
 IF u IS NULL OR length(u)>2000 OR u !~* '^https?://[^/[:space:]@]+' THEN RAISE EXCEPTION 'Use a public http or https listing URL'; END IF;
 host:=lower(split_part(regexp_replace(u,'^https?://','','i'),'/',1));
 host:=split_part(split_part(host,'?',1),'#',1);
 IF host ~ '(^localhost|\.local$|^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2[0-9]|3[01])\.|^0\.|^169\.254\.|\[|:|@)' OR position('.' in host)=0 THEN RAISE EXCEPTION 'Use a public listing website'; END IF;
 -- Preserve case-sensitive path and meaningful query IDs; strip common campaign parameters.
 u:=regexp_replace(u,'^https?://(www\.)?','','i');
 u:=lower(split_part(u,'/',1))||CASE WHEN position('/' in u)>0 THEN substring(u FROM position('/' in u)) ELSE '' END;
 u:=split_part(u,'#',1);
 u:=regexp_replace(u,'([?&])(utm_[^=&#]+|fbclid|gclid)=[^&#]*','\1','gi');
 u:=regexp_replace(replace(replace(u,'?&','?'),'&&','&'),'[?&/]+$','');
 RETURN u;
END $$;
CREATE OR REPLACE FUNCTION public.community_deal_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 NEW.source_key:=community_source_key(NEW.source_url);
 NEW.source_domain:=split_part(NEW.source_key,'/',1);
 NEW.updated_at:=now();
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.community_close_week(p_week uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE w community_weeks; n int;
BEGIN
 SELECT * INTO w FROM community_weeks WHERE id=p_week FOR UPDATE;
 IF NOT FOUND OR w.ends_at>now() THEN RETURN jsonb_build_object('ok',false); END IF;
 IF w.closed_at IS NOT NULL THEN RETURN jsonb_build_object('ok',true); END IF;
 INSERT INTO community_week_winners(week_id,deal_id,rank,up_votes,down_votes,net_score,snapshot)
 SELECT w.id,d.id,row_number() OVER(ORDER BY coalesce(sum(v.value),0) DESC,count(*) FILTER(WHERE v.value=1) DESC,CASE d.slug WHEN 'Dc4gpg6slIT' THEN 0 WHEN 'acquappesa-sea-view-39000' THEN 1 ELSE 2 END,d.approved_at ASC,d.id ASC),
 count(*) FILTER(WHERE v.value=1),count(*) FILTER(WHERE v.value=-1),coalesce(sum(v.value),0),
 jsonb_build_object('title',d.title,'slug',d.slug,'image_urls',d.image_urls,'price_eur',d.price_eur,'country',d.country,'hunter_handle',d.hunter_handle)
 FROM community_deals d LEFT JOIN community_week_votes v ON v.deal_id=d.id AND v.week_id=w.id
 WHERE d.status='approved' AND d.approved_at<w.ends_at
 GROUP BY d.id ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS n=ROW_COUNT;
 UPDATE community_weeks SET closed_at=now() WHERE id=w.id;
 RETURN jsonb_build_object('ok',true,'archived',n);
END $$;
CREATE OR REPLACE FUNCTION public.community_rollover()
RETURNS community_weeks LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE w community_weeks; old community_weeks;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('community:rollover',0));
 FOR old IN SELECT * FROM community_weeks WHERE ends_at<=now() AND closed_at IS NULL ORDER BY starts_at LOOP
  PERFORM community_close_week(old.id);
 END LOOP;
 w:=community_current_week();
 RETURN w;
END $$;
REVOKE ALL ON FUNCTION public.community_rollover() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.community_moderation_queue() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.community_deal(text,text) FROM PUBLIC,anon,authenticated;
-- Retire unfinished legacy write paths so there is one authoritative implementation.
REVOKE ALL ON FUNCTION public.community_cast_vote(uuid,text,uuid,smallint), public.community_merge_votes(uuid,text),public.community_record_view(uuid,text),public.community_moderate_deal(uuid,text,text,boolean,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.community_rankings(p_scope text DEFAULT 'week',p_country text DEFAULT NULL,p_category text DEFAULT NULL,p_voter text DEFAULT NULL,p_limit int DEFAULT 50,p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE w community_weeks; result jsonb;
BEGIN
 w:=community_rollover();
 WITH a AS(SELECT deal_id,count(*) FILTER(WHERE value=1)::int up,count(*) FILTER(WHERE value=-1)::int down FROM community_votes GROUP BY deal_id),
 b AS(SELECT deal_id,count(*) FILTER(WHERE value=1)::int up,count(*) FILTER(WHERE value=-1)::int down,
 count(*) FILTER(WHERE created_at>now()-interval '24 hours' AND value=1)::int recent
 FROM community_week_votes WHERE week_id=w.id GROUP BY deal_id),
 c AS(SELECT d.id,d.slug,d.title,CASE WHEN auth.uid() IS NOT NULL THEN d.source_url END source_url,true has_source,d.source_domain,d.image_urls,d.video_url,d.price_eur,d.country,d.location_name,d.sqm,d.bedrooms,d.category,d.why_great,d.hunter_handle,d.is_editorial_pick,d.pick_note,d.approved_at,d.find_id,
 coalesce(a.up,0) life_up,coalesce(a.down,0) life_down,coalesce(a.up,0)-coalesce(a.down,0) life_net,
 coalesce(b.up,0) week_up,coalesce(b.down,0) week_down,coalesce(b.up,0)-coalesce(b.down,0) week_net,coalesce(b.recent,0) votes_24h,
 (SELECT count(*) FROM community_saves s WHERE s.deal_id=d.id) saves,
 (SELECT count(*) FROM community_views s WHERE s.deal_id=d.id) views,
 (SELECT count(*) FROM community_comments s WHERE s.deal_id=d.id AND s.status='published') comments
 FROM community_deals d LEFT JOIN a ON a.deal_id=d.id LEFT JOIN b ON b.deal_id=d.id WHERE d.status='approved'),
 ranked AS(SELECT c.*,row_number() OVER(ORDER BY CASE WHEN p_scope='all' THEN life_net ELSE week_net END DESC,CASE WHEN p_scope='all' THEN life_up ELSE week_up END DESC,CASE slug WHEN 'Dc4gpg6slIT' THEN 0 WHEN 'acquappesa-sea-view-39000' THEN 1 ELSE 2 END,approved_at ASC,id ASC) rank FROM c),
 filtered AS(SELECT * FROM ranked WHERE (p_country IS NULL OR country=p_country) AND (p_category IS NULL OR category=p_category)),
 page AS(SELECT * FROM filtered ORDER BY rank LIMIT least(greatest(p_limit,1),100) OFFSET greatest(p_offset,0))
 SELECT jsonb_build_object('week',to_jsonb(w),'scope',p_scope,'total',(SELECT count(*) FROM filtered),
 'global_deals',(SELECT count(*) FROM c),'global_votes',(SELECT coalesce(sum(life_up+life_down),0) FROM c),
 'weekly_votes',(SELECT coalesce(sum(week_up+week_down),0) FROM c),
 'countries',(SELECT coalesce(jsonb_agg(x.country ORDER BY x.country),'[]') FROM (SELECT DISTINCT country FROM c WHERE country IS NOT NULL) x),
 'picks',coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM (SELECT * FROM ranked WHERE is_editorial_pick ORDER BY approved_at DESC LIMIT 3) p),'[]'),
 'rows',coalesce((SELECT jsonb_agg(to_jsonb(page) ORDER BY rank) FROM page),'[]')) INTO result;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.community_api(p_action text,p_token text DEFAULT NULL,p_payload jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions,pg_temp AS $$
DECLARE uid uuid:=auth.uid(); admin boolean:=coalesce(public.is_admin(auth.uid()),false);
 actor_key text; old_actor text; token text:=p_token; th text; network_key text; headers jsonb;
 known_find ig_finds; d community_deals; w community_weeks; value_int int; target uuid; h community_hunters; result jsonb; old community_weeks;
BEGIN
 IF length(p_payload::text)>16000 OR length(coalesce(token,''))>128 THEN RETURN jsonb_build_object('error','Request too large'); END IF;
 headers:=coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb;
 network_key:=encode(digest(coalesce(headers->>'cf-connecting-ip',split_part(headers->>'x-forwarded-for',',',1),'unknown') || (SELECT value FROM app_secrets WHERE key='community_vote_secret'),'sha256'),'hex');
 IF token IS NOT NULL THEN
  th:=encode(digest(token,'sha256'),'hex'); SELECT actor INTO actor_key FROM community_identities WHERE token_hash=th;
 END IF;
 IF actor_key IS NULL THEN
  IF p_action<>'session' THEN RETURN jsonb_build_object('error','Your voting session expired. Refresh and try again.'); END IF;
  IF NOT community_limit('issue:'||network_key,20,3600) THEN RETURN jsonb_build_object('error','Too many new visitor sessions. Please try later.'); END IF;
  token:=encode(gen_random_bytes(32),'hex'); th:=encode(digest(token,'sha256'),'hex'); actor_key:='a:'||gen_random_uuid();
  INSERT INTO community_identities(token_hash,actor) VALUES(th,actor_key);
 END IF;
 -- Serializes changes and account merging; this is deliberately simple at launch volume.
 PERFORM pg_advisory_xact_lock(hashtextextended('community:writes',0));
 w:=community_rollover();
 IF uid IS NOT NULL THEN
  IF actor_key LIKE 'a:%' THEN
   old_actor:=actor_key; actor_key:='u:'||uid;
   INSERT INTO community_votes(deal_id,week_id,voter_key,user_id,value,created_at,updated_at)
    SELECT deal_id,week_id,actor_key,uid,value,created_at,updated_at FROM community_votes WHERE voter_key=old_actor ON CONFLICT DO NOTHING;
   DELETE FROM community_votes WHERE voter_key=old_actor;
   INSERT INTO community_week_votes(deal_id,week_id,actor,value,created_at,updated_at)
    SELECT deal_id,week_id,actor_key,value,created_at,updated_at FROM community_week_votes WHERE actor=old_actor AND week_id=w.id ON CONFLICT DO NOTHING;
   DELETE FROM community_week_votes WHERE actor=old_actor AND week_id=w.id;
   UPDATE community_identities SET actor=actor_key WHERE token_hash=th;
  ELSE actor_key:='u:'||uid; UPDATE community_identities SET actor=actor_key WHERE token_hash=th; END IF;
  INSERT INTO community_hunters(user_id,handle) VALUES(uid,'hunter_'||substr(encode(digest(uid::text,'sha256'),'hex'),1,12)) ON CONFLICT(user_id) DO NOTHING;
  SELECT * INTO h FROM community_hunters WHERE user_id=uid;
 END IF;
 IF p_action='session' THEN
  RETURN jsonb_build_object('token',token,'admin',admin,'pending_submissions',CASE WHEN admin THEN (SELECT count(*) FROM community_deals WHERE status='pending') ELSE NULL END,'hunter',CASE WHEN uid IS NOT NULL THEN to_jsonb(h)-'user_id' ELSE NULL END,
   'votes',coalesce((SELECT jsonb_object_agg(deal_id,value) FROM community_week_votes WHERE actor=actor_key AND week_id=w.id),'{}'),
   'saved',coalesce((SELECT jsonb_agg(deal_id) FROM community_saves WHERE user_id=uid),'[]'));
 END IF;
 IF NOT community_limit('request:'||actor_key,180,60) THEN RETURN jsonb_build_object('error','Please slow down and try again in a minute.'); END IF;
 IF p_action='detail' THEN
  SELECT * INTO d FROM community_deals WHERE slug=p_payload->>'slug' AND status='approved';
  IF NOT FOUND THEN RETURN jsonb_build_object('error','Deal not found'); END IF;
  INSERT INTO community_views(deal_id,voter_key) VALUES(d.id,actor_key) ON CONFLICT DO NOTHING;
  result:=community_rankings('week',NULL,NULL,NULL,100,0);
  SELECT x INTO result FROM jsonb_array_elements(result->'rows') x WHERE x->>'id'=d.id::text;
  IF result IS NULL THEN
   result:=to_jsonb(d)-'submitted_by'-'reject_reason'-'source_key';
   result:=result||jsonb_build_object('week_up',(SELECT count(*) FROM community_week_votes WHERE deal_id=d.id AND week_id=w.id AND value=1),'week_down',(SELECT count(*) FROM community_week_votes WHERE deal_id=d.id AND week_id=w.id AND value=-1),'life_up',(SELECT count(*) FROM community_votes WHERE deal_id=d.id AND value=1),'life_down',(SELECT count(*) FROM community_votes WHERE deal_id=d.id AND value=-1),
    'views',(SELECT count(*) FROM community_views WHERE deal_id=d.id),'saves',(SELECT count(*) FROM community_saves WHERE deal_id=d.id),'comments',(SELECT count(*) FROM community_comments WHERE deal_id=d.id AND status='published'));
   result:=result||jsonb_build_object('week_net',(result->>'week_up')::int-(result->>'week_down')::int,'life_net',(result->>'life_up')::int-(result->>'life_down')::int);
  END IF;
  result:=result||jsonb_build_object('has_source',true);
  IF uid IS NULL THEN result:=result-'source_url'; END IF;
  RETURN jsonb_build_object('deal',result,'comments',coalesce((SELECT jsonb_agg(jsonb_build_object('id',c.id,'body',c.body,'created_at',c.created_at,'handle',ch.handle,'own',c.user_id=uid) ORDER BY c.created_at DESC) FROM community_comments c LEFT JOIN community_hunters ch ON ch.user_id=c.user_id WHERE c.deal_id=d.id AND c.status='published'),'[]'));
 ELSIF p_action='winners' THEN
  RETURN jsonb_build_object('weeks',coalesce((SELECT jsonb_agg(to_jsonb(cw)||jsonb_build_object('winners',(SELECT coalesce(jsonb_agg(to_jsonb(cww) ORDER BY rank),'[]') FROM community_week_winners cww WHERE cww.week_id=cw.id AND rank<=10)) ORDER BY cw.starts_at DESC) FROM community_weeks cw WHERE cw.closed_at IS NOT NULL),'[]'));
 ELSIF p_action='hunter' THEN
  RETURN community_hunter(p_payload->>'handle')||jsonb_build_object('profile',coalesce((SELECT jsonb_build_object('display_name',display_name,'bio',bio) FROM community_hunters WHERE handle=p_payload->>'handle'),'{}'));
 ELSIF p_action='import' THEN
  -- Deterministic reuse of known sources; no paid AI or untrusted server-side fetch.
  PERFORM community_source_key(p_payload->>'url');
  SELECT * INTO d FROM community_deals WHERE community_source_key(source_url)=community_source_key(p_payload->>'url') AND status='approved';
  IF FOUND THEN RETURN jsonb_build_object('duplicate',d.slug); END IF;
  SELECT jsonb_build_object('title',coalesce(hook,location_name),'image_urls',image_urls,'price_eur',price_eur,'country',country_guess,'location_name',location_name,'sqm',sqm,'bedrooms',bedrooms) INTO result FROM ig_finds WHERE external_url=p_payload->>'url' OR post_url=p_payload->>'url' LIMIT 1;
  RETURN jsonb_build_object('data',result,'manual',result IS NULL);
 END IF;
 target:=nullif(p_payload->>'id','')::uuid;
 IF p_action='vote' THEN
  value_int:=(p_payload->>'value')::int;
  IF value_int NOT IN(-1,1) OR value_int IS NULL THEN RETURN jsonb_build_object('error','Choose an upvote or a downvote'); END IF;
  SELECT * INTO d FROM community_deals WHERE id=target AND status='approved';
  IF NOT FOUND THEN RETURN jsonb_build_object('error','Deal unavailable'); END IF;
  IF EXISTS(SELECT 1 FROM community_week_votes WHERE deal_id=target AND week_id=w.id AND actor=actor_key AND value=value_int) THEN RETURN jsonb_build_object('ok',true,'already',true); END IF;
  IF NOT community_limit('vote:'||actor_key,30,60) OR NOT community_limit('vote-network:'||network_key,300,3600) THEN RETURN jsonb_build_object('error','Voting is temporarily limited. Please try again later.'); END IF;
  INSERT INTO community_week_votes(deal_id,week_id,actor,value) VALUES(target,w.id,actor_key,value_int)
   ON CONFLICT(deal_id,week_id,actor) DO UPDATE SET value=excluded.value,updated_at=now();
  INSERT INTO community_votes(deal_id,week_id,voter_key,user_id,value) VALUES(target,w.id,actor_key,uid,value_int)
   ON CONFLICT(deal_id,voter_key) DO UPDATE SET value=excluded.value,updated_at=now(),user_id=coalesce(excluded.user_id,community_votes.user_id);
  RETURN jsonb_build_object('ok',true);
 END IF;
 IF uid IS NULL THEN RETURN jsonb_build_object('error','Please sign in to continue','auth',true); END IF;
 IF p_action='profile' THEN
  IF NOT community_limit('profile:'||uid,10,3600) THEN RETURN jsonb_build_object('error','Please try later'); END IF;
  IF coalesce(p_payload->>'handle',h.handle) !~ '^[a-z0-9_]{3,30}$' OR coalesce(p_payload->>'handle',h.handle) IN('realhunt','admin','support','moderator') THEN RETURN jsonb_build_object('error','Use 3–30 lowercase letters, numbers or underscores. This handle may be reserved.'); END IF;
  IF EXISTS(SELECT 1 FROM community_deals WHERE hunter_handle=coalesce(p_payload->>'handle',h.handle) AND submitted_by IS DISTINCT FROM uid) AND coalesce(p_payload->>'handle',h.handle)<>h.handle THEN RETURN jsonb_build_object('error','That hunter handle is already attributed to another source'); END IF;
  UPDATE community_hunters SET handle=coalesce(p_payload->>'handle',handle),display_name=left(coalesce(p_payload->>'name',''),60),bio=left(coalesce(p_payload->>'bio',''),240) WHERE user_id=uid;
  UPDATE community_deals SET hunter_handle=coalesce(p_payload->>'handle',h.handle) WHERE submitted_by=uid;
  RETURN jsonb_build_object('ok',true,'hunter',(SELECT to_jsonb(ch)-'user_id' FROM community_hunters ch WHERE user_id=uid));
 ELSIF p_action='dashboard' THEN
  RETURN jsonb_build_object('deals',coalesce((SELECT jsonb_agg(to_jsonb(cd)||jsonb_build_object('week_score',(SELECT coalesce(sum(value),0) FROM community_week_votes WHERE deal_id=cd.id AND week_id=w.id),'lifetime_votes',(SELECT count(*) FROM community_votes WHERE deal_id=cd.id),'views',(SELECT count(*) FROM community_views WHERE deal_id=cd.id)) ORDER BY created_at DESC) FROM community_deals cd WHERE submitted_by=uid),'[]'),
   'saved',coalesce((SELECT jsonb_agg(jsonb_build_object('slug',cd.slug,'title',cd.title,'price_eur',cd.price_eur,'image_urls',cd.image_urls)) FROM community_deals cd JOIN community_saves cs ON cs.deal_id=cd.id WHERE cs.user_id=uid AND cd.status='approved'),'[]'));
 ELSIF p_action='quick_submit' THEN
  IF length(btrim(coalesce(p_payload->>'website','')))>0 THEN RETURN jsonb_build_object('error','Unable to accept this submission'); END IF;
  PERFORM community_source_key(p_payload->>'url');
  SELECT * INTO d FROM community_deals WHERE community_source_key(source_url)=community_source_key(p_payload->>'url');
  IF FOUND THEN
   IF d.status='approved' THEN RETURN jsonb_build_object('ok',true,'duplicate',d.slug); END IF;
   IF d.submitted_by=uid THEN RETURN jsonb_build_object('ok',true,'already',true,'slug',d.slug,'status',d.status); END IF;
   RETURN jsonb_build_object('error','This property has already been submitted for review');
  END IF;
  IF NOT community_limit('submit:'||uid,10,3600) OR NOT community_limit('submit-network:'||network_key,40,3600) THEN RETURN jsonb_build_object('error','You have reached the submission limit. Please try later.'); END IF;
  SELECT * INTO known_find FROM ig_finds WHERE external_url=btrim(p_payload->>'url') OR post_url=btrim(p_payload->>'url') LIMIT 1;
  INSERT INTO community_deals(slug,title,source_url,source_key,image_urls,price_eur,country,location_name,sqm,bedrooms,category,why_great,submitted_by,hunter_handle,status)
  VALUES('deal-'||substr(replace(gen_random_uuid()::text,'-',''),1,16),
   left(coalesce(nullif(known_find.hook,''),nullif(known_find.location_name,''),'Property submitted for review'),160),btrim(p_payload->>'url'),'',
   coalesce(known_find.image_urls,'{}'::text[]),CASE WHEN known_find.price_eur>0 THEN known_find.price_eur END,
   known_find.country_guess,known_find.location_name,CASE WHEN known_find.sqm>0 THEN known_find.sqm END,
   CASE WHEN known_find.bedrooms BETWEEN 0 AND 1000 THEN known_find.bedrooms END,
   CASE WHEN known_find.is_beach THEN 'beach' ELSE 'other' END,left(p_payload->>'why',800),uid,h.handle,'pending') RETURNING * INTO d;
  RETURN jsonb_build_object('ok',true,'slug',d.slug,'status','pending');
 ELSIF p_action='submit' THEN
  IF NOT community_limit('submit:'||uid,10,3600) OR NOT community_limit('submit-network:'||network_key,40,3600) THEN RETURN jsonb_build_object('error','You have reached the hourly submission limit'); END IF;
  IF length(btrim(coalesce(p_payload->>'title','')))<5 OR length(btrim(coalesce(p_payload->>'country','')))<2 THEN RETURN jsonb_build_object('error','Add a title and country'); END IF;
  IF coalesce((p_payload->>'price_eur')::int,0)<=0 THEN RETURN jsonb_build_object('error','Add a positive price in euros'); END IF;
  IF length(coalesce(p_payload->>'image',''))>0 THEN PERFORM community_source_key(p_payload->>'image'); END IF;
  IF EXISTS(SELECT 1 FROM community_deals WHERE community_source_key(source_url)=community_source_key(p_payload->>'url')) THEN RETURN jsonb_build_object('error','This listing has already been submitted'); END IF;
  INSERT INTO community_deals(slug,title,source_url,source_key,image_urls,price_eur,country,location_name,sqm,bedrooms,category,why_great,submitted_by,hunter_handle,status)
  VALUES('deal-'||substr(replace(gen_random_uuid()::text,'-',''),1,16),left(btrim(p_payload->>'title'),160),p_payload->>'url','',
   CASE WHEN length(coalesce(p_payload->>'image',''))>0 THEN ARRAY[p_payload->>'image'] ELSE '{}'::text[] END,
   (p_payload->>'price_eur')::int,left(p_payload->>'country',80),left(p_payload->>'location',160),nullif(p_payload->>'sqm','')::int,nullif(p_payload->>'bedrooms','')::int,
   coalesce(p_payload->>'category','other'),left(p_payload->>'why',800),uid,h.handle,'pending') RETURNING * INTO d;
  RETURN jsonb_build_object('ok',true,'slug',d.slug);
 ELSIF p_action IN('save','comment','report') THEN
  SELECT * INTO d FROM community_deals WHERE id=target AND status='approved';
  IF NOT FOUND THEN RETURN jsonb_build_object('error','Deal unavailable'); END IF;
  IF p_action='save' THEN
   IF coalesce((p_payload->>'saved')::boolean,false) THEN INSERT INTO community_saves(deal_id,user_id) VALUES(target,uid) ON CONFLICT DO NOTHING;
   ELSE DELETE FROM community_saves WHERE deal_id=target AND user_id=uid; END IF;
  ELSIF p_action='comment' THEN
   IF NOT community_limit('comment:'||uid,5,300) THEN RETURN jsonb_build_object('error','Please wait before posting another comment'); END IF;
   INSERT INTO community_comments(deal_id,user_id,body) VALUES(target,uid,btrim(p_payload->>'body'));
  ELSE
   IF NOT community_limit('report:'||uid,10,3600) THEN RETURN jsonb_build_object('error','Please try later'); END IF;
   INSERT INTO community_reports(deal_id,reporter_id,reason,detail) VALUES(target,uid,left(p_payload->>'reason',80),left(p_payload->>'detail',1000));
  END IF;
  RETURN jsonb_build_object('ok',true);
 END IF;
 IF NOT admin THEN RETURN jsonb_build_object('error','Administrator access required'); END IF;
 IF p_action='queue' THEN
  RETURN community_moderation_queue()||jsonb_build_object(
   'approved',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'slug',slug,'title',title,'is_editorial_pick',is_editorial_pick) ORDER BY approved_at DESC) FROM community_deals WHERE status='approved'),'[]'),
   'reports',coalesce((SELECT jsonb_agg(to_jsonb(cr)||jsonb_build_object('deal_title',cd.title,'deal_slug',cd.slug,'source_url',cd.source_url) ORDER BY cr.created_at) FROM community_reports cr LEFT JOIN community_deals cd ON cd.id=cr.deal_id WHERE cr.status='open'),'[]'));
 ELSIF p_action='moderate' THEN
  SELECT * INTO d FROM community_deals WHERE id=target FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','Deal not found'); END IF;
  IF p_payload->>'decision'='approve' THEN
   IF length(btrim(coalesce(d.country,'')))<2 OR d.title='Property submitted for review' THEN RETURN jsonb_build_object('error','Add a descriptive title and country before approval'); END IF;
   IF cardinality(d.image_urls)=0 THEN RETURN jsonb_build_object('error','Add at least one photo before approval'); END IF;
   UPDATE community_deals SET status='approved',approved_at=coalesce(approved_at,now()),week_id=coalesce(week_id,w.id),reject_reason=NULL WHERE id=target;
  ELSIF p_payload->>'decision' IN('reject','duplicate') THEN
   UPDATE community_deals SET status='rejected',reject_reason=left(coalesce(p_payload->>'reason',p_payload->>'decision'),500) WHERE id=target;
   UPDATE community_reports SET status='actioned',reviewed_by=uid,reviewed_at=now() WHERE deal_id=target AND status='open';
  ELSIF p_payload->>'decision'='pick' THEN
   UPDATE community_deals SET is_editorial_pick=coalesce((p_payload->>'pick')::boolean,false),pick_note=left(p_payload->>'note',240) WHERE id=target;
  ELSIF p_payload->>'decision'='edit' THEN
   IF length(coalesce(p_payload->>'image',''))>0 THEN PERFORM community_source_key(p_payload->>'image'); END IF;
   UPDATE community_deals SET title=left(coalesce(p_payload->>'title',title),160),price_eur=coalesce((p_payload->>'price_eur')::int,price_eur),country=left(coalesce(p_payload->>'country',country),80),location_name=left(coalesce(p_payload->>'location',location_name),160),image_urls=CASE WHEN length(coalesce(p_payload->>'image',''))>0 THEN ARRAY[p_payload->>'image'] ELSE image_urls END WHERE id=target;
  ELSE RETURN jsonb_build_object('error','Unknown moderation action'); END IF;
 ELSIF p_action='resolve' THEN
  UPDATE community_reports SET status=CASE WHEN p_payload->>'resolution'='actioned' THEN 'actioned' ELSE 'dismissed' END,reviewed_by=uid,reviewed_at=now() WHERE id=target;
 ELSIF p_action='hide_comment' THEN
  UPDATE community_comments SET status='hidden' WHERE id=target;
 ELSE RETURN jsonb_build_object('error','Unknown action'); END IF;
 RETURN jsonb_build_object('ok',true);
EXCEPTION WHEN unique_violation THEN RETURN jsonb_build_object('error','This listing or handle is already in use');
 WHEN check_violation OR invalid_text_representation OR numeric_value_out_of_range THEN RETURN jsonb_build_object('error','Please check the entered values');
END $$;
REVOKE ALL ON FUNCTION public.community_api(text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.community_api(text,text,jsonb) TO anon,authenticated;
-- Reuse existing real listings only. No votes, comments or views are seeded.
INSERT INTO community_deals(slug,title,source_url,source_key,image_urls,video_url,price_eur,country,location_name,sqm,bedrooms,category,why_great,find_id,hunter_handle,status,is_editorial_pick,approved_at,week_id)
SELECT f.shortcode,left(coalesce(nullif(f.hook,''),f.location_name,'Property opportunity'),160),coalesce(nullif(f.external_url,''),f.post_url),'',f.image_urls,
 CASE WHEN f.shortcode='Dc4gpg6slIT' THEN '/videos/umbria-35000.mp4' ELSE NULL END,
 CASE WHEN f.price_eur>0 THEN f.price_eur END,f.country_guess,f.location_name,CASE WHEN f.sqm>0 THEN f.sqm END,CASE WHEN f.bedrooms BETWEEN 0 AND 1000 THEN f.bedrooms END,CASE WHEN f.is_beach THEN 'beach' ELSE 'other' END,NULL,f.id,
 'realhunt','approved', f.shortcode IN('Dc4gpg6slIT','acquappesa-sea-view-39000','DcndWlcGwtG'),now(),(community_current_week()).id
FROM ig_finds f WHERE coalesce(f.status,'new') NOT IN('hidden','sold','reserved') AND cardinality(f.image_urls)>0
 AND coalesce(nullif(f.external_url,''),f.post_url) ~ '^https?://'
ON CONFLICT DO NOTHING;
UPDATE community_deals SET is_editorial_pick=true WHERE status='approved' AND price_eur>0 AND (sqm IS NULL OR sqm>0) AND (bedrooms IS NULL OR bedrooms BETWEEN 0 AND 1000) AND slug IN('Dc4gpg6slIT','acquappesa-sea-view-39000','DcndWlcGwtG');
COMMIT;
