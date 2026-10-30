-- 24-oct-2026: daily data-quality check. Lists suspicious published homes (odd prices or sizes, likely duplicates
-- across portals, missing photos, sold reports) and emails hello@realhunt.co only about issues not reported before.
-- It never changes a home: a person decides.
create table if not exists realhunt.quality_reported (
  deal_id uuid not null references realhunt.community_deals(id) on delete cascade,
  kind text not null, detail text, reported_at timestamptz not null default now(),
  primary key (deal_id, kind)
);
alter table realhunt.quality_reported enable row level security;

create or replace function realhunt.rh_quality_issues() returns table (deal_id uuid, slug text, kind text, detail text)
language sql stable security definer set search_path to realhunt as $$
  with d as (select * from realhunt.community_deals where status = 'approved')
  select id, slug, 'price', 'price €' || price_eur || ' is outside €8,000 to €400,000' from d where price_eur < 8000 or price_eur > 400000
  union all
  select id, slug, 'size', sqm || ' m² for ' || coalesce(bedrooms, 0) || ' bedrooms' from d where sqm is not null and (sqm < 20 or sqm > 2000 or (bedrooms >= 2 and sqm < 35))
  union all
  select id, slug, 'price_per_sqm', '€' || round(price_eur::numeric / sqm) || ' per m²' from d where sqm > 0 and (price_eur::numeric / sqm < 80 or price_eur::numeric / sqm > 7000)
  union all
  select b.id, b.slug, 'duplicate', 'same price, size and town as /deal/' || a.slug
  from d a join d b on a.id < b.id and a.country = b.country and a.price_eur = b.price_eur and coalesce(a.sqm, 0) = coalesce(b.sqm, 0)
    and lower(split_part(a.location_name, ',', 1)) = lower(split_part(b.location_name, ',', 1))
  union all
  select id, slug, 'photos', coalesce(cardinality(image_urls), 0) || ' photos' from d where coalesce(cardinality(image_urls), 0) < 3
  union all
  select d.id, d.slug, 'sold_reports', count(*) || ' visitors reported it sold' from d join realhunt.community_availability av on av.deal_id = d.id
    and av.status = 'sold' and av.user_id <> '00000000-0000-0000-0000-000000000000' group by d.id, d.slug having count(*) >= 2
$$;
revoke all on function realhunt.rh_quality_issues() from public, anon, authenticated;

create or replace function realhunt.rh_quality_report() returns int
language plpgsql security definer set search_path to realhunt as $$
declare r record; h text := ''; n int := 0; begin
  for r in select i.* from realhunt.rh_quality_issues() i
           where not exists (select 1 from realhunt.quality_reported q where q.deal_id = i.deal_id and q.kind = i.kind)
           order by i.kind, i.slug loop
    h := h || '<li><b>' || rh_html(r.kind) || '</b>: <a href="https://realhunt.co/deal/' || rh_html(r.slug) || '">' || rh_html(r.slug) || '</a>, ' || rh_html(r.detail) || '</li>';
    insert into realhunt.quality_reported(deal_id, kind, detail) values (r.deal_id, r.kind, r.detail) on conflict do nothing;
    n := n + 1;
  end loop;
  if n > 0 then
    insert into realhunt.email_outbox(to_email, subject, html, label)
    values ('hello@realhunt.co', 'RealHunt data check: ' || n || ' home' || case when n > 1 then 's' else '' end || ' to look at',
      '<p>New issues found by the daily data check. Nothing was changed: fix or remove the home in the admin, or ignore.</p><ul>' || h || '</ul>',
      'quality-' || to_char(now(), 'YYYY-MM-DD'));
  end if;
  return n;
end $$;
revoke all on function realhunt.rh_quality_report() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'realhunt-quality-report';
select cron.schedule('realhunt-quality-report', '15 7 * * *', 'select realhunt.rh_quality_report()');
