-- Additive release: no customer records removed. Apply as one transaction.
begin;
set local lock_timeout = '3s';
set local statement_timeout = '30s';

create table if not exists public.network_audit (
 id bigint generated always as identity primary key,
 entity text not null, entity_id text not null, actor uuid,
 action text not null, fields text[] not null default '{}',
 previous_status text, next_status text, before_values jsonb not null default '{}', after_values jsonb not null default '{}', created_at timestamptz not null default now()
);
alter table public.network_audit enable row level security;
revoke all on public.network_audit from anon, authenticated;
grant select on public.network_audit to authenticated;
create policy audit_admin_read on public.network_audit for select to authenticated using (public.is_admin(auth.uid()));
create index if not exists network_audit_entity_idx on public.network_audit(entity,entity_id,created_at desc);
create or replace function public.audit_network_change() returns trigger language plpgsql security definer set search_path=public as $$
declare before_row jsonb; after_row jsonb; changed text[];
begin
 before_row := case when tg_op='INSERT' then '{}'::jsonb else to_jsonb(old) end;
 after_row := case when tg_op='DELETE' then '{}'::jsonb else to_jsonb(new) end;
 select coalesce(array_agg(k),'{}') into changed from (select jsonb_object_keys(before_row || after_row) k) q where before_row->k is distinct from after_row->k;
 insert into public.network_audit(entity,entity_id,actor,action,fields,previous_status,next_status,before_values,after_values)
 values(tg_table_name,coalesce(after_row->>'id',before_row->>'id'),auth.uid(),tg_op,changed,before_row->>'status',after_row->>'status',
 (select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(before_row) where key in ('status','commission_pct','source_share_pct','sale_price','commission_eur','source_share_eur','exempt','agreement_version')),
 (select coalesce(jsonb_object_agg(key,value),'{}') from jsonb_each(after_row) where key in ('status','commission_pct','source_share_pct','sale_price','commission_eur','source_share_eur','exempt','agreement_version')));
 return coalesce(new,old);
end $$;
create trigger audit_developers after insert or update or delete on public.network_developers for each row execute function public.audit_network_change();
create trigger audit_introductions after insert or update or delete on public.introductions for each row execute function public.audit_network_change();
create trigger audit_deals after insert or update or delete on public.network_deals for each row execute function public.audit_network_change();

-- Own-row policies alone do not protect commercial columns.
create or replace function public.guard_developer_fields() returns trigger language plpgsql set search_path=public as $$
begin
 if current_user not in ('anon','authenticated') or public.is_admin(auth.uid()) then return new; end if;
 if tg_op='INSERT' then
   if new.user_id is distinct from auth.uid() or new.status<>'pending' or new.commission_pct<>5 or new.source_share_pct<>3 or new.fee_eur<>15 or new.agreement_accepted_at is not null or new.agreement_version is not null or new.agreement_signer is not null or new.notes is not null then raise exception 'Commercial terms and approval are managed by RealHunt'; end if;
 elsif (to_jsonb(new) - array['company','contact_name','email','phone','website','country','project_name','project_url','price_from','avg_ticket','share_default','mode','updated_at']) is distinct from (to_jsonb(old) - array['company','contact_name','email','phone','website','country','project_name','project_url','price_from','avg_ticket','share_default','mode','updated_at']) then
   raise exception 'Commercial terms and approval are managed by RealHunt';
 end if;
 return new;
end $$;
create trigger guard_developer_fields before insert or update on public.network_developers for each row execute function public.guard_developer_fields();
drop policy if exists dev_own on public.network_developers;
create policy dev_select on public.network_developers for select to authenticated using(user_id=auth.uid() or public.is_admin(auth.uid()));
create policy dev_insert on public.network_developers for insert to authenticated with check(user_id=auth.uid() or public.is_admin(auth.uid()));
create policy dev_update on public.network_developers for update to authenticated using(user_id=auth.uid() or public.is_admin(auth.uid())) with check(user_id=auth.uid() or public.is_admin(auth.uid()));
create policy dev_delete on public.network_developers for delete to authenticated using(public.is_admin(auth.uid()));

-- Contacts and private notes are returned only by the role-aware overview RPC.
revoke all on public.introductions from anon, authenticated;
revoke insert, update on public.lead_fingerprints from anon, authenticated;
grant update(shared,country,budget,tag) on public.lead_fingerprints to authenticated;
create unique index if not exists network_deals_one_intro on public.network_deals(introduction_id) where introduction_id is not null;
create unique index if not exists introductions_one_active on public.introductions(buyer_fp,to_developer) where status<>'lost';
create index if not exists fingerprints_owner_date on public.lead_fingerprints(developer_id,uploaded_at desc,id desc);
create index if not exists introductions_owner_date on public.introductions(to_developer,created_at desc);
create index if not exists deals_owner_date on public.network_deals(developer_id,reported_at desc);

alter table public.introductions add column if not exists commission_pct_snapshot numeric;
alter table public.introductions add column if not exists source_share_pct_snapshot numeric;
create or replace function public.snapshot_intro_terms() returns trigger language plpgsql security definer set search_path=public as $$
begin
 select commission_pct,source_share_pct into new.commission_pct_snapshot,new.source_share_pct_snapshot from public.network_developers where id=new.to_developer;
 return new;
end $$;
create trigger snapshot_intro_terms before insert on public.introductions for each row execute function public.snapshot_intro_terms();

create or replace function public.dev_check_fp(p_fp text) returns jsonb language plpgsql security definer set search_path=public as $$
declare d uuid;
begin
 select id into d from public.network_developers where user_id=auth.uid();
 if d is null then raise exception 'Developer sign-in required' using errcode='42501'; end if;
 if p_fp !~ '^[0-9a-f]{64}$' then raise exception 'Invalid fingerprint'; end if;
 -- Only a previously uploaded contact can be checked. No global contact-membership oracle.
 if not exists(select 1 from public.lead_fingerprints where developer_id=d and fp=p_fp) then return jsonb_build_object('mine',false,'restricted',true); end if;
 return jsonb_build_object('mine',true,
 'network',(select count(distinct developer_id) from public.lead_fingerprints where fp=p_fp and developer_id<>d and shared),
 'realhunt',exists(select 1 from public.rh_fingerprints where fp=p_fp),
 'introduced',(select count(*) from public.introductions where buyer_fp=p_fp and (to_developer=d or from_developer=d)));
end $$;

create or replace function public.dev_update_intro(p_id uuid,p_patch jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare d public.network_developers; i public.introductions; target text; allowed text[];
begin
 select * into d from public.network_developers where user_id=auth.uid();
 if d.id is null then raise exception 'Developer sign-in required' using errcode='42501'; end if;
 select * into i from public.introductions where id=p_id and to_developer=d.id for update;
 if i.id is null then raise exception 'Buyer not found' using errcode='42501'; end if;
 if jsonb_typeof(p_patch)<>'object' or exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('status','dev_notes','next_action_at')) then raise exception 'Unsupported change'; end if;
 target := coalesce(p_patch->>'status',i.status);
 allowed := case i.status when 'proposed' then array['accepted','lost'] when 'accepted' then array['contacted','lost'] when 'contacted' then array['visited','reserved','lost'] when 'visited' then array['reserved','lost'] when 'reserved' then array['lost'] when 'lost' then array['accepted'] else '{}'::text[] end;
 if target<>i.status and not(target=any(allowed)) then raise exception 'Invalid stage change. Report sales through the sale form.'; end if;
 if target<>i.status and target<>'lost' and (d.status<>'approved' or d.agreement_accepted_at is null or d.agreement_version<>'2026-09-17') then raise exception 'Approval and a signed agreement are required'; end if;
 if length(coalesce(p_patch->>'dev_notes',''))>10000 then raise exception 'Notes are too long'; end if;
 update public.introductions set status=target,
 dev_notes=case when p_patch ? 'dev_notes' then p_patch->>'dev_notes' else dev_notes end,
 next_action_at=case when p_patch ? 'next_action_at' then nullif(p_patch->>'next_action_at','')::date else next_action_at end,updated_at=now() where id=i.id;
 return jsonb_build_object('ok',true);
end $$;
create or replace function public.admin_update_intro(p_id uuid,p_status text) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin(auth.uid()) then raise exception 'admin only' using errcode='42501'; end if;
 if p_status not in ('proposed','accepted','contacted','visited','reserved','sold','lost') then raise exception 'Invalid status'; end if;
 if p_status='sold' and not exists(select 1 from public.network_deals where introduction_id=p_id and status<>'void') then raise exception 'Record a sale before marking this buyer sold'; end if;
 update public.introductions set status=p_status,updated_at=now() where id=p_id;
 if not found then raise exception 'Introduction not found'; end if;
 return jsonb_build_object('ok',true);
end $$;
create or replace function public.dev_buyer_history(p_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.introductions i join public.network_developers d on d.id=i.to_developer where i.id=p_id and d.user_id=auth.uid()) and not public.is_admin(auth.uid()) then raise exception 'Not allowed' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(q order by q.created_at desc),'[]') from (select action,fields,previous_status,next_status,created_at from public.network_audit where entity='introductions' and entity_id=p_id::text order by created_at desc limit 100) q);
end $$;

create or replace function public.dev_report_sale(p_intro uuid,p_price numeric,p_note text) returns jsonb language plpgsql security definer set search_path=public as $$
declare d public.network_developers; i public.introductions; nd public.network_deals; ex boolean; cp numeric; sp numeric;
begin
 select * into d from public.network_developers where user_id=auth.uid();
 if d.id is null then raise exception 'Developer sign-in required' using errcode='42501'; end if;
 select * into i from public.introductions where id=p_intro and to_developer=d.id for update;
 if i.id is null then raise exception 'Introduction not found' using errcode='42501'; end if;
 if p_price is null or p_price<=0 or p_price>1000000000 then raise exception 'Enter a valid sale price'; end if;
 select * into nd from public.network_deals where introduction_id=i.id;
 if nd.id is not null then
   if nd.sale_price=p_price then return to_jsonb(nd); end if;
   raise exception 'This sale is already recorded with a different price. Contact RealHunt.';
 end if;
 if d.status<>'approved' or d.agreement_accepted_at is null or d.agreement_version<>'2026-09-17' then raise exception 'Approval and a signed agreement are required'; end if;
 if i.status not in ('contacted','visited','reserved') then raise exception 'Contact the buyer before reporting a sale'; end if;
 cp:=coalesce(i.commission_pct_snapshot,d.commission_pct); sp:=coalesce(i.source_share_pct_snapshot,d.source_share_pct);
 if cp<0 or cp>100 or sp<0 or sp>cp then raise exception 'Invalid commission terms. Contact RealHunt.'; end if;
 ex:=exists(select 1 from public.lead_fingerprints where developer_id=d.id and fp=i.buyer_fp and uploaded_at<i.created_at);
 insert into public.network_deals(introduction_id,developer_id,source_developer_id,buyer_fp,sale_price,commission_pct,commission_eur,source_share_pct,source_share_eur,exempt,exempt_reason,notes,created_by)
 values(i.id,d.id,i.from_developer,i.buyer_fp,round(p_price,2),cp,case when ex then 0 else round(p_price*cp/100,2) end,sp,case when ex or i.from_developer is null then 0 else round(p_price*sp/100,2) end,ex,case when ex then 'Fingerprint was in your list before the introduction' else null end,left(p_note,10000),auth.uid()) returning * into nd;
 update public.introductions set status='sold',updated_at=now() where id=i.id;
 return to_jsonb(nd);
end $$;

create or replace function public.admin_set_deal(p_id uuid,p_status text,p_notes text) returns jsonb language plpgsql security definer set search_path=public as $$
declare d public.network_deals; allowed text[];
begin
 if not public.is_admin(auth.uid()) then raise exception 'admin only' using errcode='42501'; end if;
 select * into d from public.network_deals where id=p_id for update;
 if d.id is null then raise exception 'Deal not found'; end if;
 allowed:=case d.status when 'reported' then array['invoiced','disputed','void'] when 'invoiced' then array['paid','disputed','void'] when 'paid' then array['disputed'] when 'disputed' then array['invoiced','paid','void'] else '{}'::text[] end;
 if p_status is not null and p_status<>d.status and not(p_status=any(allowed)) then raise exception 'Invalid payment stage change'; end if;
 update public.network_deals set status=coalesce(p_status,status),notes=coalesce(left(p_notes,10000),notes),
 invoiced_at=case when p_status='invoiced' then coalesce(invoiced_at,now()) else invoiced_at end,
 paid_at=case when p_status='paid' then coalesce(paid_at,now()) else paid_at end,updated_at=now() where id=p_id;
 return jsonb_build_object('ok',true);
end $$;
create or replace function public.admin_mark_share_paid(p_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin(auth.uid()) then raise exception 'admin only' using errcode='42501'; end if;
 update public.network_deals set source_paid_at=coalesce(source_paid_at,now()),updated_at=now() where id=p_id and status='paid' and source_developer_id is not null and source_share_eur>0;
 if not found then raise exception 'Collect the commission before paying a source share'; end if;
 return jsonb_build_object('ok',true);
end $$;

create or replace function public.admin_approve_submission(p_id uuid,p_approve boolean) returns void language plpgsql security definer set search_path=public as $$
declare s public.submissions;
begin
 if not public.is_admin(auth.uid()) then raise exception 'admin only' using errcode='42501'; end if;
 select * into s from public.submissions where id=p_id for update;
 if s.id is null then raise exception 'Submission not found'; end if;
 if s.status<>'pending' then return; end if;
 if p_approve then
   insert into public.ig_finds(source_account,post_url,shortcode,caption,caption_en,image_urls,posted_at,location_name,country_guess,price_eur,status,verified,hook,rank_score)
   values('realhunt','https://realhunt.co/sell','rh'||left(s.id::text,8),s.description,s.description,s.image_urls,now(),s.location,s.country,s.price_eur,'new',false,s.location||': submitted by the owner',0.9);
 end if;
 update public.submissions set status=case when p_approve then 'approved' else 'rejected' end where id=p_id;
end $$;

-- Restricted anonymous ingestion into a fresh table: no legacy analytics triggers or locks.
create table if not exists public.rh_telemetry_events (
 id bigint generated always as identity primary key,event_id uuid unique not null,
 sid text not null,user_id uuid,event text not null,path text,find_shortcode text,meta jsonb,
 created_at timestamptz not null default now()
);
alter table public.rh_telemetry_events enable row level security;
revoke all on public.rh_telemetry_events from anon,authenticated;
grant select on public.rh_telemetry_events to authenticated;
create policy telemetry_admin_read on public.rh_telemetry_events for select to authenticated using(public.is_admin(auth.uid()));
create index if not exists telemetry_date_event on public.rh_telemetry_events(created_at desc,event);
create or replace function public.record_telemetry(p_rows jsonb) returns void language plpgsql security definer set search_path=public set statement_timeout='750ms' set lock_timeout='100ms' as $$
begin
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>20 or octet_length(p_rows::text)>32000 then raise exception 'Invalid telemetry batch'; end if;
 insert into public.rh_telemetry_events(event_id,sid,user_id,event,path,find_shortcode,meta)
 select (x->>'event_id')::uuid,left(x->>'sid',80),auth.uid(),left(x->>'event',60),split_part(left(x->>'path',240),'?',1),left(x->>'find_shortcode',80),coalesce(x->'meta','{}')
 from jsonb_array_elements(p_rows) x where x->>'event' ~ '^[a-z][a-z0-9_]{1,59}$' and length(x->>'sid') between 8 and 80
 on conflict(event_id) do nothing;
end $$;

create or replace function public.admin_platform_health() returns jsonb language plpgsql security definer set search_path=public set statement_timeout='5s' as $$
begin
 if not public.is_admin(auth.uid()) then raise exception 'admin only' using errcode='42501'; end if;
 return jsonb_build_object(
 'pending_developers',(select count(*) from public.network_developers where status='pending'),
 'uncontacted_buyers',(select count(*) from public.home_requests where not coalesce(contacted,false)),
 'overdue_followups',(select count(*) from public.introductions where next_action_at<current_date and status not in ('sold','lost')),
 'pending_submissions',(select count(*) from public.submissions where status='pending'),
 'email_failures_24h',(select count(*) from public.email_send_log l where l.status='failed' and l.created_at>now()-interval '24 hours' and not exists(select 1 from public.email_send_log s where s.message_id=l.message_id and s.status in ('sent','delivered') and s.created_at>l.created_at)),
 'email_queue_pending',(select count(*) from public.email_outbox where status not in ('sent','delivered','superseded','suppressed')),
 'commission_due',(select coalesce(sum(commission_eur),0) from public.network_deals where status in ('reported','invoiced')),
 'homes',(select count(*) from public.ig_finds),
 'source_accounts',(select count(distinct source_account) from public.ig_finds),
 'unverified_homes',(select count(*) from public.ig_finds where not coalesce(verified,false) and status<>'hidden'),
 'registrations',(select count(*) from auth.users),
 'confirmed_registrations',(select count(*) from auth.users where email_confirmed_at is not null),
 'subscribers',(select count(*) from public.newsletter_subscribers),
 'bounces_24h',(select count(distinct provider_email_id) from public.email_delivery_events where event_type in ('email.bounced','email.complained') and event_at>now()-interval '24 hours'),
 'last_event',(select max(created_at) from public.rh_telemetry_events),
 'funnel',(select coalesce(jsonb_object_agg(event,n),'{}') from (select event,count(distinct sid) n from public.rh_telemetry_events where created_at>now()-interval '7 days' and coalesce(meta->>'internal','false')<>'true' group by event) q),
 'daily',(select coalesce(jsonb_agg(q order by d),'[]') from (select to_char(created_at at time zone 'UTC','YYYY-MM-DD') d,count(distinct sid) n from public.rh_telemetry_events where event='home_view' and created_at>now()-interval '14 days' and coalesce(meta->>'internal','false')<>'true' group by 1) q)
 );
end $$;

-- One aggregated record per address, while retaining every capture source and total capture count.
create or replace function public.admin_contacts_page(p_query text default '',p_offset integer default 0,p_limit integer default 50) returns jsonb language plpgsql security definer set search_path=public set statement_timeout='5s' as $$
declare result jsonb;
begin
 if not public.is_admin(auth.uid()) then raise exception 'admin only' using errcode='42501'; end if;
 with captures as (
 select lower(trim(email)) email,created_at,'registration'::text source from auth.users where email is not null
 union all select lower(trim(email)),created_at,'newsletter' from public.newsletter_subscribers
 union all select lower(trim(email)),created_at,'home_request' from public.home_requests
 union all select lower(trim(email)),created_at,'contact' from public.contact_requests
 union all select lower(trim(email)),created_at,'alert' from public.alerts
 union all select lower(trim(email)),created_at,'developer' from public.network_developers
 union all select lower(trim(email)),created_at,'submission' from public.submissions
 union all select lower(trim(contact_email)),created_at,'sales_crm' from public.leads
 union all select lower(trim(email)),created_at,'profile' from public.profiles
 union all select lower(trim(email)),created_at,'agent_application' from public.agent_applications
 union all select lower(trim(email)),created_at,'agent' from public.agents
 union all select lower(trim(email)),created_at,'agent_brand' from public.agent_brand
 union all select lower(trim(email)),created_at,'outreach_import' from public.outreach_targets
 ), grouped as (
 select email,min(created_at) first_seen,max(created_at) last_seen,array_agg(distinct source) sources,count(*) captures from captures where email is not null and email<>'' and (coalesce(p_query,'')='' or email ilike '%'||left(p_query,120)||'%') group by email
 ) select jsonb_build_object('total',(select count(*) from grouped),'rows',(select coalesce(jsonb_agg(q),'[]') from (select * from grouped order by last_seen desc,email limit greatest(1,least(p_limit,500)) offset greatest(p_offset,0)) q)) into result;
 return result;
end $$;

-- Harden every network RPC's invocation privilege; routines retain their own row/role checks.
do $$ declare f record; begin
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'dev_%' or p.proname in ('admin_network','admin_introduce','admin_set_deal','admin_mark_share_paid','admin_set_intro_contact','admin_update_intro','admin_approve_submission','admin_platform_health','admin_contacts_page')) loop
 execute format('revoke all on function %s from public,anon',f.sig);
 execute format('grant execute on function %s to authenticated',f.sig);
 end loop;
end $$;
revoke all on function public.record_telemetry(jsonb) from public;
grant execute on function public.record_telemetry(jsonb) to anon,authenticated;
revoke all on function public.audit_network_change(),public.guard_developer_fields(),public.snapshot_intro_terms() from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.dev_upload_fps(p_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d uuid; n_new int := 0; n_dup int := 0; n_net int := 0; n_rh int := 0;
begin
 select id into d from public.network_developers where user_id = auth.uid();
 if d is null then raise exception 'no developer profile'; end if;
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>500 then raise exception 'Upload at most 500 contacts per batch'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) x where (x->>'fp') !~ '^[0-9a-f]{64}$' or (x->>'fp') is null or coalesce(x->>'kind','') not in ('email','phone') or length(coalesce(x->>'tag',''))>120 or length(coalesce(x->>'country',''))>80) then raise exception 'Invalid contact data'; end if;
 with src as (
 select distinct on (x->>'fp') x->>'fp' fp, coalesce(x->>'kind','email') kind, coalesce((x->>'shared')::boolean, false) shared, nullif(x->>'country','') country, nullif(x->>'budget','')::int budget, nullif(x->>'tag','') tag
 from jsonb_array_elements(p_rows) x where length(x->>'fp') = 64
 ), ins as (
 insert into public.lead_fingerprints(developer_id, fp, kind, shared, country, budget, tag, source)
 select d, fp, kind, shared, country, budget, tag, 'upload' from src
 on conflict (developer_id, fp) do nothing returning fp
 )
 select count(*) into n_new from ins;
 select count(*) - n_new into n_dup from jsonb_array_elements(p_rows) x where length(x->>'fp') = 64;
 select count(distinct l.fp) into n_net from public.lead_fingerprints l where l.developer_id = d and exists (select 1 from public.lead_fingerprints o where o.fp = l.fp and o.developer_id <> d);
 select count(distinct l.fp) into n_rh from public.lead_fingerprints l where l.developer_id = d and exists (select 1 from public.rh_fingerprints r where r.fp = l.fp);
 update public.network_developers set updated_at = now() where id = d;
 return jsonb_build_object('inserted', n_new, 'duplicates', n_dup, 'overlap_network', n_net, 'overlap_realhunt', n_rh);
end $function$
;

CREATE OR REPLACE FUNCTION public.admin_introduce(p_fp text, p_to uuid, p_from uuid, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare i uuid; f numeric;
begin
 if not public.is_admin(auth.uid()) then raise exception 'admin only'; end if;
 if not exists(select 1 from public.network_developers where id=p_to and status='approved' and agreement_accepted_at is not null and agreement_version='2026-09-17' and coalesce(mode,'both')<>'share') then raise exception 'Choose an approved developer with a signed agreement who receives buyers'; end if;
 if p_fp !~ '^[0-9a-f]{64}$' then raise exception 'Invalid buyer fingerprint'; end if;
 if p_from is not null and not exists(select 1 from public.lead_fingerprints l join public.network_developers d on d.id=l.developer_id where l.fp=p_fp and l.developer_id=p_from and l.shared and d.status='approved') then raise exception 'This contact is not available for sharing'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_fp||p_to::text,0));
 if exists (select 1 from public.lead_fingerprints where fp = p_fp and developer_id = p_to) then return jsonb_build_object('ok', false, 'reason', 'This buyer is already in that developer''s own list'); end if;
 if exists (select 1 from public.introductions where buyer_fp = p_fp and to_developer = p_to and status <> 'lost') then return jsonb_build_object('ok', false, 'reason', 'Already introduced to that developer'); end if;
 select fee_eur into f from public.network_developers where id = p_from;
 insert into public.introductions(buyer_fp, from_developer, to_developer, fee_eur, note, created_by) values (p_fp, p_from, p_to, coalesce(f, 15), p_note, auth.uid()) returning id into i;
 return jsonb_build_object('ok', true, 'id', i);
end $function$
;

alter table public.network_developers add constraint valid_network_commissions check(commission_pct between 0 and 100 and source_share_pct between 0 and commission_pct) not valid;
alter table public.network_developers add constraint valid_network_status check(status in ('pending','approved','paused','rejected')) not valid;

CREATE OR REPLACE FUNCTION public.admin_experiments(p_days integer DEFAULT 30, p_exclude_tz text[] DEFAULT ARRAY['Europe/Copenhagen'::text])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare since timestamptz := now() - make_interval(days => coalesce(p_days, 30));
begin
  if not public.is_admin(auth.uid()) then raise exception 'admin only'; end if;
  return (
    with ev as (
      select e.sid, e.event, e.created_at, e.meta
      from public.rh_telemetry_events e
      where e.created_at >= since
        and coalesce((e.meta->>'internal')::boolean, false) = false
        and not (coalesce(e.meta->>'tz','') = any (p_exclude_tz))
        and (e.user_id is null or not public.is_admin(e.user_id))
    ),
    exposures as (
      select distinct meta->>'exp_key' as key, meta->>'exp_v' as v, sid, min(created_at) over (partition by sid, meta->>'exp_key', meta->>'exp_v') as first_at
      from ev where event = 'exp_expose' and meta ? 'exp_key'
    ),
    conv as (
      -- a converter is a sid that fired the goal after being exposed, with the same variant in its assignment map
      select x.key, x.v, e.event as goal, e.sid
      from exposures x join ev e on e.sid = x.sid and e.created_at >= x.first_at and e.event <> 'exp_expose'
      where (e.meta->'exp'->>x.key) = x.v
      group by x.key, x.v, e.event, e.sid
    )
    select coalesce(jsonb_object_agg(k.key, k.data), '{}'::jsonb) from (
      select x.key, jsonb_build_object(
        'variants', (select coalesce(jsonb_object_agg(v, n), '{}'::jsonb) from (select v, count(distinct sid) n from exposures where key = x.key group by v) t),
        'goals', (select coalesce(jsonb_object_agg(goal, m), '{}'::jsonb) from (select goal, jsonb_object_agg(v, n) m from (select goal, v, count(distinct sid) n from conv where key = x.key group by goal, v) q group by goal) t),
        'daily', (select coalesce(jsonb_agg(jsonb_build_object('d', d, 'n', n) order by d), '[]'::jsonb) from (select to_char(first_at, 'MM-DD') d, count(distinct sid) n from exposures where key = x.key group by 1) t)
      ) as data
      from (select distinct key from exposures) x
    ) k
  );
end $function$
;

create or replace function public.dev_contacts_page(p_query text default '',p_mode text default 'all',p_offset integer default 0,p_limit integer default 50) returns jsonb language plpgsql security definer set search_path=public set statement_timeout='5s' as $$
declare d uuid;
begin
 select id into d from public.network_developers where user_id=auth.uid();
 if d is null then raise exception 'Developer sign-in required' using errcode='42501'; end if;
 return (with filtered as (
 select id,fp,kind,shared,country,budget,tag,uploaded_at from public.lead_fingerprints where developer_id=d and (p_mode='all' or (p_mode='shared' and shared) or (p_mode='private' and not shared)) and (coalesce(p_query,'')='' or concat_ws(' ',country,tag,fp) ilike '%'||left(p_query,120)||'%')
 ) select jsonb_build_object('total',(select count(*) from filtered),'rows',(select coalesce(jsonb_agg(q),'[]') from (select * from filtered order by uploaded_at desc,id desc limit greatest(1,least(p_limit,500)) offset greatest(p_offset,0)) q)));
end $$;
revoke all on function public.dev_contacts_page(text,text,integer,integer) from public,anon;
grant execute on function public.dev_contacts_page(text,text,integer,integer) to authenticated;

-- Sending and queue dispatch are server jobs, never public browser RPCs.
revoke all on function public.send_brevo(text,text,text),public.process_email_outbox(),public.send_weekly_digest() from public,anon,authenticated;
grant execute on function public.send_brevo(text,text,text),public.process_email_outbox(),public.send_weekly_digest() to service_role;
revoke all on function public.admin_set_find(uuid,text,boolean),public.admin_experiments(integer,text[]) from public,anon;
grant execute on function public.admin_set_find(uuid,text,boolean),public.admin_experiments(integer,text[]) to authenticated;

alter table public.ig_finds add column if not exists source_checked_at timestamptz;
create or replace function public.admin_set_find(p_id uuid,p_status text,p_verified boolean) returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin(auth.uid()) then raise exception 'admin only' using errcode='42501'; end if;
 if p_status is not null and p_status not in ('new','reserved','sold','hidden') then raise exception 'Invalid availability'; end if;
 update public.ig_finds set status=coalesce(p_status,status),verified=coalesce(p_verified,verified),source_checked_at=case when p_verified=true then now() else source_checked_at end where id=p_id;
 if not found then raise exception 'Listing not found'; end if;
end $$;

alter table public.email_send_log add column if not exists provider_email_id text;
create index if not exists email_log_provider_idx on public.email_send_log(provider_email_id) where provider_email_id is not null;
create index if not exists email_log_message_status_idx on public.email_send_log(message_id,status,created_at desc);

create table if not exists public.email_delivery_events(event_id text primary key,provider_email_id text not null,event_type text not null,event_at timestamptz not null,received_at timestamptz not null default now());
alter table public.email_delivery_events enable row level security;
revoke all on public.email_delivery_events from public,anon,authenticated;
grant select on public.email_delivery_events to authenticated;
create policy delivery_admin_read on public.email_delivery_events for select to authenticated using(public.is_admin(auth.uid()));
create or replace function public.record_email_delivery(p_event_id text,p_provider_id text,p_type text,p_at timestamptz) returns void language plpgsql security definer set search_path=public as $$
declare recipient text; template text; status_value text;
begin
 if p_type not in ('email.delivered','email.bounced','email.complained','email.delivery_delayed','email.failed','email.suppressed') then return; end if;
 select recipient_email,template_name into recipient,template from public.email_send_log where provider_email_id=p_provider_id order by created_at desc limit 1;
 if recipient is null then return; end if;
 insert into public.email_delivery_events values(p_event_id,p_provider_id,p_type,coalesce(p_at,now()),now()) on conflict(event_id) do nothing;
 if not found then return; end if;
 status_value:=replace(p_type,'email.','');
 insert into public.email_send_log(message_id,provider_email_id,recipient_email,template_name,status,created_at) values('delivery-'||p_event_id,p_provider_id,recipient,template,status_value,coalesce(p_at,now()));
 if p_type in ('email.bounced','email.complained') then insert into public.suppressed_emails(email) values(recipient) on conflict(email) do nothing; end if;
end $$;
revoke all on function public.record_email_delivery(text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.record_email_delivery(text,text,text,timestamptz) to service_role;

create or replace function public.admin_candidates_page(p_query text default '',p_offset integer default 0,p_limit integer default 50) returns jsonb language plpgsql security definer set search_path=public set statement_timeout='5s' as $$
begin
 if not public.is_admin(auth.uid()) then raise exception 'admin only' using errcode='42501'; end if;
 return (with candidates as (
 select l.id,l.fp,l.developer_id from_developer,coalesce(d.project_name,d.company) from_name,l.country,l.budget,l.tag,l.uploaded_at,
 exists(select 1 from public.rh_fingerprints r where r.fp=l.fp) rh_user,
 (select count(distinct developer_id) from public.lead_fingerprints o where o.fp=l.fp and o.developer_id<>l.developer_id) also_with,
 (select count(*) from public.introductions i where i.buyer_fp=l.fp) intros
 from public.lead_fingerprints l join public.network_developers d on d.id=l.developer_id where l.shared and d.status='approved' and (coalesce(p_query,'')='' or concat_ws(' ',d.project_name,d.company,l.country,l.tag,l.fp) ilike '%'||left(p_query,120)||'%')
 ) select jsonb_build_object('total',(select count(*) from candidates),'rows',(select coalesce(jsonb_agg(q),'[]') from (select * from candidates order by uploaded_at desc,id desc limit greatest(1,least(p_limit,500)) offset greatest(p_offset,0)) q)));
end $$;
revoke all on function public.admin_candidates_page(text,integer,integer) from public,anon;
grant execute on function public.admin_candidates_page(text,integer,integer) to authenticated;

create or replace function public.admin_web_vitals() returns jsonb language plpgsql security definer set search_path=public set statement_timeout='5s' as $$
begin
 if not public.is_admin(auth.uid()) then raise exception 'admin only' using errcode='42501'; end if;
 return (with latest as (
 select distinct on (sid,meta->>'metric_id') meta->>'name' metric,meta->>'device' device,(meta->>'value')::numeric value
 from public.rh_telemetry_events where event='web_vital' and created_at>now()-interval '28 days' and jsonb_typeof(meta->'value')='number' and meta->>'name' in ('LCP','INP','CLS') and meta ? 'metric_id' and coalesce(meta->>'internal','false')<>'true'
 order by sid,meta->>'metric_id',created_at desc,id desc
 ) select coalesce(jsonb_agg(q),'[]') from (select metric,device,count(*) samples,percentile_cont(0.75) within group(order by value) p75 from latest group by metric,device order by device,metric) q);
end $$;
revoke all on function public.admin_web_vitals() from public,anon;
grant execute on function public.admin_web_vitals() to authenticated;

create or replace function public.rh_urlencode(value text) returns text language sql immutable set search_path=public as $$
select coalesce(string_agg(case when b between 48 and 57 or b between 65 and 90 or b between 97 and 122 or b in(45,46,95,126) then chr(b) else '%'||upper(lpad(to_hex(b),2,'0')) end,'' order by n),'')
from (select n,get_byte(convert_to(value,'UTF8'),n) b from generate_series(0,octet_length(convert_to(value,'UTF8'))-1) n) q;
$$;
CREATE OR REPLACE FUNCTION public.rh_auth_confirm_mail()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
DECLARE v_link text; v_label text; v_next text;
BEGIN
  -- Reactivada 19-sep-2026 tras subir la instancia a Small y crear email_outbox_label_idx: la consulta
  -- que antes escaneaba la tabla entera en cada alta ahora va por indice.
  IF NEW.email IS NULL OR NEW.email_confirmed_at IS NOT NULL THEN RETURN NEW; END IF;
  IF coalesce(NEW.confirmation_token,'') = '' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND coalesce(OLD.confirmation_token,'') = NEW.confirmation_token THEN RETURN NEW; END IF;

  v_label := 'confirm-'||NEW.id::text;
  IF EXISTS (SELECT 1 FROM public.email_outbox
             WHERE label = v_label AND created_at > now() - interval '2 minutes') THEN
    RETURN NEW;
  END IF;

  v_next := NEW.raw_user_meta_data->>'auth_return_to';
  IF v_next IS NULL OR v_next !~ '^/[A-Za-z0-9_/?.=#%&-]*$' OR v_next LIKE '//%' OR v_next LIKE '/auth/%' THEN v_next := '/'; END IF;
  v_link := 'https://nylmhdtlshhtjkuvfbms.supabase.co/auth/v1/verify?token='||NEW.confirmation_token
            ||'&type=signup&redirect_to='||public.rh_urlencode('https://realhunt.co/auth/callback?next='||public.rh_urlencode(v_next));

  INSERT INTO public.email_outbox (to_email, subject, html, label, status)
  VALUES (NEW.email, 'Confirm your email · RealHunt', public.rh_confirm_email_html(v_link), v_label, 'pending');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $function$

;
CREATE OR REPLACE FUNCTION public.process_email_outbox()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare r record; sec text; ak text; res record; n int := 0; cupo int; fin timestamptz;
begin
  -- Un solo pase a la vez. Ayer subí el tiempo de espera de cada envío a 25 s y dejé lotes de 20:
  -- un pase podía tardar 8 minutos reteniendo una conexión, mientras el cron arrancaba otro cada 5.
  -- Los pases se apilaban y se comían el pool de conexiones de la base. Eso tumbó la web.
  if not pg_try_advisory_lock(778001) then return 0; end if;

  fin := clock_timestamp() + interval '60 seconds';   -- nunca más allá del siguiente cron
  perform extensions.http_set_curlopt('CURLOPT_TIMEOUT_MS','6000');

  select value into sec from app_secrets where key='rh_email_secret';
  select value into ak from app_secrets where key='rh_anon_key';

  select greatest(0, 85 - count(*)) into cupo
    from email_send_log where status='sent' and created_at > now() - interval '1 hour';
  if cupo = 0 then perform pg_advisory_unlock(778001); return 0; end if;

  for r in select * from email_outbox
           where status='pending' and created_at > now() - interval '14 days'
             and (attempts = 0 or created_at < now() - interval '2 minutes')
           order by (label like 'confirm-%') desc, (label like 'sorry-confirm-%') desc, id
           limit least(cupo, 8) loop
    exit when clock_timestamp() > fin;
    if r.label like 'confirm-%' and exists(select 1 from public.email_send_log l where lower(l.recipient_email)=lower(r.to_email) and l.status in ('sent','delivered') and l.template_name in ('signup','magiclink') and l.created_at>=r.created_at) then
      update public.email_outbox set status='superseded',last_error=null where id=r.id;
      continue;
    end if;
    begin
      select * into res from extensions.http(('POST','https://nylmhdtlshhtjkuvfbms.supabase.co/functions/v1/send-email',
        array[extensions.http_header('apikey',ak), extensions.http_header('Authorization','Bearer '||ak)], 'application/json',
        json_build_object('outbox_id',r.id,'secret',sec,'to',r.to_email,'subject',r.subject,'html',r.html,'label',r.label)::text)::extensions.http_request);
      if res.status = 200 then update email_outbox set status='sent', sent_at=now(), attempts=attempts+1 where id=r.id; n := n+1;
      else
        update email_outbox set attempts=attempts+1, last_error=left(res.content,300) where id=r.id;
        if res.status = 429 then exit; end if;
      end if;
      if res.status = 403 and res.content like '%domain_not_verified%' then exit; end if;
    exception when others then update email_outbox set attempts=attempts+1, last_error=left(SQLERRM,300) where id=r.id; end;
  end loop;

  perform pg_advisory_unlock(778001);
  return n;
end $function$
;


commit;
