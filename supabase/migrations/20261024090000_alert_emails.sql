-- 24-oct-2026: email alerts for everyone who signs up with just an email (realhunt.alerts).
-- Before this, only signed-in buyers with buyer_preferences got alerts (rh_queue_buyer_alerts), so the
-- 148 email-only sign-ups never received anything.
--
-- Flow: sign-up -> confirmation email (double opt-in, within ~10 min) -> on confirm, a welcome email
-- with the 5 best homes for that search -> then a digest with up to 5 NEW matching homes, daily or
-- weekly, sent only when there is something new. All mail goes through email_outbox, whose sender
-- (realhunt-send-email) adds the one-click unsubscribe header and footer and skips suppressed emails.

alter table realhunt.alerts
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirm_token text,
  add column if not exists confirm_sent_at timestamptz,
  add column if not exists last_sent_at timestamptz;
update realhunt.alerts set confirm_token = replace(gen_random_uuid()::text, '-', '') where confirm_token is null;
alter table realhunt.alerts alter column confirm_token set default replace(gen_random_uuid()::text, '-', '');
create index if not exists alerts_confirm_token_idx on realhunt.alerts (confirm_token);
create index if not exists alerts_email_idx on realhunt.alerts (lower(email));

-- Alerts that belong to an account with a confirmed email are already confirmed.
update realhunt.alerts a set confirmed_at = coalesce(u.email_confirmed_at, now())
  from auth.users u where a.user_id = u.id and u.email_confirmed_at is not null and a.confirmed_at is null;

-- Plain-text safe HTML helper exists as realhunt.rh_html(text).

-- Homes that match one email's active alerts, best score first.
create or replace function realhunt.rh_alert_matches(p_email text, p_since timestamptz, p_limit int default 5)
returns table (id uuid, slug text, title text, price_eur int, location_name text, country text, img text, sqm int, score int)
language sql stable security definer set search_path to realhunt, public as $$
  with sc as (select realhunt.community_scores() m)
  select d.id, d.slug, d.title, d.price_eur, d.location_name, d.country,
         case when d.image_urls[1] like 'http%' then d.image_urls[1] when d.image_urls[1] is not null then 'https://realhunt.co' || d.image_urls[1] end,
         d.sqm, ((sc.m -> d.id::text) ->> 'n')::int
  from realhunt.community_deals d, sc
  where d.status = 'approved' and (d.publish_at is null or d.publish_at <= now())
    and (p_since is null or coalesce(d.publish_at, d.approved_at) > p_since)
    and exists (select 1 from realhunt.alerts a where lower(a.email) = lower(p_email) and a.active and a.confirmed_at is not null
      and (coalesce(cardinality(a.countries), 0) = 0 or d.country = any(a.countries))
      and (a.max_price is null or d.price_eur <= a.max_price)
      and (coalesce(a.category, '') = '' or d.category = a.category))
  order by ((sc.m -> d.id::text) ->> 'n')::int desc nulls last, d.approved_at desc
  limit p_limit
$$;

create or replace function realhunt.rh_alert_list_html(p_email text, p_since timestamptz) returns text
language plpgsql stable security definer set search_path to realhunt, public as $$
declare r record; h text := ''; begin
  for r in select * from realhunt.rh_alert_matches(p_email, p_since, 5) loop
    h := h || '<table role="presentation" width="100%" style="border-collapse:collapse;margin:0 0 18px"><tr>'
      || case when r.img is not null then '<td width="132" style="vertical-align:top;padding-right:14px"><a href="https://realhunt.co/deal/' || rh_html(r.slug) || '"><img src="' || rh_html(r.img) || '" width="132" height="99" alt="" style="display:block;border-radius:10px;object-fit:cover"></a></td>' else '' end
      || '<td style="vertical-align:top"><a href="https://realhunt.co/deal/' || rh_html(r.slug) || '" style="color:#141414;font-weight:600;text-decoration:none">' || rh_html(r.title) || '</a><br>'
      || '<span style="font-size:18px;font-weight:700">€' || to_char(r.price_eur, 'FM999,999,999') || '</span>'
      || coalesce(' · ' || r.sqm || ' m²', '') || coalesce(' · score ' || r.score, '') || '<br>'
      || '<span style="color:#666">' || rh_html(coalesce(r.location_name, r.country)) || '</span></td></tr></table>';
  end loop;
  return h;
end $$;

-- Confirm: called from realhunt.co/alerts/confirm?t=<token>. Confirms every alert of that email and
-- queues the welcome email with the best current matches.
create or replace function realhunt.alert_confirm(p_token text) returns jsonb
language plpgsql security definer set search_path to realhunt, public as $$
declare v_email text; v_n int; v_list text; v_first boolean; begin
  select email into v_email from realhunt.alerts where confirm_token = p_token limit 1;
  if v_email is null then return jsonb_build_object('ok', false, 'error', 'This link is not valid any more. Sign up again on realhunt.co/alerts.'); end if;
  select bool_and(confirmed_at is null) into v_first from realhunt.alerts where lower(email) = lower(v_email);
  update realhunt.alerts set confirmed_at = coalesce(confirmed_at, now()), active = true, updated_at = now() where lower(email) = lower(v_email);
  get diagnostics v_n = row_count;
  delete from realhunt.suppressed_emails where lower(email) = lower(v_email);
  if v_first then
    v_list := realhunt.rh_alert_list_html(v_email, null);
    perform realhunt.send_brevo(v_email, 'Your RealHunt alerts are on: the best homes for your search',
      '<p>Your alerts are confirmed. These are the best homes on RealHunt for your search right now, each one checked by a person and scored from 70 to 98:</p>'
      || coalesce(nullif(v_list, ''), '<p>No home matches your search right now. We will email you as soon as one passes our check.</p>')
      || '<p><a href="https://realhunt.co/new">See all new homes</a> · <a href="https://realhunt.co/alerts">Change your alerts</a></p>'
      || '<p style="color:#666;font-size:13px">RealHunt is not an estate agent. Every home links to its original listing; check price and availability there before you decide.</p>');
    update realhunt.alerts set last_sent_at = now() where lower(email) = lower(v_email);
  end if;
  return jsonb_build_object('ok', true, 'alerts', v_n);
end $$;
grant execute on function realhunt.alert_confirm(text) to anon, authenticated;

-- Every 10 minutes: one confirmation email per unconfirmed address (at most 20 per run, so the
-- 85-an-hour outbox quota stays free for sign-in emails).
create or replace function realhunt.rh_alert_send_confirmations() returns int
language plpgsql security definer set search_path to realhunt, public as $$
declare r record; n int := 0; begin
  if not pg_try_advisory_xact_lock(hashtext('rh_alert_send_confirmations')) then return 0; end if;
  for r in
    select distinct on (lower(a.email)) lower(a.email) as email, a.confirm_token, a.countries, a.country, a.max_price
    from realhunt.alerts a
    where a.active and a.confirmed_at is null and a.user_id is null and a.email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
      and not exists (select 1 from realhunt.alerts b where lower(b.email) = lower(a.email) and (b.confirm_sent_at is not null or b.confirmed_at is not null))
      and not exists (select 1 from realhunt.suppressed_emails s where lower(s.email) = lower(a.email))
    order by lower(a.email), a.created_at desc
    limit 20
  loop
    perform realhunt.send_brevo(r.email, 'Confirm your RealHunt home alerts',
      '<p>You asked RealHunt for new homes'
      || coalesce(' in ' || rh_html(nullif(array_to_string(coalesce(nullif(r.countries, '{}'), array[r.country]), ', '), '')), '')
      || coalesce(' up to €' || to_char(r.max_price, 'FM999,999,999'), '') || '.</p>'
      || '<p>Confirm with one click and we will send you the best homes for your search, then new ones as they pass our check:</p>'
      || '<p><a href="https://realhunt.co/alerts/confirm?t=' || r.confirm_token || '" style="display:inline-block;background:#D4420C;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Confirm my alerts</a></p>'
      || '<p style="color:#666;font-size:13px">If you did not ask for this, ignore this email and you will not hear from us again.</p>');
    update realhunt.alerts set confirm_sent_at = now() where lower(email) = r.email;
    n := n + 1;
  end loop;
  return n;
end $$;

-- Daily: up to 5 new matching homes per confirmed address, respecting daily/weekly, only when there is
-- something new. At most 60 addresses per run.
create or replace function realhunt.rh_alert_digest() returns int
language plpgsql security definer set search_path to realhunt, public as $$
declare r record; v_list text; n int := 0; v_cnt int; begin
  if not pg_try_advisory_xact_lock(hashtext('rh_alert_digest')) then return 0; end if;
  for r in
    select lower(a.email) as email, max(coalesce(a.last_sent_at, a.confirmed_at)) as since,
           bool_or(coalesce(a.frequency, 'daily') = 'daily') as daily
    from realhunt.alerts a
    where a.active and a.confirmed_at is not null
      and a.user_id is null  -- signed-in buyers get rh_queue_buyer_alerts instead
      and not exists (select 1 from realhunt.suppressed_emails s where lower(s.email) = lower(a.email))
    group by lower(a.email)
    having max(coalesce(a.last_sent_at, a.confirmed_at)) < now() - case when bool_or(coalesce(a.frequency, 'daily') = 'daily') then interval '20 hours' else interval '6 days 20 hours' end
    order by 2
    limit 60
  loop
    select count(*) into v_cnt from realhunt.rh_alert_matches(r.email, r.since, 5);
    continue when v_cnt = 0;
    v_list := realhunt.rh_alert_list_html(r.email, r.since);
    perform realhunt.send_brevo(r.email, 'New on RealHunt: ' || v_cnt || ' home' || case when v_cnt > 1 then 's' else '' end || ' for your search',
      '<p>New homes that match your RealHunt alerts, best score first:</p>' || v_list
      || '<p><a href="https://realhunt.co/new">See all new homes</a> · <a href="https://realhunt.co/alerts">Change your alerts</a></p>'
      || '<p style="color:#666;font-size:13px">Availability can change. Check the original listing before you decide.</p>');
    update realhunt.alerts set last_sent_at = now() where lower(email) = r.email;
    n := n + 1;
  end loop;
  return n;
end $$;

-- A new alert for an address that already confirmed is confirmed too.
create or replace function realhunt.rh_alert_inherit_confirm() returns trigger
language plpgsql security definer set search_path to realhunt, public as $$
begin
  if new.confirmed_at is null and exists (select 1 from realhunt.alerts a where lower(a.email) = lower(new.email) and a.confirmed_at is not null and a.id <> new.id) then
    new.confirmed_at := now(); new.confirm_sent_at := now(); new.last_sent_at := now();
  end if;
  return new;
end $$;
drop trigger if exists alerts_inherit_confirm on realhunt.alerts;
create trigger alerts_inherit_confirm before insert on realhunt.alerts for each row execute function realhunt.rh_alert_inherit_confirm();

select cron.unschedule(jobid) from cron.job where jobname in ('realhunt-alert-confirmations', 'realhunt-alert-digest');
select cron.schedule('realhunt-alert-confirmations', '*/10 * * * *', 'set search_path to realhunt, public, extensions; select realhunt.rh_alert_send_confirmations()');
select cron.schedule('realhunt-alert-digest', '20 7 * * *', 'set search_path to realhunt, public, extensions; select realhunt.rh_alert_digest()');

-- 92 addresses already got "Your alert is on. We only email when a home matches." in September (single
-- opt-in with notice): they count as confirmed from that email, and their first digest covers the homes
-- added since they signed up.
update realhunt.alerts a set confirmed_at = o.sent_at, confirm_sent_at = o.sent_at
  from (select lower(to_email) e, min(coalesce(sent_at, created_at)) sent_at from realhunt.email_outbox
        where subject like 'Alert on:%' and status = 'sent' group by 1) o
  where lower(a.email) = o.e and a.confirmed_at is null;

-- New anonymous sign-ups get the double opt-in email instead of "Alert on", so nobody receives two
-- emails. Signed-in buyers (already confirmed) keep the short "Alert on" note.
create or replace function realhunt.trg_alert_email() returns trigger
language plpgsql security definer set search_path to realhunt as $function$
begin
  if new.user_id is null or new.confirmed_at is null then return new; end if;
  perform send_brevo(new.email, 'Alert on: homes' || case when new.country is not null then ' in ' || new.country else '' end || case when new.max_price is not null then ' under €' || to_char(new.max_price, 'FM999,999,999') else '' end,
    '<p>Your alert is on. We only email when a home matches.</p><p><a href="https://realhunt.co/new">See the newest homes</a></p>');
  return new;
end $function$;

select cron.alter_job(jobid, active := true) from cron.job where jobname = 'realhunt-alert-confirmations';
