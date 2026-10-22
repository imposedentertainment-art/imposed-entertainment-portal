create table if not exists public.edge_rate_limits (
  bucket_key text not null,
  window_start timestamptz not null,
  hits integer not null default 0 check (hits >= 0),
  primary key (bucket_key, window_start)
);
create index if not exists edge_rate_limits_window_start_idx on public.edge_rate_limits (window_start);
alter table public.edge_rate_limits enable row level security;
revoke all on table public.edge_rate_limits from public, anon, authenticated;
grant all on table public.edge_rate_limits to service_role;
create or replace function public.consume_public_rate_limit(p_bucket_key text, p_limit integer, p_window_seconds integer default 60)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_hits integer;
begin
  if p_bucket_key is null or length(p_bucket_key) > 100 or p_bucket_key !~ '^[a-f0-9]{64}:[a-z_]{1,24}$' then
    raise exception 'invalid rate-limit key';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 1000 or p_window_seconds is null or p_window_seconds < 10 or p_window_seconds > 3600 then
    raise exception 'invalid rate-limit settings';
  end if;
  v_window_start := to_timestamp(floor(extract(epoch from clock_timestamp()) / p_window_seconds) * p_window_seconds);
  insert into public.edge_rate_limits(bucket_key, window_start, hits)
  values (p_bucket_key, v_window_start, 1)
  on conflict (bucket_key, window_start) do update
    set hits = public.edge_rate_limits.hits + 1
  returning hits into v_hits;
  delete from public.edge_rate_limits where window_start < clock_timestamp() - interval '2 hours';
  return v_hits > p_limit;
end;
$$;
revoke all on function public.consume_public_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_public_rate_limit(text, integer, integer) to service_role;
