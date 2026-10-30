BEGIN;
-- The old importer must not bypass the new hunt alert preferences.
CREATE OR REPLACE FUNCTION public.trg_alert_match()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare a record; n int;
begin
  if new.status = 'hidden' or new.price_eur is null or new.image_urls is null then return new; end if;
  for a in select distinct on (email) * from alerts
           where coalesce(active,true) AND source IS DISTINCT FROM 'hunt' AND frequency IS DISTINCT FROM 'off' AND (country is null or country = new.country_guess)
             and (max_price is null or new.price_eur <= max_price)
             and (not beach or new.is_beach)
           order by email, created_at desc loop
    -- One home at a time is a useful alert; ninety-three at once is a carpet bombing. A bulk import
    -- used to queue one email per home per person (2,420 of them on 18-sep). Three in six hours is
    -- the ceiling; beyond that the rest of the batch is simply not sent.
    select count(*) into n from email_outbox
      where to_email = a.email and subject like 'New: %' and created_at > now() - CASE WHEN a.frequency='weekly' THEN interval '7 days' ELSE interval '1 day' END;
    if n >= 1 then continue; end if;
    perform send_brevo(a.email,
      'New: ' || coalesce(new.hook, new.location_name, 'a home') || ' for €' || to_char(new.price_eur,'FM999,999,999'),
      '<p>A home matching your alert just came in.</p>' || find_card_html(new) ||
      '<p><a href="https://realhunt.co/account/alerts">Manage alerts</a></p>');
  end loop;
  return new;
end $function$;

REVOKE ALL ON FUNCTION rh_queue_buyer_alerts() FROM PUBLIC,anon,authenticated;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN PERFORM cron.schedule('rh-buyer-alerts','35 * * * *','select public.rh_queue_buyer_alerts()'); END IF; END $$;
COMMIT;
