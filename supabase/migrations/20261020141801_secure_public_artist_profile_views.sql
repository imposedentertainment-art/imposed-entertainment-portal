create or replace view public.public_artist_profiles
with (security_barrier = true, security_invoker = false)
as
select
  p.public_slug,
  coalesce(nullif(btrim(p.display_name), ''), nullif(btrim(p.full_name), ''), 'Artist') as display_name,
  p.tagline,
  case when coalesce((p.public_profile_preferences->>'bio')::boolean, false) then p.bio else null end as bio,
  case when coalesce((p.public_profile_preferences->>'links')::boolean, false) then p.links else '[]'::jsonb end as links,
  case when coalesce((p.public_profile_preferences->>'location')::boolean, false) then p.location else null end as location,
  case when coalesce((p.public_profile_preferences->>'email')::boolean, false) and p.show_email then p.email else null end as email,
  case when coalesce((p.public_profile_preferences->>'discography')::boolean, false) then true else false end as show_discography,
  p.avatar_path,
  p.banner_path,
  p.accent
from public.profiles p
where p.is_public = true
  and p.public_slug is not null;

grant select on public.public_artist_profiles to anon, authenticated;

create or replace view public.public_artist_releases
with (security_barrier = true, security_invoker = false)
as
select
  p.public_slug as artist_slug,
  r.id as release_id,
  r.title,
  r.artist_name,
  r.release_type,
  r.genre,
  r.release_date,
  r.artwork_path,
  r.streaming_links
from public.profiles p
join public.releases r on r.owner_id = p.id
where p.is_public = true
  and p.public_slug is not null
  and coalesce((p.public_profile_preferences->>'discography')::boolean, false) = true
  and r.status = 'Live';

grant select on public.public_artist_releases to anon, authenticated;
