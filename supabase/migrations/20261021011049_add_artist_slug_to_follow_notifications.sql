alter table public.notifications add column if not exists artist_slug text;
create index if not exists notifications_follow_release_unread_idx
  on public.notifications(user_id, created_at desc)
  where kind = 'followed_artist_release' and read = false;
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
  insert into public.notifications(user_id, kind, title, body, release_id, artist_slug, "read", created_at)
  select f.user_id, 'followed_artist_release',
    left(artist_display_value || ' has new music', 160),
    left('"' || new.title || '" is now available on Imposed Entertainment.', 500),
    new.id, artist_slug_value, false, now()
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
