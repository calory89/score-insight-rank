-- 7-nov-2026 (Carlos: "enseña todas a todos"): every approved home is public at once, for everyone.
-- Before, approval set publish_at to now() + 48 hours so only Insiders saw new homes for two days.
create or replace function realhunt.community_insider_window() returns trigger
language plpgsql as $$
begin
  if new.status = 'approved' and new.publish_at is null and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    new.publish_at := now();
  end if;
  return new;
end $$;

update realhunt.community_deals set publish_at = now() where status = 'approved' and publish_at > now();
