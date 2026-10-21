# Imposed Entertainment shop integration plan

## Current implementation status

- Public catalogue: `/shop`, backed by `public.shop_products`.
- Catalogue browsing, search, category filters and product prices are implemented.
- Supabase Row Level Security allows anonymous visitors to read only published, available products. Signed-in users can manage only products they own.
- Product categories are vinyl, CDs, clothing and accessories.
- Checkout, order creation, seller onboarding and automated fulfilment are **not enabled**. Do not describe the shop as taking orders.

## Provider fit (checked 21 October 2026)

### Payments: Stripe Checkout

Use a Supabase Edge Function to create a hosted Stripe Checkout Session. The browser should send product IDs and quantities only; the server must reload current prices from Supabase, validate availability, calculate shipping/tax policy, and create the Checkout Session. Never accept the browser's price as authoritative.

Use a signed Stripe webhook to verify payment and idempotently record the paid order before triggering fulfilment. The success redirect alone is not proof of payment. Keep Stripe secret keys and webhook signing secrets in Supabase Edge Function secrets, never in `config.js`, HTML or client JavaScript.

Official references:
- https://docs.stripe.com/api/checkout/sessions
- https://docs.stripe.com/payments/checkout/quickstarts

### Clothing and accessories: Printify first, Printful as an alternative

Printify's API explicitly supports product catalogue/shop management, order submission and webhooks. It is a suitable candidate for apparel/accessories after account and API access are configured. Printful also provides an API/manual-order store for custom integrations. Neither provider should be assumed to supply a music-media product unless that exact product and fulfilment path is confirmed in its current catalogue.

Official references:
- https://developers.printify.com/
- https://printify.com/printify-api/
- https://developers.printful.com/docs/
- https://help.printful.com/hc/en-us/articles/50262225690257-How-do-I-create-and-use-a-manual-order-API-store

### CDs: Kunaki is a candidate for server-side fulfilment

Kunaki documents on-demand CD manufacturing, shipping quotes, order submission and order-status/tracking endpoints. Its API documentation says titles are created through Kunaki's publishing workflow and the HTTP/XML service is used to fulfil orders. The API credentials and recipient addresses must only be sent server-to-server from an Edge Function. Confirm UK shipping costs, account requirements and operational terms before enabling it.

Official references:
- https://kunaki.com/product-cd.html
- https://kunaki.com/HTTPService.htm
- https://kunaki.com/xmlservice.htm

### Vinyl: not yet approved for automated POD

The research performed for this release did not verify a suitable public, supported vinyl-on-demand API end to end. Do not route vinyl orders to Printify or Printful by assumption. Keep vinyl listings disabled for purchase until a provider confirms vinyl production, API access, shipping quotes, order submission, tracking and commercial eligibility. A manual/external listing is not equivalent to an automated POD integration.

## Hybrid shop model

- Label-managed products use `store_type = 'label'` and are owned by the label account.
- Artist-managed products use `store_type = 'artist'`; RLS requires the artist to own the row.
- The `artist_id` field allows label-owned products to be associated with an artist collection without granting that artist access to the label-owned row.
- The catalogue stores provider product/variant references only, never provider credentials.

## Before enabling checkout

1. Choose the legal seller/merchant of record and confirm how artist revenue shares, refunds, chargebacks, VAT/tax, and customer support will work.
2. Configure Stripe test keys and webhook signing secret as Supabase Edge Function secrets.
3. Configure separate provider credentials and provider-specific Edge Functions/secrets.
4. Add order and order-item tables with immutable price snapshots, shipping address protection, idempotency keys and owner/label-only access.
5. Verify Stripe webhook signatures; process only paid sessions; make fulfilment requests idempotent; persist provider order IDs and tracking.
6. Test failure, cancellation, duplicate webhook, refund, unavailable variant, shipping quote, and provider outage paths in test mode.
7. Only then expose an active checkout button.

## Current limitations

There are no products in the catalogue yet, and there is no product-publishing UI in this first foundation release. The shop will show its honest empty state until products are added through a controlled publishing workflow. No live payment or fulfilment credentials were available/configured during this change.
