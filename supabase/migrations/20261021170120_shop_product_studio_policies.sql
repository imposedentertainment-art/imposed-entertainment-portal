-- Product studio authorization: artists own their artist listings; label admins manage their own label-shop listings.
drop policy if exists "Published shop products are public" on public.shop_products;
drop policy if exists "Owners manage their shop products" on public.shop_products;
drop policy if exists "Shop catalogue read policy" on public.shop_products;
drop policy if exists "Artists manage their own products" on public.shop_products;
drop policy if exists "Label admins manage label products" on public.shop_products;

create policy "Shop catalogue read policy"
  on public.shop_products for select to anon, authenticated
  using (
    (status = 'published' and available = true)
    or owner_id = (select auth.uid())
    or (
      store_type = 'label'
      and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid()) and p.role = 'label_admin'
      )
    )
  );

create policy "Artists manage their own products"
  on public.shop_products for all to authenticated
  using (
    owner_id = (select auth.uid())
    and store_type = 'artist'
    and artist_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'artist'
    )
  )
  with check (
    owner_id = (select auth.uid())
    and store_type = 'artist'
    and artist_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'artist'
    )
  );

create policy "Label admins manage label products"
  on public.shop_products for all to authenticated
  using (
    owner_id = (select auth.uid())
    and store_type = 'label'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'label_admin'
    )
  )
  with check (
    owner_id = (select auth.uid())
    and store_type = 'label'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'label_admin'
    )
  );
