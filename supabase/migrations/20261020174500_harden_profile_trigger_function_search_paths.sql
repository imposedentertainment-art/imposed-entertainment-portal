begin;

-- These SECURITY DEFINER triggers operate on profile updates. Use the same
-- explicit trusted search path as the other privileged RPCs.
alter function public.protect_profile_email()
  set search_path = pg_catalog, public;
alter function public.protect_profile_name()
  set search_path = pg_catalog, public;
alter function public.protect_profile_role()
  set search_path = pg_catalog, public;

commit;
