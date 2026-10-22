-- 1. A self-inserted profile can only ever be an artist (blocks role escalation if a profile row is ever missing)
alter policy "profile self insert" on public.profiles
  with check (id = (select auth.uid()) and role = 'artist'::public.user_role);

-- 2. Artists cannot hand a release to another user or attach it to a band they are not in
create or replace function public.guard_release_update()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if old.status not in ('Draft', 'Changes Requested') then
    raise exception 'This release is with the label and cannot be edited. Ask the label to reopen it.' using errcode = '42501';
  end if;
  if new.status is distinct from old.status and new.status not in ('Draft', 'Submitted') then
    raise exception 'You cannot set that status.' using errcode = '42501';
  end if;
  if new.owner_id is distinct from old.owner_id then
    raise exception 'Release ownership can only be changed by the label.' using errcode = '42501';
  end if;
  if new.band_id is distinct from old.band_id and new.band_id is not null and not public.is_band_member(new.band_id) then
    raise exception 'You can only attach a release to a band you belong to.' using errcode = '42501';
  end if;
  new.review_note := old.review_note;
  new.sent_at := old.sent_at;
  return new;
end;
$function$;

-- 3. Live release media is for signed-in users only, not anonymous storage API callers
alter policy "live release media read" on storage.objects to authenticated;

-- 4. Announcement notifications respect the per-user announcements preference (edge function no longer inserts them)
create or replace function public.notify_announcement()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.notifications(user_id, kind, title, body)
  select p.id, 'announcement', new.title, left(new.body, 140)
  from public.profiles p
  where p.id is distinct from new.created_by
    and coalesce(p.notification_preferences->>'announcements', 'true') <> 'false';
  return new;
end; $function$;
