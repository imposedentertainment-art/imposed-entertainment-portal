# Changelog

All notable changes to Imposed Entertainment are documented here. This project follows [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-20

First release using Semantic Versioning. This is the versioning baseline for the existing portal feature set, not a claim that every integration has been independently end-to-end tested.

### Fixed
- Align service-worker cache version and the allowlisted asset query parameter with the portal release, avoiding stale-version cache mismatches.
- Fix Business Suite Draft Recovery ordering to use the database's `saved_at` column rather than the nonexistent `created_at` column.
- Display draft snapshot timestamps using `saved_at` when available.

### Changed
- Replace the previous numeric build label with `1.0.0` in the portal shell, diagnostics report, and service-worker cache namespace.
- Add a canonical `VERSION` file and changelog.

### Compatibility and verification
- No Supabase schema migration was needed for this release.
- Existing Supabase URL, public client key, authentication flow, routes, and feature modules remain in place.
- Supabase project/table/advisor inspection completed. Full browser-based sign-in, RLS-per-user isolation, file uploads, and every feature action still require live end-to-end testing with test accounts.
