alter table public.profiles
  add column if not exists links jsonb not null default '[]'::jsonb,
  add column if not exists location text,
  add column if not exists accent text,
  add column if not exists avatar_path text,
  add column if not exists banner_path text,
  add column if not exists tagline text,
  add column if not exists show_email boolean not null default true;

insert into storage.buckets (id, name, public) values ('profile-media','profile-media',true) on conflict (id) do nothing;

create policy "profile media write" on storage.objects for all to authenticated
  using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "live release media read" on storage.objects for select to authenticated
  using (bucket_id in ('artwork','audio') and exists (select 1 from public.releases r where r.id::text = (storage.foldername(name))[2] and r.status = 'Live'));

create or replace function public.search_profiles(p_q text default '')
returns table(id uuid, display_name text, tagline text, bio text, location text, accent text, avatar_path text, role text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.tagline, p.bio, p.location, p.accent, p.avatar_path, p.role::text
  from public.profiles p
  where auth.uid() is not null
    and (p.role::text <> 'label_admin' or public.is_admin())
    and (coalesce(trim(p_q),'') = ''
      or p.display_name ilike '%' || replace(replace(trim(p_q),'%',''),'_','') || '%'
      or p.full_name ilike '%' || replace(replace(trim(p_q),'%',''),'_','') || '%')
  order by p.display_name nulls last limit 40
$$;

create or replace function public.get_profile(p_id uuid)
returns table(id uuid, display_name text, tagline text, bio text, location text, accent text, avatar_path text, banner_path text, links jsonb, contact_email text, role text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.tagline, p.bio, p.location, p.accent, p.avatar_path, p.banner_path, p.links,
    case when p.show_email or p.id = auth.uid() or public.is_admin() then p.email end, p.role::text
  from public.profiles p
  where p.id = p_id and auth.uid() is not null
    and (p.role::text <> 'label_admin' or public.is_admin() or p.id = auth.uid())
$$;

create or replace function public.profile_discography(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x.release_date desc nulls last), '[]'::jsonb) from (
    select r.id, r.title, r.release_type, r.release_date, r.artwork_path, r.artist_name,
      (select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'version',t.version,'audio_path',t.audio_path,'n',t.track_number) order by t.track_number),'[]'::jsonb) from public.release_tracks t where t.release_id = r.id) as tracks
    from public.releases r
    where r.owner_id = p_id and r.status = 'Live' and auth.uid() is not null
      and exists (select 1 from public.profiles pp where pp.id = p_id and (pp.role::text <> 'label_admin' or public.is_admin() or pp.id = auth.uid()))
  ) x
$$;

revoke execute on function public.search_profiles(text), public.get_profile(uuid), public.profile_discography(uuid) from public, anon;
grant execute on function public.search_profiles(text), public.get_profile(uuid), public.profile_discography(uuid) to authenticated;
