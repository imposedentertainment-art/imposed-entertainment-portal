drop policy if exists "band members read band files" on storage.objects;
create policy "band members read band files" on storage.objects for select to authenticated
using (bucket_id in ('artwork', 'audio') and exists (
  select 1 from public.releases r
  where r.id::text = (storage.foldername(name))[2] and r.band_id is not null and public.is_band_member(r.band_id)));

create or replace function public.notify_comment() returns trigger language plpgsql security definer set search_path = public as $$
declare t text; o uuid; b uuid; commenter_is_admin boolean := public.is_admin();
begin
  select title, owner_id, band_id into t, o, b from public.releases where id = new.release_id;
  insert into public.notifications(user_id, kind, title, body, release_id)
  select distinct x.u, 'comment', 'New comment on ' || coalesce(t, 'a release'), left(new.body, 140), new.release_id
  from (
    select o as u where o is not null
    union select user_id from public.band_members where band_id = b
    union select id from public.profiles where role::text in ('admin', 'label_admin') and not commenter_is_admin
  ) x where x.u is distinct from new.author_id;
  return new;
end; $$;

create or replace function public.protect_profile_role() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.role::text in ('admin', 'label_admin') and new.role::text not in ('admin', 'label_admin')
     and not exists (select 1 from public.profiles where id <> old.id and role::text in ('admin', 'label_admin')) then
    raise exception 'There must be at least one label admin';
  end if;
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Only label admins can change roles';
  end if;
  return new;
end; $$;

create or replace function public.protect_profile_name() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.display_name is distinct from old.display_name or new.full_name is distinct from old.full_name)
     and auth.uid() is not null and not public.is_admin() then
    raise exception 'Your name is set by the label. Ask them if it needs changing.';
  end if;
  return new;
end; $$;
drop trigger if exists profiles_protect_name on public.profiles;
create trigger profiles_protect_name before update on public.profiles for each row execute function public.protect_profile_name();

do $$
declare p record; q text; w text; stmt text;
begin
  for p in select schemaname, tablename, policyname, qual, with_check from pg_policies
    where schemaname = 'public'
      and ((qual ~ 'auth\.uid\(\)' and qual !~* 'select auth\.uid') or (with_check ~ 'auth\.uid\(\)' and with_check !~* 'select auth\.uid'))
  loop
    q := case when p.qual is not null then replace(p.qual, 'auth.uid()', '(select auth.uid())') end;
    w := case when p.with_check is not null then replace(p.with_check, 'auth.uid()', '(select auth.uid())') end;
    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename)
      || case when q is not null then ' using (' || q || ')' else '' end
      || case when w is not null then ' with check (' || w || ')' else '' end;
    execute stmt;
  end loop;
end $$;
