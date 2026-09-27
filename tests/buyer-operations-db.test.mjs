import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.COMMUNITY_DB_RUNTIME||'@electric-sql/pglite');
const db=new PGlite();
await db.exec(`CREATE SCHEMA auth;CREATE ROLE anon;CREATE ROLE authenticated;
CREATE TABLE auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,created_at timestamptz default now());
CREATE TABLE suppressed_emails(email text);CREATE TABLE email_outbox(id bigint generated always as identity,to_email text,subject text,html text,created_at timestamptz default now());
CREATE TABLE email_send_log(template_name text,status text,created_at timestamptz);CREATE TABLE email_delivery_events(event_type text,provider_email_id text,event_at timestamptz);
CREATE TABLE rh_telemetry_events(event text,sid text,meta jsonb,created_at timestamptz);
CREATE FUNCTION send_brevo(text,text,text) RETURNS void LANGUAGE sql AS $$INSERT INTO email_outbox(to_email,subject,html) VALUES($1,$2,$3)$$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT nullif(current_setting('test.uid',true),'')::uuid$$;
CREATE FUNCTION public.is_admin(id uuid) RETURNS boolean LANGUAGE sql AS $$SELECT coalesce(id='00000000-0000-0000-0000-000000000001'::uuid,false)$$;
CREATE FUNCTION public.community_limit(text,integer,integer) RETURNS boolean LANGUAGE sql AS $$SELECT true$$;`);
const schema=JSON.parse(await readFile(new URL('./upgrade-schema.json',import.meta.url),'utf8'));
for(const table of [...new Set(schema.map(r=>r.table_name))]){
 const cols=schema.filter(r=>r.table_name===table).map(r=>`"${r.column_name}" ${r.type}${r.column_name==='id'?' PRIMARY KEY'+(r.type==='uuid'?' DEFAULT gen_random_uuid()':''):''}`);
 await db.exec(`CREATE TABLE public.${table}(${cols.join(',')})`);
}
for(const file of ['20260927140000_buyer_quality_operations.sql','20260927141000_finance_and_alert_ownership.sql','20260927142000_buyer_alerts_and_metrics.sql','20260927143000_alert_delivery_schedule.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
const admin='00000000-0000-0000-0000-000000000001',owner='00000000-0000-0000-0000-000000000002',stranger='00000000-0000-0000-0000-000000000003';
const one=async(sql,args=[])=>Object.values((await db.query(sql,args)).rows[0])[0];
const login=async(id)=>one("select set_config('test.uid',$1,false)",[id||'']);
await db.query('insert into auth.users(id,email) values($1,$2),($3,$4),($5,$6)',[admin,'admin@example.test',owner,'owner@example.test',stranger,'stranger@example.test']);
const deal=await one("insert into community_deals(slug,title,status,image_urls,created_at) values('house','Test house','approved',ARRAY['/a.webp'],now()) returning id");
await test('quality queue denies ordinary accounts and only records an availability date after an explicit check',async()=>{
 await login(owner);await assert.rejects(one('select rh_quality_queue()'),/Admin only/);
 await login(admin);assert.equal((await one('select rh_quality_queue()')).length,1);
 await one("select rh_check_listing($1,78,2,'facts','https://example.test/house','Source states 78 square metres and 2 bedrooms')",[deal]);
 assert.equal(await one('select verified_at from community_deals where id=$1',[deal]),null);
 assert.equal(await one('select sqm from community_deals where id=$1',[deal]),78);
 await one("select rh_check_listing($1,null,null,'price_availability','https://example.test/house','Seller confirmed price and availability today')",[deal]);
 assert.ok(await one('select verified_at from community_deals where id=$1',[deal]));
 assert.equal(await one('select count(*) from listing_checks'),2);
});
await test('anonymous visitors cannot overwrite or take ownership of existing alerts',async()=>{
 await login(owner);await one("select community_save_alert('',ARRAY['Italy'],40000,'beach')");
 await login(null);await one("select community_save_alert('owner@example.test',ARRAY['Spain'],100000,'city')");
 assert.equal(await one("select max_price from alerts where email='owner@example.test'"),40000);
 await login(stranger);const r=await one("select community_save_alert('owner@example.test',ARRAY['Japan'],10000,'village')");assert.ok(r.error);
 assert.equal(await one("select user_id from alerts where email='owner@example.test'"),owner);
});
await test('preference and notification RPCs isolate each account',async()=>{
 await login(owner);await one("select rh_buyer_preferences('off',ARRAY['price_drop'])");
 assert.equal(await one("select active from alerts where user_id=$1",[owner]),false);
 await login(stranger);assert.equal((await one('select rh_buyer_preferences()')).frequency,'weekly');
 await db.query("insert into notifications(user_id,title,read) values($1,'Private update',false)",[owner]);
 assert.equal((await one('select rh_notifications(true)')).length,0);
 assert.equal(await one('select read from notifications where user_id=$1',[owner]),false);
 await login(null);await assert.rejects(one('select rh_buyer_preferences()'),/Sign in/);
});
let board,token;
await test('board discussions require a valid invitation, revoke blocks new members, and private notes stay private',async()=>{
 board=await one("insert into community_boards(user_id,slug,name,deal_ids) values($1,'test-board','Test',ARRAY[]::uuid[]) returning id",[owner]);
 await login(owner);token=(await one("select rh_board_workspace('test-board','invite')")).invite;
 await one("select rh_board_workspace('test-board','comment','My private priorities')");
 await login(stranger);await assert.rejects(one("select rh_board_workspace('test-board')"),/invited/);
 await one("select rh_board_workspace('test-board','join',$1)",[token]);
 assert.equal((await one("select rh_board_workspace('test-board')")).comments[0].body,'My private priorities');
 await assert.rejects(one("select rh_board_workspace('test-board','invite')"),/owner/);
 await login(owner);await one("select rh_board_workspace('test-board','revoke')");
 await login(admin);await assert.rejects(one("select rh_board_workspace('test-board','join',$1)",[token]),/expired or revoked/);
});
let intro,sale;
await test('sharing changes are audited and unrelated developers cannot open a dispute',async()=>{
 const dev=await one("insert into network_developers(user_id,company) values($1,'Owner developer') returning id",[owner]);
 intro=await one("insert into introductions(to_developer,commission_pct_snapshot,source_share_pct_snapshot,status) values($1,5,3,'accepted') returning id",[dev]);
 await db.query("insert into lead_fingerprints(id,developer_id,fp,shared) values(1,$1,repeat('a',64),false)",[dev]);
 await db.exec('update lead_fingerprints set shared=true where id=1');assert.equal(await one('select count(*) from lead_sharing_history'),2);
 await login(stranger);await assert.rejects(one("select rh_network_cases($1,'open',null,'This is my dispute')",[intro]),/Not permitted/);
 await login(owner);const c=await one("select rh_network_cases($1,'open',null,'Please check the prior contact evidence')",[intro]);assert.equal(c.length,1);
 await assert.rejects(one("select rh_network_cases($1,'resolved',$2,'I resolved it myself')",[intro,c[0].id]),/Admin only/);
 await login(admin);await one("select rh_network_cases($1,'resolved',$2,'Reviewed documentary evidence with both parties')",[intro,c[0].id]);
 sale=await one("insert into network_deals(introduction_id,developer_id,commission_eur,source_share_eur,status,currency,exempt) values($1,$2,5000,3000,'reported','EUR',false) returning id",[intro,dev]);
});
await test('partial collections are idempotent; payouts cannot precede collection; refunds preserve accounting',async()=>{
 await login(owner);await assert.rejects(one('select rh_finance()'),/Admin only/);
 await login(admin);const key='00000000-0000-0000-0000-000000000010';
 await one("select rh_finance($1,'collection',2000,'Bank ref 1',$2)",[sale,key]);
 await one("select rh_finance($1,'collection',2000,'Bank ref 1',$2)",[sale,key]);
 assert.equal(await one('select count(*) from network_cash_journal'),1);
 await assert.rejects(one("select rh_finance($1,'collection',1000,'Other ref',$2)",[sale,key]),/already used/);
 await assert.rejects(one("select rh_finance($1,'referral_payment',100,'Bank ref 2',gen_random_uuid())",[sale]),/Collect the full/);
 await one("select rh_finance($1,'collection',3000,'Bank ref 3',gen_random_uuid())",[sale]);
 assert.equal(await one('select status from network_deals where id=$1',[sale]),'paid');
 await one("select rh_finance($1,'referral_payment',3000,'Bank ref 4',gen_random_uuid())",[sale]);
 await assert.rejects(one("select rh_finance($1,'refund',5000,'Bank refund',gen_random_uuid())",[sale]),/recover referral/);
 await one("select rh_finance($1,'referral_return',3000,'Returned ref',gen_random_uuid())",[sale]);
 await one("select rh_finance($1,'refund',5000,'Seller refunded',gen_random_uuid())",[sale]);
 const r=(await one('select rh_finance($1)',[sale]))[0];assert.equal(Number(r.collected),0);assert.equal(Number(r.referral_paid),0);assert.equal(r.status,'disputed');
});
await test('raw private tables and admin RPCs are unavailable to anonymous role',async()=>{
 await db.exec('SET ROLE anon');await assert.rejects(one('select count(*) from board_discussion'),/permission denied/);await assert.rejects(one('select rh_quality_queue()'),/permission denied/);await db.exec('RESET ROLE');
});
await test('members can manage board homes; removal revokes access and old invitations',async()=>{
 await login(stranger);let r=await one("select rh_board_workspace('test-board','toggle_home',$1)",[deal]);assert.equal(r.homes.length,1);
 await login(owner);await one("select rh_board_workspace('test-board','remove_member',$1)",[stranger]);
 await login(stranger);await assert.rejects(one("select rh_board_workspace('test-board')"),/invited/);
});
await test('alerts require confirmation, honor preferences, exclude seen homes and never enqueue a digest twice',async()=>{
 await login(owner);await one("select rh_buyer_preferences('daily',ARRAY['new','price_drop'])");
 await db.query("update buyer_preferences set updated_at=now()-interval '1 minute' where user_id=$1",[owner]);
 await db.query("update community_deals set country='Italy',category='beach',price_eur=40000 where id=$1",[deal]);
 await db.query("update community_deals set price_eur=30000 where id=$1",[deal]);
 assert.equal(await one('select rh_queue_buyer_alerts()'),0);
 await db.query('update auth.users set email_confirmed_at=now() where id=$1',[owner]);
 assert.equal(await one('select rh_queue_buyer_alerts()'),1);assert.equal(await one('select rh_queue_buyer_alerts()'),0);
 assert.equal(await one('select count(*) from email_outbox'),1);
 await one("select rh_buyer_preferences('off',ARRAY['price_drop'])");await db.query('update community_deals set price_eur=20000 where id=$1',[deal]);assert.equal(await one('select rh_queue_buyer_alerts()'),0);
 await one("select rh_buyer_preferences('daily',ARRAY['new'])");
 const other=await one("insert into community_deals(slug,title,status,country,category,price_eur) values('second','Second','approved','Italy','beach',30000) returning id");
 await one("select rh_seen('second')");await db.exec("update buyer_alert_receipts set queued_at=now()-interval '2 days'");assert.equal(await one('select rh_queue_buyer_alerts()'),0);
 await db.query("insert into community_deals(slug,title,status,country,category,price_eur) values('third','<script>Home</script>','approved','Italy','beach',30000)");
 assert.equal(await one('select rh_queue_buyer_alerts()'),1);
 assert.match(await one('select html from email_outbox order by id desc limit 1'),/&lt;script&gt;/);
 await db.exec("update buyer_alert_receipts set queued_at=now()-interval '2 days'");
 await db.query('insert into suppressed_emails values($1)',['owner@example.test']);
 await db.query("insert into community_deals(slug,title,status,country,category,price_eur) values('fourth','Fourth','approved','Italy','beach',30000)");
 assert.equal(await one('select rh_queue_buyer_alerts()'),0);
});
await test('quality metrics hide aggregates from non-admin accounts and distinguish delivery',async()=>{
 await login(owner);await assert.rejects(one('select rh_quality_metrics()'),/Admin only/);
 await login(admin);await db.exec("insert into email_send_log values('confirmation','sent',now());insert into email_delivery_events values('email.delivered','message1',now()),('email.delivered','message1',now());");
 const m=await one('select rh_quality_metrics()');assert.equal(m.mail_attempts[0].attempts,1);assert.equal(m.delivery_events[0].messages,1);
});
await db.close();
