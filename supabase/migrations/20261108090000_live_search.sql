-- 8-nov-2026: live web search (edge function realhunt-live-search).
-- Every search is saved in live_jobs (query, what it understood, who asked as a user id or a salted IP hash,
-- what it cost, what it found) and every listing it finds in live_listings, so each search grows the data and
-- later searches can be answered from it without spending. Only the edge function (service role) reads or
-- writes these tables: RLS is on with no policies and the API roles have no grants.
create table if not exists realhunt.live_jobs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  q text not null,
  lang text,
  qkey text,
  parsed jsonb,
  user_id uuid,
  ip_hash text,
  status text not null default 'queued' check (status in ('queued', 'running', 'done', 'error', 'rejected', 'cached', 'capped', 'need_login')),
  progress int not null default 0,
  stage jsonb,
  results jsonb not null default '[]'::jsonb,
  note text,
  provider text,
  cost_usd numeric(10, 5) not null default 0,
  usage jsonb,
  ref_job uuid
);
create index if not exists live_jobs_qkey on realhunt.live_jobs (qkey, created_at desc);
create index if not exists live_jobs_ip on realhunt.live_jobs (ip_hash, created_at desc);
create index if not exists live_jobs_user on realhunt.live_jobs (user_id, created_at desc);
create index if not exists live_jobs_created on realhunt.live_jobs (created_at desc);

create table if not exists realhunt.live_listings (
  id bigint generated always as identity primary key,
  url text not null unique,
  kind text not null check (kind in ('buy', 'rent')),
  q text,
  qkey text,
  country text,
  place text,
  price_eur numeric,
  beds int,
  sqm int,
  data jsonb not null default '{}'::jsonb,
  score int,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  deal_slug text
);
create index if not exists live_listings_match on realhunt.live_listings (country, kind, score desc, last_seen desc);

alter table realhunt.live_jobs enable row level security;
alter table realhunt.live_listings enable row level security;
revoke all on realhunt.live_jobs from anon, authenticated;
revoke all on realhunt.live_listings from anon, authenticated;
grant all on realhunt.live_jobs, realhunt.live_listings to service_role;
