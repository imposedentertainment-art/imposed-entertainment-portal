-- Unified shop catalogue foundation. Payment and fulfilment are deliberately not enabled by this migration.
create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  artist_id uuid references auth.users(id) on delete set null,
  store_type text not null default 'artist' check (store_type in ('label','artist')),
  product_type text not null check (product_type in ('vinyl','cd','clothing','accessory')),
  title text not null check (char_length(btrim(title)) between 1 and 180),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 180),
  description text not null default '' check (char_length(description) <= 5000),
  image_urls jsonb not null default '[]'::jsonb check (jsonb_typeof(image_urls) = 'array' and jsonb_array_length(image_urls) <= 8),
  price_minor integer not null check (price_minor > 0),
  currency text not null default 'GBP' check (currency in ('GBP','USD','EUR')),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  fulfillment_provider text not null default 'manual' check (fulfillment_provider in ('manual','printful','printify')),
  provider_product_id text,
  provider_variant_id text,
  variant_options jsonb not null default '{}'::jsonb check (jsonb_typeof(variant_options) = 'object'),
  featured boolean not null default false,
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_products_artist_store_owner check (store_type <> 'artist' or artist_id = owner_id),
  constraint shop_products_provider_ids_check check (
    (fulfillment_provider = 'manual' and provider_product_id is null and provider_variant_id is null)
    or fulfillment_provider in ('printful','printify')
  ),
  unique (owner_id, slug)
);

create index if not exists shop_products_public_catalogue_idx
  on public.shop_products (status, available, featured desc, created_at desc)
  where status = 'published' and available = true;
create index if not exists shop_products_owner_idx on public.shop_products (owner_id, updated_at desc);
create index if not exists shop_products_artist_idx on public.shop_products (artist_id, status);

alter table public.shop_products enable row level security;

drop policy if exists "Published shop products are public" on public.shop_products;
create policy "Published shop products are public"
  on public.shop_products for select to anon, authenticated
  using ((status = 'published' and available = true) or owner_id = (select auth.uid()));

drop policy if exists "Owners manage their shop products" on public.shop_products;
create policy "Owners manage their shop products"
  on public.shop_products for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and (store_type <> 'artist' or artist_id = (select auth.uid()))
  );

grant select on public.shop_products to anon, authenticated;
grant insert, update, delete on public.shop_products to authenticated;
