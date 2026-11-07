-- 7-nov-2026 (Carlos: "que aparezcan grandes si hay cuota de comunidad HOA... muchas casas son baratas pero
-- luego es muy caro"). Running costs of each home, shown big on cards and on the home page.
alter table realhunt.community_deals
  add column if not exists hoa_monthly numeric,          -- community / HOA fee per month, in hoa_currency
  add column if not exists hoa_currency text,            -- 'USD', 'EUR'...
  add column if not exists hoa_unknown boolean not null default false,  -- a flat/condo whose listing does not state the fee
  add column if not exists tax_annual numeric,           -- property tax per year, in hoa_currency
  add column if not exists costs_note text;              -- e.g. what the fee includes, assessments

-- community_rankings: the row select now also returns hoa_monthly, hoa_currency, hoa_unknown, tax_annual, costs_note
-- (applied by replacing 'd.why_great,d.hunter_handle,' in the live definition).
