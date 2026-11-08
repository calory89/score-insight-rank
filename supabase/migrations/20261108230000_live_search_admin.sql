-- Live search v3 (8-nov-2026): admins (realhunt.is_admin) get their own, higher daily Claude budget so the owner can
-- test; their spend is kept apart from the global cap that protects normal visitors' searches.
alter table realhunt.live_jobs add column if not exists admin boolean not null default false;
create index if not exists live_jobs_admin_day on realhunt.live_jobs (admin, created_at);
