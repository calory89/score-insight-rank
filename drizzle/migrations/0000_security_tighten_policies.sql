-- Score fields on analyses can only be changed by admins or server code
create or replace function public.analyses_guard_scores() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is not null and not public.is_admin(auth.uid()) then
    new.global_score:=old.global_score; new.roi_potential:=old.roi_potential; new.market_stability:=old.market_stability;
    new.demand_strength:=old.demand_strength; new.risk_level:=old.risk_level; new.liquidity_outlook:=old.liquidity_outlook;
    new.market_rank:=old.market_rank; new.market_total:=old.market_total; new.percentile:=old.percentile;
    new.verdict:=old.verdict; new.base_votes:=old.base_votes; new.confidence_level:=old.confidence_level;
    new.user_id:=old.user_id;
  end if;
  return new;
end $$;
drop trigger if exists analyses_guard_scores on public.analyses;
create trigger analyses_guard_scores before update on public.analyses for each row execute function public.analyses_guard_scores();

-- Game scores: bounded values, one save per minute
create or replace function public.game_scores_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.total_rounds <> 10 or new.score < 0 or new.score > new.total_rounds then raise exception 'invalid score'; end if;
  if exists (select 1 from public.game_scores where user_id=new.user_id and played_at > now()-interval '1 minute') then raise exception 'too many scores'; end if;
  new.played_at:=now();
  return new;
end $$;
drop trigger if exists game_scores_guard on public.game_scores;
create trigger game_scores_guard before insert on public.game_scores for each row execute function public.game_scores_guard();

-- Notifications: only for yourself, or by admins
drop policy if exists "Service can insert notifications" on public.notifications;
create policy "Own or admin can insert notifications" on public.notifications for insert to authenticated
  with check (auth.uid() = user_id or public.is_admin(auth.uid()));

-- Alerts / home requests / submissions / votes / error logs: user_id must be the caller or empty
drop policy if exists al_insert on public.alerts;
create policy al_insert on public.alerts for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());
drop policy if exists hr_insert on public.home_requests;
create policy hr_insert on public.home_requests for insert to anon, authenticated with check ((user_id is null or user_id = auth.uid()) and coalesce(contacted,false)=false and coalesce(sold,false)=false);
drop policy if exists hr_admin_update on public.home_requests;
create policy hr_admin_update on public.home_requests for update to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists sub_insert on public.submissions;
create policy sub_insert on public.submissions for insert to anon, authenticated with check ((user_id is null or user_id = auth.uid()) and (status is null or status='pending'));
drop policy if exists sub_admin on public.submissions;
create policy sub_admin on public.submissions for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
drop policy if exists "Anyone can cast a vote" on public.votes;
create policy "Anyone can cast a vote" on public.votes for insert with check (user_id is null or user_id = auth.uid());
drop policy if exists "Service role can insert error logs" on public.error_logs;
create policy "Error logs insert own" on public.error_logs for insert with check (user_id is null or user_id = auth.uid());

-- Page visits: only fresh rows can be updated
drop policy if exists "Update own fresh visit" on public.page_visits;
create policy "Update own fresh visit" on public.page_visits for update to anon, authenticated
  using (created_at > now() - interval '1 day') with check (created_at > now() - interval '1 day');

-- Storage: public buckets don't need list access; uploads limited to images
drop policy if exists sub_read on storage.objects;
drop policy if exists dev_media_read on storage.objects;
drop policy if exists sub_upload on storage.objects;
create policy sub_upload on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'submissions' and lower(name) ~ '^[a-z0-9.\-]+\.(jpe?g|png|webp|gif|heic|avif)$');