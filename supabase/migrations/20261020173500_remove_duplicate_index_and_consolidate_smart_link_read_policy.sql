begin;

-- Both indexes enforce the same partial uniqueness rule. Keep the original
-- unique index and remove the redundant duplicate.
drop index if exists public.profiles_public_slug_unique_idx;

-- The former policies were permissive and their conditions were ORed anyway.
-- Consolidate without changing access: published links are public; owners can
-- also read their own unpublished links when signed in.
drop policy if exists owner_select on public.smart_links;
drop policy if exists smart_links_public_read on public.smart_links;
create policy smart_links_owner_or_published_select
  on public.smart_links
  for select
  to anon, authenticated
  using (published = true or owner_id = (select auth.uid()));

commit;
