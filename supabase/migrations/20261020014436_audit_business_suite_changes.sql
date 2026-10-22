create or replace function public.log_business_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  row_data jsonb;
  row_owner uuid;
  row_id text;
  action_name text;
begin
  if tg_op = 'DELETE' then
    row_data := to_jsonb(old);
    action_name := 'deleted';
  elsif tg_op = 'UPDATE' then
    row_data := to_jsonb(new);
    action_name := 'updated';
  else
    row_data := to_jsonb(new);
    action_name := 'created';
  end if;
  row_owner := nullif(row_data->>'owner_id','')::uuid;
  if row_owner is null then
    row_owner := nullif(row_data->>'id','')::uuid;
  end if;
  row_id := coalesce(row_data->>'id',row_data->>'owner_id','unknown');
  if row_owner is not null then
    insert into public.portal_change_history(owner_id,entity_type,entity_id,action,summary)
    values(row_owner,tg_table_name,row_id,action_name,initcap(replace(tg_table_name,'_',' ')) || ' ' || action_name);
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.log_business_change() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'royalty_splits','rights_register','release_budgets','invoices','catalogue_assets',
    'industry_contacts','gig_events','marketing_campaigns','campaign_metrics','smart_links',
    'audio_feedback','sample_clearances','mastering_checks','draft_snapshots',
    'scheduled_reports','session_devices','integration_connections','user_preferences'
  ] loop
    execute format('drop trigger if exists business_change_audit on public.%I',t);
    execute format('create trigger business_change_audit after insert or update or delete on public.%I for each row execute function public.log_business_change()',t);
  end loop;
end $$;
