alter table public.podcast_submissions
  add column if not exists audio_mime_type text not null default 'audio/mpeg';

alter table public.podcast_submissions
  drop constraint if exists podcast_submissions_audio_mime_type_check;

alter table public.podcast_submissions
  add constraint podcast_submissions_audio_mime_type_check
  check (audio_mime_type in ('audio/mpeg','audio/mp4','audio/wav','audio/x-wav'));

update storage.buckets
set allowed_mime_types = array['audio/flac','audio/x-flac','audio/mpeg','audio/mp3','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav']
where id = 'audio';
