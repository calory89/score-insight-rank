-- 8-nov-2026 (Carlos: noise and flood risk for every home, on the home page and on the map).
-- Filled by scripts/risks.py from free public sources (OpenStreetMap/Overpass, OurAirports, FEMA NFHL,
-- Open-Meteo elevation, Natural Earth). Shape:
--   {"noise":{"level":"high|medium|low|null","motorway_m":int|null,"rail_m":int|null,"airport_km":num|null,
--             "airport":text,"roads_checked":bool,"source":text},
--    "flood":{"level":"high|medium|low|null","source":"FEMA NFHL|rough","zone"?:text,"elev_m"?:int,
--             "coast_km"?:num,"river_km"?:num,"map":url,"map_name":text,"note":text},
--    "updated":"2026-11"}
alter table realhunt.community_deals add column if not exists risks jsonb;

-- community_rankings: the row select now also returns d.risks
-- (applied live by replacing 'd.costs_note,d.hunter_handle,' with 'd.costs_note,d.risks,d.hunter_handle,' in the definition).
