# Printful integration setup

The Product Studio's Printful panel uses the Supabase Edge Function `printful-catalog`. The browser never receives the Printful API token.

## One-time setup

1. Create/sign into your Printful account and create an API token with only the permissions required for catalogue reads at this stage.
2. In Supabase Dashboard → Edge Functions → Secrets, add `PRINTFUL_API_TOKEN` with the token value. Never put this token in `config.js`, frontend JavaScript, GitHub, or a public environment variable.
3. Ensure the Edge Function `printful-catalog` is deployed with JWT verification enabled.
4. Sign into Imposed Entertainment as an artist or label administrator and open `/shop/manage`. Use **Load catalogue** and then search or choose **Use for draft**.
5. A selected product only pre-fills a draft listing. Set the retail price yourself and keep it unavailable until a future variant/artwork/fulfilment workflow has been implemented and tested.

## Current scope and deliberate limits

- Reads the Printful catalogue through Printful's API from the server.
- Uses the existing signed-in Supabase session and verifies the profile role server-side.
- Does not create a synced Printful store product, upload artwork, submit orders, calculate final production/shipping costs, or enable checkout.
- Do not enable ordering until variant selection, print-file placement, retail price vs fulfilment cost, store-product sync, order submission, and fulfilment status handling are implemented and tested.
- The integration uses Printful's v1 catalogue endpoint `GET https://api.printful.com/products`. Confirm the endpoint and token scope against your account's current Printful developer docs before expanding permissions.

## Troubleshooting

- `PRINTFUL_API_TOKEN is not configured`: add the secret in Supabase Edge Function secrets and redeploy/retry if needed.
- `Printful rejected the configured token`: create a valid token with catalogue-read access.
- `Could not load Printful`: inspect Supabase Edge Function logs; never paste the token into logs or support messages.
