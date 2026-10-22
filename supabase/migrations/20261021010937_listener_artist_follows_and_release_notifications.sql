create table if not exists public.listener_artist_follows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artist_slug text not null check (artist_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  artist_name text not null default 'Artist' check (char_length(artist_name) between 1 and 120),
  created_at timestamptz not null default now(),
  constraint listener_artist_follows_user_artist_unique unique (user_id, artist_slug)
);
create index if not exists listener_artist_follows_artist_slug_idx on public.listener_artist_follows(artist_slug);
create index if not exists listener_artist_follows_user_created_idx on public.listener_artist_follows(user_id, created_at desc);
alter table public.listener_artist_follows enable row level security;
drop policy if exists listener_follows_select_own on public.listener_artist_follows;
create policy listener_follows_select_own on public.listener_artist_follows for select to authenticated using (user_id = auth.uid() and public.is_listener_account());
drop policy if exists listener_follows_insert_own on public.listener_artist_follows;
create policy listener_follows_insert_own on public.listener_artist_follows for insert to authenticated with check (user_id = auth.uid() and public.is_listener_account());
drop policy if exists listener_follows_delete_own on public.listener_artist_follows;
create policy listener_follows_delete_own on public.listener_artist_follows for delete to authenticated using (user_id = auth.uid() and public.is_listener_account());

create or replace function public.notify_listener_followers_of_release()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  artist_slug_value text;
  artist_display_value text;
begin
  if new.status is distinct from 'Live' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'Live' then return new; end if;
  select p.public_slug, coalesce(nullif(p.display_name,''), new.artist_name)
    into artist_slug_value, artist_display_value
  from public.profiles p
  where p.id = new.owner_id and p.is_public = true and p.public_slug is not null
    and coalesce(p.notification_preferences->>'new_followed_releases','true') <> 'false'
  limit 1;
  if artist_slug_value is null then return new; end if;
  insert into public.notifications(user_id, kind, title, body, release_id, "read", created_at)
  select f.user_id, 'followed_artist_release',
    left(artist_display_value || ' has new music', 160),
    left('"' || new.title || '" is now available on Imposed Entertainment.', 500),
    new.id, false, now()
  from public.listener_artist_follows f
  join public.profiles listener on listener.id = f.user_id and listener.role::text = 'listener'
  where f.artist_slug = artist_slug_value
    and f.user_id <> new.owner_id
    and coalesce(listener.notification_preferences->>'new_followed_releases','true') <> 'false'
  on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.notify_listener_followers_of_release() from public, anon, authenticated;
drop trigger if exists listener_follow_release_notifications on public.releases;
create trigger listener_follow_release_notifications
after insert or update of status on public.releases
for each row execute function public.notify_listener_followers_of_release();
