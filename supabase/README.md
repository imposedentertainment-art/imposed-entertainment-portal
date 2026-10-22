# Supabase project source of truth

The `migrations/` directory is being aligned to the 87 migration records currently present in `supabase_migrations.schema_migrations`. Preserve the 14-digit version prefixes exactly; Supabase compares local and remote migrations by version, not just their description.

Active Edge Function code is tracked under `functions/<name>/index.ts`; gateway JWT settings are in `config.toml`. `verify-turnstile` intentionally disables gateway JWT verification because it is the public challenge entry point. It validates requests itself and issues a short-lived signed visitor session before serving public discovery data. Privileged functions remain JWT protected.

**Clean-room baseline caveat:** the earliest recorded migration, `core_schema_reset_to_portal`, assumes an existing `public.profiles` table and legacy portal schema. The schema setup that predates recorded migration history is not represented as a complete baseline migration here. Do not treat this history as sufficient to bootstrap an empty Supabase project until that baseline has been reconstructed and tested. Do not run database resets against production data.

Before applying database changes to a live project, compare local and remote migration lists and review the proposed SQL. Keep provider secrets in Supabase Function secrets, never in this repository.
