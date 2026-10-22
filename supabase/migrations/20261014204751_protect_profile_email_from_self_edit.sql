create or replace function public.protect_profile_email() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is distinct from old.email and auth.uid() is not null and not public.is_admin() then
    raise exception 'Email is managed by your sign-in account';
  end if;
  return new;
end; $$;
drop trigger if exists profiles_protect_email on public.profiles;
create trigger profiles_protect_email before update on public.profiles for each row execute function public.protect_profile_email();
