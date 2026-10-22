-- Artists may only work on releases while they are Draft or Changes Requested, and may only
-- move them Draft <-> Submitted. Label admins are unrestricted. Direct SQL/maintenance (no JWT user) is unrestricted.
create or replace function public.guard_release_update()
returns trigger
language plpgsql
set search_path = public
as $$
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
  new.review_note := old.review_note;
  new.sent_at := old.sent_at;
  return new;
end;
$$;

revoke execute on function public.guard_release_update() from public, anon, authenticated;

drop trigger if exists guard_release_update on public.releases;
create trigger guard_release_update
  before update on public.releases
  for each row execute function public.guard_release_update();

-- Artists can only delete their own drafts. Label admins can delete any release.
drop policy if exists "release owner/admin delete" on public.releases;
create policy "release owner/admin delete" on public.releases
  for delete to public
  using (is_admin() or (owner_id = (select auth.uid()) and status = 'Draft'));

-- Artists can only create releases as drafts.
drop policy if exists "release owner insert" on public.releases;
create policy "release owner insert" on public.releases
  for insert to public
  with check (owner_id = (select auth.uid()) and (status = 'Draft' or is_admin()));
