revoke update on table public.profiles from authenticated;
grant update (display_name, full_name, bio, instagram, website, links, location, accent, avatar_path, banner_path, tagline, show_email, preferred_language, notification_preferences, public_slug, is_public, public_profile_preferences, updated_at) on table public.profiles to authenticated;

create or replace function public.set_profile_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Label administrator access required' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own role' using errcode = '42501';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_profile_role(uuid, public.user_role) from public, anon;
grant execute on function public.set_profile_role(uuid, public.user_role) to authenticated;
