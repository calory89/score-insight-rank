import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const runtime = process.env.COMMUNITY_DB_RUNTIME || "@electric-sql/pglite";
const { PGlite } = await import(runtime);
const { pgcrypto } = await import(
  process.env.COMMUNITY_DB_CRYPTO || "@electric-sql/pglite/contrib/pgcrypto"
);
const db = new PGlite({ extensions: { pgcrypto } });
await db.exec(`CREATE EXTENSION pgcrypto; CREATE SCHEMA auth; CREATE SCHEMA extensions;
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE FUNCTION public.is_admin(id uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT id='00000000-0000-0000-0000-000000000001'::uuid $$;
 CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
 CREATE TABLE public.app_secrets(key text PRIMARY KEY,value text);
 CREATE TABLE public.ig_finds(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),shortcode text,hook text,external_url text,post_url text,image_urls text[],price_eur int,country_guess text,location_name text,sqm int,bedrooms int,status text,is_beach boolean);
 INSERT INTO ig_finds(shortcode,hook,external_url,image_urls,price_eur,country_guess,location_name,status) VALUES('test-house','A real test listing','https://example.com/listing/1',ARRAY['https://example.com/photo.jpg'],45000,'Italy','Test town','published');
 INSERT INTO ig_finds(shortcode,hook,external_url,image_urls,country_guess,status) VALUES('price-on-request','Price on request home','https://example.com/listing/unknown',ARRAY['https://example.com/unknown.jpg'],'Italy','published');`);
for (const file of [
  "20260920201911_3adec968-398e-425e-bb1d-c3abd340640d.sql",
  "20260920201934_54f2bca1-90b9-44ad-942f-a897994e56a3.sql",
  "20260920223000_community_release.sql",
])
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/" + file, import.meta.url),
      "utf8",
    ),
  );
const one = async (sql, args = []) =>
  Object.values((await db.query(sql, args)).rows[0])[0];
const api = async (action, token, payload = {}) =>
  one("select community_api($1,$2,$3::jsonb)", [
    action,
    token,
    JSON.stringify(payload),
  ]);
const login = async (id) =>
  db.query("select set_config('test.uid',$1,false)", [id || ""]);
const user = "00000000-0000-0000-0000-000000000002";
const admin = "00000000-0000-0000-0000-000000000001";
let visitor, deal, account, submitted;
await test("existing catalog seeds approved discoveries without fake engagement", async () => {
  const f = await one("select community_rankings()");
  assert.equal(f.global_deals, 2);
  assert.equal(f.global_votes, 0);
  deal = f.rows.find(d => d.slug === "test-house");
  assert.equal(f.rows.find(d => d.slug === "price-on-request").price_eur, null);
  await db.exec("DELETE FROM community_deals WHERE slug='price-on-request'");
  assert.equal(deal.slug, "test-house");
  assert.equal(deal.week_net, 0);
  assert.ok(!("submitted_by" in deal));
});
await test("server-issued identity, replay and downvote rejection are atomic", async () => {
  assert.match(
    (await api("vote", "invented", { id: deal.id, value: 1 })).error,
    /expired/,
  );
  visitor = await api("session", null);
  assert.equal(visitor.token.length, 64);
  assert.equal(
    (await api("vote", visitor.token, { id: deal.id, value: 1 })).ok,
    true,
  );
  assert.equal(
    (await api("vote", visitor.token, { id: deal.id, value: 1 })).already,
    true,
  );
  assert.match((await api("vote", visitor.token, { id: deal.id, value: -1 })).error, /Only upvotes/);
  const f = await one("select community_rankings()");
  assert.equal(f.global_votes, 1);
  assert.equal(f.rows[0].week_net, 1);
  assert.equal(f.rows[0].week_up, 1);
  assert.equal(f.rows[0].week_down, 0);
});
await test("sign-in merges anonymous votes into an existing account without duplication", async () => {
  await login(user);
  account = await api("session", null);
  await api("vote", account.token, { id: deal.id, value: 1 });
  await api("session", visitor.token);
  const f = await one("select community_rankings()");
  assert.equal(f.global_votes, 1);
  assert.equal(f.rows[0].week_net, 1);
  assert.equal(await one("select count(*) from community_week_votes"), 1);
});
await test("pending submissions stay private and cannot be self-approved", async () => {
  const r = await api("submit", account.token, {
    url: "https://example.org/listing/2",
    title: "Stone home by the coast",
    country: "Italy",
    price_eur: 39000,
    image: "https://example.org/2.jpg",
    category: "beach",
  });
  assert.equal(r.ok, true, JSON.stringify(r));
  const dash = await api("dashboard", account.token);
  submitted = dash.deals[0];
  assert.equal(submitted.status, "pending");
  assert.equal(
    (
      await api("moderate", account.token, {
        id: submitted.id,
        decision: "approve",
      })
    ).error,
    "Administrator access required",
  );
  assert.equal((await one("select community_rankings()")).global_deals, 1);
});
await test("profiles keep attribution, saves and comments require an account", async () => {
  assert.equal(
    (
      await api("profile", account.token, {
        handle: "coastal_hunter",
        name: "Coastal Hunter",
        bio: "Finding village homes",
      })
    ).ok,
    true,
  );
  assert.equal(
    (await api("dashboard", account.token)).deals[0].hunter_handle,
    "coastal_hunter",
  );
  await api("save", account.token, { id: deal.id, saved: true });
  await api("save", account.token, { id: deal.id, saved: true });
  assert.equal((await api("dashboard", account.token)).saved.length, 1);
  assert.equal(
    (
      await api("comment", account.token, {
        id: deal.id,
        body: "Useful local context",
      })
    ).ok,
    true,
  );
  await login(null);
  assert.equal(
    (await api("save", visitor.token, { id: deal.id, saved: true })).auth,
    true,
  );
  assert.equal(
    (await api("comment", visitor.token, { id: deal.id, body: "Anonymous" }))
      .auth,
    true,
  );
});
await test("detail views deduplicate and comments omit auth identifiers", async () => {
  const a = await api("detail", visitor.token, { slug: deal.slug });
  const b = await api("detail", visitor.token, { slug: deal.slug });
  assert.equal(a.deal.views, b.deal.views);
  assert.equal(a.comments.length, 1);
  assert.equal(a.comments[0].handle, "coastal_hunter");
  assert.ok(!("user_id" in a.comments[0]));
});
await test("admins approve, curate picks and resolve reports", async () => {
  await login(admin);
  const s = await api("session", null);
  assert.equal(s.admin, true);
  assert.equal(
    (await api("moderate", s.token, { id: submitted.id, decision: "approve" }))
      .ok,
    true,
  );
  await api("moderate", s.token, {
    id: submitted.id,
    decision: "pick",
    pick: true,
  });
  assert.equal((await one("select community_rankings()")).picks.length, 1);
  await login(user);
  await api("report", account.token, {
    id: submitted.id,
    reason: "Sold or unavailable",
    detail: "Source removed",
  });
  await login(admin);
  const q = await api("queue", s.token);
  assert.equal(q.reports.length, 1);
  assert.equal(q.reports[0].deal_slug, submitted.slug);
  await api("moderate", s.token, {
    id: submitted.id,
    decision: "reject",
    reason: "Unavailable",
  });
  assert.equal((await api("queue", s.token)).reports.length, 0);
  assert.equal((await one("select community_rankings()")).global_deals, 1);
});
await test("raw tables and obsolete write paths are inaccessible to browsers", async () => {
  for (const role of ["anon", "authenticated"]) {
    assert.equal(
      await one(
        `select has_table_privilege('${role}','community_deals','INSERT')`,
      ),
      false,
    );
    assert.equal(
      await one(
        `select has_table_privilege('${role}','community_votes','SELECT')`,
      ),
      false,
    );
    assert.equal(
      await one(
        `select has_table_privilege('${role}','community_hunters','SELECT')`,
      ),
      false,
    );
    assert.equal(
      await one(
        `select has_function_privilege('${role}','community_cast_vote(uuid,text,uuid,smallint)','EXECUTE')`,
      ),
      false,
    );
  }
});
await test("weekly rollover preserves lifetime and freezes winner snapshots", async () => {
  const old = await one(
    "select id from community_weeks where ends_at>now() order by starts_at limit 1",
  );
  await db.query(
    "update community_deals set approved_at=now()-interval '10 days'",
  );
  await db.query(
    "update community_weeks set ends_at=now()-interval '1 second' where id=$1",
    [old],
  );
  const f = await one("select community_rankings()");
  assert.equal(f.weekly_votes, 0);
  assert.equal(f.global_votes, 1);
  const archive = await one(
    "select snapshot from community_week_winners where week_id=$1 and deal_id=$2",
    [old, deal.id],
  );
  assert.equal(archive.title, deal.title);
  await login(user);
  await api("vote", account.token, { id: deal.id, value: 1 });
  assert.equal(
    await one(
      "select net_score from community_week_winners where week_id=$1 and deal_id=$2",
      [old, deal.id],
    ),
    1,
  );
  const next = await one("select community_rankings()");
  assert.equal(next.rows[0].life_net, 2);
  assert.equal(next.global_votes, 2);
  assert.equal(next.weekly_votes, 1);
  assert.equal((await api("vote", account.token, {id: deal.id, value: 1})).already, true);
  assert.equal((await one("select community_rankings()")).global_votes, 2);
});
await test("launch homes break ties without overriding actual votes", async () => {
  await db.exec("BEGIN");
  try {
    await db.exec("DELETE FROM community_week_votes; DELETE FROM community_votes;");
    await db.exec(`INSERT INTO community_deals(slug,title,source_url,source_key,image_urls,price_eur,country,status,approved_at)
      VALUES('Dc4gpg6slIT','Umbria','https://example.org/umbria','',ARRAY['https://example.org/u.jpg'],35000,'Italy','approved',now()),
      ('acquappesa-sea-view-39000','Acquappesa','https://example.org/acquappesa','',ARRAY['https://example.org/a.jpg'],39000,'Italy','approved',now())`);
    for (const scope of ['week', 'all']) {
      const f = await one("select community_rankings($1)", [scope]);
      assert.deepEqual(f.rows.slice(0,2).map(d => d.slug), ['Dc4gpg6slIT','acquappesa-sea-view-39000']);
      assert.equal(f.global_votes, 0);
    }
    await api('vote',account.token,{id:deal.id,value:1});
    assert.equal((await one('select community_rankings()')).rows[0].id,deal.id);
    assert.equal((await one("select community_rankings('all')")).rows[0].id,deal.id);
  } finally { await db.exec("ROLLBACK"); }
});
await test("anonymous source URLs are gated in rankings, picks and deep detail pages", async () => {
  await db.exec('BEGIN');
  try {
    await login(null);
    const anonymous = await api('session',null);
    await db.exec(`INSERT INTO community_deals(slug,title,source_url,source_key,image_urls,country,status,approved_at)
      SELECT 'catalog-'||n,'Catalog home '||n,'https://example.org/catalog/'||n,'',ARRAY['https://example.org/photo.jpg'],'Italy','approved',now() FROM generate_series(1,175) n`);
    const ids = new Set(); let offset=0, total=0;
    do {
      const page = await one("select community_rankings('week',null,null,null,24,$1)",[offset]);
      total=page.total;
      for(const row of [...page.rows,...page.picks]) {assert.equal(row.source_url,null);assert.equal(row.has_source,true);}
      for(const row of page.rows) ids.add(row.id);
      offset+=page.rows.length;
    } while(offset<total);
    assert.equal(ids.size,total);
    assert.ok(total>175);
    const last=(await one("select community_rankings('week',null,null,null,24,$1)",[total-1])).rows[0];
    assert.ok(last.rank>100);
    const detail=await api('detail',anonymous.token,{slug:last.slug});
    assert.equal(detail.deal.source_url,undefined);
    assert.equal(detail.deal.has_source,true);
    await login(user);
    const signedIn=await api('detail',account.token,{slug:last.slug});
    assert.equal(signedIn.deal.source_url,await one('select source_url from community_deals where id=$1',[last.id]));
    assert.ok((await one('select community_rankings()')).rows.every(d=>d.source_url));
  } finally {await db.exec('ROLLBACK');}
});
await test("link-only submissions require login, remain private and reach the admin queue", async () => {
  await db.exec('BEGIN');
  try {
    await login(null);
    const guest=await api('session',null);
    assert.equal((await api('quick_submit',guest.token,{url:'https://example.org/new-house'})).auth,true);
    await login(user);
    const result=await api('quick_submit',account.token,{url:'https://example.org/new-house',why:'Worth reviewing',submitted_by:admin,status:'approved'});
    assert.equal(result.status,'pending');
    const mine=(await api('dashboard',account.token)).deals.find(d=>d.slug===result.slug);
    assert.equal(mine.submitted_by,user);
    assert.equal(mine.why_great,'Worth reviewing');
    assert.equal(mine.status,'pending');
    assert.equal((await one('select community_rankings()')).rows.some(d=>d.slug===result.slug),false);
    assert.equal((await api('quick_submit',account.token,{url:'https://example.org/new-house?utm_source=again'})).already,true);
    await login('00000000-0000-0000-0000-000000000003');
    const other=await api('session',null);
    assert.equal((await api('dashboard',other.token)).deals.length,0);
    assert.ok((await api('queue',other.token)).error);
    assert.ok((await api('quick_submit',other.token,{url:'https://example.org/new-house'})).error);
    await login(admin);
    const moderator=await api('session',null);
    assert.ok(moderator.pending_submissions>=1);
    assert.ok((await api('queue',moderator.token)).pending.some(d=>d.id===mine.id));
    assert.ok((await api('moderate',moderator.token,{id:mine.id,decision:'approve'})).error);
    assert.equal((await api('moderate',moderator.token,{id:mine.id,decision:'edit',title:'A reviewed coastal home',country:'Italy',location:'Calabria',price_eur:39000,image:'https://example.org/photo.jpg'})).ok,true);
    assert.equal((await api('moderate',moderator.token,{id:mine.id,decision:'approve'})).ok,true);
    await login(user);
    const approved=(await api('dashboard',account.token)).deals.find(d=>d.id===mine.id);
    assert.equal(approved.status,'approved');assert.equal(approved.country,'Italy');assert.equal(approved.lifetime_votes,0);
    assert.ok((await one('select community_rankings()')).rows.some(d=>d.id===mine.id));
    await login(admin);
    await api('moderate',moderator.token,{id:mine.id,decision:'reject',reason:'The advertiser confirmed it is no longer available'});
    await login(user);
    assert.match((await api('dashboard',account.token)).deals.find(d=>d.id===mine.id).reject_reason,/no longer available/);
  } finally {await db.exec('ROLLBACK');}
});
await test("submission spam limits, honeypot and unsafe URLs are enforced on the server", async () => {
  await db.exec('BEGIN');
  try {
    await login(user);
    assert.ok((await api('quick_submit',account.token,{url:'https://example.org/bot',website:'bot-filled'})).error);
    await db.exec('SAVEPOINT invalid_url');
    await assert.rejects(api('quick_submit',account.token,{url:'http://localhost/admin'}),/public listing/);
    await db.exec('ROLLBACK TO SAVEPOINT invalid_url');
    await db.exec("DELETE FROM community_limits WHERE bucket LIKE 'submit:%' OR bucket LIKE 'submit-network:%'");
    for(let i=0;i<10;i++) assert.equal((await api('quick_submit',account.token,{url:'https://example.org/spam-check/'+i})).status,'pending');
    assert.match((await api('quick_submit',account.token,{url:'https://example.org/spam-check/extra'})).error,/submission limit/);
    assert.equal(await one("select has_function_privilege('anon','community_deal(text,text)','EXECUTE')"),false);
  } finally {await db.exec('ROLLBACK');}
});
await test('initial points are separate from real votes, stable on replay, and expire weekly',async()=>{
  const before=await one('select count(*) from community_week_votes');
  await db.exec("ALTER TABLE community_deals DROP CONSTRAINT community_area_positive; UPDATE community_deals SET sqm=0 WHERE status='approved'; ALTER TABLE community_deals ADD CONSTRAINT community_area_positive CHECK(sqm IS NULL OR sqm>0) NOT VALID;");
  await db.exec(await readFile(new URL('../supabase/migrations/20260921010000_launch_points.sql',import.meta.url),'utf8'));
  assert.equal(await one('select count(*) from community_week_votes'),before);
  assert.equal(await one('select count(*) from community_deals where sqm=0'),0);
  await db.exec('BEGIN');
  try {
    await db.exec('UPDATE community_deals SET launch_week_id=(community_current_week()).id WHERE launch_points>0');
    let feed=await one('select community_rankings()');
    const seeded=feed.rows.find(x=>x.launch_points===370);
    assert.ok(seeded);
    assert.equal(seeded.week_net,seeded.week_up+370);
    assert.equal(feed.weekly_points,feed.rows.reduce((s,d)=>s+d.week_net,0));
    await login(null);
    const visitor=await api('session',null);
    assert.equal((await api('vote',visitor.token,{id:seeded.id,value:1})).ok,true);
    const voted=await one('select community_rankings()');
    assert.equal(voted.weekly_votes,feed.weekly_votes+1);
    assert.equal(voted.weekly_points,feed.weekly_points+1);
    assert.equal((await api('vote',visitor.token,{id:seeded.id,value:1})).already,true);
    const detail=(await api('detail',visitor.token,{slug:seeded.slug})).deal;
    assert.equal(detail.week_net,seeded.week_net+1);
    const week=voted.week.id;
    await db.query("UPDATE community_weeks SET ends_at=now()-interval '1 second' WHERE id=$1",[week]);
    const next=await one('select community_rankings()');
    assert.equal(next.weekly_points,0);
    assert.equal(next.weekly_votes,0);
    assert.equal(next.global_points,voted.global_points);
    assert.equal(next.global_votes,voted.global_votes);
  } finally { await db.exec('ROLLBACK'); }
});
await db.close();
