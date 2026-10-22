create table public.listener_library (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 item_type text not null check (item_type in ('artist','release')),
 item_key text not null check (length(item_key) between 1 and 180),
 artist_slug text,
 release_id uuid references public.releases(id) on delete cascade,
 title text not null default '' check (length(title) <= 180),
 artist_name text not null default '' check (length(artist_name) <= 120),
 created_at timestamptz not null default now(),
 unique (user_id, item_type, item_key),
 check ((item_type = 'artist' and artist_slug is not null and release_id is null) or (item_type = 'release' and release_id is not null and artist_slug is not null))
);
create index listener_library_user_created_idx on public.listener_library (user_id, created_at desc);
alter table public.listener_library enable row level security;
create policy listener_library_select_own on public.listener_library for select to authenticated using (user_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'listener'));
create policy listener_library_insert_own on public.listener_library for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'listener'));
create policy listener_library_delete_own on public.listener_library for delete to authenticated using (user_id = auth.uid() and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'listener'));
