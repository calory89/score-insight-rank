BEGIN;
-- Future changes only. Never backfill a mailing from historical listings.
CREATE TABLE IF NOT EXISTS buyer_listing_events(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,deal_id uuid NOT NULL REFERENCES community_deals(id),kind text NOT NULL CHECK(kind IN('new','price_drop','availability')),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS buyer_listing_events_time ON buyer_listing_events(created_at);
CREATE TABLE IF NOT EXISTS buyer_alert_receipts(user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,event_id bigint NOT NULL REFERENCES buyer_listing_events(id),queued_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,event_id));
CREATE TABLE IF NOT EXISTS buyer_seen(user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,deal_id uuid NOT NULL REFERENCES community_deals(id),seen_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,deal_id));
ALTER TABLE buyer_listing_events ENABLE ROW LEVEL SECURITY;ALTER TABLE buyer_alert_receipts ENABLE ROW LEVEL SECURITY;ALTER TABLE buyer_seen ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON buyer_listing_events,buyer_alert_receipts,buyer_seen FROM anon,authenticated;
CREATE OR REPLACE FUNCTION rh_seen(p_slug text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL THEN RETURN;END IF;
 INSERT INTO buyer_seen(user_id,deal_id) SELECT auth.uid(),id FROM community_deals WHERE slug=p_slug AND status='approved' ON CONFLICT(user_id,deal_id) DO UPDATE SET seen_at=now();
END $$;
CREATE OR REPLACE FUNCTION rh_listing_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.status='approved' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
  INSERT INTO buyer_listing_events(deal_id,kind) VALUES(NEW.id,'new');
 ELSIF TG_OP='UPDATE' THEN
  IF NEW.status='approved' AND NEW.price_eur<OLD.price_eur THEN INSERT INTO buyer_listing_events(deal_id,kind) VALUES(NEW.id,'price_drop');END IF;
  IF NEW.verified_at IS DISTINCT FROM OLD.verified_at OR NEW.status IS DISTINCT FROM OLD.status OR NEW.units IS DISTINCT FROM OLD.units THEN INSERT INTO buyer_listing_events(deal_id,kind) VALUES(NEW.id,'availability');END IF;
 END IF;RETURN NEW;
END $$;
CREATE TRIGGER rh_listing_event AFTER INSERT OR UPDATE OF status,price_eur,verified_at,units ON community_deals FOR EACH ROW EXECUTE FUNCTION rh_listing_event();
CREATE OR REPLACE FUNCTION rh_html(p text) RETURNS text LANGUAGE sql IMMUTABLE AS $$SELECT replace(replace(replace(replace(coalesce(p,''),'&','&amp;'),'<','&lt;'),'>','&gt;'),'"','&quot;')$$;
-- Explicitly saved preferences + verified account + owned alert are all required.
CREATE OR REPLACE FUNCTION rh_queue_buyer_alerts() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r record; e record; body text; ids bigint[]; n integer=0;
BEGIN
 IF NOT pg_try_advisory_xact_lock(hashtext('rh_queue_buyer_alerts')) THEN RETURN 0;END IF;
 FOR r IN SELECT p.*,u.email FROM buyer_preferences p JOIN auth.users u ON u.id=p.user_id
 WHERE p.frequency IN('daily','weekly') AND u.email_confirmed_at IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM suppressed_emails s WHERE lower(s.email)=lower(u.email))
 AND EXISTS(SELECT 1 FROM alerts a WHERE a.user_id=p.user_id AND a.active AND a.source='hunt')
 AND coalesce((SELECT max(queued_at) FROM buyer_alert_receipts WHERE user_id=p.user_id),'-infinity')<now()-CASE WHEN p.frequency='daily' THEN interval '1 day' ELSE interval '7 days' END
 ORDER BY p.updated_at LIMIT 500 LOOP
  body='<p>Updates matching your saved RealHunt search:</p>';ids=ARRAY[]::bigint[];
  FOR e IN SELECT ev.id,ev.kind,d.title,d.slug,d.price_eur,d.status FROM buyer_listing_events ev JOIN community_deals d ON d.id=ev.deal_id
   WHERE ev.created_at>=greatest(r.updated_at,now()-interval '30 days') AND ev.kind=ANY(r.changes)
   AND (d.publish_at IS NULL OR d.publish_at<=now())
   AND (d.status='approved' OR ev.kind='availability' AND EXISTS(SELECT 1 FROM buyer_seen s WHERE s.user_id=r.user_id AND s.deal_id=d.id))
   AND NOT EXISTS(SELECT 1 FROM buyer_alert_receipts a WHERE a.user_id=r.user_id AND a.event_id=ev.id)
   AND (ev.kind<>'new' OR NOT EXISTS(SELECT 1 FROM buyer_seen s WHERE s.user_id=r.user_id AND s.deal_id=d.id))
   AND EXISTS(SELECT 1 FROM alerts a WHERE a.user_id=r.user_id AND a.active AND a.source='hunt'
    AND (coalesce(cardinality(a.countries),0)=0 OR d.country=ANY(a.countries)) AND (a.max_price IS NULL OR d.price_eur<=a.max_price) AND (a.category IS NULL OR d.category=a.category))
   ORDER BY ev.created_at DESC LIMIT 12 LOOP
    ids=array_append(ids,e.id);
    body=body||'<p><a href="https://realhunt.co/deal/'||rh_html(e.slug)||'">'||rh_html(e.title)||'</a> · '||replace(e.kind,'_',' ')||CASE WHEN e.status<>'approved' THEN ' · listing removed' WHEN e.price_eur IS NULL THEN '' ELSE ' · €'||to_char(e.price_eur,'FM999,999,999') END||'</p>';
  END LOOP;
  IF cardinality(ids)>0 THEN
   body=body||'<p>Availability can change. Check the original listing before making a decision.</p><p><a href="https://realhunt.co/alerts">Manage frequency or switch alerts off</a></p>';
   PERFORM send_brevo(r.email,'Your RealHunt search: '||cardinality(ids)||' updates',body);
   INSERT INTO buyer_alert_receipts(user_id,event_id) SELECT r.user_id,unnest(ids) ON CONFLICT DO NOTHING;
   n=n+1;
  END IF;
 END LOOP;RETURN n;
END $$;
CREATE OR REPLACE FUNCTION rh_quality_metrics() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin only' USING ERRCODE='42501';END IF;
 RETURN jsonb_build_object('window_days',28,
 'events',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM(SELECT event,count(*) AS events,count(DISTINCT sid) AS sessions FROM rh_telemetry_events WHERE created_at>now()-interval '28 days' AND coalesce(meta->>'internal','false')<>'true' AND event IN('auth_link_requested','auth_link_failed','auth_magic','auth_confirmed','auth_confirmation_failed','original_listing_opened','community_vote','community_save','quick_view','compare_open') GROUP BY event)x),
 'registrations',(SELECT count(*) FROM auth.users WHERE created_at>now()-interval '28 days'),
 'confirmed_registrations',(SELECT count(*) FROM auth.users WHERE created_at>now()-interval '28 days' AND email_confirmed_at IS NOT NULL),
 'mail_attempts',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM(SELECT template_name,status,count(*) AS attempts FROM email_send_log WHERE created_at>now()-interval '28 days' GROUP BY template_name,status)x),
 'delivery_events',(SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]') FROM(SELECT event_type,count(DISTINCT provider_email_id) AS messages FROM email_delivery_events WHERE event_at>now()-interval '28 days' GROUP BY event_type)x));
END $$;
REVOKE ALL ON FUNCTION rh_seen(text),rh_queue_buyer_alerts(),rh_quality_metrics() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION rh_seen(text),rh_quality_metrics() TO authenticated;
-- The scheduler is installed separately only after tests; this migration sends no emails.
COMMIT;
