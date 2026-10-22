begin;
alter table public.releases
  add column if not exists streaming_links jsonb not null default '[]'::jsonb;
alter table public.releases drop constraint if exists releases_streaming_links_array;
alter table public.releases add constraint releases_streaming_links_array
  check (case when jsonb_typeof(streaming_links) = 'array' then jsonb_array_length(streaming_links) <= 12 else false end);
commit;
