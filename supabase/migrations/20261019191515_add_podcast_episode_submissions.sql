create table if not exists public.podcast_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  show_title text not null check (char_length(btrim(show_title)) between 2 and 160),
  show_description text not null default '' check (char_length(show_description) <= 5000),
  episode_title text not null check (char_length(btrim(episode_title)) between 2 and 200),
  episode_description text not null default '' check (char_length(episode_description) <= 10000),
  episode_type text not null default 'Full episode' check (episode_type in ('Full episode','Trailer','Bonus')),
  season_number integer check (season_number is null or season_number between 1 and 999),
  episode_number integer check (episode_number is null or episode_number between 1 and 9999),
  explicit boolean not null default false,
  language text not null default 'English' check (char_length(language) between 2 and 40),
  planned_publish_at date,
  duration_seconds integer check (duration_seconds is null or duration_seconds between 1 and 86400),
  audio_path text not null,
  audio_size_bytes bigint not null check (audio_size_bytes between 1 and 52428800),
  artwork_path text,
  status text not null default 'Draft' check (status in ('Draft','Submitted','Changes Requested','Approved','Sent to Spotify','Live','Rejected')),
  review_note text check (review_note is null or char_length(review_note) <= 5000),
  spotify_show_url text check (spotify_show_url is null or spotify_show_url ~* '^https://[^[:space:]]+$'),
  spotify_episode_url text check (spotify_episode_url is null or spotify_episode_url ~* '^https://[^[:space:]]+$'),
  rights_confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists podcast_submissions_owner_updated_idx
  on public.podcast_submissions (owner_id, updated_at desc);
create index if not exists podcast_submissions_status_updated_idx
  on public.podcast_submissions (status, updated_at desc);

alter table public.podcast_submissions enable row level security;

drop policy if exists "Podcast submissions readable by owner or label" on public.podcast_submissions;
create policy "Podcast submissions readable by owner or label"
on public.podcast_submissions for select to authenticated
using ((owner_id = (select auth.uid())) or public.is_admin());

drop policy if exists "Artists create podcast drafts" on public.podcast_submissions;
create policy "Artists create podcast drafts"
on public.podcast_submissions for insert to authenticated
with check (owner_id = (select auth.uid()) and status = 'Draft');

drop policy if exists "Owners edit drafts label manages all" on public.podcast_submissions;
create policy "Owners edit drafts label manages all"
on public.podcast_submissions for update to authenticated
using ((owner_id = (select auth.uid()) and status in ('Draft','Changes Requested')) or public.is_admin())
with check (public.is_admin() or (owner_id = (select auth.uid()) and status in ('Draft','Submitted','Changes Requested')));

drop policy if exists "Owners delete drafts label manages all" on public.podcast_submissions;
create policy "Owners delete drafts label manages all"
on public.podcast_submissions for delete to authenticated
using (public.is_admin() or (owner_id = (select auth.uid()) and status = 'Draft'));

grant select, insert, update, delete on public.podcast_submissions to authenticated;

comment on table public.podcast_submissions is 'Podcast episode submissions for label review. Uploads are stored in private Supabase Storage buckets; Spotify publishing is a separate external step.';
comment on column public.podcast_submissions.status is 'Internal workflow state; Sent to Spotify means an operator completed the external Spotify for Creators handoff, not that this app published via Spotify API.';
