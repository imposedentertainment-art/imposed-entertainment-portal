drop policy listener_library_select_own on public.listener_library;
drop policy listener_library_insert_own on public.listener_library;
drop policy listener_library_delete_own on public.listener_library;
create policy listener_library_select_own on public.listener_library for select to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'listener'));
create policy listener_library_insert_own on public.listener_library for insert to authenticated with check (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'listener'));
create policy listener_library_delete_own on public.listener_library for delete to authenticated using (user_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'listener'));
create index if not exists listener_library_release_id_idx on public.listener_library (release_id) where release_id is not null;
