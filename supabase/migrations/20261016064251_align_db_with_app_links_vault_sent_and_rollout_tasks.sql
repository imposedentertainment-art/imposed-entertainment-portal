drop table if exists public.artist_files cascade;
drop function if exists public.notify_vault() cascade;
drop function if exists public.notify_store_links() cascade;
alter table public.releases drop column if exists store_links;

alter table public.releases add column if not exists sent_at timestamptz;

create table if not exists public.release_links (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  platform text not null,
  url text not null check (url ~* '^https://\S+$'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now());
create index if not exists release_links_release_idx on public.release_links(release_id);
create index if not exists release_links_creator_idx on public.release_links(created_by);
alter table public.release_links enable row level security;
create policy "links read" on public.release_links for select to authenticated using (public.can_see_release(release_id));
create policy "links admin write" on public.release_links for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table if not exists public.vault_files (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  path text not null,
  size bigint,
  kind text not null default 'Other',
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now());
create index if not exists vault_files_artist_idx on public.vault_files(artist_id);
create index if not exists vault_files_uploader_idx on public.vault_files(uploaded_by);
alter table public.vault_files enable row level security;
create policy "vault files read" on public.vault_files for select to authenticated using (artist_id = (select auth.uid()) or public.is_admin());
create policy "vault files insert" on public.vault_files for insert to authenticated with check (uploaded_by = (select auth.uid()) and (artist_id = (select auth.uid()) or public.is_admin()));
create policy "vault files delete" on public.vault_files for delete to authenticated using (public.is_admin() or uploaded_by = (select auth.uid()));

create or replace function public.notify_release_link() returns trigger language plpgsql security definer set search_path = public as $$
declare t text; o uuid; b uuid;
begin
  select title, owner_id, band_id into t, o, b from public.releases where id = new.release_id;
  insert into public.notifications(user_id, kind, title, body, release_id)
  select distinct x.u, 'store_link', 'New listening link', new.platform || ' link added to ' || coalesce(t, 'your release') || '.', new.release_id
  from (select o as u where o is not null union select user_id from public.band_members where band_id = b) x;
  return new;
end; $$;
drop trigger if exists release_link_notify on public.release_links;
create trigger release_link_notify after insert on public.release_links for each row execute function public.notify_release_link();

create or replace function public.notify_release_sent() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.sent_at is null and new.sent_at is not null then
    insert into public.notifications(user_id, kind, title, body, release_id)
    select distinct x.u, 'sent', 'Sent to the distributor', coalesce(new.title, 'Your release') || ' has been uploaded to the distributor.', new.id
    from (select new.owner_id as u where new.owner_id is not null union select user_id from public.band_members where band_id = new.band_id) x;
  end if;
  return new;
end; $$;
drop trigger if exists release_sent_notify on public.releases;
create trigger release_sent_notify after update of sent_at on public.releases for each row execute function public.notify_release_sent();

create or replace function public.notify_vault_file() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    if new.artist_id is distinct from new.uploaded_by then
      insert into public.notifications(user_id, kind, title, body) values (new.artist_id, 'file', 'New file from the label', new.kind || ': ' || new.name);
    end if;
  else
    insert into public.notifications(user_id, kind, title, body)
    select p.id, 'file', 'New file from an artist', new.kind || ': ' || new.name from public.profiles p where p.role::text in ('admin','label_admin');
  end if;
  return new;
end; $$;
drop trigger if exists vault_file_notify on public.vault_files;
create trigger vault_file_notify after insert on public.vault_files for each row execute function public.notify_vault_file();

-- Release rollout plan: small text rows, no storage cost
create table if not exists public.release_tasks (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  title text not null,
  offset_days int not null default 0,
  due_date date,
  assignee text not null default 'artist' check (assignee in ('artist','label')),
  done boolean not null default false,
  done_at timestamptz,
  sort int not null default 0);
create index if not exists release_tasks_release_idx on public.release_tasks(release_id, sort);
alter table public.release_tasks enable row level security;
create policy "tasks read" on public.release_tasks for select to authenticated using (public.can_see_release(release_id));
create policy "tasks update" on public.release_tasks for update to authenticated
  using (public.can_see_release(release_id) and (assignee = 'artist' or public.is_admin()))
  with check (public.can_see_release(release_id) and (assignee = 'artist' or public.is_admin()));
create policy "tasks admin write" on public.release_tasks for insert to authenticated with check (public.is_admin());
create policy "tasks admin delete" on public.release_tasks for delete to authenticated using (public.is_admin());

create or replace function public.seed_release_tasks() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.release_tasks(release_id, title, offset_days, assignee, sort, due_date) values
   (new.id, 'Final artwork and audio ready', -35, 'artist', 1, new.release_date + -35),
   (new.id, 'Submit release to the label', -32, 'artist', 2, new.release_date + -32),
   (new.id, 'Label review and approval', -30, 'label', 3, new.release_date + -30),
   (new.id, 'Upload to the distributor', -28, 'label', 4, new.release_date + -28),
   (new.id, 'Pitch to playlists and press', -21, 'label', 5, new.release_date + -21),
   (new.id, 'Announce and tease on socials', -14, 'artist', 6, new.release_date + -14),
   (new.id, 'Pre-save and listening links shared', -7, 'artist', 7, new.release_date + -7),
   (new.id, 'Release day posts and thank-yous', 0, 'artist', 8, new.release_date),
   (new.id, 'Review first-month performance', 30, 'label', 9, new.release_date + 30);
  return new;
end; $$;
drop trigger if exists release_seed_tasks on public.releases;
create trigger release_seed_tasks after insert on public.releases for each row execute function public.seed_release_tasks();

create or replace function public.shift_release_tasks() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.release_date is distinct from old.release_date then
    update public.release_tasks set due_date = case when new.release_date is null then null else new.release_date + offset_days end
    where release_id = new.id and done = false;
  end if;
  return new;
end; $$;
drop trigger if exists release_shift_tasks on public.releases;
create trigger release_shift_tasks after update of release_date on public.releases for each row execute function public.shift_release_tasks();

-- give existing releases a plan
insert into public.release_tasks(release_id, title, offset_days, assignee, sort, due_date)
select r.id, t.title, t.o, t.a, t.s, r.release_date + t.o from public.releases r
cross join (values ('Final artwork and audio ready',-35,'artist',1),('Submit release to the label',-32,'artist',2),('Label review and approval',-30,'label',3),('Upload to the distributor',-28,'label',4),('Pitch to playlists and press',-21,'label',5),('Announce and tease on socials',-14,'artist',6),('Pre-save and listening links shared',-7,'artist',7),('Release day posts and thank-yous',0,'artist',8),('Review first-month performance',30,'label',9)) as t(title,o,a,s)
where not exists (select 1 from public.release_tasks x where x.release_id = r.id);
