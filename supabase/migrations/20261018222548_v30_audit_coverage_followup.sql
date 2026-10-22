create or replace function public.log_release_audit_change()
returns trigger language plpgsql security definer set search_path = public as $function$
declare v_action text; v_details jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.release_audit_log(release_id,actor_id,action,new_status,details)
    values(new.id,auth.uid(),'created',new.status,jsonb_build_object('title',new.title,'artist_name',new.artist_name));
    return new;
  end if;
  if new.status is distinct from old.status then
    v_action := 'status_changed';
  elsif new.title is distinct from old.title or new.artist_name is distinct from old.artist_name
     or new.release_type is distinct from old.release_type or new.genre is distinct from old.genre
     or new.release_date is distinct from old.release_date or new.c_line is distinct from old.c_line
     or new.p_line is distinct from old.p_line or new.territory is distinct from old.territory
     or new.stores is distinct from old.stores or new.artwork_path is distinct from old.artwork_path
     or new.metadata_path is distinct from old.metadata_path or new.upc is distinct from old.upc
     or new.language is distinct from old.language or new.previously_released is distinct from old.previously_released
     or new.original_release_date is distinct from old.original_release_date or new.rights_confirmed is distinct from old.rights_confirmed then
    v_action := 'metadata_updated';
  else
    return new;
  end if;
  v_details := jsonb_build_object('title',new.title,'artist_name',new.artist_name);
  insert into public.release_audit_log(release_id,actor_id,action,old_status,new_status,details)
  values(new.id,auth.uid(),v_action,old.status,new.status,v_details);
  return new;
end;
$function$;
revoke all on function public.log_release_audit_change() from public, anon, authenticated;
