create or replace function public.guard_podcast_submission_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_admin() then
      if new.owner_id is distinct from (select auth.uid()) then
        raise exception 'Podcast submission owner must be the signed-in user.';
      end if;
      if new.status <> 'Draft' then
        raise exception 'New podcast submissions must start as drafts.';
      end if;
      if new.review_note is not null
         or new.spotify_show_url is not null
         or new.spotify_episode_url is not null then
        raise exception 'Only label staff can set review notes or Spotify publishing links.';
      end if;
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.owner_id is distinct from old.owner_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Podcast submission identity and ownership cannot be changed.';
  end if;

  if not public.is_admin() then
    if new.review_note is distinct from old.review_note
       or new.spotify_show_url is distinct from old.spotify_show_url
       or new.spotify_episode_url is distinct from old.spotify_episode_url then
      raise exception 'Only label staff can change review notes or Spotify publishing links.';
    end if;

    if old.status not in ('Draft','Changes Requested') then
      raise exception 'This podcast submission is locked while the label reviews it.';
    end if;

    if new.status not in ('Draft','Submitted','Changes Requested') then
      raise exception 'Artists cannot set label-only podcast statuses.';
    end if;

    if new.status = 'Submitted' and not new.rights_confirmed then
      raise exception 'Rights confirmation is required before submission.';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_podcast_submission_write() from public, anon, authenticated;

drop trigger if exists podcast_submission_write_guard on public.podcast_submissions;
create trigger podcast_submission_write_guard
before insert or update on public.podcast_submissions
for each row execute function public.guard_podcast_submission_write();

comment on function public.guard_podcast_submission_write() is 'Enforces podcast submission ownership, artist/label field boundaries, and submission status protections.';
