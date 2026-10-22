create or replace function public.enforce_invite_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if exists (
    select 1 from public.invites i
    where lower(i.email) = lower(new.email)
      and i.status = 'Pending'
      and (i.expires_at is null or i.expires_at > now())
  ) or exists (
    select 1 from public.band_invites b
    where lower(b.email) = lower(new.email)
      and b.status = 'Pending'
      and (b.expires_at is null or b.expires_at > now())
  ) then
    return new;
  end if;
  raise exception 'Accounts are invite-only. Ask the label for an invite.';
end;
$function$;
