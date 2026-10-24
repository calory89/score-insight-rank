-- 24-oct-2026: daily check of every original listing, price updates and sold detection.
-- The edge function realhunt-listing-check visits the source page and stores one reading per home and day.
-- Nothing changes on a single reading: rh_listing_check_apply() needs two matching readings on different days.

create table if not exists realhunt.listing_probes (
  id bigserial primary key,
  deal_id uuid not null references realhunt.community_deals(id) on delete cascade,
  checked_at timestamptz not null default now(),
  http_status int, final_url text, verdict text not null check (verdict in ('ok','gone','blocked','error')),
  price int, currency text, note text
);
create index if not exists listing_probes_deal_idx on realhunt.listing_probes (deal_id, checked_at desc);
alter table realhunt.listing_probes enable row level security;  -- no policies: server only

insert into realhunt.app_secrets(key, value) values ('rh_check_secret', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
  on conflict (key) do nothing;

-- Homes due for a check: published, with a source, not checked in the last 20 hours, oldest check first.
create or replace function realhunt.rh_listing_check_due(p_limit int) returns table (id uuid, source_url text)
language sql stable security definer set search_path to realhunt as $$
  select d.id, d.source_url from realhunt.community_deals d
  left join lateral (select max(c.checked_at) last from realhunt.listing_probes c where c.deal_id = d.id) c on true
  where d.status = 'approved' and d.source_url like 'http%' and coalesce(c.last, '-infinity') < now() - interval '20 hours'
  order by c.last nulls first, d.approved_at desc
  limit least(greatest(p_limit, 1), 40)
$$;
revoke all on function realhunt.rh_listing_check_due(int) from public, anon, authenticated;

-- Fire one batch through pg_net (asynchronous: the database never waits on the portals).
create or replace function realhunt.rh_listing_check_tick() returns bigint
language plpgsql security definer set search_path to realhunt, extensions as $$
declare sec text; ak text; begin
  select value into sec from realhunt.app_secrets where key = 'rh_check_secret';
  select value into ak from realhunt.app_secrets where key = 'rh_anon_key';
  return net.http_post(url := 'https://oykcsmextclpdnugixqz.supabase.co/functions/v1/realhunt-listing-check',
    headers := jsonb_build_object('Content-Type', 'application/json', 'apikey', ak, 'Authorization', 'Bearer ' || ak),
    body := jsonb_build_object('secret', sec, 'limit', 20), timeout_milliseconds := 150000);
end $$;

-- Act on two matching readings on different days.
--  * gone twice  -> a 'sold' availability report from RealHunt itself (shown as "Reported sold") + listing event
--  * ok twice after being marked sold -> remove that report (relisted)
--  * same EUR price twice, 1% to 50% away from ours -> update the price (the existing triggers log the history,
--    raise a price_drop event and notify savers when it went down)
create or replace function realhunt.rh_listing_check_apply() returns jsonb
language plpgsql security definer set search_path to realhunt as $$
declare sys uuid := '00000000-0000-0000-0000-000000000000'; r record; n_sold int := 0; n_back int := 0; n_price int := 0; begin
  for r in
    select d.id, d.price_eur, l.v1, l.v2, l.p1, l.p2, l.c1, l.c2, l.d1, l.d2
    from realhunt.community_deals d
    join lateral (
      select (array_agg(verdict order by checked_at desc))[1] v1, (array_agg(verdict order by checked_at desc))[2] v2,
             (array_agg(price order by checked_at desc))[1] p1, (array_agg(price order by checked_at desc))[2] p2,
             (array_agg(currency order by checked_at desc))[1] c1, (array_agg(currency order by checked_at desc))[2] c2,
             (array_agg(checked_at::date order by checked_at desc))[1] d1, (array_agg(checked_at::date order by checked_at desc))[2] d2
      from (select * from realhunt.listing_probes c where c.deal_id = d.id and c.verdict in ('ok','gone') order by checked_at desc limit 2) x
    ) l on true
    where d.status = 'approved' and l.d1 is not null and l.d2 is not null and l.d1 <> l.d2
  loop
    if r.v1 = 'gone' and r.v2 = 'gone' then
      insert into realhunt.community_availability(deal_id, user_id, status) values (r.id, sys, 'sold') on conflict (deal_id, user_id) do nothing;
      if found then insert into realhunt.buyer_listing_events(deal_id, kind) values (r.id, 'availability'); n_sold := n_sold + 1; end if;
    elsif r.v1 = 'ok' and r.v2 = 'ok' then
      delete from realhunt.community_availability where deal_id = r.id and user_id = sys and status = 'sold';
      if found then insert into realhunt.buyer_listing_events(deal_id, kind) values (r.id, 'availability'); n_back := n_back + 1; end if;
      if r.c1 = 'EUR' and r.c2 = 'EUR' and r.p1 = r.p2 and r.p1 is not null and r.price_eur > 0
         and abs(r.p1 - r.price_eur)::numeric / r.price_eur between 0.01 and 0.5 then
        update realhunt.community_deals set price_eur = r.p1, updated_at = now() where id = r.id;
        n_price := n_price + 1;
      end if;
    end if;
  end loop;
  return jsonb_build_object('sold', n_sold, 'relisted', n_back, 'price_updates', n_price);
end $$;

-- Email digests also list price drops on matching homes, and skip homes RealHunt marked as sold.
drop function if exists realhunt.rh_alert_matches(text, timestamptz, int);
create function realhunt.rh_alert_matches(p_email text, p_since timestamptz, p_limit int default 5)
returns table (id uuid, slug text, title text, price_eur int, location_name text, country text, img text, sqm int, score int, dropped boolean)
language sql stable security definer set search_path to realhunt, public as $$
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
      and (coalesce(cardinality(a.countries), 0) = 0 or d.country = any(a.countries))
      and (a.max_price is null or d.price_eur <= a.max_price)
      and (coalesce(a.category, '') = '' or d.category = a.category))
  order by dr.dropped desc, ((sc.m -> d.id::text) ->> 'n')::int desc nulls last, d.approved_at desc
  limit p_limit
$$;

create or replace function realhunt.rh_alert_list_html(p_email text, p_since timestamptz) returns text
language plpgsql stable security definer set search_path to realhunt, public as $$
declare r record; h text := ''; begin
  for r in select * from realhunt.rh_alert_matches(p_email, p_since, 5) loop
    h := h || '<table role="presentation" width="100%" style="border-collapse:collapse;margin:0 0 18px"><tr>'
      || case when r.img is not null then '<td width="132" style="vertical-align:top;padding-right:14px"><a href="https://realhunt.co/deal/' || rh_html(r.slug) || '"><img src="' || rh_html(r.img) || '" width="132" height="99" alt="" style="display:block;border-radius:10px;object-fit:cover"></a></td>' else '' end
      || '<td style="vertical-align:top">' || case when r.dropped then '<span style="display:inline-block;background:#0F6B34;color:#fff;font-size:12px;font-weight:700;padding:2px 8px;border-radius:999px;margin-bottom:4px">Price dropped</span><br>' else '' end
      || '<a href="https://realhunt.co/deal/' || rh_html(r.slug) || '" style="color:#141414;font-weight:600;text-decoration:none">' || rh_html(r.title) || '</a><br>'
      || '<span style="font-size:18px;font-weight:700">€' || to_char(r.price_eur, 'FM999,999,999') || '</span>'
      || coalesce(' · ' || r.sqm || ' m²', '') || coalesce(' · score ' || r.score, '') || '<br>'
      || '<span style="color:#666">' || rh_html(coalesce(r.location_name, r.country)) || '</span></td></tr></table>';
  end loop;
  return h;
end $$;

select cron.unschedule(jobid) from cron.job where jobname in ('realhunt-listing-check', 'realhunt-listing-check-apply');
select cron.schedule('realhunt-listing-check', '*/10 0-5 * * *', 'select realhunt.rh_listing_check_tick()');
select cron.schedule('realhunt-listing-check-apply', '55 6 * * *', 'set search_path to realhunt, public, extensions; select realhunt.rh_listing_check_apply()');

-- Social posts cannot be read without a login: leave them out of the due list so they never block a batch.
create or replace function realhunt.rh_listing_check_due(p_limit int) returns table (id uuid, source_url text)
language sql stable security definer set search_path to realhunt as $$
  select d.id, d.source_url from realhunt.community_deals d
  left join lateral (select max(c.checked_at) last from realhunt.listing_probes c where c.deal_id = d.id) c on true
  where d.status = 'approved' and d.source_url like 'http%'
    and d.source_url !~* '(instagram|facebook|tiktok|youtube|wa\.me|whatsapp)\.'
    and coalesce(c.last, '-infinity') < now() - interval '20 hours'
  order by c.last nulls first, d.approved_at desc
  limit least(greatest(p_limit, 1), 40)
$$;
revoke all on function realhunt.rh_listing_check_due(int) from public, anon, authenticated;
grant execute on function realhunt.rh_listing_check_due(int) to service_role;
grant select, insert on realhunt.listing_probes to service_role;
grant usage on sequence realhunt.listing_probes_id_seq to service_role;
