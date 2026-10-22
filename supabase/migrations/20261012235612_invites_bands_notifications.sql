create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  artist_name text default '',
  status text not null default 'Pending',
  code text not null unique default replace(gen_random_uuid()::text,'-',''),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz default (now() + interval '30 days'),
  accepted_at timestamptz
);
create table public.bands (
  id uuid primary key default gen_random_uuid(),
  name text not null, bio text default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.band_members (
  band_id uuid not null references public.bands(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (band_id, user_id)
);
create table public.band_invites (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands(id) on delete cascade,
  email text not null,
  code text not null unique default replace(gen_random_uuid()::text,'-',''),
  status text not null default 'Pending',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz default (now() + interval '30 days')
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null, title text not null, body text default '',
  band_invite_id uuid, release_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);
alter table public.releases add column band_id uuid references public.bands(id) on delete set null;
alter table public.invites enable row level security;
alter table public.bands enable row level security;
alter table public.band_members enable row level security;
alter table public.band_invites enable row level security;
alter table public.notifications enable row level security;

create function public.is_band_member(b uuid) returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from public.band_members where band_id=b and user_id=auth.uid()) $$;
create function public.shares_band(u uuid) returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from public.band_members a join public.band_members c on a.band_id=c.band_id where a.user_id=auth.uid() and c.user_id=u) $$;
revoke all on function public.is_band_member(uuid), public.shares_band(uuid) from public, anon;
grant execute on function public.is_band_member(uuid), public.shares_band(uuid) to authenticated;

create policy "invite admin access" on public.invites for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "bands read" on public.bands for select to authenticated using (public.is_band_member(id) or public.is_admin());
create policy "bands label edit" on public.bands for update to authenticated using (public.is_admin());
create policy "bands label delete" on public.bands for delete to authenticated using (public.is_admin());
create policy "band members read" on public.band_members for select to authenticated using (public.is_band_member(band_id) or public.is_admin());
create policy "band members leave" on public.band_members for delete to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "band invites label" on public.band_invites for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "profiles band mates" on public.profiles for select to authenticated using (public.shares_band(id));
create policy "band release read" on public.releases for select to authenticated using (band_id is not null and public.is_band_member(band_id));
create policy "band tracks read" on public.release_tracks for select to authenticated
using (exists(select 1 from public.releases r where r.id=release_id and r.band_id is not null and public.is_band_member(r.band_id)));
create policy "band events read" on public.release_events for select to authenticated
using (exists(select 1 from public.releases r where r.id=release_id and r.band_id is not null and public.is_band_member(r.band_id)));
create policy "notes own read" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notes own update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create function public.create_band(p_name text, p_bio text default '') returns uuid language plpgsql security definer set search_path=public as $$
declare bid uuid;
begin
  if not public.is_admin() then raise exception 'Only the label can create bands'; end if;
  if length(trim(p_name))=0 then raise exception 'Band name required'; end if;
  insert into public.bands(name,bio,created_by) values (trim(p_name),coalesce(p_bio,''),auth.uid()) returning id into bid;
  return bid;
end; $$;
create function public.my_band_invites() returns table(id uuid, band_id uuid, band_name text) language sql stable security definer set search_path=public as $$
  select i.id, i.band_id, b.name from public.band_invites i join public.bands b on b.id=i.band_id
  where i.status='Pending' and lower(i.email)=lower(auth.jwt()->>'email') and (i.expires_at is null or i.expires_at>now());
$$;
create function public.accept_band_invite(p_id uuid, p_accept boolean default true) returns void language plpgsql security definer set search_path=public as $$
declare r public.band_invites;
begin
  select * into r from public.band_invites where id=p_id and status='Pending' and lower(email)=lower(auth.jwt()->>'email') and (expires_at is null or expires_at>now());
  if not found then raise exception 'Invite not found or expired'; end if;
  if p_accept then
    insert into public.band_members(band_id,user_id,role) values (r.band_id,auth.uid(),'member') on conflict do nothing;
    update public.band_invites set status='Accepted' where id=p_id;
  else update public.band_invites set status='Declined' where id=p_id; end if;
end; $$;
create function public.get_invite(p_code text) returns table(email text, artist_name text) language sql stable security definer set search_path=public as $$
  select i.email, i.artist_name from public.invites i where i.code=p_code and i.status='Pending' and (i.expires_at is null or i.expires_at>now())
  union all
  select b.email, '' from public.band_invites b where b.code=p_code and b.status='Pending' and (b.expires_at is null or b.expires_at>now())
  limit 1;
$$;
revoke all on function public.create_band(text,text), public.my_band_invites(), public.accept_band_invite(uuid,boolean), public.get_invite(text) from public, anon;
grant execute on function public.create_band(text,text), public.my_band_invites(), public.accept_band_invite(uuid,boolean) to authenticated;
grant execute on function public.get_invite(text) to anon, authenticated;

create function public.enforce_invite_only() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists (select 1 from public.profiles where role::text in ('admin','label_admin')) then return new; end if;
  if exists (select 1 from public.invites i where lower(i.email)=lower(new.email) and i.status='Pending' and (i.expires_at is null or i.expires_at>now()))
  or exists (select 1 from public.band_invites b where lower(b.email)=lower(new.email) and b.status='Pending' and (b.expires_at is null or b.expires_at>now()))
  then return new; end if;
  raise exception 'Accounts are invite-only. Ask the label for an invite.';
end; $$;
create function public.accept_invite_on_signup() returns trigger language plpgsql security definer set search_path=public as $$
begin
  update public.invites set status='Accepted', accepted_at=now() where lower(email)=lower(new.email) and status='Pending';
  return new;
end; $$;
create function public.notify_band_invite() returns trigger language plpgsql security definer set search_path=public as $$
declare uid uuid; bname text;
begin
  select id into uid from public.profiles where lower(email)=lower(new.email) limit 1;
  select name into bname from public.bands where id=new.band_id;
  if uid is not null then
    insert into public.notifications(user_id,kind,title,body,band_invite_id)
    values (uid,'band_invite','Band invite','The label invited you to join '||coalesce(bname,'a band')||'.',new.id);
  end if;
  return new;
end; $$;
create function public.notify_release_status() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status is distinct from old.status then
    if new.status='Submitted' then
      insert into public.notifications(user_id,kind,title,body,release_id)
      select p.id,'submission','New submission',coalesce(new.title,'A release')||' was submitted for review.',new.id from public.profiles p where p.role::text in ('admin','label_admin');
    elsif new.owner_id is not null then
      insert into public.notifications(user_id,kind,title,body,release_id)
      values (new.owner_id,'release_status',coalesce(new.title,'Release')||': '||new.status,'The label updated the status of your release.',new.id);
    end if;
  end if;
  return new;
end; $$;
revoke all on function public.enforce_invite_only(), public.accept_invite_on_signup(), public.notify_band_invite(), public.notify_release_status() from public, anon, authenticated;

create trigger enforce_invite_only before insert on auth.users for each row execute function public.enforce_invite_only();
create trigger accept_invite_on_signup after insert on auth.users for each row execute function public.accept_invite_on_signup();
create trigger band_invite_notify after insert on public.band_invites for each row execute function public.notify_band_invite();
create trigger release_status_notify after update on public.releases for each row execute function public.notify_release_status();
