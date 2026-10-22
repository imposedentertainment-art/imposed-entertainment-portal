drop policy if exists "notes own delete" on public.notifications;
create policy "notes own delete" on public.notifications for delete to authenticated using (user_id = auth.uid());
