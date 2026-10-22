begin;
create index if not exists release_track_feedback_resolved_by_idx on public.release_track_feedback (resolved_by) where resolved_by is not null;
drop policy if exists "tasks owner create artist tasks" on public.release_tasks;
drop policy if exists "tasks admin write" on public.release_tasks;
drop policy if exists "tasks create authorized" on public.release_tasks;
create policy "tasks create authorized" on public.release_tasks for insert to authenticated
with check (public.is_admin() or (assignee = 'artist' and public.can_see_release(release_id) and exists (
 select 1 from public.releases r where r.id = release_tasks.release_id
 and (r.owner_id = (select auth.uid()) or (r.band_id is not null and public.is_band_member(r.band_id)))
)));
create or replace function public.get_public_artist_page(p_slug text)
returns jsonb language sql stable security definer set search_path = public
as $function$
 select jsonb_build_object(
  'id',p.id,'public_slug',p.public_slug,'display_name',coalesce(nullif(p.display_name,''),'Artist'),'tagline',p.tagline,
  'bio',case when coalesce(p.public_profile_preferences->>'bio','true')='true' then p.bio end,
  'location',case when coalesce(p.public_profile_preferences->>'location','true')='true' then p.location end,
  'accent',p.accent,'avatar_path',p.avatar_path,'banner_path',p.banner_path,
  'links',case when coalesce(p.public_profile_preferences->>'links','true')='true' then p.links else '[]'::jsonb end,
  'contact_email',case when p.show_email and coalesce(p.public_profile_preferences->>'email','false')='true' then p.email end,
  'releases',case when coalesce(p.public_profile_preferences->>'discography','true')='true' then (select coalesce(jsonb_agg(jsonb_build_object('title',r.title,'release_type',r.release_type,'release_date',r.release_date,'artist_name',r.artist_name) order by r.release_date desc nulls last),'[]'::jsonb) from public.releases r where r.owner_id=p.id and r.status='Live') else '[]'::jsonb end
 ) from public.profiles p where p.public_slug=lower(trim(p_slug)) and p.is_public=true and p.role::text<>'label_admin' limit 1;
$function$;
commit;
