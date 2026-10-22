do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'podcast_audio_path_scoped_to_owner') then
    alter table public.podcast_submissions add constraint podcast_audio_path_scoped_to_owner
      check (audio_path like owner_id::text || '/podcast/' || id::text || '/%');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'podcast_artwork_path_scoped_to_owner') then
    alter table public.podcast_submissions add constraint podcast_artwork_path_scoped_to_owner
      check (artwork_path is null or artwork_path like owner_id::text || '/podcast/' || id::text || '/%');
  end if;
end $$;
