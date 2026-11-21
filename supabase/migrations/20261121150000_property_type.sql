-- 21-nov-2026 (list 2, idea 70): the kind of home stored with each home, instead of being read from its English title
-- at every build. Values are the kinds src/community/homeLead.ts homeKind knows (its `en` names). Nullable: a home
-- without one falls back to reading the title (homeKind), in scripts/build_static.py and in the app.
-- Fill the approved homes once with supabase/oneoff/20261121_fill_property_type.sql (plain UPDATEs per slug).
alter table realhunt.community_deals
  add column if not exists property_type text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'community_deals_property_type_check') then
    alter table realhunt.community_deals add constraint community_deals_property_type_check check (property_type is null or property_type in
      ('studio','penthouse','duplex','flat','loft','townhouse','villa','bungalow','farmhouse','cottage','chalet','cabin','house','home'));
  end if;
end $$;

-- community_rankings returns the column too, so community_feed and the daily snapshot (public/data/rh-static.json)
-- carry it. Same edit as the hoa and Spanish columns (20261107120000, 20261108200000), done here in SQL: the live
-- definition gets 'd.property_type,' after 'd.why_great,'. If that anchor is not found exactly once, nothing changes
-- and a notice says so (then add the column to the row select by hand).
do $$
declare f record; def text; anchor text := 'd.why_great,'; n int;
begin
  for f in select p.oid from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'realhunt' and p.proname = 'community_rankings' loop
    def := pg_get_functiondef(f.oid);
    if position('d.property_type' in def) > 0 then continue; end if;
    n := (length(def) - length(replace(def, anchor, ''))) / length(anchor);
    if n = 1 then execute replace(def, anchor, anchor || 'd.property_type,');
    else raise notice 'community_rankings: % found % times, property_type not added to the row select', anchor, n; end if;
  end loop;
end $$;
