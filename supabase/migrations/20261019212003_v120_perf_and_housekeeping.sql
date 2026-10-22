-- Rate limiter: purge old buckets on ~2% of calls instead of every call (removes a DELETE from the hot path)
create or replace function public.consume_public_rate_limit(p_bucket_key text, p_limit integer, p_window_seconds integer default 60)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
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
  if random() < 0.02 then
    delete from public.edge_rate_limits where window_start < clock_timestamp() - interval '2 hours';
  end if;
  return v_hits > p_limit;
end;
$function$;

-- Fast unread badge / inbox counts
create index if not exists notifications_unread_idx on public.notifications (user_id, created_at desc) where read = false;

-- Retention helper: old read notifications and stale rate-limit rows
create or replace function public.prune_old_data()
returns void
language sql
security invoker
set search_path to 'public'
as $$
  delete from public.notifications where read = true and created_at < now() - interval '90 days';
  delete from public.edge_rate_limits where window_start < now() - interval '2 hours';
$$;
revoke all on function public.prune_old_data() from public, anon, authenticated;

comment on table public.edge_rate_limits is 'Edge function rate-limit counters. RLS on with no policies on purpose: only the service role (edge functions) may touch it.';
