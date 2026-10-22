begin;

-- Profile visibility preferences cannot redact columns from direct table SELECTs.
-- Restrict direct reads to the profile owner and label administrators; other
-- signed-in users use the existing get_profile/search_profiles RPCs, which redact
-- fields according to public_profile_preferences.
drop policy if exists "profiles readable by owner admin or band mates" on public.profiles;
create policy "profiles readable by owner or label admin"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()) or public.is_admin());

-- Keep the privileged role-change RPC on a fixed, trusted search path.
alter function public.set_profile_role(uuid, public.user_role)
  set search_path = pg_catalog, public;

commit;
