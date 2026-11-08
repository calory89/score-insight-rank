-- 8-nov-2026: "Tell me if the price drops" on every home page.
--
-- A watch is one more row in realhunt.alerts with deal_slug set (source 'home', user_id null), so it reuses the
-- whole email-alert pipeline: double opt-in (rh_alert_send_confirmations + /alerts/confirm), the daily/weekly
-- digest (rh_alert_digest), suppression and the one-click unsubscribe added by the email_outbox sender.
--
-- Backwards compatible: existing rows have deal_slug null and behave exactly as before. Every function that
-- reads alerts as search criteria now ignores rows with deal_slug set (otherwise an empty country list would
-- match every home):
--   rh_alert_matches, trg_alert_match  -> "and a.deal_slug is null"
-- New:
--   community_watch_home(email, slug)   -> adds a watch (generic reply, rate limited)
--   rh_home_watch_matches(email, since) -> watched homes whose price is now lower than at the last email
--                                          (or at the moment of watching); since null = all watched homes
--   rh_home_watch_html(email, since)    -> email cards for those homes
-- Changed (same output when an email has no watches):
--   rh_alert_send_confirmations, alert_confirm, rh_alert_digest
-- Price changes come from realhunt.community_price_history, written by community_price_track whenever
-- community_deals.price_eur changes (including the nightly realhunt-listing-check / listing_probes updates).

alter table realhunt.alerts add column if not exists deal_slug text;
alter table realhunt.alerts add column if not exists watch_price integer;
create unique index if not exists alerts_home_watch_uniq on realhunt.alerts (lower(email), deal_slug) where deal_slug is not null;

-- ------------------------------------------------------------------------------------------- add a watch
create or replace function realhunt.community_watch_home(p_email text, p_slug text)
returns jsonb language plpgsql security definer set search_path to 'realhunt', 'pg_temp' as $$
declare em text := lower(trim(coalesce(p_email, ''))); own_email text; v_id uuid; v_freq text; v_last timestamptz; v_price int;
begin
  if auth.uid() is not null then select lower(email) into own_email from auth.users where id = auth.uid(); end if;
  if em = '' then em := own_email; end if;
  if em is null or em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(em) > 254 then return jsonb_build_object('error', 'Enter a valid email address.'); end if;
  select d.price_eur into v_price from community_deals d where d.slug = p_slug and d.status = 'approved' and (d.publish_at is null or d.publish_at <= now());
  if not found then return jsonb_build_object('error', 'This home is no longer listed.'); end if;
  if not community_limit('watch:' || em, 20, 86400) then return jsonb_build_object('error', 'Too many changes today.'); end if;
  perform pg_advisory_xact_lock(hashtext('rh-alert:' || em));
  -- Already watching: say ok without changing anything (a watch switched off stays off).
  if exists (select 1 from alerts where lower(email) = em and deal_slug = p_slug) then return jsonb_build_object('ok', true); end if;
  select (array_agg(frequency order by created_at desc))[1], max(last_sent_at) into v_freq, v_last from alerts where lower(email) = em and user_id is null;
  insert into alerts (email, deal_slug, watch_price, source, active, frequency, user_id)
    values (em, p_slug, v_price, 'home', true, coalesce(nullif(v_freq, 'off'), 'daily'), null) returning id into v_id;
  -- An address that is already confirmed inherits the confirmation (rh_alert_inherit_confirm), which also stamps
  -- last_sent_at = now(); keep the address's own digest clock so its existing alerts are not delayed.
  if v_last is not null then update alerts set last_sent_at = v_last where id = v_id and confirmed_at is not null; end if;
  -- Generic reply: anonymous callers cannot learn whether an address already exists.
  return jsonb_build_object('ok', true);
end $$;
revoke all on function realhunt.community_watch_home(text, text) from public;
grant execute on function realhunt.community_watch_home(text, text) to anon, authenticated, service_role;

-- ------------------------------------------------------------------------------------ watched price drops
create or replace function realhunt.rh_home_watch_matches(p_email text, p_since timestamptz)
returns table (id uuid, slug text, title text, price_eur int, location_name text, country text, img text, sqm int, was_eur int)
language sql stable security definer set search_path to 'realhunt', 'public' as $$
  select distinct on (d.id) d.id, d.slug, d.title, d.price_eur, d.location_name, d.country,
         case when d.image_urls[1] like 'http%' then d.image_urls[1] when d.image_urls[1] is not null then 'https://realhunt.co' || d.image_urls[1] end,
         d.sqm, w.was
  from realhunt.alerts a
  join realhunt.community_deals d on d.slug = a.deal_slug
  cross join lateral (select coalesce(
      (select h.price_eur from realhunt.community_price_history h where h.deal_id = d.id and h.seen_at <= greatest(p_since, a.created_at) order by h.seen_at desc limit 1),
      a.watch_price) as was) w
  where a.deal_slug is not null and lower(a.email) = lower(p_email) and a.active and a.confirmed_at is not null
    and d.status = 'approved' and (d.publish_at is null or d.publish_at <= now()) and d.price_eur is not null
    and not exists (select 1 from realhunt.community_availability av where av.deal_id = d.id and av.status = 'sold' and av.user_id = '00000000-0000-0000-0000-000000000000')
    and (p_since is null or (w.was is not null and d.price_eur < w.was))
  order by d.id
$$;

create or replace function realhunt.rh_home_watch_html(p_email text, p_since timestamptz)
returns text language plpgsql stable security definer set search_path to 'realhunt', 'public' as $$
declare r record; h text := ''; begin
  for r in select * from realhunt.rh_home_watch_matches(p_email, p_since) order by price_eur limit 10 loop
    h := h || '<table role="presentation" width="100%" style="border-collapse:collapse;margin:0 0 18px"><tr>'
      || case when r.img is not null then '<td width="132" style="vertical-align:top;padding-right:14px"><a href="https://realhunt.co/deal/' || rh_html(r.slug) || '"><img src="' || rh_html(r.img) || '" width="132" height="99" alt="" style="display:block;border-radius:10px;object-fit:cover"></a></td>' else '' end
      || '<td style="vertical-align:top">'
      || case when p_since is not null then '<span style="display:inline-block;background:#0F6B34;color:#fff;font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px;margin-bottom:4px">Price dropped</span><br>' else '' end
      || '<a href="https://realhunt.co/deal/' || rh_html(r.slug) || '" style="color:#141414;font-weight:600;text-decoration:none">' || rh_html(r.title) || '</a><br>'
      || '<span style="font-size:18px;font-weight:700">€' || to_char(r.price_eur, 'FM999,999,999') || '</span>'
      || case when p_since is not null and r.was_eur is not null and r.was_eur > r.price_eur then ' <span style="color:#666;text-decoration:line-through">€' || to_char(r.was_eur, 'FM999,999,999') || '</span>' else '' end
      || coalesce(' · ' || r.sqm || ' m²', '') || '<br>'
      || '<span style="color:#666">' || rh_html(coalesce(r.location_name, r.country)) || '</span></td></tr></table>';
  end loop;
  return h;
end $$;
revoke all on function realhunt.rh_home_watch_matches(text, timestamptz) from public, anon, authenticated;
revoke all on function realhunt.rh_home_watch_html(text, timestamptz) from public, anon, authenticated;

-- ------------------------------------------------------- search criteria ignore watch rows (same as before otherwise)
create or replace function realhunt.rh_alert_matches(p_email text, p_since timestamp with time zone, p_limit integer default 5)
 returns table(id uuid, slug text, title text, price_eur integer, location_name text, country text, img text, sqm integer, score integer, dropped boolean)
 language sql stable security definer set search_path to 'realhunt', 'public' as $function$
  with sc as (select realhunt.community_scores() m)
  select d.id, d.slug, d.title, d.price_eur, d.location_name, d.country,
         case when d.image_urls[1] like 'http%' then d.image_urls[1] when d.image_urls[1] is not null then 'https://realhunt.co' || d.image_urls[1] end,
         d.sqm, ((sc.m -> d.id::text) ->> 'n')::int, dr.dropped
  from realhunt.community_deals d
  cross join sc
  cross join lateral (select p_since is not null and exists (
      select 1 from realhunt.community_price_history h where h.deal_id = d.id and h.seen_at > p_since and h.price_eur = d.price_eur
        and exists (select 1 from realhunt.community_price_history h2 where h2.deal_id = d.id and h2.seen_at < h.seen_at and h2.price_eur > h.price_eur)) as dropped) dr
  where d.status = 'approved' and (d.publish_at is null or d.publish_at <= now())
    and not exists (select 1 from realhunt.community_availability av where av.deal_id = d.id and av.status = 'sold' and av.user_id = '00000000-0000-0000-0000-000000000000')
    and (p_since is null or coalesce(d.publish_at, d.approved_at) > p_since or dr.dropped)
    and exists (select 1 from realhunt.alerts a where lower(a.email) = lower(p_email) and a.active and a.confirmed_at is not null
      and a.deal_slug is null
      and (coalesce(cardinality(a.countries), 0) = 0 or d.country = any(a.countries))
      and (a.max_price is null or d.price_eur <= a.max_price)
      and (coalesce(a.category, '') = '' or d.category = a.category))
  order by dr.dropped desc, ((sc.m -> d.id::text) ->> 'n')::int desc nulls last, d.approved_at desc
  limit p_limit
$function$;

create or replace function realhunt.trg_alert_match()
 returns trigger language plpgsql security definer set search_path to 'realhunt' as $function$
declare a record; n int;
begin
  if new.status = 'hidden' or new.price_eur is null or new.image_urls is null then return new; end if;
  for a in select distinct on (email) * from alerts
           where coalesce(active,true) AND source IS DISTINCT FROM 'hunt' AND frequency IS DISTINCT FROM 'off' AND deal_slug IS NULL AND (country is null or country = new.country_guess)
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

-- --------------------------------------------------------------------------- double opt-in email
create or replace function realhunt.rh_alert_send_confirmations()
 returns integer language plpgsql security definer set search_path to 'realhunt', 'public' as $function$
declare r record; n int := 0; begin
  if not pg_try_advisory_xact_lock(hashtext('rh_alert_send_confirmations')) then return 0; end if;
  for r in
    select distinct on (lower(a.email)) lower(a.email) as email, a.confirm_token, a.countries, a.country, a.max_price, a.deal_slug,
      (select d.title from realhunt.community_deals d where d.slug = a.deal_slug limit 1) as deal_title
    from realhunt.alerts a
    where a.active and a.confirmed_at is null and a.user_id is null and a.email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
      and not exists (select 1 from realhunt.alerts b where lower(b.email) = lower(a.email) and (b.confirm_sent_at is not null or b.confirmed_at is not null))
      and not exists (select 1 from realhunt.suppressed_emails s where lower(s.email) = lower(a.email))
    order by lower(a.email), a.created_at desc
    limit 20
  loop
    if r.deal_slug is not null then
      perform realhunt.send_brevo(r.email, 'Confirm your RealHunt price alert',
        '<p>You asked RealHunt to email you if the price drops on <strong>' || rh_html(coalesce(r.deal_title, 'a home')) || '</strong>.</p>'
        || '<p>Confirm with one click and we will tell you as soon as it gets cheaper:</p>'
        || '<p><a href="https://realhunt.co/alerts/confirm?t=' || r.confirm_token || '" style="display:inline-block;background:#D4420C;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Confirm my alert</a></p>'
        || '<p style="color:#666;font-size:13px">If you did not ask for this, ignore this email and you will not hear from us again.</p>');
    else
      perform realhunt.send_brevo(r.email, 'Confirm your RealHunt home alerts',
        '<p>You asked RealHunt for new homes'
        || coalesce(' in ' || rh_html(nullif(array_to_string(coalesce(nullif(r.countries, '{}'), array[r.country]), ', '), '')), '')
        || coalesce(' up to €' || to_char(r.max_price, 'FM999,999,999'), '') || '.</p>'
        || '<p>Confirm with one click and we will send you the best homes for your search, then new ones as they pass our check:</p>'
        || '<p><a href="https://realhunt.co/alerts/confirm?t=' || r.confirm_token || '" style="display:inline-block;background:#D4420C;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Confirm my alerts</a></p>'
        || '<p style="color:#666;font-size:13px">If you did not ask for this, ignore this email and you will not hear from us again.</p>');
    end if;
    update realhunt.alerts set confirm_sent_at = now() where lower(email) = r.email;
    n := n + 1;
  end loop;
  return n;
end $function$;

create or replace function realhunt.alert_confirm(p_token text)
 returns jsonb language plpgsql security definer set search_path to 'realhunt', 'public' as $function$
declare v_email text; v_n int; v_list text; v_first boolean; v_watch boolean; v_search boolean; v_hlist text; begin
  select email into v_email from realhunt.alerts where confirm_token = p_token limit 1;
  if v_email is null then return jsonb_build_object('ok', false, 'error', 'This link is not valid any more. Sign up again on realhunt.co/alerts.'); end if;
  select bool_and(confirmed_at is null), bool_or(deal_slug is not null), bool_or(deal_slug is null) into v_first, v_watch, v_search from realhunt.alerts where lower(email) = lower(v_email);
  update realhunt.alerts set confirmed_at = coalesce(confirmed_at, now()), active = true, updated_at = now() where lower(email) = lower(v_email);
  get diagnostics v_n = row_count;
  delete from realhunt.suppressed_emails where lower(email) = lower(v_email);
  if v_first and not v_watch then
    v_list := realhunt.rh_alert_list_html(v_email, null);
    perform realhunt.send_brevo(v_email, 'Your RealHunt alerts are on: the best homes for your search',
      '<p>Your alerts are confirmed. These are the best homes on RealHunt for your search right now, each one checked by a person and scored from 70 to 98:</p>'
      || coalesce(nullif(v_list, ''), '<p>No home matches your search right now. We will email you as soon as one passes our check.</p>')
      || '<p><a href="https://realhunt.co/new">See all new homes</a> · <a href="https://realhunt.co/alerts">Change your alerts</a></p>'
      || '<p style="color:#666;font-size:13px">RealHunt is not an estate agent. Every home links to its original listing; check price and availability there before you decide.</p>');
    update realhunt.alerts set last_sent_at = now() where lower(email) = lower(v_email);
  elsif v_first then
    v_hlist := realhunt.rh_home_watch_html(v_email, null);
    v_list := case when v_search then realhunt.rh_alert_list_html(v_email, null) else '' end;
    perform realhunt.send_brevo(v_email, 'Your RealHunt price alert is on',
      '<p>Your alert is confirmed. We will email you as soon as the price drops on:</p>'
      || coalesce(nullif(v_hlist, ''), '<p>The home you picked.</p>')
      || case when v_search then '<p>And these are the best homes on RealHunt for your search right now:</p>' || coalesce(nullif(v_list, ''), '<p>No home matches your search right now.</p>') else '' end
      || '<p><a href="https://realhunt.co/new">See all new homes</a> · <a href="https://realhunt.co/alerts">Change your alerts</a></p>'
      || '<p style="color:#666;font-size:13px">RealHunt is not an estate agent. Every home links to its original listing; check price and availability there before you decide.</p>');
    update realhunt.alerts set last_sent_at = now() where lower(email) = lower(v_email);
  end if;
  return jsonb_build_object('ok', true, 'alerts', v_n);
end $function$;

-- ----------------------------------------------------------------------------------------- digest
create or replace function realhunt.rh_alert_digest()
 returns integer language plpgsql security definer set search_path to 'realhunt', 'public' as $function$
declare r record; v_list text; n int := 0; v_cnt int; v_home int; v_hlist text; v_title text; v_subject text; begin
  if not pg_try_advisory_xact_lock(hashtext('rh_alert_digest')) then return 0; end if;
  for r in
    select lower(a.email) as email, max(coalesce(a.last_sent_at, a.confirmed_at)) as since,
           bool_or(coalesce(a.frequency, 'daily') = 'daily') as daily,
           bool_or(a.deal_slug is null) as has_search, bool_or(a.deal_slug is not null) as has_watch
    from realhunt.alerts a
    where a.active and a.confirmed_at is not null
      and a.user_id is null  -- signed-in buyers get rh_queue_buyer_alerts instead
      and not exists (select 1 from realhunt.suppressed_emails s where lower(s.email) = lower(a.email))
    group by lower(a.email)
    having max(coalesce(a.last_sent_at, a.confirmed_at)) < now() - case when bool_or(coalesce(a.frequency, 'daily') = 'daily') then interval '20 hours' else interval '6 days 20 hours' end
    order by 2
    limit 60
  loop
    v_cnt := 0; v_home := 0;
    if r.has_search then select count(*) into v_cnt from realhunt.rh_alert_matches(r.email, r.since, 5); end if;
    if r.has_watch then select count(*), min(title) into v_home, v_title from realhunt.rh_home_watch_matches(r.email, r.since); end if;
    continue when v_cnt = 0 and v_home = 0;
    v_list := case when v_cnt > 0 then realhunt.rh_alert_list_html(r.email, r.since) else '' end;
    v_hlist := case when v_home > 0 then realhunt.rh_home_watch_html(r.email, r.since) else '' end;
    v_subject := case when v_cnt > 0 then 'New on RealHunt: ' || v_cnt || ' home' || case when v_cnt > 1 then 's' else '' end || ' for your search'
                      when v_home = 1 then 'Price dropped: ' || left(coalesce(v_title, 'a home you watch'), 80)
                      else 'Price dropped on ' || v_home || ' homes you watch' end;
    perform realhunt.send_brevo(r.email, v_subject,
      case when v_home > 0 then '<p>The price dropped on ' || case when v_home > 1 then 'homes' else 'a home' end || ' you asked us to watch:</p>' || v_hlist else '' end
      || case when v_cnt > 0 then '<p>New homes that match your RealHunt alerts, best score first:</p>' || v_list else '' end
      || '<p><a href="https://realhunt.co/new">See all new homes</a> · <a href="https://realhunt.co/alerts">Change your alerts</a></p>'
      || '<p style="color:#666;font-size:13px">Availability can change. Check the original listing before you decide.</p>');
    update realhunt.alerts set last_sent_at = now() where lower(email) = r.email;
    n := n + 1;
  end loop;
  return n;
end $function$;
