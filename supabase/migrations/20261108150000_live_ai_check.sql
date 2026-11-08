-- 8-nov-2026 (Carlos: "lo que muestra es malo... tiene que crear fichas tan perfectas como las nuestras; si algo es muy
-- barato, di por qué"). Live search v2: every find is checked by Claude vision before it is shown, and the finds that
-- pass become real RealHunt homes, published at once and labelled "Checked by AI, not yet by a person".
--
-- community_deals
--   ai_checked     true while the home was published by the live search's AI check and no person has approved it yet.
--                  A person approving it in /hunt/admin ("moderate" approve) sets it back to false; rejecting it hides it.
--   ai_checked_at  when the AI check published it
--   why_cheap      one plain sentence when the price is well below the area (or the listing has a caveat), else null
--   ai_flags       non-blocking caveats the check found and the page shows (e.g. age_restricted, needs_renovation)
alter table realhunt.community_deals
  add column if not exists ai_checked boolean not null default false,
  add column if not exists ai_checked_at timestamptz,
  add column if not exists why_cheap text,
  add column if not exists ai_flags text[];

-- live_listings: the AI review of each listing and whether it passed the gate (only shown = true is ever reused)
alter table realhunt.live_listings
  add column if not exists review jsonb,
  add column if not exists shown boolean;
-- live_jobs: the work still to do, so a long job continues across several invocations of the function
alter table realhunt.live_jobs add column if not exists work jsonb;

-- community_rankings: the row select also returns the four new columns (so they reach the feed and the static
-- snapshot); applied by replacing 'd.costs_note,' in the live definition, as with the HOA columns.
-- community_api: a person's "approve" clears ai_checked, and the admin queue's approved list says which are AI-checked.
do $$
declare src text;
begin
  src := pg_get_functiondef('realhunt.community_rankings(text,text,text,text,integer,integer)'::regprocedure);
  if position('d.ai_checked' in src) = 0 then
    src := replace(src, 'd.costs_note,', 'd.costs_note,d.ai_checked,d.ai_checked_at,d.why_cheap,d.ai_flags,');
    execute src;
  end if;
  src := pg_get_functiondef('realhunt.community_api(text,text,jsonb)'::regprocedure);
  if position('ai_checked' in src) = 0 then
    src := replace(src, 'reject_reason=NULL WHERE id=target;', 'reject_reason=NULL,ai_checked=false WHERE id=target; /* rh_ai_check_v1 */');
    src := replace(src, '''is_editorial_pick'',is_editorial_pick) ORDER BY approved_at DESC) FROM community_deals WHERE status=''approved''',
                        '''is_editorial_pick'',is_editorial_pick,''ai_checked'',ai_checked,''ai_checked_at'',ai_checked_at,''why_cheap'',why_cheap,''image_urls'',image_urls,''price_eur'',price_eur,''location_name'',location_name,''source_url'',source_url) ORDER BY ai_checked DESC, approved_at DESC) FROM community_deals WHERE status=''approved''');
    execute src;
  end if;
end $$;
