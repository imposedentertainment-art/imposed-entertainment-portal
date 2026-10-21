-- CD fulfilment can use Kunaki's documented server-to-server HTTP/XML API.
-- Vinyl provider support remains unconfigured until a suitable provider/API is verified.
alter table public.shop_products
  drop constraint if exists shop_products_fulfillment_provider_check;
alter table public.shop_products
  add constraint shop_products_fulfillment_provider_check
  check (fulfillment_provider in ('manual','printful','printify','kunaki'));

alter table public.shop_products
  drop constraint if exists shop_products_provider_ids_check;
alter table public.shop_products
  add constraint shop_products_provider_ids_check
  check (
    (fulfillment_provider = 'manual' and provider_product_id is null and provider_variant_id is null)
    or fulfillment_provider in ('printful','printify','kunaki')
  );
