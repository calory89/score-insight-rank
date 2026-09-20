begin;
set local lock_timeout='3s';
create or replace function public.dev_network_preferences(p_receive boolean) returns jsonb language plpgsql security definer set search_path=public as $$
declare d uuid;
begin
 if p_receive is null then raise exception 'Choose a receiving preference'; end if;
 if p_receive and not exists(select 1 from public.network_developers where user_id=auth.uid() and nullif(trim(project_name),'') is not null and project_url ~ '^https?://') then raise exception 'Add a project name and website in Settings before receiving buyers'; end if;
 update public.network_developers set receiving_enabled=p_receive,updated_at=now() where user_id=auth.uid() returning id into d;
 if d is null then raise exception 'Developer sign-in required' using errcode='42501'; end if;
 return jsonb_build_object('ok',true);
end $$;
create or replace function public.admin_intro_preview(p_fp text,p_to uuid,p_from uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare d public.network_developers; prior timestamptz; existing uuid; origin text;
begin
 if not public.is_admin(auth.uid()) then raise exception 'Admin only' using errcode='42501'; end if;
 if p_fp is null or p_fp!~'^[0-9a-f]{64}$' then raise exception 'Invalid buyer fingerprint'; end if;
 select * into d from public.network_developers where id=p_to;
 if d.id is null or d.status<>'approved' or d.agreement_accepted_at is null or d.agreement_version<>'2026-09-17' or not d.receiving_enabled then raise exception 'Choose an approved, signed developer who receives buyers'; end if;
 if nullif(trim(d.project_name),'') is null or coalesce(d.project_url,'') !~ '^https?://' then raise exception 'Receiving developer needs a project name and website'; end if;
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
commit;
