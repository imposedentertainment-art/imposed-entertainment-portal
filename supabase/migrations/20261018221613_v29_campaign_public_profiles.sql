begin;
alter table public.profiles
  add column if not exists public_slug text,
  add column if not exists is_public boolean not null default false,
  add column if not exists public_profile_preferences jsonb not null default '{"bio":true,"links":true,"location":true,"discography":true,"email":false}'::jsonb;
alter table public.profiles drop constraint if exists profiles_public_slug_format;
alter table public.profiles add constraint profiles_public_slug_format check (public_slug is null or public_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
alter table public.profiles drop constraint if exists profiles_public_preferences_object;
alter table public.profiles add constraint profiles_public_preferences_object check (jsonb_typeof(public_profile_preferences) = 'object');
create unique index if not exists profiles_public_slug_unique on public.profiles (public_slug) where public_slug is not null;
update public.profiles p set public_slug = lower(trim(both '-' from regexp_replace(coalesce(nullif(p.display_name,''), 'artist') || '-' || substr(p.id::text,1,6), '[^a-zA-Z0-9]+', '-', 'g'))) where p.is_public = true and p.public_slug is null;
alter table public.release_tasks add column if not exists created_at timestamptz not null default now();
alter table public.release_tasks add column if not exists priority text not null default 'normal';
alter table public.release_tasks add column if not exists assigned_to uuid references public.profiles(id) on delete set null;
alter table public.release_tasks drop constraint if exists release_tasks_priority_check;
alter table public.release_tasks add constraint release_tasks_priority_check check (priority in ('low','normal','high','urgent'));
create index if not exists release_tasks_open_due_idx on public.release_tasks (due_date, release_id) where done = false;
create index if not exists release_tasks_assigned_to_idx on public.release_tasks (assigned_to) where assigned_to is not null;
alter table public.release_track_feedback add column if not exists resolved_at timestamptz;
alter table public.release_track_feedback add column if not exists resolved_by uuid references public.profiles(id) on delete set null;
create index if not exists release_track_feedback_open_idx on public.release_track_feedback (release_id, created_at desc) where resolved_at is null;
create or replace function public.get_public_artist_page(p_slug text)
returns jsonb language sql stable security definer set search_path = public
as $function$
  select jsonb_build_object(
    'id', p.id, 'public_slug', p.public_slug,
    'display_name', coalesce(nullif(p.display_name,''), 'Artist'),
    'tagline', p.tagline,
    'bio', case when coalesce((p.public_profile_preferences->>'bio')::boolean, true) then p.bio end,
    'location', case when coalesce((p.public_profile_preferences->>'location')::boolean, true) then p.location end,
    'accent', p.accent, 'avatar_path', p.avatar_path, 'banner_path', p.banner_path,
    'links', case when coalesce((p.public_profile_preferences->>'links')::boolean, true) then p.links else '[]'::jsonb end,
    'contact_email', case when p.show_email and coalesce((p.public_profile_preferences->>'email')::boolean, false) then p.email end,
    'releases', case when coalesce((p.public_profile_preferences->>'discography')::boolean, true) then (
      select coalesce(jsonb_agg(jsonb_build_object('title',r.title,'release_type',r.release_type,'release_date',r.release_date,'artist_name',r.artist_name) order by r.release_date desc nulls last), '[]'::jsonb)
      from public.releases r where r.owner_id = p.id and r.status = 'Live'
    ) else '[]'::jsonb end
  ) from public.profiles p
  where p.public_slug = lower(trim(p_slug)) and p.is_public = true and p.role::text <> 'label_admin'
  limit 1;
$function$;
revoke all on function public.get_public_artist_page(text) from public;
grant execute on function public.get_public_artist_page(text) to anon, authenticated;
drop policy if exists "tasks owner create artist tasks" on public.release_tasks;
create policy "tasks owner create artist tasks" on public.release_tasks for insert to authenticated
with check (assignee = 'artist' and public.can_see_release(release_id) and exists (
  select 1 from public.releases r where r.id = release_tasks.release_id
  and (r.owner_id = auth.uid() or (r.band_id is not null and public.is_band_member(r.band_id)))
));
drop policy if exists "release feedback admin resolve" on public.release_track_feedback;
create policy "release feedback admin resolve" on public.release_track_feedback for update to authenticated
using (public.is_admin()) with check (public.is_admin());
commit;
