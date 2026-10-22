alter table public.podcast_submissions
  drop constraint if exists podcast_spotify_show_url_host_check,
  drop constraint if exists podcast_spotify_episode_url_host_check;

alter table public.podcast_submissions
  add constraint podcast_spotify_show_url_host_check
  check (spotify_show_url is null or spotify_show_url ~* '^https://open[.]spotify[.]com/show/[A-Za-z0-9]+([/?#].*)?$'),
  add constraint podcast_spotify_episode_url_host_check
  check (spotify_episode_url is null or spotify_episode_url ~* '^https://open[.]spotify[.]com/episode/[A-Za-z0-9]+([/?#].*)?$');

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

  if new.status = 'Changes Requested'
     and (new.review_note is null or char_length(btrim(new.review_note)) < 4) then
    raise exception 'A clear review note is required when requesting changes.';
  end if;

  if new.status = 'Approved' then
    if old.status <> 'Submitted' then
      raise exception 'Only submitted episodes can be approved.';
    end if;
    if not new.rights_confirmed then
      raise exception 'Rights confirmation is required before approval.';
    end if;
  end if;

  if new.status = 'Sent to Spotify' then
    if old.status not in ('Approved','Sent to Spotify') then
      raise exception 'Approve the episode before recording the Spotify handoff.';
    end if;
    if new.spotify_show_url is null then
      raise exception 'A Spotify show URL is required before recording the handoff.';
    end if;
  end if;

  if new.status = 'Live' then
    if old.status not in ('Sent to Spotify','Live') then
      raise exception 'Record the Spotify handoff before marking the episode live.';
    end if;
    if new.spotify_episode_url is null then
      raise exception 'A public Spotify episode URL is required before marking it live.';
    end if;
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

comment on function public.guard_podcast_submission_write() is 'Enforces podcast ownership, artist/label field boundaries, Spotify URL host validation and workflow transition requirements.';
