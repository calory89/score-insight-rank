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
 INSERT INTO ig_finds(shortcode,hook,external_url,image_urls,price_eur,country_guess,location_name,status) VALUES('test-house','A real test listing','https://example.com/listing/1',ARRAY['https://example.com/photo.jpg'],45000,'Italy','Test town','published');`);
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
  assert.equal(f.global_deals, 1);
  assert.equal(f.global_votes, 0);
  deal = f.rows[0];
  assert.equal(deal.slug, "test-house");
  assert.equal(deal.week_net, 0);
  assert.ok(!("submitted_by" in deal));
});
await test("server-issued identity, replay and vote reversal are atomic", async () => {
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
  await api("vote", visitor.token, { id: deal.id, value: -1 });
  const f = await one("select community_rankings()");
  assert.equal(f.global_votes, 1);
  assert.equal(f.rows[0].week_net, -1);
  assert.equal(f.rows[0].week_up, 0);
  assert.equal(f.rows[0].week_down, 1);
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
  await api("vote", account.token, { id: deal.id, value: -1 });
  assert.equal(
    await one(
      "select net_score from community_week_winners where week_id=$1 and deal_id=$2",
      [old, deal.id],
    ),
    1,
  );
  assert.equal((await one("select community_rankings()")).rows[0].life_net, -1);
});
await db.close();
