alter table public.profiles add column if not exists bio text, add column if not exists instagram text, add column if not exists website text;

create or replace function public.can_see_release(rid uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.releases r where r.id = rid and (r.owner_id = auth.uid() or public.is_admin() or (r.band_id is not null and public.is_band_member(r.band_id))))
$$;

create table if not exists public.release_comments (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now());
create index if not exists release_comments_rel_idx on public.release_comments(release_id, created_at);
alter table public.release_comments enable row level security;
drop policy if exists "comments read" on public.release_comments;
create policy "comments read" on public.release_comments for select to authenticated using (public.can_see_release(release_id));
drop policy if exists "comments write" on public.release_comments;
create policy "comments write" on public.release_comments for insert to authenticated with check (author_id = auth.uid() and public.can_see_release(release_id));
drop policy if exists "comments delete" on public.release_comments;
create policy "comments delete" on public.release_comments for delete to authenticated using (author_id = auth.uid() or public.is_admin());

create or replace function public.notify_comment() returns trigger language plpgsql security definer set search_path = public as $$
declare t text; o uuid;
begin
  select title, owner_id into t, o from public.releases where id = new.release_id;
  if public.is_admin() then
    if o is not null and o <> new.author_id then
      insert into public.notifications(user_id, kind, title, body, release_id)
      values (o, 'comment', 'New comment on ' || coalesce(t, 'your release'), left(new.body, 140), new.release_id);
    end if;
  else
    insert into public.notifications(user_id, kind, title, body, release_id)
    select p.id, 'comment', 'New comment on ' || coalesce(t, 'a release'), left(new.body, 140), new.release_id
    from public.profiles p where p.role::text in ('admin', 'label_admin') and p.id <> new.author_id;
  end if;
  return new;
end; $$;
drop trigger if exists release_comment_notify on public.release_comments;
create trigger release_comment_notify after insert on public.release_comments for each row execute function public.notify_comment();

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  body text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now());
alter table public.announcements enable row level security;
drop policy if exists "announce read" on public.announcements;
create policy "announce read" on public.announcements for select to authenticated using (true);
drop policy if exists "announce insert" on public.announcements;
create policy "announce insert" on public.announcements for insert to authenticated with check (public.is_admin());
drop policy if exists "announce delete" on public.announcements;
create policy "announce delete" on public.announcements for delete to authenticated using (public.is_admin());

create or replace function public.notify_announcement() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(user_id, kind, title, body)
  select p.id, 'announcement', new.title, left(new.body, 140) from public.profiles p where p.id is distinct from new.created_by;
  return new;
end; $$;
drop trigger if exists announcement_notify on public.announcements;
create trigger announcement_notify after insert on public.announcements for each row execute function public.notify_announcement();

create table if not exists public.release_internal_notes (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null check (length(trim(body)) > 0),
  created_at timestamptz not null default now());
alter table public.release_internal_notes enable row level security;
drop policy if exists "internal admin only" on public.release_internal_notes;
create policy "internal admin only" on public.release_internal_notes for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.earnings (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  period text not null check (period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  store text not null default 'RouteNote',
  streams bigint not null default 0 check (streams >= 0),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now());
create index if not exists earnings_release_idx on public.earnings(release_id, period desc);
alter table public.earnings enable row level security;
drop policy if exists "earnings read" on public.earnings;
create policy "earnings read" on public.earnings for select to authenticated using (public.can_see_release(release_id));
drop policy if exists "earnings admin write" on public.earnings;
create policy "earnings admin write" on public.earnings for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.notify_earnings() returns trigger language plpgsql security definer set search_path = public as $$
declare t text; o uuid;
begin
  select title, owner_id into t, o from public.releases where id = new.release_id;
  if o is not null then
    insert into public.notifications(user_id, kind, title, body, release_id)
    values (o, 'earnings', 'New earnings statement', coalesce(t, 'Your release') || ' · ' || new.period || ': £' || to_char(new.amount, 'FM999G999G990D00'), new.release_id);
  end if;
  return new;
end; $$;
drop trigger if exists earnings_notify on public.earnings;
create trigger earnings_notify after insert on public.earnings for each row execute function public.notify_earnings();
