alter table public.notifications
  add column if not exists podcast_submission_id uuid references public.podcast_submissions(id) on delete set null;
create index if not exists notifications_podcast_submission_idx
  on public.notifications (podcast_submission_id) where podcast_submission_id is not null;

create or replace function public.notify_podcast_submission_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'Submitted' then return new; end if;
  elsif new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'Submitted' then
    insert into public.notifications (user_id, kind, title, body, podcast_submission_id)
    select p.id, 'podcast_update', 'Podcast episode submitted',
      new.show_title || ' — ' || new.episode_title || ' is ready for label review.',
      new.id
    from public.profiles p
    where p.role = 'label_admin' and p.id is distinct from new.owner_id;
  elsif new.status in ('Changes Requested','Approved','Rejected','Sent to Spotify','Live') then
    insert into public.notifications (user_id, kind, title, body, podcast_submission_id)
    values (
      new.owner_id,
      'podcast_update',
      case new.status
        when 'Changes Requested' then 'Podcast changes requested'
        when 'Approved' then 'Podcast episode approved'
        when 'Rejected' then 'Podcast submission rejected'
        when 'Sent to Spotify' then 'Podcast sent to Spotify'
        when 'Live' then 'Podcast episode is live'
      end,
      new.show_title || ' — ' || new.episode_title ||
        case when new.status = 'Changes Requested' and coalesce(new.review_note,'') <> '' then '. Label feedback: ' || left(new.review_note, 500) else '.' end,
      new.id
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.notify_podcast_submission_status() from public, anon, authenticated;
drop trigger if exists podcast_submission_status_notification on public.podcast_submissions;
create trigger podcast_submission_status_notification
after insert or update on public.podcast_submissions
for each row execute function public.notify_podcast_submission_status();

comment on column public.notifications.podcast_submission_id is 'Optional link to a podcast episode submission; opens Podcast Studio when present.';
