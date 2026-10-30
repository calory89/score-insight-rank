-- Run inside a transaction after the migration and ROLLBACK. Synthetic records never commit.
insert into public.network_developers(id,user_id,company,status,agreement_accepted_at,agreement_version,agreement_signer,mode)
values ('00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-0000000000b1','QA isolated A','approved',now(),'2026-09-17','QA','both'),
('00000000-0000-4000-8000-0000000000a2','00000000-0000-4000-8000-0000000000b2','QA isolated B','approved',now(),'2026-09-17','QA','both');
insert into public.introductions(id,buyer_fp,to_developer,from_developer,buyer_contact)
values('00000000-0000-4000-8000-0000000000c1',repeat('a',64),'00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-0000000000a2','QA contact');
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000b1","role":"authenticated"}',true);
set local role authenticated;
do $$ declare result jsonb; again jsonb; denied boolean; begin
 if has_function_privilege('anon','public.dev_check_fp(text)','EXECUTE') then raise exception 'FAIL: anonymous contact lookup'; end if;
 if has_function_privilege('anon','public.send_brevo(text,text,text)','EXECUTE') then raise exception 'FAIL: anonymous send'; end if;
 if has_table_privilege('authenticated','public.introductions','SELECT') then raise exception 'FAIL: raw contact access'; end if;
 if (select count(*) from public.network_developers where id in ('00000000-0000-4000-8000-0000000000a1','00000000-0000-4000-8000-0000000000a2'))<>1 then raise exception 'FAIL: cross-company visibility'; end if;
 denied:=false;
 begin update public.network_developers set commission_pct=0 where id='00000000-0000-4000-8000-0000000000a1'; exception when others then denied:=true; end;
 if not denied then raise exception 'FAIL: developer changed commission'; end if;
 denied:=false;
 begin update public.network_developers set status='paused' where id='00000000-0000-4000-8000-0000000000a1'; exception when others then denied:=true; end;
 if not denied then raise exception 'FAIL: developer changed approval'; end if;
 denied:=false;
 begin perform public.admin_platform_health(); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'FAIL: non-admin health access'; end if;
 denied:=false;
 begin perform public.admin_contacts_page(); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'FAIL: non-admin contacts access'; end if;
 result:=public.dev_overview();
 if result->'received'->0->>'contact' is not null then raise exception 'FAIL: contact exposed before acceptance'; end if;
 perform public.dev_update_intro('00000000-0000-4000-8000-0000000000c1','{"status":"accepted"}');
 result:=public.dev_overview();
 if result->'received'->0->>'contact'<>'QA contact' then raise exception 'FAIL: accepted contact unavailable'; end if;
 denied:=false;
 begin perform public.dev_report_sale('00000000-0000-4000-8000-0000000000c1',30000,'QA'); exception when others then denied:=true; end;
 if not denied then raise exception 'FAIL: invalid sale stage accepted'; end if;
 perform public.dev_update_intro('00000000-0000-4000-8000-0000000000c1','{"status":"contacted","dev_notes":"QA note"}');
 result:=public.dev_report_sale('00000000-0000-4000-8000-0000000000c1',30000,'QA');
 again:=public.dev_report_sale('00000000-0000-4000-8000-0000000000c1',30000,'QA');
 if result->>'id'<>again->>'id' then raise exception 'FAIL: duplicate sale'; end if;
 if (result->>'commission_eur')::numeric<>1500 or (result->>'source_share_eur')::numeric<>900 then raise exception 'FAIL: commission calculation'; end if;
 denied:=false;
 begin perform public.dev_report_sale('00000000-0000-4000-8000-0000000000c1',31000,'QA'); exception when others then denied:=true; end;
 if not denied then raise exception 'FAIL: sale price overwrite'; end if;
 if jsonb_array_length(public.dev_buyer_history('00000000-0000-4000-8000-0000000000c1'))<3 then raise exception 'FAIL: missing audit history'; end if;
 result:=public.dev_upload_fps('[{"fp":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","kind":"email","shared":false}]');
 again:=public.dev_upload_fps('[{"fp":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","kind":"email","shared":false}]');
 if (result->>'inserted')::int<>1 or (again->>'duplicates')::int<>1 then raise exception 'FAIL: duplicate import handling'; end if;
 if (public.dev_contacts_page()->>'total')::int<>1 then raise exception 'FAIL: own contacts total'; end if;
 denied:=false;
 begin insert into public.lead_fingerprints(developer_id,fp,kind,uploaded_at) values('00000000-0000-4000-8000-0000000000a1',repeat('c',64),'email',now()-interval '1 year'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'FAIL: forged prior-contact proof'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-0000000000b2","role":"authenticated"}',true);
set local role authenticated;
do $$ declare denied boolean:=false; result jsonb; begin
 begin perform public.dev_update_intro('00000000-0000-4000-8000-0000000000c1','{"dev_notes":"unauthorized"}'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'FAIL: changed another developer buyer'; end if;
 result:=public.dev_overview();
 if jsonb_array_length(result->'received')<>0 or jsonb_array_length(result->'given')<>1 then raise exception 'FAIL: wrong company scope'; end if;
 if result->'given'->0 ? 'contact' or result->'given'->0 ? 'dev_notes' then raise exception 'FAIL: source sees recipient notes/contact'; end if;
end $$;
reset role;
select set_config('request.jwt.claims','{"role":"anon"}',true);
set local role anon;
do $$ declare denied boolean:=false; begin
 begin perform public.dev_check_fp(repeat('a',64)); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'FAIL: public contact lookup'; end if;
end $$;
reset role;
