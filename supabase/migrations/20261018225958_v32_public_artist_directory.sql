-- v32: expose only opted-in public artist cards for the anonymous listener directory.
create or replace function public.get_public_artist_directory()
returns table (public_slug text, display_name text, tagline text, location text, avatar_path text)
language sql stable security definer set search_path = public
as $$
  select p.public_slug, coalesce(nullif(p.display_name, ''), 'Artist'), p.tagline,
    case when coalesce(p.public_profile_preferences->>'location','true') = 'true' then p.location else null end,
    p.avatar_path
  from public.profiles p
  where p.is_public = true
    and p.public_slug is not null and length(trim(p.public_slug)) > 0
    and p.role::text <> 'label_admin'
  order by coalesce(nullif(p.display_name, ''), 'Artist') asc
  limit 200;
$$;
revoke all on function public.get_public_artist_directory() from public;
grant execute on function public.get_public_artist_directory() to anon, authenticated;
