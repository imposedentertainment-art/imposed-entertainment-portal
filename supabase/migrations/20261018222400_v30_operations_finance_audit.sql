-- v30 operations, delivery tracking, artist statements and release audit trail.
-- Additive only: no existing user, release, earnings, or storage rows are deleted.
begin;
create table if not exists public.release_audit_log (
 id bigint generated always as identity primary key,
 release_id uuid not null references public.releases(id) on delete cascade,
 actor_id uuid references public.profiles(id) on delete set null,
 action text not null check (action in ('created','status_changed','metadata_updated')),
 old_status text, new_status text,
 details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
 created_at timestamptz not null default now()
);
create index if not exists release_audit_release_created_idx on public.release_audit_log (release_id, created_at desc);
create index if not exists release_audit_created_idx on public.release_audit_log (created_at desc);
alter table public.release_audit_log enable row level security;
drop policy if exists "release audit readable by release access or admin" on public.release_audit_log;
create policy "release audit readable by release access or admin" on public.release_audit_log for select to authenticated using (public.is_admin() or public.can_see_release(release_id));
create or replace function public.log_release_audit_change()
returns trigger language plpgsql security definer set search_path = public as $function$
declare v_action text; v_details jsonb := '{}'::jsonb;
begin
 if tg_op = 'INSERT' then
  insert into public.release_audit_log(release_id,actor_id,action,new_status,details) values(new.id,auth.uid(),'created',new.status,jsonb_build_object('title',new.title,'artist_name',new.artist_name));
  return new;
 end if;
 if new.status is distinct from old.status then v_action := 'status_changed'; v_details := jsonb_build_object('title',new.title,'artist_name',new.artist_name);
 elsif new.title is distinct from old.title or new.artist_name is distinct from old.artist_name or new.release_date is distinct from old.release_date or new.upc is distinct from old.upc or new.artwork_path is distinct from old.artwork_path then v_action := 'metadata_updated'; v_details := jsonb_build_object('title',new.title,'artist_name',new.artist_name);
 else return new; end if;
 insert into public.release_audit_log(release_id,actor_id,action,old_status,new_status,details) values(new.id,auth.uid(),v_action,old.status,new.status,v_details);
 return new;
end;
$function$;
revoke all on function public.log_release_audit_change() from public, anon, authenticated;
drop trigger if exists releases_audit_log_trigger on public.releases;
create trigger releases_audit_log_trigger after insert or update on public.releases for each row execute function public.log_release_audit_change();
create table if not exists public.release_delivery_records (
 id uuid primary key default gen_random_uuid(),
 release_id uuid not null references public.releases(id) on delete cascade,
 platform text not null check (length(trim(platform)) between 1 and 80),
 delivery_status text not null default 'planned' check (delivery_status in ('planned','sent','accepted','live','blocked')),
 reference text, sent_at timestamptz, checked_at timestamptz, notes text,
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists release_delivery_release_idx on public.release_delivery_records(release_id, updated_at desc);
alter table public.release_delivery_records enable row level security;
drop policy if exists "delivery records readable by release access" on public.release_delivery_records;
create policy "delivery records readable by release access" on public.release_delivery_records for select to authenticated using (public.is_admin() or public.can_see_release(release_id));
drop policy if exists "delivery records admin insert" on public.release_delivery_records;
create policy "delivery records admin insert" on public.release_delivery_records for insert to authenticated with check (public.is_admin() and created_by = (select auth.uid()));
drop policy if exists "delivery records admin update" on public.release_delivery_records;
create policy "delivery records admin update" on public.release_delivery_records for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "delivery records admin delete" on public.release_delivery_records;
create policy "delivery records admin delete" on public.release_delivery_records for delete to authenticated using (public.is_admin());
create table if not exists public.artist_statements (
 id uuid primary key default gen_random_uuid(),
 artist_id uuid not null references public.profiles(id) on delete cascade,
 period_start date not null, period_end date not null,
 currency text not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
 gross_amount numeric(12,2) not null default 0 check (gross_amount >= 0),
 adjustments numeric(12,2) not null default 0,
 net_amount numeric(12,2) not null default 0,
 statement_number text,
 status text not null default 'draft' check (status in ('draft','published','paid')),
 published_at timestamptz, paid_at timestamptz, note text,
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint artist_statements_period_check check (period_end >= period_start)
);
create index if not exists artist_statements_artist_period_idx on public.artist_statements(artist_id, period_start desc);
create unique index if not exists artist_statements_number_unique on public.artist_statements(statement_number) where statement_number is not null;
alter table public.artist_statements enable row level security;
drop policy if exists "artist statements admin all" on public.artist_statements;
create policy "artist statements admin all" on public.artist_statements for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "artists read published own statements" on public.artist_statements;
create policy "artists read published own statements" on public.artist_statements for select to authenticated using (artist_id = (select auth.uid()) and status in ('published','paid'));
create or replace function public.set_v30_updated_at()
returns trigger language plpgsql set search_path = public as $function$
begin new.updated_at := now(); return new; end;
$function$;
revoke all on function public.set_v30_updated_at() from public, anon, authenticated;
drop trigger if exists delivery_records_updated_at on public.release_delivery_records;
create trigger delivery_records_updated_at before update on public.release_delivery_records for each row execute function public.set_v30_updated_at();
drop trigger if exists artist_statements_updated_at on public.artist_statements;
create trigger artist_statements_updated_at before update on public.artist_statements for each row execute function public.set_v30_updated_at();
commit;
