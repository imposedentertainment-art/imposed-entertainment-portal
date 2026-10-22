create table if not exists public.royalty_splits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  release_id uuid,
  track_id uuid,
  contributor_name text not null check (length(trim(contributor_name)) between 1 and 160),
  contributor_email text,
  role text not null default 'Contributor',
  split_percent numeric(5,2) not null check (split_percent >= 0 and split_percent <= 100),
  agreement_status text not null default 'draft' check (agreement_status in ('draft','sent','accepted','declined','expired')),
  agreed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.rights_register (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  release_id uuid,
  asset_title text not null,
  right_type text not null check (right_type in ('master','composition','artwork','name_image','sample','sync','other')),
  rights_holder text,
  territory text not null default 'Worldwide',
  starts_on date,
  expires_on date,
  contract_path text,
  status text not null default 'pending' check (status in ('pending','cleared','restricted','expired','disputed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_on is null or starts_on is null or expires_on >= starts_on)
);
create table if not exists public.release_budgets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  release_id uuid,
  category text not null,
  description text,
  planned_amount numeric(12,2) not null default 0 check (planned_amount >= 0),
  actual_amount numeric(12,2) not null default 0 check (actual_amount >= 0),
  currency char(3) not null default 'GBP',
  paid boolean not null default false,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  invoice_number text not null,
  client_name text not null,
  client_email text,
  description text,
  amount numeric(12,2) not null check (amount >= 0),
  currency char(3) not null default 'GBP',
  issued_on date not null default current_date,
  due_on date,
  status text not null default 'draft' check (status in ('draft','sent','part_paid','paid','overdue','void')),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  external_payment_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, invoice_number),
  check (due_on is null or due_on >= issued_on),
  check (paid_amount <= amount)
);
create table if not exists public.catalogue_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  release_id uuid,
  track_id uuid,
  title text not null,
  asset_type text not null default 'track' check (asset_type in ('track','composition','master','artwork','video','sample','other')),
  isrc text,
  iswc text,
  upc text,
  primary_artist text,
  writers jsonb not null default '[]'::jsonb,
  publishers jsonb not null default '[]'::jsonb,
  rights_status text not null default 'unknown' check (rights_status in ('unknown','owned','licensed','shared','restricted')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.industry_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  company text,
  role text,
  email text,
  phone text,
  website text,
  contact_type text not null default 'other',
  stage text not null default 'new' check (stage in ('new','contacted','active','follow_up','closed','do_not_contact')),
  last_contacted_at timestamptz,
  follow_up_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.gig_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  venue text,
  address text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  event_status text not null default 'planned' check (event_status in ('planned','confirmed','completed','cancelled')),
  fee numeric(12,2),
  currency char(3) not null default 'GBP',
  ticket_url text,
  contact_name text,
  contact_email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  release_id uuid,
  name text not null,
  channel text not null default 'other',
  objective text,
  campaign_status text not null default 'draft' check (campaign_status in ('draft','scheduled','active','paused','completed','cancelled')),
  starts_on date,
  ends_on date,
  budget numeric(12,2) not null default 0 check (budget >= 0),
  currency char(3) not null default 'GBP',
  asset_links jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create table if not exists public.campaign_metrics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  campaign_id uuid not null references public.marketing_campaigns(id) on delete cascade,
  measured_on date not null default current_date,
  impressions bigint not null default 0 check (impressions >= 0),
  clicks bigint not null default 0 check (clicks >= 0),
  conversions bigint not null default 0 check (conversions >= 0),
  spend numeric(12,2) not null default 0 check (spend >= 0),
  revenue numeric(12,2) not null default 0 check (revenue >= 0),
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  unique(campaign_id, measured_on, source)
);
create table if not exists public.smart_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  release_id uuid,
  slug text not null,
  title text not null,
  description text,
  artwork_url text,
  destinations jsonb not null default '[]'::jsonb,
  pre_save_enabled boolean not null default false,
  published boolean not null default false,
  clicks bigint not null default 0 check (clicks >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, slug)
);
create table if not exists public.audio_feedback (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  release_id uuid,
  track_id uuid,
  audio_path text,
  version_label text,
  timestamp_seconds numeric(10,3) not null default 0 check (timestamp_seconds >= 0),
  comment text not null,
  feedback_status text not null default 'open' check (feedback_status in ('open','in_progress','resolved','dismissed')),
  created_by uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.sample_clearances (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  release_id uuid,
  track_id uuid,
  sample_description text not null,
  source_title text,
  source_owner text,
  source_url text,
  sample_start_seconds numeric(10,3),
  sample_end_seconds numeric(10,3),
  clearance_status text not null default 'research' check (clearance_status in ('research','requested','approved','denied','not_required','unknown')),
  evidence_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sample_end_seconds is null or sample_start_seconds is null or sample_end_seconds >= sample_start_seconds)
);
create table if not exists public.mastering_checks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  release_id uuid,
  track_id uuid,
  audio_path text,
  check_type text not null,
  measured_value numeric,
  expected_range text,
  unit text,
  result text not null default 'not_checked' check (result in ('pass','warning','fail','not_checked')),
  notes text,
  checked_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.portal_change_history (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id text,
  action text not null,
  summary text not null,
  change_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.draft_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  draft_key text not null,
  payload jsonb not null,
  saved_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  unique(owner_id, draft_key)
);
create table if not exists public.scheduled_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  report_name text not null,
  report_type text not null,
  frequency text not null check (frequency in ('weekly','monthly','quarterly')),
  delivery_email text,
  format text not null default 'csv' check (format in ('csv','json')),
  enabled boolean not null default true,
  next_run_at timestamptz,
  last_run_at timestamptz,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.session_devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  device_label text not null,
  user_agent text,
  last_seen_at timestamptz not null default now(),
  current_session boolean not null default false,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  display_name text not null,
  connection_status text not null default 'not_configured' check (connection_status in ('not_configured','pending','connected','error','disconnected')),
  credential_reference text,
  scopes jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, provider)
);
create table if not exists public.user_preferences (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  language_code text not null default 'en',
  timezone_name text not null default 'Europe/London',
  autosave_enabled boolean not null default true,
  reduced_motion boolean not null default false,
  report_preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array[
    'royalty_splits','rights_register','release_budgets','invoices','catalogue_assets',
    'industry_contacts','gig_events','marketing_campaigns','campaign_metrics','smart_links',
    'audio_feedback','sample_clearances','mastering_checks','portal_change_history',
    'draft_snapshots','scheduled_reports','session_devices','integration_connections','user_preferences'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists owner_select on public.%I', t);
    execute format('drop policy if exists owner_insert on public.%I', t);
    execute format('drop policy if exists owner_update on public.%I', t);
    execute format('drop policy if exists owner_delete on public.%I', t);
    execute format('create policy owner_select on public.%I for select to authenticated using (owner_id = (select auth.uid()))', t);
    execute format('create policy owner_insert on public.%I for insert to authenticated with check (owner_id = (select auth.uid()))', t);
    execute format('create policy owner_update on public.%I for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))', t);
    execute format('create policy owner_delete on public.%I for delete to authenticated using (owner_id = (select auth.uid()))', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

create index if not exists royalty_splits_owner_release_idx on public.royalty_splits(owner_id, release_id);
create index if not exists rights_register_owner_status_idx on public.rights_register(owner_id, status, expires_on);
create index if not exists release_budgets_owner_release_idx on public.release_budgets(owner_id, release_id);
create index if not exists invoices_owner_status_due_idx on public.invoices(owner_id, status, due_on);
create index if not exists catalogue_assets_owner_title_idx on public.catalogue_assets(owner_id, title);
create index if not exists industry_contacts_owner_followup_idx on public.industry_contacts(owner_id, follow_up_at);
create index if not exists gig_events_owner_starts_idx on public.gig_events(owner_id, starts_at);
create index if not exists marketing_campaigns_owner_status_idx on public.marketing_campaigns(owner_id, campaign_status, starts_on);
create index if not exists campaign_metrics_owner_date_idx on public.campaign_metrics(owner_id, measured_on);
create index if not exists smart_links_owner_published_idx on public.smart_links(owner_id, published);
create index if not exists audio_feedback_owner_release_status_idx on public.audio_feedback(owner_id, release_id, feedback_status);
create index if not exists sample_clearances_owner_status_idx on public.sample_clearances(owner_id, clearance_status);
create index if not exists mastering_checks_owner_release_idx on public.mastering_checks(owner_id, release_id);
create index if not exists portal_change_history_owner_created_idx on public.portal_change_history(owner_id, created_at desc);
create index if not exists draft_snapshots_expiry_idx on public.draft_snapshots(expires_at);
create index if not exists scheduled_reports_owner_next_run_idx on public.scheduled_reports(owner_id, enabled, next_run_at);
create index if not exists session_devices_owner_last_seen_idx on public.session_devices(owner_id, last_seen_at desc);
