begin;
alter table public.releases
  drop constraint if exists releases_streaming_links_payload_size;
alter table public.releases
  add constraint releases_streaming_links_payload_size
  check (
    jsonb_typeof(streaming_links) = 'array'
    and jsonb_array_length(streaming_links) <= 12
    and octet_length(streaming_links::text) <= 100000
  );
commit;
