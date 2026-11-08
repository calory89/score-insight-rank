-- 8-nov-2026 (Carlos: "solo español para los que se conectan desde países hispanohablantes, el resto en inglés, pero nunca
-- mezclados: todo bien traducido, las tarjetas, todo"). Spanish versions of each home's own texts. The live search's AI check
-- writes them for every home it publishes; older homes were filled from public/i18n/es-listings.json or translated once.
-- Nullable: the Spanish site falls back to the dictionary (es-listings.json) and then to the English text.
alter table realhunt.community_deals
  add column if not exists title_es text,
  add column if not exists why_great_es text,
  add column if not exists why_cheap_es text;

-- community_rankings: the row select now also returns title_es, why_great_es, why_cheap_es (applied by replacing
-- 'd.why_cheap,d.ai_flags,' with 'd.why_cheap,d.title_es,d.why_great_es,d.why_cheap_es,d.ai_flags,' in the live definition,
-- the same way as the hoa columns in 20261107120000_hoa_costs.sql). community_feed and the detail action read it.
