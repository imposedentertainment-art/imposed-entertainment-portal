create or replace function public.get_profile(p_id uuid)
returns table(id uuid, display_name text, tagline text, bio text, location text, accent text, avatar_path text, banner_path text, links jsonb, contact_email text, role text)
language sql stable security definer set search_path to 'pg_catalog', 'public'
as $function$
select p.id,p.display_name,p.tagline,
case when p.id=auth.uid() or public.is_admin() or (p.public_profile_preferences->>'bio') is distinct from 'false' then p.bio else null end,
case when p.id=auth.uid() or public.is_admin() or (p.public_profile_preferences->>'location') is distinct from 'false' then p.location else null end,
p.accent,p.avatar_path,p.banner_path,
case when p.id=auth.uid() or public.is_admin() or (p.public_profile_preferences->>'links') is distinct from 'false' then p.links else '[]'::jsonb end,
case when p.id=auth.uid() or public.is_admin() or (p.show_email is true and (p.public_profile_preferences->>'email') is distinct from 'false') then p.email else null end,
p.role::text
from public.profiles p where p.id=p_id and auth.uid() is not null and (p.role::text <> 'label_admin' or public.is_admin() or p.id=auth.uid());
$function$;

create or replace function public.search_profiles(p_q text default ''::text)
returns table(id uuid, display_name text, tagline text, bio text, location text, accent text, avatar_path text, role text)
language sql stable security definer set search_path to 'pg_catalog', 'public'
as $function$
select p.id,p.display_name,p.tagline,
case when public.is_admin() or p.id=auth.uid() or (p.public_profile_preferences->>'bio') is distinct from 'false' then p.bio else null end,
case when public.is_admin() or p.id=auth.uid() or (p.public_profile_preferences->>'location') is distinct from 'false' then p.location else null end,
p.accent,p.avatar_path,p.role::text
from public.profiles p where auth.uid() is not null and (p.role::text <> 'label_admin' or public.is_admin())
and (coalesce(trim(p_q),'')='' or p.display_name ilike '%'||replace(replace(trim(p_q),'%',''),'_','')||'%' or p.full_name ilike '%'||replace(replace(trim(p_q),'%',''),'_','')||'%')
order by p.display_name nulls last limit 40;
$function$;

create or replace function public.profile_discography(p_id uuid)
returns jsonb language sql stable security definer set search_path to 'pg_catalog', 'public'
as $function$
select coalesce(jsonb_agg(x order by x.release_date desc nulls last),'[]'::jsonb)
from (
 select r.id,r.title,r.release_type,r.release_date,r.artwork_path,r.artist_name,
 (select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'version',t.version,'audio_path',t.audio_path,'n',t.track_number) order by t.track_number),'[]'::jsonb) from public.release_tracks t where t.release_id=r.id) as tracks
 from public.releases r where r.owner_id=p_id and r.status='Live' and auth.uid() is not null
 and exists(select 1 from public.profiles pp where pp.id=p_id and (pp.role::text <> 'label_admin' or public.is_admin() or pp.id=auth.uid())
 and (p_id=auth.uid() or public.is_admin() or (pp.public_profile_preferences->>'discography') is distinct from 'false'))
) x;
$function$;
