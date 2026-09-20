-- Run after the migration inside the SAME transaction and roll back.
insert into public.network_developers(id,user_id,company,status,agreement_accepted_at,agreement_version,agreement_signer,receiving_enabled,share_default,project_name,project_url)
values('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000011','Workflow QA source','approved',now(),'2026-09-17','QA',false,false,'QA source project','https://source.example.test'),
('10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000012','Workflow QA recipient','approved',now(),'2026-09-17','QA',true,false,'QA receiver project','https://receiver.example.test');
insert into public.lead_fingerprints(developer_id,fp,kind,shared,uploaded_at)
values('10000000-0000-4000-8000-000000000001',encode(extensions.digest('network-qa@example.test|rhn1','sha256'),'hex'),'email',false,now()-interval '1 day'),
('10000000-0000-4000-8000-000000000002',encode(extensions.digest('network-qa@example.test|rhn1','sha256'),'hex'),'email',false,now()-interval '1 day');

select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000011","role":"authenticated"}',true);
set local role authenticated;
do $$ declare n bigint; denied boolean; begin
 perform public.dev_network_preferences(true);
 if (public.dev_overview()->'developer'->>'share_default')::boolean then raise exception 'FAIL receiving enabled sharing'; end if;
 if (public.dev_overview()->>'shared')::int<>0 then raise exception 'FAIL receiving shared contacts'; end if;
 perform public.dev_network_preferences(false);
 select id into n from public.lead_fingerprints where developer_id='10000000-0000-4000-8000-000000000001';
 perform public.dev_set_contact_sharing(array[n],true);
 if (public.dev_overview()->'developer'->>'receiving_enabled')::boolean then raise exception 'FAIL sharing enabled receiving'; end if;
 denied:=false;begin perform public.admin_intro_preview(repeat('a',64),'10000000-0000-4000-8000-000000000002',null);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'FAIL developer admin preview'; end if;
 denied:=false;begin update public.lead_fingerprints set shared=false where id=n;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'FAIL direct sharing bypass'; end if;
end $$;
reset role;
do $$ declare a uuid; begin select user_id into a from public.user_roles where role='admin' limit 1; if a is null then raise exception 'Admin fixture context unavailable'; end if; perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);end $$;
set local role authenticated;
do $$ declare fp text:=encode(extensions.digest('network-qa@example.test|rhn1','sha256'),'hex'); preview jsonb; r jsonb; denied boolean; begin
 preview:=public.admin_intro_preview(fp,'10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001');
 if (preview->>'commission_pct')::numeric<>0 or not (preview->>'exempt')::boolean then raise exception 'FAIL prior contact commission'; end if;
 denied:=false;begin perform public.admin_introduce_checked(fp,'10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',null,preview||'{"commission_pct":5}');exception when others then denied:=true;end;
 if not denied then raise exception 'FAIL stale conditions accepted'; end if;
 r:=public.admin_introduce_checked(fp,'10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',null,preview);
 perform set_config('qa.intro',r->>'id',true);
 denied:=false;begin perform public.admin_supply_intro_contact((r->>'id')::uuid,'QA | network-qa@example.test','Spain',100000,'');exception when others then denied:=true;end;
 if not denied then raise exception 'FAIL admin handoff without evidence';end if;
 perform public.admin_supply_intro_contact((r->>'id')::uuid,'QA | network-qa@example.test','Spain',100000,'QA explicit permission for this introduction');
 denied:=false;begin perform public.admin_introduce_checked(fp,'10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',null,preview);exception when others then denied:=true;end;
 if not denied then raise exception 'FAIL duplicate introduction'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000012","role":"authenticated"}',true);
set local role authenticated;
do $$ declare r jsonb;begin
 if public.dev_overview()->'received'->0->>'contact' is not null then raise exception 'FAIL handoff exposed before acceptance';end if;
 delete from public.lead_fingerprints where developer_id='10000000-0000-4000-8000-000000000002';
 if not (public.dev_overview()->'received'->0->>'was_mine')::boolean then raise exception 'FAIL deletion lost exemption';end if;
 perform public.dev_update_intro(current_setting('qa.intro')::uuid,'{"status":"accepted"}');
 r:=public.dev_save_task(null,current_setting('qa.intro')::uuid,'Call buyer',current_date,false);
 perform set_config('qa.task',r->>'id',true);
 if jsonb_array_length(public.dev_tasks())<>1 then raise exception 'FAIL task creation';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000011","role":"authenticated"}',true);
set local role authenticated;
do $$ declare denied boolean; n bigint;begin
 denied:=false;begin perform public.dev_save_task(current_setting('qa.task')::uuid,null,'Stolen task',current_date,true);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'FAIL cross-company task update';end if;
 if jsonb_array_length(public.dev_tasks())<>0 then raise exception 'FAIL cross-company task read';end if;
 denied:=false;begin perform public.dev_authorize_intro_contact(current_setting('qa.intro')::uuid,'QA','network-qa@example.test','',false);exception when others then denied:=true;end;
 if not denied then raise exception 'FAIL contact without permission';end if;
 denied:=false;begin perform public.dev_authorize_intro_contact(current_setting('qa.intro')::uuid,'QA','wrong@example.test','',true);exception when others then denied:=true;end;
 if not denied then raise exception 'FAIL unrelated contact';end if;
 perform public.dev_authorize_intro_contact(current_setting('qa.intro')::uuid,'QA','network-qa@example.test','',true);
 select id into n from public.lead_fingerprints where developer_id='10000000-0000-4000-8000-000000000001';
 perform public.dev_set_contact_sharing(array[n],false);
 if (public.dev_overview()->'given'->0->>'contact_ready')::boolean is distinct from true then raise exception 'FAIL missing contact handoff';end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000012","role":"authenticated"}',true);
set local role authenticated;
do $$ declare r jsonb; denied boolean;begin
 if public.dev_overview()->'received'->0->>'contact' not like '%network-qa@example.test%' then raise exception 'FAIL authorized contact unavailable';end if;
 denied:=false;begin perform public.dev_authorize_intro_contact(current_setting('qa.intro')::uuid,'QA','network-qa@example.test','',true);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'FAIL recipient can forge source permission';end if;
 perform public.dev_update_intro(current_setting('qa.intro')::uuid,'{"status":"contacted"}');
 r:=public.dev_report_sale(current_setting('qa.intro')::uuid,50000,null);
 if not (r->>'exempt')::boolean or (r->>'commission_eur')::numeric<>0 or (r->>'source_share_eur')::numeric<>0 then raise exception 'FAIL exempt sale after deletion';end if;
end $$;
reset role;
-- A later upload must not create an exemption for an existing introduction.
insert into public.introductions(id,buyer_fp,to_developer,status) values('10000000-0000-4000-8000-000000000031',repeat('d',64),'10000000-0000-4000-8000-000000000002','contacted');
insert into public.lead_fingerprints(developer_id,fp,kind,shared,uploaded_at) values('10000000-0000-4000-8000-000000000002',repeat('d',64),'email',false,clock_timestamp());
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000012","role":"authenticated"}',true);
set local role authenticated;
do $$ declare r jsonb;begin
 r:=public.dev_report_sale('10000000-0000-4000-8000-000000000031',20000,null);
 if (r->>'exempt')::boolean or (r->>'commission_eur')::numeric<>1000 then raise exception 'FAIL later upload exemption';end if;
end $$;
reset role;
do $$begin
 if has_function_privilege('anon','public.dev_tasks()','EXECUTE') or has_function_privilege('anon','public.dev_authorize_intro_contact(uuid,text,text,text,boolean)','EXECUTE') then raise exception 'FAIL public access';end if;
end $$;
-- Pausing reception and withdrawing sharing block NEW introductions only.
reset role;
do $$ declare a uuid;begin select user_id into a from public.user_roles where role='admin' limit 1;perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);end $$;
set local role authenticated;
do $$ declare denied boolean:=false;begin
 begin perform public.admin_intro_preview(encode(extensions.digest('network-qa@example.test|rhn1','sha256'),'hex'),'10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001');exception when others then denied:=true;end;
 if not denied then raise exception 'FAIL private contact proposed';end if;
 denied:=false;
 begin perform public.admin_intro_preview(repeat('d',64),'10000000-0000-4000-8000-000000000001',null);exception when others then denied:=true;end;
 if not denied then raise exception 'FAIL paused receiving ignored';end if;
end $$;
reset role;
insert into public.rh_fingerprints(fp,kind,country) values(repeat('e',64),'email','Spain');
do $$ declare a uuid;begin select user_id into a from public.user_roles where role='admin' limit 1;perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);end $$;
set local role authenticated;
do $$ declare p jsonb; r jsonb;begin
 p:=public.admin_intro_preview(repeat('e',64),'10000000-0000-4000-8000-000000000002',null);
 if p->>'source'<>'RealHunt' or (p->>'source_share_pct')::numeric<>0 then raise exception 'FAIL RealHunt source allocation';end if;
 r:=public.admin_introduce_checked(repeat('e',64),'10000000-0000-4000-8000-000000000002',null,null,p);
 perform set_config('qa.rh_intro',r->>'id',true);
end $$;
reset role;
update public.network_developers set commission_pct=7,source_share_pct=4 where id='10000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000012","role":"authenticated"}',true);
set local role authenticated;
do $$ declare r jsonb;begin
 perform public.dev_update_intro(current_setting('qa.rh_intro')::uuid,'{"status":"accepted"}');
 perform public.dev_update_intro(current_setting('qa.rh_intro')::uuid,'{"status":"contacted"}');
 r:=public.dev_report_sale(current_setting('qa.rh_intro')::uuid,10000,null);
 if (r->>'commission_eur')::numeric<>500 or (r->>'source_share_eur')::numeric<>0 then raise exception 'FAIL introduction terms changed after creation';end if;
end $$;
reset role;
-- Contributor registration does not require a property project; receiving does.
reset role;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000013","role":"authenticated"}',true);
set local role authenticated;
insert into public.network_developers(id,user_id,company,contact_name) values('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000013','QA contributor','QA');
do $$ declare denied boolean:=false;begin
 if (public.dev_overview()->'developer'->>'receiving_enabled')::boolean then raise exception 'FAIL contributor automatically receives';end if;
 begin perform public.dev_network_preferences(true);exception when others then denied:=true;end;
 if not denied then raise exception 'FAIL receiving without project';end if;
 perform public.dev_upload_fps('[{"fp":"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff","kind":"email","shared":false}]');
 if (public.dev_overview()->>'leads')::integer<>1 then raise exception 'FAIL contributor cannot protect';end if;
end $$;
reset role;
