alter table public.invites add column if not exists role text not null default 'artist';
alter table public.invites drop constraint if exists invites_role_check;
alter table public.invites add constraint invites_role_check check (role in ('artist','label_admin'));

drop function if exists public.get_invite(text);
create function public.get_invite(p_code text) returns table(email text, artist_name text, role text)
language sql stable security definer set search_path = public as $$
  select i.email, i.artist_name, i.role from public.invites i
  where i.code = p_code and i.status = 'Pending' and (i.expires_at is null or i.expires_at > now())
  union all
  select b.email, '', 'artist' from public.band_invites b
  where b.code = p_code and b.status = 'Pending' and (b.expires_at is null or b.expires_at > now())
  limit 1;
$$;
revoke all on function public.get_invite(text) from public;
grant execute on function public.get_invite(text) to anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare r text;
begin
  select i.role into r from public.invites i
  where lower(i.email) = lower(new.email) and i.status in ('Pending','Accepted')
  order by i.created_at desc limit 1;
  insert into public.profiles(id, display_name, full_name, email, role)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''),'@',1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''),'@',1)),
    new.email,
    case when r = 'label_admin' then 'label_admin'::public.user_role else 'artist'::public.user_role end)
  on conflict (id) do update set email = excluded.email;
  return new;
end; $$;

drop trigger if exists accept_invite_on_signup on auth.users;
drop trigger if exists zz_accept_invite_on_signup on auth.users;
create trigger zz_accept_invite_on_signup after insert on auth.users
for each row execute function public.accept_invite_on_signup();
