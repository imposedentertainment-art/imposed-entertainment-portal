begin;
alter table public.profiles add column if not exists notification_preferences jsonb not null default '{"release_updates":true,"band_invites":true,"announcements":true,"unread_badge":true}'::jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='profiles_notification_preferences_object') then
    alter table public.profiles add constraint profiles_notification_preferences_object check (jsonb_typeof(notification_preferences) = 'object');
  end if;
end $$;
create table if not exists public.release_track_feedback (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  track_id uuid not null references public.release_tracks(id) on delete cascade,
  track_title text not null,
  position_seconds integer not null check (position_seconds between 0 and 86400),
  body text not null check (length(btrim(body)) between 1 and 1200),
  author_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists release_track_feedback_release_created_idx on public.release_track_feedback (release_id, created_at desc);
create index if not exists release_track_feedback_track_idx on public.release_track_feedback (track_id);
alter table public.release_track_feedback enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='release_track_feedback' and policyname='track feedback read accessible release') then
    create policy "track feedback read accessible release" on public.release_track_feedback for select to authenticated using (public.can_see_release(release_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='release_track_feedback' and policyname='track feedback create accessible release') then
    create policy "track feedback create accessible release" on public.release_track_feedback for insert to authenticated with check (author_id = (select auth.uid()) and public.can_see_release(release_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='release_track_feedback' and policyname='track feedback author or admin delete') then
    create policy "track feedback author or admin delete" on public.release_track_feedback for delete to authenticated using (author_id = (select auth.uid()) or public.is_admin());
  end if;
end $$;
grant select, insert, delete on public.release_track_feedback to authenticated;
create or replace function public.guard_release_track_feedback()
returns trigger language plpgsql security definer set search_path = public
as $$ declare actual_release uuid; begin
  select release_id into actual_release from public.release_tracks where id = new.track_id;
  if actual_release is null or actual_release <> new.release_id then
    raise exception 'The selected track does not belong to this release.' using errcode = '23514';
  end if;
  new.track_title := (select title from public.release_tracks where id = new.track_id);
  return new;
end; $$;
drop trigger if exists guard_release_track_feedback on public.release_track_feedback;
create trigger guard_release_track_feedback before insert or update of release_id, track_id, track_title on public.release_track_feedback for each row execute function public.guard_release_track_feedback();
revoke execute on function public.get_invite(text) from public;
grant execute on function public.get_invite(text) to anon, authenticated;
revoke execute on function public.accept_band_invite(uuid, boolean) from public, anon;
grant execute on function public.accept_band_invite(uuid, boolean) to authenticated;
revoke execute on function public.can_see_release(uuid) from public, anon;
grant execute on function public.can_see_release(uuid) to authenticated;
revoke execute on function public.create_band(text, text) from public, anon;
grant execute on function public.create_band(text, text) to authenticated;
revoke execute on function public.get_profile(uuid) from public, anon;
grant execute on function public.get_profile(uuid) to authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.is_band_member(uuid) from public, anon;
grant execute on function public.is_band_member(uuid) to authenticated;
revoke execute on function public.my_band_invites() from public, anon;
grant execute on function public.my_band_invites() to authenticated;
revoke execute on function public.profile_discography(uuid) from public, anon;
grant execute on function public.profile_discography(uuid) to authenticated;
revoke execute on function public.search_profiles(text) from public, anon;
grant execute on function public.search_profiles(text) to authenticated;
revoke execute on function public.shares_band(uuid) from public, anon;
grant execute on function public.shares_band(uuid) to authenticated;
commit;
