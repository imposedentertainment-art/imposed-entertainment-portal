do $$ declare c text; begin
  for c in select conname from pg_constraint where conrelid = 'public.releases'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%status%' loop
    execute format('alter table public.releases drop constraint %I', c);
  end loop;
end $$;
alter table public.releases add constraint releases_status_check check (status in ('Draft','Submitted','Changes Requested','Approved','Sent to distributor','Live','Rejected'));
alter table public.releases add column if not exists upc text, add column if not exists store_links jsonb not null default '{}'::jsonb;
alter table public.release_tracks add column if not exists lyrics text, add column if not exists explicit boolean not null default false, add column if not exists language text;
alter table public.earnings alter column store set default 'Distributor';
update public.earnings set store = 'Distributor' where store = 'RouteNote';

create or replace function public.notify_store_links() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.store_links is distinct from old.store_links and new.store_links <> '{}'::jsonb then
    insert into public.notifications(user_id, kind, title, body, release_id)
    select distinct x.u, 'store_links', 'Store links added', coalesce(new.title, 'Your release') || ' now has listening links.', new.id
    from (select new.owner_id as u where new.owner_id is not null
          union select user_id from public.band_members where band_id = new.band_id) x;
  end if;
  return new;
end; $$;
drop trigger if exists release_links_notify on public.releases;
create trigger release_links_notify after update of store_links on public.releases for each row execute function public.notify_store_links();

create table if not exists public.artist_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  kind text not null default 'Other' check (kind in ('Contract','Split sheet','Invoice','Other')),
  path text not null,
  size bigint,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now());
create index if not exists artist_files_owner_idx on public.artist_files(owner_id);
create index if not exists artist_files_uploader_idx on public.artist_files(uploaded_by);
alter table public.artist_files enable row level security;
create policy "files read" on public.artist_files for select to authenticated using (owner_id = (select auth.uid()) or public.is_admin());
create policy "files insert" on public.artist_files for insert to authenticated with check (uploaded_by = (select auth.uid()) and (owner_id = (select auth.uid()) or public.is_admin()));
create policy "files delete" on public.artist_files for delete to authenticated using (public.is_admin() or uploaded_by = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit) values ('vault', 'vault', false, 26214400) on conflict (id) do nothing;
create policy "vault read" on storage.objects for select to authenticated using (bucket_id = 'vault' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
create policy "vault upload" on storage.objects for insert to authenticated with check (bucket_id = 'vault' and ((storage.foldername(name))[1] = (select auth.uid())::text or public.is_admin()));
create policy "vault delete" on storage.objects for delete to authenticated using (bucket_id = 'vault' and (public.is_admin() or owner_id = (select auth.uid())::text));

create or replace function public.notify_vault() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() then
    if new.owner_id is distinct from new.uploaded_by then
      insert into public.notifications(user_id, kind, title, body) values (new.owner_id, 'file', 'New file from the label', new.kind || ': ' || new.name);
    end if;
  else
    insert into public.notifications(user_id, kind, title, body)
    select p.id, 'file', 'New file from an artist', new.kind || ': ' || new.name from public.profiles p where p.role::text in ('admin','label_admin');
  end if;
  return new;
end; $$;
drop trigger if exists artist_file_notify on public.artist_files;
create trigger artist_file_notify after insert on public.artist_files for each row execute function public.notify_vault();
