begin;
create table if not exists public.release_track_version_history (
 id bigint generated always as identity primary key,
 release_id uuid not null references public.releases(id) on delete cascade,
 track_id uuid references public.release_tracks(id) on delete set null,
 track_number integer,
 previous_version jsonb not null check (jsonb_typeof(previous_version) = 'object'),
 changed_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists track_version_release_created_idx on public.release_track_version_history(release_id, created_at desc);
create index if not exists track_version_track_created_idx on public.release_track_version_history(track_id, created_at desc) where track_id is not null;
create index if not exists track_version_changed_by_idx on public.release_track_version_history(changed_by) where changed_by is not null;
alter table public.release_track_version_history enable row level security;
drop policy if exists "track version history readable by release access" on public.release_track_version_history;
create policy "track version history readable by release access" on public.release_track_version_history for select to authenticated using (public.is_admin() or public.can_see_release(release_id));
create or replace function public.log_release_track_version()
returns trigger language plpgsql security definer set search_path = public as $function$
begin
 if new.title is distinct from old.title or new.version is distinct from old.version or new.isrc is distinct from old.isrc or new.audio_path is distinct from old.audio_path or new.duration_seconds is distinct from old.duration_seconds or new.explicit is distinct from old.explicit or new.language is distinct from old.language or new.featured_artists is distinct from old.featured_artists or new.songwriters is distinct from old.songwriters then
  insert into public.release_track_version_history(release_id,track_id,track_number,previous_version,changed_by)
  values(old.release_id,old.id,old.track_number,jsonb_build_object('title',old.title,'version',old.version,'isrc',old.isrc,'audio_path',old.audio_path,'duration_seconds',old.duration_seconds,'explicit',old.explicit,'language',old.language,'featured_artists',old.featured_artists,'songwriters',old.songwriters),auth.uid());
 end if;
 return new;
end;
$function$;
revoke all on function public.log_release_track_version() from public, anon, authenticated;
drop trigger if exists release_track_version_history_trigger on public.release_tracks;
create trigger release_track_version_history_trigger after update on public.release_tracks for each row execute function public.log_release_track_version();
commit;
