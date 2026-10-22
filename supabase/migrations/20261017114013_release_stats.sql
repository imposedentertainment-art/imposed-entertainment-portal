create table if not exists public.release_stats (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  period date not null,
  platform text not null default 'All platforms',
  streams bigint not null default 0 check (streams >= 0),
  listeners bigint check (listeners >= 0),
  saves bigint check (saves >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (release_id, period, platform)
);
create index if not exists release_stats_release_idx on public.release_stats(release_id);
create index if not exists release_stats_creator_idx on public.release_stats(created_by);
alter table public.release_stats enable row level security;
create policy "stats read" on public.release_stats for select to authenticated using (public.can_see_release(release_id));
create policy "stats admin insert" on public.release_stats for insert to authenticated with check (public.is_admin());
create policy "stats admin update" on public.release_stats for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "stats admin delete" on public.release_stats for delete to authenticated using (public.is_admin());

create or replace function public.notify_release_stats() returns trigger language plpgsql security definer set search_path = public as $$
declare t text; o uuid; b uuid;
begin
  select title, owner_id, band_id into t, o, b from public.releases where id = new.release_id;
  insert into public.notifications(user_id, kind, title, body, release_id)
  select distinct x.u, 'stats', 'New stats', 'Stats were added for ' || coalesce(t, 'your release') || '.', new.release_id
  from (select o as u where o is not null union select user_id from public.band_members where band_id = b) x;
  return new;
end; $$;
drop trigger if exists release_stats_notify on public.release_stats;
create trigger release_stats_notify after insert on public.release_stats for each row execute function public.notify_release_stats();
