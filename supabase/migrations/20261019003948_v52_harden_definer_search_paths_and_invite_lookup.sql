begin;
alter function public.accept_band_invite(uuid, boolean) set search_path = pg_catalog, public;
alter function public.can_see_release(uuid) set search_path = pg_catalog, public;
alter function public.create_band(text, text) set search_path = pg_catalog, public;
alter function public.get_invite(text) set search_path = pg_catalog, public;
alter function public.get_profile(uuid) set search_path = pg_catalog, public;
alter function public.is_admin() set search_path = pg_catalog, public;
alter function public.is_band_member(uuid) set search_path = pg_catalog, public;
alter function public.my_band_invites() set search_path = pg_catalog, public;
alter function public.profile_discography(uuid) set search_path = pg_catalog, public;
alter function public.search_profiles(text) set search_path = pg_catalog, public;
alter function public.shares_band(uuid) set search_path = pg_catalog, public;
create or replace function public.get_invite(p_code text)
returns table(email text, artist_name text, role text)
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select i.email, i.artist_name, i.role
  from public.invites i
  where p_code is not null
    and length(p_code) between 1 and 128
    and i.code = p_code
    and i.status = 'Pending'
    and (i.expires_at is null or i.expires_at > now())
  union all
  select b.email, '', 'artist'
  from public.band_invites b
  where p_code is not null
    and length(p_code) between 1 and 128
    and b.code = p_code
    and b.status = 'Pending'
    and (b.expires_at is null or b.expires_at > now())
  limit 1;
$function$;
revoke execute on function public.get_invite(text) from public;
grant execute on function public.get_invite(text) to anon, authenticated;
commit;
