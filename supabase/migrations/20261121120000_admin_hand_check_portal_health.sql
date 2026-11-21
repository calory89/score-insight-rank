-- 21-nov-2026 (RealHunt list2 76 and 80): two admin-only functions for /hunt/admin. NOT applied by the agent that
-- wrote it: the coordinator applies it. Until then the admin screen says the buttons are not switched on yet and the
-- portal table falls back to what the public snapshot shows.
--
-- 1) community_admin_hand_check: an admin opened the original advert by hand. It stores one reading in
--    realhunt.listing_probes, exactly like the nightly check does, with the note "hand check: ...". So:
--      * 'ok'   -> community_source_checks() gives the home a fresh ok_at; the next snapshot drops the
--                  "could not confirm" notice (src/community/n9/status.ts isUnconfirmed);
--      * 'gone' -> counts as one "gone" reading; rh_listing_check_apply() still needs a second one on another
--                  day before the home is marked as no longer for sale (nothing changes on one reading).
-- 2) community_admin_portal_health: per portal, the nightly check readings of the last p_days days and of the days
--    before that, with how many "online" readings also read a price, so the admin sees when a portal stops giving
--    the price (or starts blocking the check).

create or replace function realhunt.community_admin_hand_check(p_deal uuid, p_verdict text, p_note text default null)
returns jsonb language plpgsql security definer set search_path to realhunt, public as $$
begin
  if not coalesce(is_realhunt_admin(auth.uid()), false) then return jsonb_build_object('error', 'Admins only'); end if;
  if p_verdict is null or p_verdict not in ('ok', 'gone') then return jsonb_build_object('error', 'Verdict must be ok or gone'); end if;
  if not exists (select 1 from realhunt.community_deals d where d.id = p_deal and d.status = 'approved') then
    return jsonb_build_object('error', 'Home not found');
  end if;
  insert into realhunt.listing_probes (deal_id, verdict, note)
  values (p_deal, p_verdict, left('hand check: ' || coalesce(nullif(btrim(p_note), ''), 'opened by an admin'), 300));
  return jsonb_build_object('ok', true, 'verdict', p_verdict, 'checked_at', now());
end $$;
revoke all on function realhunt.community_admin_hand_check(uuid, text, text) from public, anon;
grant execute on function realhunt.community_admin_hand_check(uuid, text, text) to authenticated, service_role;

create or replace function realhunt.community_admin_portal_health(p_days int default 7)
returns jsonb language sql stable security definer set search_path to realhunt, public as $$
  with w as (select greatest(1, least(coalesce(p_days, 7), 60)) as d),
  s as (
    select regexp_replace(lower(split_part(split_part(d.source_url, '://', 2), '/', 1)), '^www\.', '') as dom,
           p.verdict, p.price, p.checked_at, (p.checked_at > now() - make_interval(days => (select d from w))) as recent
    from realhunt.listing_probes p join realhunt.community_deals d on d.id = p.deal_id
    where d.status = 'approved' and d.source_url like 'http%'
      and p.checked_at > now() - make_interval(days => 2 * (select d from w))
  )
  select case when not coalesce(is_realhunt_admin(auth.uid()), false) then jsonb_build_object('error', 'Admins only') else
    jsonb_build_object('days', (select d from w), 'portals', coalesce((
      select jsonb_agg(x order by x->>'domain') from (
        select jsonb_build_object(
          'domain', dom,
          'probes', count(*) filter (where recent),
          'ok', count(*) filter (where recent and verdict = 'ok'),
          'ok_price', count(*) filter (where recent and verdict = 'ok' and price is not null),
          'blocked', count(*) filter (where recent and verdict = 'blocked'),
          'gone', count(*) filter (where recent and verdict = 'gone'),
          'error', count(*) filter (where recent and verdict = 'error'),
          'prev_ok', count(*) filter (where not recent and verdict = 'ok'),
          'prev_ok_price', count(*) filter (where not recent and verdict = 'ok' and price is not null),
          'prev_blocked', count(*) filter (where not recent and verdict = 'blocked'),
          'last_ok', max(checked_at) filter (where verdict = 'ok'),
          'last_price', max(checked_at) filter (where verdict = 'ok' and price is not null)
        ) as x from s group by dom) t), '[]'::jsonb))
  end
$$;
revoke all on function realhunt.community_admin_portal_health(int) from public, anon;
grant execute on function realhunt.community_admin_portal_health(int) to authenticated, service_role;
