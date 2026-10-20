# Imposed Entertainment V133 — Reliable updates and cache refresh

## Changes
- Bumped the portal build marker and all versioned static asset URLs to V133.
- Fixed the service worker's version-query allowlist: it previously only accepted V131 while the app was loading V132 assets. V133 now matches the service worker cache policy.
- Bumped the service-worker cache namespace to V133 so browsers remove the previous Imposed cache during activation.
- Kept the Supabase project configuration, route rewrites, and existing feature modules intact.

## Deployment
- GitHub `main` is the source of truth.
- Cloudflare Pages should automatically deploy commits to `main`.
- Verify the newest Cloudflare Pages deployment reaches **Success**, then hard refresh the site if an old page remains cached.

## Test notes
- Confirmed the expected version markers in the source before committing.
- A live browser/auth/database regression test is still required for authenticated Supabase flows and user-specific features.
