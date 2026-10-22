-- All of these tables were verified empty (0 rows) before dropping. profiles (1 label admin row) is kept.
drop table if exists public.tracks cascade;
drop table if exists public.releases cascade;
drop table if exists public.band_members cascade;
drop table if exists public.bands cascade;
drop table if exists public.invites cascade;

-- Remove the old wide-open policies (any signed-in user could edit every profile and role).
drop policy if exists "Enable authenticated access for profiles" on public.profiles;
drop policy if exists "authenticated users upload 13cu0ag_0" on storage.objects;
drop policy if exists "manage files 13cu0ag_0" on storage.objects;
drop policy if exists "manage files 13cu0ag_1" on storage.objects;
drop policy if exists "manage files 13cu0ag_2" on storage.objects;
drop policy if exists "public access for releases 13cu0ag_0" on storage.objects;

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
update public.profiles set display_name = coalesce(display_name, full_name, split_part(email,'@',1));

create table public.releases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  artist_name text not null,
  release_type text not null default 'Single',
  genre text not null default 'Other',
  release_date date,
  c_line text default '',
  p_line text default '',
  territory text not null default 'Worldwide',
  stores jsonb not null default '[]'::jsonb,
  status text not null default 'Draft' check (status in ('Draft','Submitted','Changes Requested','Approved','Live','Rejected')),
  artwork_path text,
  metadata_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.release_tracks (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  track_number integer not null,
  title text not null,
  version text default '',
  isrc text default '',
  audio_path text,
  duration_seconds numeric,
  created_at timestamptz not null default now(),
  unique(release_id, track_number)
);
create table public.release_events (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  note text default '',
  created_at timestamptz not null default now()
);
create index releases_owner_id_idx on public.releases(owner_id);
create index releases_status_idx on public.releases(status);
create index tracks_release_id_idx on public.release_tracks(release_id);
create index events_release_id_idx on public.release_events(release_id);
alter table public.profiles enable row level security;
alter table public.releases enable row level security;
alter table public.release_tracks enable row level security;
alter table public.release_events enable row level security;

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role::text in ('admin','label_admin'));
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create policy "profile self read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "profile self insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profile self update" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
create policy "release owner/admin select" on public.releases for select to authenticated using (owner_id = auth.uid() or public.is_admin());
create policy "release owner insert" on public.releases for insert to authenticated with check (owner_id = auth.uid());
create policy "release owner/admin update" on public.releases for update to authenticated using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy "release owner/admin delete" on public.releases for delete to authenticated using (owner_id = auth.uid() or public.is_admin());
create policy "track owner/admin access" on public.release_tracks for all to authenticated
using (exists(select 1 from public.releases r where r.id = release_tracks.release_id and (r.owner_id = auth.uid() or public.is_admin())))
with check (exists(select 1 from public.releases r where r.id = release_tracks.release_id and (r.owner_id = auth.uid() or public.is_admin())));
create policy "event owner/admin read" on public.release_events for select to authenticated
using (exists(select 1 from public.releases r where r.id = release_events.release_id and (r.owner_id = auth.uid() or public.is_admin())));
create policy "event authenticated insert" on public.release_events for insert to authenticated with check (actor_id = auth.uid());

insert into storage.buckets (id, name, public) values ('documents','documents',false),('artwork','artwork',false),('audio','audio',false)
on conflict (id) do update set public = excluded.public;
drop policy if exists "documents owner/admin" on storage.objects;
create policy "documents owner/admin" on storage.objects for all to authenticated
using (bucket_id = 'documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()))
with check (bucket_id = 'documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "artwork owner/admin" on storage.objects;
create policy "artwork owner/admin" on storage.objects for all to authenticated
using (bucket_id = 'artwork' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()))
with check (bucket_id = 'artwork' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "audio owner/admin" on storage.objects;
create policy "audio owner/admin" on storage.objects for all to authenticated
using (bucket_id = 'audio' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()))
with check (bucket_id = 'audio' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists releases_touch on public.releases;
create trigger releases_touch before update on public.releases for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name, full_name, email)
  values(new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''),'@',1)), coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''),'@',1)), new.email)
  on conflict(id) do update set email = excluded.email;
  return new;
end; $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.protect_profile_role() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only label admins can change roles';
  end if;
  return new;
end; $$;
revoke all on function public.protect_profile_role() from public, anon, authenticated;
drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles for each row execute function public.protect_profile_role();
