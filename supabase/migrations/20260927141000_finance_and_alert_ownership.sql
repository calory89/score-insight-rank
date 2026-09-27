BEGIN;
CREATE TABLE IF NOT EXISTS public.network_cash_journal(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),deal_id uuid NOT NULL REFERENCES network_deals(id),kind text NOT NULL CHECK(kind IN('collection','refund','referral_payment','referral_return')),amount numeric NOT NULL CHECK(amount>0),reference text NOT NULL,request_key uuid NOT NULL UNIQUE,actor uuid,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE network_cash_journal ENABLE ROW LEVEL SECURITY;REVOKE ALL ON network_cash_journal FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.rh_finance(p_deal uuid DEFAULT NULL,p_kind text DEFAULT 'read',p_amount numeric DEFAULT NULL,p_reference text DEFAULT '',p_key uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE d network_deals; got numeric; paid numeric; old network_cash_journal;
BEGIN
 IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin only' USING ERRCODE='42501'; END IF;
 IF p_kind<>'read' THEN
  IF p_kind NOT IN('collection','refund','referral_payment','referral_return') OR p_amount IS NULL OR p_amount<=0 OR p_amount<>round(p_amount,2) OR p_key IS NULL OR length(trim(p_reference))<3 THEN RAISE EXCEPTION 'Enter a positive amount, payment reference and unique request key'; END IF;
  SELECT * INTO d FROM network_deals WHERE id=p_deal FOR UPDATE;
  IF NOT FOUND OR d.exempt OR d.currency<>'EUR' THEN RAISE EXCEPTION 'Select a non-exempt EUR commission'; END IF;
  SELECT * INTO old FROM network_cash_journal WHERE request_key=p_key;
  IF FOUND THEN
   IF old.deal_id<>p_deal OR old.kind<>p_kind OR old.amount<>p_amount OR old.reference<>trim(p_reference) THEN RAISE EXCEPTION 'Request key already used'; END IF;
   RETURN jsonb_build_object('ok',true,'already',true);
  END IF;
  IF NOT EXISTS(SELECT 1 FROM network_cash_journal WHERE deal_id=d.id) THEN
   IF d.paid_at IS NOT NULL AND d.commission_eur>0 THEN INSERT INTO network_cash_journal(deal_id,kind,amount,reference,request_key,actor) VALUES(d.id,'collection',d.commission_eur,'Opening balance from recorded seller payment',gen_random_uuid(),auth.uid()); END IF;
   IF d.source_paid_at IS NOT NULL AND d.source_share_eur>0 THEN INSERT INTO network_cash_journal(deal_id,kind,amount,reference,request_key,actor) VALUES(d.id,'referral_payment',d.source_share_eur,'Opening balance from recorded referral payment',gen_random_uuid(),auth.uid()); END IF;
  END IF;
  SELECT coalesce(sum(CASE kind WHEN 'collection' THEN amount WHEN 'refund' THEN -amount ELSE 0 END),0),coalesce(sum(CASE kind WHEN 'referral_payment' THEN amount WHEN 'referral_return' THEN -amount ELSE 0 END),0) INTO got,paid FROM network_cash_journal WHERE deal_id=d.id;
  IF p_kind='collection' AND (got+p_amount>d.commission_eur OR d.status='void') THEN RAISE EXCEPTION 'Collection exceeds outstanding commission or sale is void'; END IF;
  IF p_kind='refund' AND p_amount>got-paid THEN RAISE EXCEPTION 'Refund exceeds funds retained; recover referral payment first'; END IF;
  IF p_kind='referral_payment' AND (got<d.commission_eur OR paid+p_amount>d.source_share_eur OR d.status IN('void','disputed') OR EXISTS(SELECT 1 FROM network_cases WHERE introduction_id=d.introduction_id AND status IN('open','reviewing'))) THEN RAISE EXCEPTION 'Collect the full commission and resolve disputes before paying the referral'; END IF;
  IF p_kind='referral_return' AND p_amount>paid THEN RAISE EXCEPTION 'Return exceeds referral paid'; END IF;
  INSERT INTO network_cash_journal(deal_id,kind,amount,reference,request_key,actor) VALUES(d.id,p_kind,p_amount,trim(p_reference),p_key,auth.uid());
  IF p_kind='collection' AND got+p_amount>=d.commission_eur THEN UPDATE network_deals SET status=CASE WHEN status IN('void','disputed') THEN status ELSE 'paid' END,paid_at=now(),updated_at=now() WHERE id=d.id; END IF;
  IF p_kind='refund' THEN UPDATE network_deals SET status='disputed',paid_at=NULL,updated_at=now() WHERE id=d.id; END IF;
  IF p_kind='referral_payment' AND paid+p_amount>=d.source_share_eur THEN UPDATE network_deals SET source_paid_at=now(),updated_at=now() WHERE id=d.id; END IF;
  IF p_kind='referral_return' THEN UPDATE network_deals SET source_paid_at=NULL,updated_at=now() WHERE id=d.id; END IF;
 END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.reported_at DESC),'[]') FROM (
 SELECT nd.id,nd.introduction_id,nd.sale_price,nd.commission_eur,nd.source_share_eur,nd.status,nd.currency,nd.reported_at,
 coalesce((SELECT sum(CASE kind WHEN 'collection' THEN amount WHEN 'refund' THEN -amount ELSE 0 END) FROM network_cash_journal j WHERE j.deal_id=nd.id),CASE WHEN nd.paid_at IS NOT NULL THEN nd.commission_eur ELSE 0 END) AS collected,
 coalesce((SELECT sum(CASE kind WHEN 'referral_payment' THEN amount WHEN 'referral_return' THEN -amount ELSE 0 END) FROM network_cash_journal j WHERE j.deal_id=nd.id),CASE WHEN nd.source_paid_at IS NOT NULL THEN nd.source_share_eur ELSE 0 END) AS referral_paid,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('kind',j.kind,'amount',j.amount,'reference',j.reference,'at',j.created_at) ORDER BY j.created_at),'[]') FROM network_cash_journal j WHERE j.deal_id=nd.id) AS entries
 FROM network_deals nd WHERE NOT nd.exempt AND (p_deal IS NULL OR nd.id=p_deal) ORDER BY nd.reported_at DESC LIMIT 100)x);
END $$;
REVOKE ALL ON FUNCTION rh_finance(uuid,text,numeric,text,uuid) FROM PUBLIC,anon;GRANT EXECUTE ON FUNCTION rh_finance(uuid,text,numeric,text,uuid) TO authenticated;
-- Do not allow one visitor to overwrite another person's alert or attach it to their account.
CREATE OR REPLACE FUNCTION public.community_save_alert(p_email text,p_countries text[],p_max_price integer,p_category text,p_source text DEFAULT 'web') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE em text=lower(trim(coalesce(p_email,''))); own_email text; aid uuid; pref buyer_preferences;
BEGIN
 IF auth.uid() IS NOT NULL THEN SELECT lower(email) INTO own_email FROM auth.users WHERE id=auth.uid(); END IF;
 IF em='' THEN em=own_email; END IF;
 IF em IS NULL OR em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RETURN jsonb_build_object('error','Enter a valid email address.'); END IF;
 IF own_email IS NOT NULL AND em<>own_email THEN RETURN jsonb_build_object('error','Use your signed-in email address to manage alerts.'); END IF;
 IF NOT community_limit('alert:'||em,10,86400) THEN RETURN jsonb_build_object('error','Too many changes today.'); END IF;
 PERFORM pg_advisory_xact_lock(hashtext('rh-alert:'||em));
 SELECT id INTO aid FROM alerts WHERE lower(email)=em AND source='hunt' LIMIT 1 FOR UPDATE;
 IF auth.uid() IS NOT NULL THEN INSERT INTO buyer_preferences(user_id) VALUES(auth.uid()) ON CONFLICT DO NOTHING;END IF;
 SELECT * INTO pref FROM buyer_preferences WHERE user_id=auth.uid();
 IF aid IS NULL THEN
  INSERT INTO alerts(email,country,max_price,user_id,countries,category,source,active,frequency) VALUES(em,p_countries[1],greatest(1,least(coalesce(p_max_price,100000),100000)),auth.uid(),p_countries,nullif(p_category,''),'hunt',coalesce(pref.frequency,'weekly')<>'off',coalesce(pref.frequency,'weekly')) RETURNING id INTO aid;
 ELSIF own_email=em THEN
  UPDATE alerts SET country=p_countries[1],countries=p_countries,max_price=greatest(1,least(coalesce(p_max_price,100000),100000)),category=nullif(p_category,''),user_id=auth.uid(),updated_at=now() WHERE id=aid;
 END IF;
 -- Generic reply: anonymous callers cannot learn whether an address already exists.
 RETURN jsonb_build_object('ok',true);
END $$;
COMMIT;
