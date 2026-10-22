alter table public.releases add column if not exists review_note text;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

create or replace function public.notify_release_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'Submitted' then
      insert into public.notifications(user_id, kind, title, body, release_id)
      select p.id, 'submission', 'New submission', coalesce(new.title, 'A release') || ' was submitted for review.', new.id
      from public.profiles p where p.role::text in ('admin', 'label_admin');
    elsif new.owner_id is not null and new.status <> 'Draft' then
      insert into public.notifications(user_id, kind, title, body, release_id)
      values (new.owner_id, 'release_status', coalesce(new.title, 'Release') || ': ' || new.status,
              coalesce(nullif(new.review_note, ''), 'The label updated the status of your release.'), new.id);
    end if;
  end if;
  return new;
end; $$;
