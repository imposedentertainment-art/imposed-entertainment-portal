drop policy if exists smart_links_public_read on public.smart_links;
create policy smart_links_public_read
on public.smart_links
for select to anon, authenticated
using (published = true);
