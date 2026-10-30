begin;
set local lock_timeout='3s';
set local statement_timeout='30s';

alter table public.network_developers add column receiving_enabled boolean;
update public.network_developers set receiving_enabled=coalesce(mode,'both') not in ('share','protect');
alter table public.network_developers alter column receiving_enabled set default false;
alter table public.network_developers alter column receiving_enabled set not null;

alter table public.introductions add column prior_contact_at timestamptz;
alter table public.introductions add column protection_checked_at timestamptz;
alter table public.introductions add column contact_authorized_at timestamptz;
alter table public.introductions add column contact_authorized_by uuid;
alter table public.introductions add column contact_authorization_note text;
update public.introductions i set prior_contact_at=(select min(l.uploaded_at) from public.lead_fingerprints l where l.developer_id=i.to_developer and l.fp=i.buyer_fp and l.uploaded_at<i.created_at),protection_checked_at=now();

create or replace function public.snapshot_network_protection() returns trigger language plpgsql security definer set search_path=public as $$
begin
 new.created_at:=clock_timestamp();
 select min(uploaded_at) into new.prior_contact_at from public.lead_fingerprints where developer_id=new.to_developer and fp=new.buyer_fp and uploaded_at<least(new.created_at,coalesce((select min(created_at) from public.introductions where to_developer=new.to_developer and buyer_fp=new.buyer_fp),new.created_at));
 new.protection_checked_at:=clock_timestamp();
 return new;
end $$;
create trigger snapshot_network_protection before insert on public.introductions for each row execute function public.snapshot_network_protection();

create table public.network_sharing_events(id bigint generated always as identity primary key,developer_id uuid not null references public.network_developers(id) on delete cascade,fp text not null,shared boolean not null,actor uuid,created_at timestamptz not null default now());
alter table public.network_sharing_events enable row level security;
revoke all on public.network_sharing_events from anon,authenticated;
grant select on public.network_sharing_events to authenticated;
create policy sharing_own_read on public.network_sharing_events for select to authenticated using(public.is_admin(auth.uid()) or developer_id in(select id from public.network_developers where user_id=auth.uid()));
create index sharing_events_owner_date on public.network_sharing_events(developer_id,created_at desc);
create or replace function public.audit_contact_sharing() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_op='INSERT' then
  if new.shared then insert into public.network_sharing_events(developer_id,fp,shared,actor) values(new.developer_id,new.fp,true,auth.uid()); end if;
 elsif tg_op='DELETE' then
  if old.shared and exists(select 1 from public.network_developers where id=old.developer_id) then insert into public.network_sharing_events(developer_id,fp,shared,actor) values(old.developer_id,old.fp,false,auth.uid()); end if;
 elsif old.shared is distinct from new.shared then
  insert into public.network_sharing_events(developer_id,fp,shared,actor) values(new.developer_id,new.fp,new.shared,auth.uid());
 end if;
 return coalesce(new,old);
end $$;
create trigger audit_contact_sharing after insert or update or delete on public.lead_fingerprints for each row execute function public.audit_contact_sharing();

create or replace function public.dev_network_preferences(p_receive boolean) returns jsonb language plpgsql security definer set search_path=public as $$
declare d uuid;
begin
 if p_receive is null then raise exception 'Choose a receiving preference'; end if;
 update public.network_developers set receiving_enabled=p_receive,updated_at=now() where user_id=auth.uid() returning id into d;
 if d is null then raise exception 'Developer sign-in required' using errcode='42501'; end if;
 return jsonb_build_object('ok',true);
end $$;

create or replace function public.dev_set_contact_sharing(p_ids bigint[],p_shared boolean) returns jsonb language plpgsql security definer set search_path=public as $$
declare d uuid; affected integer;
begin
 select id into d from public.network_developers where user_id=auth.uid();
 if d is null then raise exception 'Developer sign-in required' using errcode='42501'; end if;
 if p_shared is null or coalesce(cardinality(p_ids),0)<1 or cardinality(p_ids)>500 then raise exception 'Choose between 1 and 500 contacts'; end if;
 perform 1 from public.lead_fingerprints where id=any(p_ids) and developer_id=d for update;
 if (select count(*) from public.lead_fingerprints where id=any(p_ids) and developer_id=d)<>(select count(distinct v) from unnest(p_ids) v) then raise exception 'Contact not found' using errcode='42501'; end if;
 update public.lead_fingerprints set shared=p_shared where id=any(p_ids) and developer_id=d and shared is distinct from p_shared;
 get diagnostics affected=row_count;
 return jsonb_build_object('ok',true,'changed',affected);
end $$;
revoke update(shared) on public.lead_fingerprints from authenticated,anon;

create or replace function public.admin_intro_preview(p_fp text,p_to uuid,p_from uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare d public.network_developers; prior timestamptz; existing uuid; origin text;
begin
 if not public.is_admin(auth.uid()) then raise exception 'Admin only' using errcode='42501'; end if;
 if p_fp is null or p_fp!~'^[0-9a-f]{64}$' then raise exception 'Invalid buyer fingerprint'; end if;
 select * into d from public.network_developers where id=p_to;
 if d.id is null or d.status<>'approved' or d.agreement_accepted_at is null or d.agreement_version<>'2026-09-17' or not d.receiving_enabled then raise exception 'Choose an approved, signed developer who receives buyers'; end if;
 if p_from=p_to then raise exception 'Source and recipient must be different'; end if;
 if p_from is not null then
  select coalesce(s.project_name,s.company) into origin from public.lead_fingerprints l join public.network_developers s on s.id=l.developer_id where l.fp=p_fp and l.developer_id=p_from and l.shared and s.status='approved';
  if origin is null then raise exception 'This contact is not available for sharing'; end if;
 elsif not exists(select 1 from public.rh_fingerprints where fp=p_fp) then raise exception 'Choose an existing RealHunt buyer';
 end if;
 select min(uploaded_at) into prior from public.lead_fingerprints where fp=p_fp and developer_id=p_to and uploaded_at<coalesce((select min(created_at) from public.introductions where buyer_fp=p_fp and to_developer=p_to),clock_timestamp());
 select id into existing from public.introductions where buyer_fp=p_fp and to_developer=p_to and status<>'lost' limit 1;
 return jsonb_build_object('source',coalesce(origin,'RealHunt'),'recipient',coalesce(d.project_name,d.company),'prior_contact_at',prior,'exempt',prior is not null,'commission_pct',case when prior is not null then 0 else d.commission_pct end,'source_share_pct',case when prior is not null or p_from is null then 0 else d.source_share_pct end,'existing_id',existing,'buyer_fp',p_fp,'to_id',p_to,'from_id',p_from);
end $$;

create or replace function public.admin_introduce_checked(p_fp text,p_to uuid,p_from uuid,p_note text,p_expected jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare preview jsonb; created_id uuid;
begin
 if not public.is_admin(auth.uid()) then raise exception 'Admin only' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_fp||p_to::text,0));
 perform 1 from public.network_developers where id in (p_to,p_from) order by id for update;
 perform 1 from public.lead_fingerprints where fp=p_fp and developer_id in(p_to,p_from) order by id for update;
 preview:=public.admin_intro_preview(p_fp,p_to,p_from);
 if p_expected is null or preview<>p_expected then raise exception 'Conditions changed. Review this introduction again.'; end if;
 if preview->>'existing_id' is not null then raise exception 'Already introduced to this developer'; end if;
 insert into public.introductions(buyer_fp,from_developer,to_developer,fee_eur,note,created_by) values(p_fp,p_from,p_to,0,left(p_note,2000),auth.uid()) returning introductions.id into created_id;
 return jsonb_build_object('ok',true,'id',created_id,'exempt',(preview->>'exempt')::boolean);
end $$;

create or replace function public.dev_authorize_intro_contact(p_intro uuid,p_name text,p_email text,p_phone text,p_authorized boolean) returns jsonb language plpgsql security definer set search_path=public as $$
declare d uuid; i public.introductions; email text; phone text; matched boolean;
begin
 select id into d from public.network_developers where user_id=auth.uid();
 select * into i from public.introductions where id=p_intro and from_developer=d for update;
 if d is null or i.id is null then raise exception 'Introduction not found' using errcode='42501'; end if;
 if p_authorized is distinct from true then raise exception 'Confirm permission to share this contact'; end if;
 if i.status not in ('accepted','contacted','visited','reserved') then raise exception 'The recipient must accept this introduction first'; end if;
 if not exists(select 1 from public.lead_fingerprints where developer_id=d and fp=i.buyer_fp and shared) then raise exception 'This contact is private. Authorize sharing before supplying details.'; end if;
 if length(coalesce(p_name,''))>150 or length(coalesce(p_email,''))>254 or length(coalesce(p_phone,''))>50 or concat_ws('',p_name,p_email,p_phone) ~ E'[|\n\r]' then raise exception 'Use separate name, email and phone fields'; end if;
 email:=lower(trim(coalesce(p_email,''))); phone:=regexp_replace(regexp_replace(coalesce(p_phone,''),'[^0-9]','','g'),'^00','');
 if email<>'' and email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid email'; end if;
 if phone<>'' and length(phone) not between 7 and 15 then raise exception 'Enter a valid international phone'; end if;
 matched:=(email<>'' and encode(extensions.digest(email||'|rhn1','sha256'),'hex')=i.buyer_fp) or (phone<>'' and encode(extensions.digest(phone||'|rhn1','sha256'),'hex')=i.buyer_fp);
 if not matched then raise exception 'Email or phone must match the fingerprint you originally uploaded'; end if;
 update public.introductions set buyer_contact=concat_ws(' | ',nullif(trim(p_name),''),nullif(email,''),nullif(trim(p_phone),'')),contact_authorized_at=now(),contact_authorized_by=auth.uid(),contact_authorization_note='Source confirmed permission for this specific introduction',updated_at=now() where id=i.id;
 return jsonb_build_object('ok',true);
end $$;

create table public.network_tasks(id uuid primary key default gen_random_uuid(),developer_id uuid not null references public.network_developers(id) on delete cascade,introduction_id uuid references public.introductions(id) on delete cascade,title text not null check(length(title) between 1 and 300),due_on date not null,done boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.network_tasks enable row level security;
revoke all on public.network_tasks from authenticated,anon;
create index network_tasks_due on public.network_tasks(developer_id,done,due_on);
create or replace function public.dev_tasks() returns jsonb language plpgsql security definer set search_path=public as $$
declare d uuid;
begin
 select id into d from public.network_developers where user_id=auth.uid();
 if d is null then raise exception 'Developer sign-in required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(to_jsonb(t) order by done,due_on,created_at) from public.network_tasks t where developer_id=d),'[]');
end $$;
create or replace function public.dev_save_task(p_id uuid,p_intro uuid,p_title text,p_due date,p_done boolean) returns jsonb language plpgsql security definer set search_path=public as $$
declare d uuid; t public.network_tasks;
begin
 select id into d from public.network_developers where user_id=auth.uid();
 if d is null then raise exception 'Developer sign-in required' using errcode='42501'; end if;
 if p_intro is not null and not exists(select 1 from public.introductions where id=p_intro and to_developer=d) then raise exception 'Buyer not found' using errcode='42501'; end if;
 if coalesce(length(trim(p_title)),0) not between 1 and 300 or p_due is null or p_done is null then raise exception 'Enter a task and due date'; end if;
 if p_id is null then insert into public.network_tasks(developer_id,introduction_id,title,due_on,done) values(d,p_intro,trim(p_title),p_due,p_done) returning * into t;
 else update public.network_tasks set introduction_id=p_intro,title=trim(p_title),due_on=p_due,done=p_done,updated_at=now() where id=p_id and developer_id=d returning * into t;
 if t.id is null then raise exception 'Task not found' using errcode='42501'; end if;
 end if;
 return to_jsonb(t);
end $$;

-- Existing overview, sale and administration definitions are updated below.

CREATE OR REPLACE FUNCTION public.dev_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d public.network_developers; r jsonb;
begin
 select * into d from public.network_developers where user_id = auth.uid();
 if d.id is null then return null; end if;
 select jsonb_build_object(
 'developer', to_jsonb(d),
 'signed', d.agreement_accepted_at is not null,
 'leads', (select count(*) from public.lead_fingerprints where developer_id = d.id),
 'shared', (select count(*) from public.lead_fingerprints where developer_id = d.id and shared),
 'overlap_network', (select count(distinct l.fp) from public.lead_fingerprints l where l.developer_id = d.id and exists (select 1 from public.lead_fingerprints o where o.fp = l.fp and o.developer_id <> d.id)),
 'overlap_realhunt', (select count(distinct l.fp) from public.lead_fingerprints l where l.developer_id = d.id and exists (select 1 from public.rh_fingerprints r where r.fp = l.fp)),
 'network_developers', (select count(*) from public.network_developers where status = 'approved'),
 'network_leads', (select count(distinct fp) from public.lead_fingerprints),
 'network_shared', (select count(distinct fp) from public.lead_fingerprints where shared),
 'rh_buyers', (select count(*) from public.rh_fingerprints),
 'received', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'status', i.status, 'note', i.note, 'created_at', i.created_at, 'updated_at', i.updated_at, 'buyer', left(i.buyer_fp, 8), 'buyer_fp', i.buyer_fp,
    'from', case when i.from_developer is null then 'RealHunt' else 'Network developer' end,
    'dev_notes', i.dev_notes, 'next_action_at', i.next_action_at, 'buyer_country', i.buyer_country, 'buyer_budget', i.buyer_budget,
    'contact', case when i.status in ('accepted','contacted','visited','reserved','sold') then i.buyer_contact else null end,
    'was_mine', i.prior_contact_at is not null, 'prior_contact_at',i.prior_contact_at,'commission_pct',coalesce(i.commission_pct_snapshot,d.commission_pct),'source_share_pct',case when i.from_developer is null then 0 else coalesce(i.source_share_pct_snapshot,d.source_share_pct) end,
    'deal', (select jsonb_build_object('id', nd.id, 'sale_price', nd.sale_price, 'commission_eur', nd.commission_eur, 'exempt', nd.exempt, 'status', nd.status) from public.network_deals nd where nd.introduction_id = i.id)
  ) order by i.created_at desc), '[]') from public.introductions i where i.to_developer = d.id),
 'given', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'status', i.status, 'fee_eur', i.fee_eur, 'created_at', i.created_at, 'buyer', left(i.buyer_fp, 8), 'to', coalesce(t.project_name, t.company, 'Developer'),
    'contact_ready',i.buyer_contact is not null,'contact_authorized_at',i.contact_authorized_at,'exempt',i.prior_contact_at is not null,'source_share_pct',coalesce(i.source_share_pct_snapshot,t.source_share_pct),'share_eur', (select nd.source_share_eur from public.network_deals nd where nd.introduction_id = i.id), 'share_status', (select case when nd.source_paid_at is not null then 'paid_to_you' when nd.status='paid' then 'ready_for_payout' else nd.status end from public.network_deals nd where nd.introduction_id = i.id)
  ) order by i.created_at desc), '[]') from public.introductions i join public.network_developers t on t.id = i.to_developer where i.from_developer = d.id),
 'deals', (select coalesce(jsonb_agg(jsonb_build_object('id', nd.id, 'introduction_id', nd.introduction_id, 'buyer', left(coalesce(nd.buyer_fp,''), 8), 'sale_price', nd.sale_price, 'commission_pct', nd.commission_pct, 'commission_eur', nd.commission_eur, 'exempt', nd.exempt, 'exempt_reason', nd.exempt_reason, 'status', nd.status, 'reported_at', nd.reported_at, 'invoiced_at', nd.invoiced_at, 'paid_at', nd.paid_at, 'notes', nd.notes, 'from', case when nd.source_developer_id is null then 'RealHunt' else 'Network developer' end) order by nd.reported_at desc), '[]') from public.network_deals nd where nd.developer_id = d.id),
 'owed', (select coalesce(sum(commission_eur), 0) from public.network_deals where developer_id = d.id and status in ('reported','invoiced')),
 'paid_total', (select coalesce(sum(commission_eur), 0) from public.network_deals where developer_id = d.id and status = 'paid'),
 'sales_total', (select coalesce(sum(sale_price), 0) from public.network_deals where developer_id = d.id and status <> 'void'),
 'earned', (select coalesce(sum(source_share_eur), 0) from public.network_deals where source_developer_id = d.id and source_paid_at is not null),
 'pending_earn', (select coalesce(sum(source_share_eur), 0) from public.network_deals where source_developer_id = d.id and source_paid_at is null and status <> 'void'),
 'by_month', (select coalesce(jsonb_agg(jsonb_build_object('m', to_char(m, 'YYYY-MM'), 'n', n) order by m), '[]') from (select date_trunc('month', uploaded_at) m, count(*) n from public.lead_fingerprints where developer_id = d.id group by 1) x)
 ) into r;
 return r;
end $function$

;
CREATE OR REPLACE FUNCTION public.dev_report_sale(p_intro uuid, p_price numeric, p_note text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
 ex:=i.prior_contact_at is not null;
 insert into public.network_deals(introduction_id,developer_id,source_developer_id,buyer_fp,sale_price,commission_pct,commission_eur,source_share_pct,source_share_eur,exempt,exempt_reason,notes,created_by)
 values(i.id,d.id,i.from_developer,i.buyer_fp,round(p_price,2),cp,case when ex then 0 else round(p_price*cp/100,2) end,sp,case when ex or i.from_developer is null then 0 else round(p_price*sp/100,2) end,ex,case when ex then 'Fingerprint was in your list before the introduction' else null end,left(p_note,10000),auth.uid()) returning * into nd;
 update public.introductions set status='sold',updated_at=now() where id=i.id;
 return to_jsonb(nd);
end $function$

;
CREATE OR REPLACE FUNCTION public.admin_network()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
 if not public.is_admin(auth.uid()) then raise exception 'admin only'; end if;
 return jsonb_build_object(
 'developers', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'company', d.company, 'contact_name', d.contact_name, 'email', d.email, 'phone', d.phone, 'website', d.website, 'country', d.country, 'project_name', d.project_name, 'project_url', d.project_url, 'price_from', d.price_from, 'status', d.status, 'fee_eur', d.fee_eur, 'commission_pct', d.commission_pct, 'source_share_pct', d.source_share_pct, 'notes', d.notes, 'mode', d.mode, 'receiving_enabled',d.receiving_enabled, 'created_at', d.created_at,
 'signed_at', d.agreement_accepted_at, 'signer', d.agreement_signer, 'agreement_version', d.agreement_version,
 'leads', (select count(*) from public.lead_fingerprints where developer_id = d.id),
 'shared', (select count(*) from public.lead_fingerprints where developer_id = d.id and shared),
 'overlap_rh', (select count(distinct l.fp) from public.lead_fingerprints l where l.developer_id = d.id and exists (select 1 from public.rh_fingerprints r where r.fp = l.fp)),
 'overlap_net', (select count(distinct l.fp) from public.lead_fingerprints l where l.developer_id = d.id and exists (select 1 from public.lead_fingerprints o where o.fp = l.fp and o.developer_id <> d.id)),
 'intros_in', (select count(*) from public.introductions where to_developer = d.id),
 'intros_out', (select count(*) from public.introductions where from_developer = d.id),
 'sold', (select count(*) from public.introductions where to_developer = d.id and status = 'sold'),
 'owed', (select coalesce(sum(commission_eur),0) from public.network_deals where developer_id = d.id and status in ('reported','invoiced'))
 ) order by d.created_at desc), '[]') from public.network_developers d),
 'matrix', (select coalesce(jsonb_agg(jsonb_build_object('a', m.a, 'b', m.b, 'n', m.n)), '[]') from (select a.developer_id as a, b.developer_id as b, count(distinct a.fp) as n from public.lead_fingerprints a join public.lead_fingerprints b on a.fp = b.fp and a.developer_id < b.developer_id group by 1, 2) m),
 'candidates','[]'::jsonb,
 'introductions', (select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'buyer', left(i.buyer_fp, 8), 'buyer_fp', i.buyer_fp, 'from', coalesce(f.project_name, f.company, 'RealHunt'), 'from_developer', i.from_developer, 'to', coalesce(t.project_name, t.company), 'to_developer', i.to_developer, 'status', i.status, 'fee_eur', i.fee_eur,'prior_contact_at',i.prior_contact_at,'commission_pct',coalesce(i.commission_pct_snapshot,t.commission_pct),'source_share_pct',case when i.from_developer is null then 0 else coalesce(i.source_share_pct_snapshot,t.source_share_pct) end,'contact_authorized_at',i.contact_authorized_at,'contact_authorization_note',i.contact_authorization_note, 'note', i.note, 'created_at', i.created_at, 'buyer_contact', i.buyer_contact, 'buyer_country', i.buyer_country, 'buyer_budget', i.buyer_budget, 'dev_notes', i.dev_notes, 'next_action_at', i.next_action_at) order by i.created_at desc), '[]')
 from public.introductions i left join public.network_developers f on f.id = i.from_developer join public.network_developers t on t.id = i.to_developer),
 'deals', (select coalesce(jsonb_agg(jsonb_build_object('id', nd.id, 'introduction_id', nd.introduction_id, 'buyer', left(coalesce(nd.buyer_fp,''), 8), 'developer', coalesce(dv.project_name, dv.company), 'developer_email', dv.email, 'source', coalesce(sv.project_name, sv.company, 'RealHunt'), 'sale_price', nd.sale_price, 'commission_pct', nd.commission_pct, 'commission_eur', nd.commission_eur, 'source_share_eur', nd.source_share_eur, 'exempt', nd.exempt, 'exempt_reason', nd.exempt_reason, 'status', nd.status, 'reported_at', nd.reported_at, 'invoiced_at', nd.invoiced_at, 'paid_at', nd.paid_at, 'source_paid_at', nd.source_paid_at, 'notes', nd.notes) order by nd.reported_at desc), '[]')
 from public.network_deals nd join public.network_developers dv on dv.id = nd.developer_id left join public.network_developers sv on sv.id = nd.source_developer_id),
 'totals', jsonb_build_object('developers', (select count(*) from public.network_developers), 'approved', (select count(*) from public.network_developers where status = 'approved'), 'pending', (select count(*) from public.network_developers where status = 'pending'), 'signed', (select count(*) from public.network_developers where agreement_accepted_at is not null), 'leads', (select count(distinct fp) from public.lead_fingerprints), 'shared', (select count(distinct fp) from public.lead_fingerprints where shared), 'rh', (select count(*) from public.rh_fingerprints), 'intros', (select count(*) from public.introductions), 'sold', (select count(*) from public.introductions where status = 'sold'),
   'gmv', (select coalesce(sum(sale_price),0) from public.network_deals where status <> 'void'),
   'commission_due', (select coalesce(sum(commission_eur),0) from public.network_deals where status in ('reported','invoiced')),
   'commission_paid', (select coalesce(sum(commission_eur),0) from public.network_deals where status = 'paid'),
   'shares_due', (select coalesce(sum(source_share_eur),0) from public.network_deals where source_paid_at is null and status <> 'void'),
   'fees', (select coalesce(sum(fee_eur), 0) from public.introductions where status in ('accepted','contacted','visited','reserved','sold')))
 );
end $function$

;

create or replace function public.admin_introduce(p_fp text,p_to uuid,p_from uuid,p_note text) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 return public.admin_introduce_checked(p_fp,p_to,p_from,p_note,public.admin_intro_preview(p_fp,p_to,p_from));
end $$;

revoke all on function public.dev_network_preferences(boolean),public.dev_set_contact_sharing(bigint[],boolean),public.admin_intro_preview(text,uuid,uuid),public.admin_introduce_checked(text,uuid,uuid,text,jsonb),public.dev_authorize_intro_contact(uuid,text,text,text,boolean),public.dev_tasks(),public.dev_save_task(uuid,uuid,text,date,boolean) from public,anon;
grant execute on function public.dev_network_preferences(boolean),public.dev_set_contact_sharing(bigint[],boolean),public.admin_intro_preview(text,uuid,uuid),public.admin_introduce_checked(text,uuid,uuid,text,jsonb),public.dev_authorize_intro_contact(uuid,text,text,text,boolean),public.dev_tasks(),public.dev_save_task(uuid,uuid,text,date,boolean) to authenticated;
create or replace function public.admin_rh_candidates(p_query text default '',p_offset integer default 0,p_limit integer default 50) returns jsonb language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin(auth.uid()) then raise exception 'Admin only' using errcode='42501'; end if;
 return (with candidates as(select fp,kind,country,budget,last_seen from public.rh_fingerprints where coalesce(p_query,'')='' or concat_ws(' ',fp,country) ilike '%'||left(p_query,120)||'%') select jsonb_build_object('total',(select count(*) from candidates),'rows',(select coalesce(jsonb_agg(q),'[]') from(select *,null::uuid as from_developer,'RealHunt'::text as from_name from candidates order by last_seen desc nulls last,fp limit greatest(1,least(p_limit,500)) offset greatest(0,p_offset)) q)));
end $$;

create or replace function public.admin_supply_intro_contact(p_id uuid,p_contact text,p_country text,p_budget integer,p_permission_note text) returns jsonb language plpgsql security definer set search_path=public as $$
declare i public.introductions;
begin
 if not public.is_admin(auth.uid()) then raise exception 'Admin only' using errcode='42501'; end if;
 select * into i from public.introductions where id=p_id for update;
 if i.id is null then raise exception 'Introduction not found'; end if;
 if coalesce(length(trim(p_permission_note)),0)<10 or length(p_permission_note)>1000 then raise exception 'Record the permission source for this contact'; end if;
 if coalesce(length(trim(p_contact)),0)=0 or length(p_contact)>1000 or length(coalesce(p_country,''))>100 or p_budget<0 then raise exception 'Enter valid contact details'; end if;
 if not exists(select 1 from regexp_split_to_table(p_contact,E'\\s*[|\\n]\\s*') part where encode(extensions.digest(case when part like '%@%' then lower(trim(part)) else regexp_replace(regexp_replace(part,'[^0-9]','','g'),'^00','') end||'|rhn1','sha256'),'hex')=i.buyer_fp) then raise exception 'Email or phone must match the original buyer fingerprint'; end if;
 update public.introductions set buyer_contact=trim(p_contact),buyer_country=nullif(trim(p_country),''),buyer_budget=p_budget,contact_authorized_at=now(),contact_authorized_by=auth.uid(),contact_authorization_note=trim(p_permission_note),updated_at=now() where id=i.id;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function public.admin_rh_candidates(text,integer,integer),public.admin_supply_intro_contact(uuid,text,text,integer,text) from public,anon;
grant execute on function public.admin_rh_candidates(text,integer,integer),public.admin_supply_intro_contact(uuid,text,text,integer,text) to authenticated;
revoke execute on function public.admin_set_intro_contact(uuid,text,text,integer) from public,anon,authenticated;

commit;
