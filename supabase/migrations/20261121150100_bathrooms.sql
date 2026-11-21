-- 21-nov-2026 (list 2, idea 85): number of bathrooms, only when the advert gives it. Nullable: nothing is shown
-- when it is missing (key facts row under the price, numberOfBathroomsTotal in the structured data).
-- The admin import (supabase/functions/realhunt-candidates, action "import") keeps the figure it extracted.
alter table realhunt.community_deals
  add column if not exists bathrooms int;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'community_deals_bathrooms_check') then
    alter table realhunt.community_deals add constraint community_deals_bathrooms_check check (bathrooms is null or bathrooms between 0 and 30);
  end if;
end $$;

-- community_rankings returns the column too (same edit as 20261121150000_property_type.sql: 'd.bathrooms,' after
-- 'd.why_great,'; a notice and no change when the anchor is not found exactly once).
do $$
declare f record; def text; anchor text := 'd.why_great,'; n int;
begin
  for f in select p.oid from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'realhunt' and p.proname = 'community_rankings' loop
    def := pg_get_functiondef(f.oid);
    if position('d.bathrooms' in def) > 0 then continue; end if;
    n := (length(def) - length(replace(def, anchor, ''))) / length(anchor);
    if n = 1 then execute replace(def, anchor, anchor || 'd.bathrooms,');
    else raise notice 'community_rankings: % found % times, bathrooms not added to the row select', anchor, n; end if;
  end loop;
end $$;
