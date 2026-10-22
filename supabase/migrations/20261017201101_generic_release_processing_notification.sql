CREATE OR REPLACE FUNCTION public.notify_release_sent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if old.sent_at is null and new.sent_at is not null then
    insert into public.notifications(user_id, kind, title, body, release_id)
    select distinct x.u, 'sent', 'Release processing started',
      coalesce(new.title, 'Your release') || ' has moved into distribution processing.', new.id
    from (
      select new.owner_id as u where new.owner_id is not null
      union
      select user_id from public.band_members where band_id = new.band_id
    ) x;
  end if;
  return new;
end;
$function$;
