alter table public.releases
  add column if not exists language text not null default 'English',
  add column if not exists previously_released boolean not null default false,
  add column if not exists original_release_date date,
  add column if not exists rights_confirmed boolean not null default false,
  add column if not exists rights_confirmed_at timestamptz,
  add column if not exists upc text;
alter table public.release_tracks
  add column if not exists explicit boolean not null default false,
  add column if not exists featured_artists text,
  add column if not exists songwriters text;
