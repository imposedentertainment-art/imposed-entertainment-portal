begin;
-- Profiles: combine self/admin and band-mate SELECT access without changing visibility.
drop policy if exists "profile self read" on public.profiles;
drop policy if exists "profiles band mates" on public.profiles;
create policy "profiles readable by owner admin or band mates" on public.profiles
for select to authenticated using (id = (select auth.uid()) or public.is_admin() or public.shares_band(id));

-- Earnings: one SELECT policy; preserve admin write access with operation-specific policies.
drop policy if exists "earnings admin write" on public.earnings;
drop policy if exists "earnings read" on public.earnings;
create policy "earnings readable by release access or admin" on public.earnings
for select to authenticated using (public.is_admin() or public.can_see_release(release_id));
create policy "earnings admin insert" on public.earnings for insert to authenticated with check (public.is_admin());
create policy "earnings admin update" on public.earnings for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "earnings admin delete" on public.earnings for delete to authenticated using (public.is_admin());

-- Release events: preserve owner/admin/band-member visibility.
drop policy if exists "band events read" on public.release_events;
drop policy if exists "event owner/admin read" on public.release_events;
create policy "release events readable by owner admin or band" on public.release_events
for select to authenticated using (
  exists (select 1 from public.releases r
    where r.id = release_events.release_id
      and (r.owner_id = (select auth.uid()) or public.is_admin()
        or (r.band_id is not null and public.is_band_member(r.band_id))))
);

-- Release links: preserve admin read/write and normal accessible-release reads.
drop policy if exists "links admin write" on public.release_links;
drop policy if exists "links read" on public.release_links;
create policy "release links readable by release access or admin" on public.release_links
for select to authenticated using (public.is_admin() or public.can_see_release(release_id));
create policy "links admin insert" on public.release_links for insert to authenticated with check (public.is_admin());
create policy "links admin update" on public.release_links for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "links admin delete" on public.release_links for delete to authenticated using (public.is_admin());

-- Tracks: combine SELECT access and split owner/admin write operations.
drop policy if exists "track owner/admin access" on public.release_tracks;
drop policy if exists "band tracks read" on public.release_tracks;
create policy "release tracks readable by owner admin or band" on public.release_tracks
for select to authenticated using (
  exists (select 1 from public.releases r
    where r.id = release_tracks.release_id
      and (r.owner_id = (select auth.uid()) or public.is_admin()
        or (r.band_id is not null and public.is_band_member(r.band_id))))
);
create policy "track owner admin insert" on public.release_tracks for insert to authenticated
with check (exists (select 1 from public.releases r where r.id = release_tracks.release_id and (r.owner_id = (select auth.uid()) or public.is_admin())));
create policy "track owner admin update" on public.release_tracks for update to authenticated
using (exists (select 1 from public.releases r where r.id = release_tracks.release_id and (r.owner_id = (select auth.uid()) or public.is_admin())))
with check (exists (select 1 from public.releases r where r.id = release_tracks.release_id and (r.owner_id = (select auth.uid()) or public.is_admin())));
create policy "track owner admin delete" on public.release_tracks for delete to authenticated
using (exists (select 1 from public.releases r where r.id = release_tracks.release_id and (r.owner_id = (select auth.uid()) or public.is_admin())));

-- Releases: one SELECT policy with the same owner/admin/band membership disjunction.
drop policy if exists "band release read" on public.releases;
drop policy if exists "release owner/admin select" on public.releases;
create policy "releases readable by owner admin or band" on public.releases
for select to authenticated using (owner_id = (select auth.uid()) or public.is_admin() or (band_id is not null and public.is_band_member(band_id)));

commit;
