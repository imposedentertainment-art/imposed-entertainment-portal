# Production Audit — 2026-10-21

## Scope and evidence

Initial architecture/security pass against the default branch and connected Supabase project. Inspected the complete tracked-file tree, primary application modules, Cloudflare Pages configuration, service-worker asset strategy, CI workflow/static audit, live public-schema metadata, migration history, RLS policies, public RPC execute grants, Edge Function inventory, and recent Supabase logs.

Repository snapshot: 82 tracked files, 19 JavaScript modules, 15 CSS files, 18 SQL migration files.
Connected Supabase snapshot: 46 public tables (all report RLS enabled), 86 recorded migrations, four active Edge Functions.

This is not a claim that every authenticated UI flow has been browser-tested. Live browser/E2E verification remains outstanding.

## Phase 1 — Architecture findings

### Critical

- **AUD-001 — Migration source-of-truth drift.** The repository contains 18 SQL migration files while the connected project reports 86 recorded migrations. The latest repository migrations also include two files with the same `20261021160000` prefix. Remote migration records for recent listener/shop changes use different versions than the corresponding local filenames. A clean database cannot be reproduced from the repository alone, and CLI migration operations need reconciliation. Do not reset the live database or push a reconstructed baseline until this is resolved.
- **AUD-002 — RLS requires behavioural verification.** All 46 public tables report RLS enabled, but that metadata does not prove ownership and role boundaries are correct. Add authenticated role-matrix tests for label admins, artists, listeners and anonymous users, covering read/insert/update/delete and RPC access. Preserve invite-only workspace rules.
- **AUD-003 — CI is static-only.** Existing CI checks JavaScript syntax, assets, versions, and source-text invariants. It does not exercise browser routes, auth transitions, storage uploads, realtime recovery or database permission boundaries.

### Additional live Supabase advisor findings

- Supabase security advisor flags the anonymous `SECURITY DEFINER` RPC `public.get_invite(p_code text)`. Anonymous execution appears intentional for invite-code validation during signup, and the function returns invite email/name/role only for pending, unexpired codes. Do not revoke it blindly; verify code entropy, abuse controls and the exact fields required by the signup UI.
- The advisor also flags 12 `SECURITY DEFINER` functions callable by authenticated users. Several have explicit role/ownership checks, but each must be reviewed for the least-privilege contract rather than revoked wholesale.
- The advisor reports leaked-password protection disabled. This is intentionally unchanged because the project is on Supabase Free and the owner has specified not to enable that feature.
- Performance advisor reports 60 unused indexes. The database has very little live data and low traffic, so this is not enough evidence to drop them. Revisit after collecting representative workload/query plans.
- Recent Auth logs contain two HTTP 500 refresh-token requests with `context canceled`. They may be aborted/slow client refreshes; correlate with client telemetry before changing auth semantics.

### Major

- **AUD-004 — Competing UI appearance layers.** The entry document loads approximately 15 CSS files and theme behaviour is split between account preferences, a local-storage customiser, root data attributes and body classes. Legacy hard-coded selectors can conflict with semantic tokens.
- **AUD-005 — Preference coupling.** Appearance data is stored inside `profiles.notification_preferences.appearance`. This makes unrelated settings share one JSON payload and increases the need for carefully merged updates.
- **AUD-006 — Client-side route verification gap.** Cloudflare rewrites paths to the SPA shell, while the JavaScript router determines the actual page. HTTP success alone does not verify direct-link, refresh, auth callback, back/forward or role-gated behaviour.
- **AUD-007 — Recovery paths need coverage.** Startup, retries, polling and Realtime recovery exist, but require tests for expired sessions, identity changes, offline/slow networks, empty records and partial data failures.
- **AUD-008 — Security policy review.** The static CSP includes inline script/style allowances and several external origins. Review dynamic HTML insertion, external dependency integrity, public RPC access and signed storage URLs without breaking Turnstile or auth.
- **AUD-009 — Large modules.** Views, profiles and event handling are large and cross-coupled. Refactor incrementally behind tests; avoid a wholesale rewrite that risks existing features.

### Polish

- **AUD-010 — Styling duplication.** Consolidate repeated navigation/card/form rules after behavioural regressions are covered.
- **AUD-011 — Action coverage.** Add a handler/action inventory test for all literal and generated `data-action` controls.
- **AUD-012 — Accessibility/responsiveness.** Add browser checks for keyboard focus, reduced motion, contrast, touch targets, viewport overflow and empty/loading/error states.
- **AUD-013 — Query/performance review.** Compare indexes and query plans against real query patterns before adding indexes.
- **AUD-014 — Storage lifecycle.** Test retries, abandoned draft recovery and orphan cleanup.
- **AUD-015 — Update delivery.** Test cache invalidation and service-worker upgrades on mobile and desktop with direct route refreshes.
- **AUD-016 — Migration filename guard.** Static CI now emits a warning when multiple migration files share the same 14-digit version prefix; the current duplicate remains a deliberate remediation item until migration history is reconciled.

## Phase 2 — Priority order

1. Reconcile migration history and produce a reproducible schema baseline without destructive changes.
2. Test and remediate RLS/RPC role boundaries.
3. Add browser smoke tests for route/auth/release/upload/profile/listener/shop flows.
4. Stabilise the shared appearance state and semantic CSS token system.
5. Add error/retry/realtime lifecycle coverage.
6. Tighten CSP and dynamic HTML handling based on dependency requirements.
7. Refactor modules and improve performance/accessibility after coverage exists.

## Phase 3 — Repairs made during this audit

- **v2.8.5:** Quick customiser now includes its selected workspace theme in account-sync events. AMOLED was added to account preference validation, the main Appearance mode selector and semantic surface styling.
- **v2.8.6:** The quick customiser applies its selected mode and workspace theme to the same root data attributes as the account-level appearance system, including signed-out sessions.
- Added regression checks for workspace-theme propagation, AMOLED mode, and shared semantic theme attributes.
- Updated HTML asset versions, service-worker cache version and changelog to v2.8.6.

## Verification status

- Latest GitHub Actions static-site check passed: https://github.com/imposedentertainment-art/imposed-entertainment-portal/actions/runs/39656776035
- The check covers syntax, asset/version consistency and source-level regression assertions.
- Supabase inspection confirmed RLS enabled on all 46 public tables and four active Edge Functions.
- Recent logs include two Auth refresh-token requests returning HTTP 500 with `context canceled`; these require correlation with client/session behaviour before attributing them to an application defect.
- No database schema or user data was changed during this audit pass.
- **Not yet verified:** all authenticated browser journeys, live Cloudflare deployment, every RLS policy by role, storage policies, and every form/RPC/realtime interaction. Do not describe the application as fully production-certified until these checks pass.
