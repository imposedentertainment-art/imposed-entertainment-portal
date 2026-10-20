# Imposed Entertainment 1.0.0

- Adopts Semantic Versioning (MAJOR.MINOR.PATCH).
- Aligns app shell, service worker cache and diagnostics version to 1.0.0.
- Fixes Draft Recovery query ordering to use the existing Supabase `saved_at` column.
- No database migration or data changes were required.
- Live end-to-end tests of authenticated workflows remain necessary before claiming full regression coverage.
