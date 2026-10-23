## 3.3.70 — Jitter UI engine integration and repository recovery

- Added Null Core for application lifecycle, configuration, event routing and bounded diagnostics; added Cloud OS for isolated service lifecycle and Prism for validated personalisation state.
- Preserved Supabase as the source of truth for authentication, account data, storage, realtime and email workflows.
- Restored monotonic app/service-worker versioning instead of downgrading the existing 3.3.69 build.
- Fixed responsive workspace navigation layering and dashboard widget layout; retained all five theme backgrounds and ensured wallpaper is owned by the page rather than duplicated inside the welcome hero.
- Updated browser smoke tests to assert the current design-system contracts and made CI browser execution serial to reduce flaky timeouts.

## 3.3.33 — Performance, desktop UI and public AI knowledge access

- Public discovery now renders at `/` without requiring an artist/label login; `/signin` remains the explicit private workspace entry point.
- Added a dedicated crawlable `/knowledge/` page for the AI knowledge base, with links to public help, discovery, shop, artist profiles, policies and account guidance.
- Reduced expensive global blur layers, constrained glass effects to purposeful surfaces, added reduced-transparency and reduced-motion fallbacks, and repaired common desktop overflow/grid constraints.
- Added cache/version updates and static audit coverage for the public knowledge route and root visitor experience.

## 3.3.32 — Public help centre and authenticated support assistant foundation

- Added a public, crawlable Help Centre covering listener discovery, accounts, public profiles, shop guidance and safe support practices.
- Added Botpress integration documentation, a guarded webchat loader for the authenticated workspace Support route, and an optional configuration value that remains disabled until a generated public webchat configuration URL is supplied.
- Expanded Content Security Policy only for the Botpress hosts needed by the optional widget; added clean `/help/` routing and public crawl guidance.
- Kept Botpress diagnostics disabled until server-side identity, role, ownership, rate-limit and retention controls are independently verified.
- Added route smoke coverage and refreshed static asset/service-worker versioning.

## 3.3.12 — Correct final drawer stacking conflict

- Overrode the legacy open-menu selector that explicitly lowered the navigation row to `z-index: 0`, placing it behind the drawer.
- Kept the header at the navigation layer, the toggle row above the drawer, and drawer links at the intended overlay layer.
- Refreshed versioned assets and service-worker cache for the corrected cascade.

## 3.3.11 — Keep the mobile menu toggle above the drawer

- Made the compact header row a deliberate top stacking layer and fixed its height, keeping the toggle above the drawer even when older rules change drawer geometry.
- Kept the drawer scrollable below the header and retained the page-covering glass backdrop.
- Refreshed the service-worker cache and added an assertion for header-row stacking.

## 3.3.10 — Keep mobile menu controls clear of the drawer

- Forced the compact mobile header into a single row and constrained the brand wordmark so the drawer cannot overlap the menu toggle.
- Preserved the drawer's measured top offset and full-height contained scrolling.
- Updated cache/version references to invalidate the earlier layout.

## 3.3.9 — Fix application stacking context and overlay regression

- Removed the app wrapper's low stacking context so fixed navigation can layer correctly.
- Disabled the legacy generic page-level mobile-menu backdrop that covered the entire application; the navigation header now owns the drawer backdrop.
- Preserved modal backdrops for dialogs while keeping the menu toggle and drawer above the menu backdrop.
- Added diagnostics to the mobile drawer browser test and refreshed the service-worker cache version.

## 3.3.8 — Consolidated UI bug fixes and regression coverage

- Restored the desktop navigation as a fixed sidebar instead of a sticky header.
- Removed page-level pseudo-element backdrops that sat above the entire application shell and hid both the mobile menu and appearance launcher.
- Put the mobile drawer backdrop inside the navigation stacking context, keeping the toggle and drawer above it.
- Restored a reliable visible appearance icon and safe-area-aware floating button.
- Added browser regression tests for appearance settings, mobile drawer visibility, overlay stacking, keyboard hints, and horizontal overflow.
- Added the consolidated stylesheet to the service-worker cache allow-list and bumped the application version.

## 3.3.7 — UI stability and regression fixes

- Removed conflicting emergency overrides that forced the desktop sidebar into a sticky top bar.
- Replaced the page-level backdrop with a header-local overlay so the mobile menu remains above its backdrop and the page is properly obscured.
- Restored the floating appearance launcher icon without relying on a CSS mask.
- Added safe-area spacing, mobile drawer sizing, high-contrast navigation text, workspace title alignment, and consistent utility button sizing.
- Added browser regression coverage for the appearance launcher and mobile navigation stacking.

## 3.3.6 — Restore navigation and appearance controls

- Made the mobile drawer visibility follow the real menu button's `aria-expanded` state.
- Restored the menu toggle above the backdrop and kept the backdrop active only while the drawer is open.
- Restored the floating appearance control with a visible text glyph fallback instead of relying on a CSS mask.
- Kept the appearance panel hidden only when its own `hidden` state is set, and refreshed asset/cache versions.

## 3.3.5 — Mobile drawer stacking and dashboard polish

- Reworked the drawer overlay to use the actual conditional `.mobile-nav` markup and a stable header-local stacking context.
- Kept the menu toggle and drawer above the backdrop while obscuring page content behind the open menu.
- Reapplied dashboard safe-area padding, floating Aa positioning, high-contrast text, and mobile shortcut visibility.
- Refreshed asset URLs and service-worker cache.

## 3.3.4 — Mobile menu visibility hotfix

- Fixed the backdrop activating just because the mobile drawer exists in the DOM.
- Scoped the blurred backdrop to the menu button's expanded state.
- Restored explicit hidden-state handling so the CSS display override cannot force a closed drawer visible.
- Bumped static asset and service-worker cache versions.

## 3.3.4 — Mobile navigation visibility recovery

- Explicitly honour the mobile drawer's `hidden`, `aria-hidden`, and `.is-hidden` states despite legacy `display:block!important` rules.
- Restrict the blurred backdrop to an open, visible drawer and restore the content/header/drawer stacking order.
- Keep the menu toggle clickable and disable the floating personalisation button only while the drawer is open.
- Refresh the stylesheet version, service-worker cache, and release metadata.

## 3.3.3 — Dashboard-wide UI refactor

- Consolidated contrast tokens across dashboard cards, headings, actions, badges and placeholders.
- Standardised hero action button shape, spacing, typography and icon alignment.
- Increased safe scroll clearance and horizontal page gutters to prevent clipped content and scrollbar collisions.
- Strengthened navigation/search modal backdrop layering and drawer text contrast.
- Standardised header spacing, stat accent rails, mobile keyboard shortcut visibility and floating Aa placement.
- Refreshed page asset versions and service-worker cache.

## 3.3.2 — Real navigation DOM integration

- Corrected overlay selectors to target the actual `.shell > header.nav > .mobile-nav` markup.
- Applied the explicit header/drawer stacking hierarchy to the real mobile navigation structure.
- Improved drawer contrast and navigation item spacing, standardised header utility controls, and hid mobile keyboard hints.
- Increased bottom scroll space and refreshed the asset cache/version metadata.

## 3.3.1 — Navigation overlays and accessibility fixes

- Added a versioned overlay/accessibility stylesheet after the existing UI layers.
- Defined explicit content, floating action, sticky header and drawer stacking levels.
- Added dark blurred navigation backdrop and high-contrast drawer, input and metadata tokens.
- Normalised workspace title stack, header utility dimensions, mobile shortcut visibility and stat accent rails.
- Updated page stylesheet references, service-worker cache version and release metadata.

## 3.3.0 — Dashboard contrast, spacing and action fixes

- Added a consolidated high-contrast dashboard style layer with dark card surfaces.
- Unified hero action buttons, workspace header spacing, title stacking and utility-button sizing.
- Positioned the personalisation/accessibility trigger at the bottom-right and increased page scroll space.
- Updated asset cache versioning.
- Corrected a Playwright smoke-test locator that matched multiple valid page containers.

## 3.2.9 — Dashboard overlap and contrast follow-up

- Pinned the personalisation/accessibility control to the bottom-right safe area with a high stacking order.
- Increased dashboard bottom scroll padding to keep the stat row clear of floating controls and the viewport edge.
- Unified the four main action button typography, padding, border, radius and secondary-action contrast.
- Improved workspace sub-bar top inset, branding/title spacing and metadata contrast.
- Standardised workspace search/account/menu control dimensions.
- Updated asset and service-worker cache version.

## 3.2.8 — Dashboard contrast and layout refinement

- Increased dashboard hero and supporting copy contrast against dark glass backgrounds.
- Standardised stat count and metadata contrast, primary action sizing, and workspace header controls.
- Added spacing and safe-area padding for page titles, top headers and the bottom stat row.
- Improved glass surface tint/blur and positioned accessibility/customisation floating controls clear of page content.
- Updated asset and service-worker cache version.

## 3.2.7 — Fix colour mode switching

- Made the selected Dark, Light, AMOLED and System modes explicitly set colour-scheme and semantic surface/text tokens.
- Added mode-scoped styling for app backgrounds, cards, navigation, form controls and text so workspace palette rules cannot leave the interface in a mixed mode.
- Corrected the browser theme-colour meta tag so Light mode no longer gets overridden by the selected workspace palette.
- Updated cache-busting and service-worker cache version.

## 3.2.6 — Major UI personalisation and responsive polish

- Connected selected typeface and line-spacing controls to live global interface tokens.
- Applied user-selected content width to common workspace containers.
- Implemented visual treatments for outlined/minimal cards, artwork shapes, outline/pill buttons, floating/minimal navigation, and decorative-element visibility.
- Improved the customisation panel's tab layout, control spacing, focus states, scrolling, and small-screen dimensions.
- Updated asset versioning and service-worker cache version.

## 3.2.5 — UI system consistency and responsive fixes

- Added a final unified UI compatibility layer for consistent focus states, component geometry, overflow handling, and responsive constraints.
- Made the canonical design-token defaults authoritative instead of redefining them in the mobile stylesheet.
- Updated stylesheet cache-busting and the service-worker cache version to ensure the new UI layer can be fetched.
- Preserved existing theme and personalisation classes; no user preferences or backend data were changed.

# Changelog

## [3.2.4] - 2026-10-21 — Quality and migration safety

- Reconcile duplicate tracked migration version prefix by assigning the shop catalogue migration a unique, ordered version. The duplicate version was not recorded in the live Supabase migration history; no production SQL was applied.
- Add Chromium browser smoke tests for local asset failures, mobile horizontal overflow and direct privacy/terms routes.
- Add an automated browser-test stage to GitHub Actions alongside existing syntax and static audits.
- Security review confirms `get_invite` is intentionally callable without sign-in for invitation onboarding; its body only returns fields for a matching pending, unexpired code. Keep this public workflow, continue reviewing token entropy and edge rate limiting. No broad SECURITY DEFINER grants were revoked.


## [3.2.3] - 2026-10-21 — Mobile glass and dashboard consistency

- Apply Liquid Glass to the actual mobile navigation drawer and accordion selectors, with consistent spacing and legible active states.
- Normalize dashboard widget grid sizing and add accessible reduced-motion-aware skeleton styling hooks.
- Keep all existing routes, data queries and account-preference storage in place.


## [3.2.2] - 2026-10-21 — Unified token bridge and mobile refinements

- Connect existing personalisation controls to glass opacity, blur, saturation, borders, radii, density, accent glow and motion tokens.
- Fix service-worker release cache/version matching and allow-list the mobile contrast stylesheet.
- Keep the current Supabase preference model and account appearance persistence; no schema migration or destructive database operation.


## [3.2.0] - 2026-10-21 — Tokenized design-system foundation

- Introduced central semantic design tokens for glass opacity, blur, border intensity, radii, spacing, typography and shadows.
- Standardized token consumption across common app surfaces, while keeping the existing preference engine and data flow intact.
- Updated asset versioning and service-worker cache namespace.
- No database schema or production data changes.

# Changelog

## [3.1.0] - 2026-10-21 — Liquid Glass refinement

- Reduced the default tint and darkening effect so theme photographs show through more clearly.
- Added layered specular highlights, translucent gradients, finer edges and subtler shadows.
- Extended the visual system across navigation, menus, buttons, form fields, tables and dashboard content.
- Tuned mobile blur separately to balance transparency with scrolling performance.
- Refreshed static asset and service-worker cache versions.

# Changelog

## [3.0.0] - 2026-10-21 — Liquid Glass visual system overhaul

- Rebalanced the UI away from near-opaque dark surfaces toward brighter, more transparent, layered glass.
- Extended glass styling across dashboard cards, menus, navigation, controls, forms, dialogs, tables and common content surfaces.
- Increased glass highlights, edge definition and backdrop saturation while retaining legibility over theme photography.
- Tuned blur for touch devices and added reduced-transparency/reduced-motion accommodations.
- Bumped asset and service-worker cache versions.

# Changelog

## [2.9.9] - 2026-10-21 — Dashboard detail controls and scroll performance

- Added working per-user controls inside “More dashboard details” for tasks, label insights, announcements, recent activity and release catalogue.
- Added an Insights preference and kept dashboard visibility choices in the existing appearance preference save flow.
- Reduced costly backdrop-filter stacking on mobile, limited off-screen dashboard rendering work and removed smooth scrolling as a default on touch devices.
- Preserved theme photography and glass appearance while improving mobile readability and panel spacing.
- Bumped static asset and service-worker cache versions.

# Changelog

## [2.9.8] - 2026-10-21 — Dashboard composition and Liquid Glass refinement

- Reworked mobile dashboard sizing to remove oversized hero whitespace and force saved desktop widget sizes into a usable single-column mobile presentation without overwriting preferences.
- Improved Liquid Glass opacity, blur, highlights, borders and text contrast across dashboard widgets, metrics, shortcuts and expandable details.
- Refined hero hierarchy, action buttons, shortcut rows, metric cards and dashboard detail disclosure.
- Added mobile overflow protection and narrow-screen typography refinements.
- Updated stylesheet versioning and service-worker precache.

# Changelog

## [2.9.7] - 2026-10-21 — Liquid Glass specificity and transparency fix

- Fixed CSS specificity conflicts that left existing component styles opaque despite the original Liquid Glass rules.
- Explicitly restyled dashboard hero secondary actions, shared cards, controls, navigation and page header surfaces with stronger translucent glass layers.
- Reduced the glass fill opacity so theme photography remains visible behind secondary actions.
- Updated asset versions and service-worker cache.

# Changelog

## [2.9.6] - 2026-10-21 — Full Liquid Glass coverage

- Extended Liquid Glass beyond dashboard widgets to global navigation, headers, sidebars, page sections, profiles, artist/release views, catalogue, shop, forms, tables, inputs, menus, popovers, dialogs and status controls.
- Standardised translucent material, theme-tinted fills, blur, subtle specular highlights, borders and ambient depth across routes.
- Preserved distinct Light Skies contrast and added reduced-transparency and unsupported-backdrop-filter fallbacks.
- Bumped all asset query versions and the service-worker cache.

# Changelog

## [2.9.5] - 2026-10-21 — Liquid Glass interface

- Introduced a cohesive Liquid Glass material across dashboard panels, cards, menus, modals, form controls and secondary actions.
- Added theme-aware translucent fills, backdrop blur, fine specular edges, layered highlights and ambient shadows.
- Kept the Light Skies theme bright and legible while giving dark themes distinct tinted glass.
- Improved focus rings and hover feedback; included reduced-transparency, reduced-motion and unsupported-blur fallbacks.
- Versioned the stylesheet and service-worker cache to refresh deployed clients.

## [2.9.4] - 2026-10-21 — Theme background and layout polish

- Removed the stray custom-banner strip from the top of the workspace so the selected theme photograph defines the visual backdrop.
- Applied the original selected theme photograph consistently behind the workspace with a controlled contrast wash.
- Refined the mobile welcome hero, spacing, button hierarchy, glass surfaces and navigation separation.
- Corrected a malformed stylesheet line in the document head so all stylesheets load in the intended place.
- Updated cache namespace and stylesheet versioning.

# Changelog

## [2.9.3] - 2026-10-21 — Working dashboard panel resizing

- Fixed dashboard width controls so full, half and one-third sizes map to real grid column spans.
- Added draggable corner handles to dashboard panels; resizing adjusts width and height and saves the result to the user's appearance preferences.
- Added keyboard resizing with arrow keys while dashboard customisation is enabled.
- Kept panel reorder, shape, reset and visibility preferences compatible.
- Added touch-friendly resize affordances and responsive fallbacks.
- Bumped asset URLs and service-worker cache to 2.9.3.

# Changelog

## [2.9.2] - 2026-10-21 — Portal UI refinement

- Improved page spacing, heading hierarchy and text rhythm across the portal.
- Refined dashboard metrics, action panels, shortcuts and upcoming-release cards.
- Improved mobile tap targets, roster row wrapping, form controls and horizontal table handling.
- Added more consistent keyboard focus states and subtle hover feedback for pointer devices.
- Refined appearance settings navigation and layout at narrow viewport widths.
- Kept user-selected themes, accent colours, and reduced-motion preferences in control.
- Fixed duplicate theme stylesheet entries in the service-worker asset list and added the new refinement stylesheet to precache allow-lists.
- Bumped asset URLs and cache namespace to 2.9.2.

## [2.9.1] - 2026-10-21 — Theme imagery on the dashboard hero

- Fixed the Overview dashboard hero so the selected original theme photograph appears directly behind the welcome message and actions, not only on the page background/theme picker.
- Added theme-aware contrast overlays for dark themes and Light Skies, while keeping existing featured-release artwork usable.
- Improved the mobile hero image crop and kept the text/actions above decorative art.
- Bumped asset URLs and service-worker cache to 2.9.1.

## [2.9.0] - 2026-10-21 — Photographic workspace and UI major refresh

### Visual overhaul
- Made the five supplied theme photographs a visible part of the workspace: full-page atmosphere, image-backed page headers and real-photo theme-picker cards.
- Kept content readable with theme-aware dark/light overlays, translucent panels, contrast-safe controls and mobile-friendly scrolling.
- Refined page rhythm, card hierarchy, buttons, focus rings, navigation surfaces and responsive layouts.
- Added restrained hover/focus feedback and reduced-motion support.

### Update delivery
- Bumped static asset URLs and service-worker cache namespace to 2.9.0.
- Added the new visual layer to the service worker's public asset allow-list.

### Verification
- Source-level review only; live Cloudflare Pages rendering and authenticated browser interaction still need confirmation.

## [2.8.11] - 2026-10-21 — Correct photo asset cache list

### Fixed
- Removed stale SVG theme assets from the service-worker precache now that the original JPEGs are extracted and used.
- Bumped release and cache version so clients fetch the corrected theme assets.


## [2.8.10] - 2026-10-21 — Original theme photographs

### Fixed
- Extracted the five original JPEGs from the repository-root `themes.zip` into the public `themes/` directory via GitHub Actions.
- Updated theme-picker thumbnails and full-page backgrounds to use the original JPEGs rather than generated SVG substitutes.
- Added the JPEGs to the service-worker precache and bumped the release/cache namespace to 2.8.10.

### Automation
- Added `.github/workflows/extract-theme-assets.yml` so the uploaded archive is extracted automatically on future changes.


## [2.8.9] - 2026-10-21 — Theme artwork icons in picker

### Fixed
- Replaced generic line-based theme preview swatches with thumbnails using each theme's bundled artwork.
- Kept accessible decorative images hidden from screen readers and added responsive thumbnail sizing.
- Bumped document asset versions and service-worker cache namespace so the updated picker can be fetched.

### Verification
- Static source checks pending; confirm live rendering after Cloudflare Pages deploys.


## [2.8.8] - 2026-10-21 — Theme artwork bundled

### Changed
- Added five repository-hosted theme background assets: Light Skies, Midnight Studio, Graphite Minimal, Plum Dusk and Forest Room.
- Updated theme backgrounds and picker previews to use the bundled SVG assets.
- Added all five files to the service-worker static allow-list and bumped the cache namespace to v2.8.8.

### Verification
- Confirmed each SVG is present in the Git tree and referenced by the theme stylesheet/service worker. Live browser rendering still requires verification after Pages deploys.

## [2.8.7] - 2026-10-21 — Photographic workspace themes

### Changed
- Applied the five supplied theme artworks to Light Skies, Midnight Studio, Graphite Minimal, Plum Dusk and Forest Room.
- Added theme-specific semantic surface, border, text and input tokens so cards and navigation coordinate with each artwork.
- Theme picker previews now use their corresponding artwork.
- Added theme image paths to the service worker's static asset allow-list and bumped the cache version.

### Deployment note
- The five JPEGs must be present at `/themes/<theme-name>.jpg` in the deployed site for the photographic backgrounds to render. The application CSS and cache manifest reference those exact paths.

## [2.8.6] - 2026-10-21 — Shared theme attributes

### Fixed
- The floating customiser now applies its saved colour mode and workspace palette to the same semantic document attributes used by the main Appearance page, including signed-out sessions.
- Added a regression assertion for the shared theme attributes.

### Verification
- Automated static checks validate the mode/palette wiring; live browser testing is still outstanding.

## [2.8.5] - 2026-10-21 — Personalisation sync and AMOLED mode

### Fixed
- The floating customiser now includes its selected workspace theme in the account-sync event payload.
- Added AMOLED as a validated account-level colour mode and exposed it in Settings → Appearance.
- Added full black page, navigation, card, text and form surfaces for AMOLED mode.

### Verification
- Static checks cover workspace theme propagation and AMOLED mode validation.
- Live authenticated browser testing remains part of the wider audit.

## [2.8.4] - 2026-10-21 — Unified themes and light mode

### Fixed
- Added Light Skies, Midnight Studio, Graphite Minimal, Plum Dusk and Forest Room to the main Settings → Appearance page.
- Replaced the old named colour preset grid with complete workspace themes and an independent custom accent.
- Made account appearance preferences and the floating customiser share the same workspace theme and colour mode.
- Added high-specificity light-mode rules that override legacy hard-coded dark navigation, card, form and text styles.
- Synced the account accent into the global accent token so active navigation and focus states use the selected colour.

### Update delivery
- Bumped HTML asset URLs and service-worker cache version to 2.8.4.

### Verification
- Static CI checks cover theme persistence, main settings options, light-mode overrides and cache-version consistency.
- Live visual verification on an authenticated phone browser is still required.

## [2.8.3] - 2026-10-21 — Functional personalisation and reliable refresh

### Fixed
- Removed the duplicate mobile Account settings entry; Settings & preferences is the single settings destination.
- Implemented real light-mode surface, text, form, card, menu and border tokens rather than only toggling a class.
- Connected typography, text scale, content width, card treatment, surface, navigation, button, motion, shadow, contrast, glow, decorative visibility, density and radius preferences to rendered UI styles.
- Made selected navigation and focus states derive from the user's accent colour instead of a fixed purple.

### Update delivery
- Bumped all HTML asset query strings and service-worker cache keys to 2.8.3.
- Added the theme layer to the service worker's critical cache assets and kept HTML/service-worker update checks network-first.

### Verification
- Added regression checks for light mode, live preference mappings, duplicate account navigation and release asset version consistency.
- Static CI checks do not replace a real authenticated mobile-browser test.


## [2.8.2] - 2026-10-21 — Full theme and navigation icon overhaul

### Improved
- Reworked the theme picker into named, complete visual themes instead of generic colour palettes.
- Added Light Skies: a light blue-grey interface with cloud-like gradients, airy panels, legible dark typography, and compatible custom accents.
- Rebuilt the dark theme tokens for Midnight Studio, Graphite Minimal, Plum Dusk, and Forest Room.
- Added missing SVG icons used by navigation and common workspace controls, plus a visible fallback icon for unknown icon names.
- Standardised icon sizing, alignment, spacing, focus states, and mobile/desktop menu presentation.
- Kept custom accent colour independent from theme choice and retained import/export/reset preferences.

### Verification
- JavaScript syntax, CSS structure, icon mapping, theme controls, and asset/cache consistency checked by GitHub Actions.
- Real-device visual verification and authenticated end-to-end feature checks remain required after deployment.

## [2.8.1] - 2026-10-21 — Personalisation fixes and palette controls

### Fixed
- Mobile active-navigation states and open accordion headings now use the chosen accent colour instead of hard-coded purple.
- Custom accent colours now propagate to selected navigation, focus states, active controls, and menu highlights consistently.
- Standardised active-state styling across mobile and desktop navigation and fixed the personalisation launcher glyph overlap.

### Added
- Added five workspace surface palettes: Midnight, Graphite, Deep Navy, Plum Dusk, and Forest Night.
- Palette selection is stored with existing local preferences and included in settings export/import and reset.
- Added regression checks for palette state, CSS accent usage, and release asset registration.

### Verification
- JavaScript syntax, CSS structure, asset references, and personalisation behaviour are checked by the repository workflow. Visual testing on a real phone remains necessary after deployment.

## [2.8.0] - 2026-10-21 — Reliable update delivery

### Fixed
- Service-worker update checks now bypass the browser HTTP cache and run on page load, rather than waiting for a browser's normal update-check interval.
- When an existing service worker takes control after an update, the page reloads once to ensure the active document uses the newly deployed app shell and assets.
- Kept first-time service-worker installation from interrupting the initial page load and guarded update reloads against loops.
- Versioned the app shell and service-worker cache together so this release invalidates prior cached assets.

### Verification
- Source-level update-flow and release-version consistency checks performed. Live Cloudflare cache propagation and real-device update behaviour still require deployment testing.

## [2.7.9] - 2026-10-21 — Authentication screen redesign

### Improved
- Refined artist/label and listener sign-in screens with calmer contrast, clearer hierarchy, a more compact brand story, cleaner portal choices, and a more legible form card.
- Improved mobile spacing and compact portal selection while preserving existing sign-in, invitation, OAuth, Turnstile and password controls.
- Bumped stylesheet asset versions and service-worker cache namespace to prevent stale authentication styles.

### Verification
- Source-level CSS structure and version consistency checked. Live visual QA and authenticated browser tests remain outstanding.


## [2.7.9] - 2026-10-21 — Mobile navigation drawer recovery

### Fixed
- Corrected the mobile drawer height calculation to measure the compact navigation header instead of the full header containing the open drawer. This prevents the menu from collapsing to zero height.
- Overrode legacy two-column mobile navigation rules that conflicted with the grouped, searchable accordion menu.
- Recalculates drawer height on viewport resize and device orientation changes.


## [2.7.7] - 2026-10-21 — Auth and upload recovery

### Fixed
- Retry one transient Supabase Auth session-read failure (including server-side 5xx and context-cancelled/network errors) before aborting startup.
- Never continue a storage upload with a stale access token when explicit session refresh fails. Refresh errors now enter the existing retry/error path instead of being hidden.
- Added regression assertions for transient auth recovery and upload refresh failure handling.

### Security and operations
- Reviewed live Supabase RLS policies for releases, profiles, listener data, and shop products; owner/admin restrictions and listener workspace blocks are present.
- Reviewed Supabase security/performance advisor output. Public invite-code lookup and authenticated SECURITY DEFINER RPC warnings require per-function intent review; no broad privilege revocation was applied because it could break sign-up and workspace flows.
- Leaked-password protection remains unchanged, per the project's Supabase Free plan constraint.

### Verification
- Static checks validate syntax and cross-file invariants; full browser/device testing remains separate.

## [2.7.7] - 2026-10-21 — Auth and upload recovery

### Fixed
- Retry one transient Supabase Auth session-read failure (including server-side 5xx and context-cancelled/network errors) before aborting startup, reducing false startup failures during token rotation.
- Never continue a storage upload with a stale access token when explicit session refresh fails. Refresh errors now enter the existing retry/error path instead of being hidden.
- Added regression assertions for transient auth recovery and upload refresh failure handling.

### Security and operations
- Reviewed live Supabase RLS policies for releases, profiles, listener data, and shop products; owner/admin restrictions and listener workspace blocks are present.
- Reviewed Supabase security/performance advisor output. Public invite-code lookup and authenticated SECURITY DEFINER RPC warnings require per-function intent review; no broad privilege revocation was applied because it could break sign-up and workspace flows.
- Leaked-password protection remains unchanged, per the project's Supabase Free plan constraint.

### Verification
- Static checks validate syntax and cross-file invariants; full browser/device testing remains separate.

## [2.7.6] - 2026-10-21 — Site-wide regression hardening

### Fixed
- Mobile navigation drawer height now accounts for the actual header position and mobile viewport/safe-area, preventing the menu from extending below the visible screen.
- Navigation marks route links such as Shop as active, not just button-based workspace views.
- Expanded static audit coverage for menu markup/CSS selectors, desktop and mobile shop access, shop routes, and persisted personalisation controls.

### Verification
- JavaScript syntax, asset/version integrity, CSS structure and cross-file route/control checks run in GitHub Actions.
- Static checks do not replace end-to-end browser tests against the live Supabase project.

## [2.7.6] - 2026-10-21 — Site-wide regression hardening

### Fixed
- Mobile navigation drawer height now accounts for the actual header position and mobile viewport/safe-area, preventing the menu from extending below the visible screen.
- Navigation now marks real route links such as Shop as active, not just button-based workspace views.
- Expanded the static audit with cross-file regression checks for menu markup/CSS selectors, desktop and mobile shop access, shop routes, and persisted personalisation controls.

### Verification
- JavaScript syntax, asset/version integrity, CSS structure and the expanded route/control audit run in GitHub Actions.
- These static checks do not replace end-to-end browser tests against the live Supabase project.

## [2.7.5] - 2026-10-21 — Navigation, shop discovery and personalisation fixes

### Fixed
- Corrected the mobile menu trigger selector to match its actual nested location inside `.nav-inner`, restoring the visible menu toggle.
- Added direct Shop links to desktop and mobile workspace navigation.
- Included anchors as well as buttons in the mobile navigation search filter.
- Made personalisation selects, toggles and accent swatches save immediately; range controls preview changes live and save on release.
- Applied visible typography, line-height, content-width, navigation, button, card and motion preferences.
- Normalised invalid saved navigation/button/motion values and corrected the four-tab customisation grid.

### Verification
- Updated static asset versions and service-worker cache namespace together.
- Automated checks are triggered by the commits; live browser and device verification remains necessary.

## [2.7.4] - 2026-10-21 — Mobile navigation recovery

### Fixed
- Corrected the CSS cascade conflict between legacy mobile-device rules and newer drawer styling that caused the menu to be hidden or misplaced.
- Added a dedicated stylesheet loaded after every existing UI layer so the mobile drawer, toggle, search, accordion sections and active-page states win over conflicting legacy selectors.
- Anchored the menu below the sticky header instead of using fixed positioning inside a backdrop-filter containing block.
- Restored a solid, scrollable menu surface with safe-area spacing and reliable tap targets.

### Verification
- Updated asset versions, build metadata and the service-worker cache allow-list together.
- Automated static checks are triggered by the commits; live-device visual testing remains necessary.

## [2.7.3] - 2026-10-21 — Mobile navigation fix

### Fixed
- Rebuilt the open mobile navigation as an opaque, viewport-filling drawer so dashboard content no longer bleeds through the menu.
- Reduced oversized accordion headers and improved link spacing, active-page clarity, sticky search, contained scrolling and small-screen safe-area padding.
- Kept the desktop navigation and workspace layout unchanged.

### Verification
- Updated portal asset versions and service-worker cache namespace together. Static checks are run after commit; live-device visual testing is still required.

# Changelog

## [2.7.2] - 2026-10-21 — Printful catalogue integration foundation

### Added
- Added a Printful catalogue browser to the authenticated Product Studio, with search, product previews, variant-count hints and draft-prefill controls.
- Added a JWT-protected Supabase Edge Function that verifies artist/label-admin access and proxies catalogue requests using a server-side Printful API token.
- Documented setup for the `PRINTFUL_API_TOKEN` Edge Function secret and safe testing without checkout.

### Safety
- No Printful token is exposed to the browser. Catalogue selections only prefill a draft; they do not create a Printful sync product, trigger fulfilment, or enable ordering.
- Payment and physical music remain deferred.

### Verification
- Static release checks are queued after commit. Live Printful API calls require a valid token secret and an authorised Printful store.


## [2.7.1] - 2026-10-21 — Ordering status clarity

### Improved
- Made it explicit throughout the public shop and product workspace that ordering is currently unavailable.
- Kept catalogue browsing and product-listing management available while payment integration is deferred.
- No payment provider, checkout flow, or fulfilment integration was added in this release.

### Verification
- Updated portal build metadata, asset query versions, and service-worker cache namespace together.


## [2.7.0] - 2026-10-21 — Shop management workspace

### Added
- Added authenticated `/shop/manage` product studio for artists and label administrators.
- Create, edit, publish, unpublish through draft status, mark availability, feature label-shop products, and archive owned listings.
- Added validation for product title, category, price and HTTPS artwork URLs; management uses the signed-in user's Supabase session and existing RLS.
- Added responsive product-editor and inventory styling.

### Safety
- Checkout and fulfilment remain disabled. Listings do not accept payment or create orders.
- Artists can manage their own collection; label shop management is restricted to label administrators by database policy.

## [2.6.0] - 2026-10-21 — Unified shop foundation

### Added
- Added a public `/shop` catalogue route with responsive product cards, search, and category filters for vinyl, CDs, clothing and accessories.
- Added a secure Supabase shop catalogue schema with owner-scoped write access, public reads for published/available items, validated price/currency/product types, and provider reference fields for future Printful/Printify fulfilment.
- Added explicit checkout-not-ready messaging so visitors cannot mistake catalogue browsing for a live payment flow.

### Safety
- No payment or fulfilment credentials are stored in the browser or catalogue. Checkout and order creation remain disabled until a server-side payment flow, signed webhooks and provider fulfilment have been configured and tested.
- Supabase leaked password protection settings were not changed.

### Verification
- The shop catalogue migration was applied to the connected Supabase project. Automated repository checks and real-browser checkout testing remain outstanding.

## [2.5.0] - 2026-10-21 — Listener merch marketplace

### Added
- Added a dedicated Merch & Artist Shops shelf to the Listener Room, powered by public shop links artists already publish on their profiles.
- Added official shop links to public artist pages when an artist has links labelled for merch, shops, stores, vinyl, physical releases or recognised music storefronts.
- Added quick Shop merch links to directory cards for artists with a detected shop link.
- Added external-link safety attributes, clear messaging that checkout and fulfilment remain with the artist's chosen shop, and responsive layouts for mobile screens.

### Compatibility
- Reuses existing public artist links and the existing verified directory response; no new database table, checkout handling, API dependency or personal data collection is introduced.
- Artists can surface shops by adding a clearly labelled shop/merch/Bandcamp/physical-release link to their existing public profile links.
- Service-worker cache namespace and local asset versions updated together.

### Verification
- Static syntax and release consistency checks should run in GitHub Actions after commit. Live browser and mobile interaction tests remain outstanding.

## [2.4.0] - 2026-10-21 — Listener discovery experience overhaul

### Improved
- Reworked the listener listening-room hierarchy with stronger hero typography, clear collection stats, polished artist rows and more intentional spacing.
- Redesigned directory search, sorting controls, saved-music panels, alphabet filtering and artist cards.
- Added sticky translucent navigation and search controls for quicker access while browsing long rosters.
- Improved mobile directory controls, collection toolbar layout, single-column artist cards and compact listening-room stats.
- Added hover/focus affordances and reduced-motion-safe transitions for discovery cards and artist rows.

### Compatibility
- Kept existing routes, public-profile visibility rules, listener collections, saved-release flows, account sync and Turnstile verification logic unchanged.
- The new stylesheet remains part of the service-worker static asset list and critical precache set.

### Verification
- Automated JavaScript syntax, asset/version, stylesheet structure and Cloudflare Pages static checks passed on the release workflow. Real-browser checks at multiple viewport sizes remain outstanding.

# Changelog

## [2.3.0] - 2026-10-21 — Portable personalisation profiles

### Added
- Added settings export to a portable JSON file.
- Added settings import with file-size limits, JSON validation, a strict preference-key allow-list and normalisation through the existing settings validator.
- Added clear status messages for successful exports/imports and recoverable file errors.

### Improved
- Completed the 2.2.0 UI preference wiring: text scale, line height, system light/dark behavior, contrast, glow, decorative visibility, navigation and motion options.
- Removed duplicate service-worker stylesheet entries and refreshed versioned asset references.

### Verification
- JavaScript syntax, asset/version, stylesheet structure and Cloudflare Pages static checks run against the release commit. Browser-level testing across devices remains outstanding.

## [2.2.0] - 2026-10-21 — Personalisation and responsive UI functionality

### Fixed
- Connected advertised text scaling and line spacing preferences to global typography.
- Implemented the system theme's light-mode behavior when the device requests light appearance.
- Added visible behavior for high-contrast mode, accent glow, decorative-element visibility, minimal navigation, solid buttons and reduced/no-motion preferences.
- Removed a duplicate service-worker asset entry and ensured the unified stylesheet is versioned consistently.

### Improved
- Strengthened accessible contrast, preference consistency, and cross-screen design-system behavior.
- Kept existing feature modules and authentication/data flows intact.

### Verification
- Automated JavaScript syntax, asset/version, CSS structure and Cloudflare Pages static checks run against the release commit. Real-browser and device testing is still required.

# Changelog

## [2.1.0] - 2026-10-21 — Unified UI and personalisation release

### Added
- Added a final, shared design-system layer to make legacy workspace pages, forms, navigation, cards and listener surfaces feel more consistent.
- Expanded interface settings with card treatments (elevated, outlined, minimal) and artwork shapes (rounded, square, circular).
- Added a dedicated Cards customisation tab, with responsive controls and a clearer four-category settings layout.
- Improved the customisation panel's focus visibility, keyboard close behavior styling, safe-area placement, small-screen sizing and reduced-motion support.

### Improved
- Improved responsive page widths, card grids, form sizing, touch targets, focus indicators and light/AMOLED theme surfaces.
- Added stronger light-theme component overrides, accessible contrast affordances and consistent card/surface behavior across the portal.
- Versioned the new stylesheet and included it in the service-worker asset allow-list and critical precache set.

### Verification
- Repository asset/version checks and CSS/JS syntax checks must pass against this commit. Real-device visual checks remain necessary before calling the UI fully verified.

## [2.0.1] - 2026-10-21 — Mobile layout hotfix

### Fixed
- Fixed phones rendering the desktop workspace sidebar and desktop-sized dashboard instead of a proper mobile layout, including browsers requesting desktop sites.
- Added early touch-device detection and a final responsive override to prevent legacy desktop CSS from winning the cascade.
- Restored a compact full-width mobile header, menu toggle, full-width main canvas, compact dashboard grids and safe-area-aware bottom spacing.

### Verification
- Static checks will run on this commit. Visual browser/device verification remains necessary after deployment.


## [2.0.0] - 2026-10-21 — Major listener platform release

### Added
- Introduced personal listener collections for grouping public artists by mood, moment, or discovery theme.
- Added collection creation, artist-to-collection actions, item counts, collection previews, deletion confirmation, and bounded collection/item limits.
- Added cross-device collection sync for authenticated listener accounts through a new owner-only Supabase table; guest collections remain local to the current browser.
- Added validation for collection names and items and enforced per-user row-level security policies on the new collection table.

### Changed
- Reset the public build and service-worker cache version to 2.0.0 to mark a product-level milestone rather than another patch increment.
- Preserved existing listener-library and artist discovery flows.

### Verification
- Static checks and GitHub Actions will be checked after commit. Browser-level QA remains a separate required step.


## [1.4.90] - 2026-10-21

### Improved
- Upgraded listener collection portability to a complete v2 backup that includes saved artists, saved releases, and recent discovery history, while retaining compatibility with existing v1 exports.
- Added validation and bounded field lengths during import; only saved artists and releases belonging to the currently available public roster are restored.

### Verification
- Asset-version consistency and stylesheet structure checks will be re-run after commit. CI and browser verification remain pending.


## [1.4.89] - 2026-10-21

### Added
- Added Listener Room, a personalized landing section inside artist discovery with live saved-artist, saved-release, and recent-discovery counts.
- Added resume browsing, saved-artist shortcuts, fresh roster suggestions, quick vibe searches, and surprise discovery actions connected to the existing artist directory and collection.
- Built the Listener Room from the current public artist response and local/cloud-synced listener collection, without introducing a new backend dependency or collecting new personal data.

### Improved
- Added a responsive dashboard layout with clear empty states, mobile-specific spacing, keyboard focus, and reduced-motion support.

### Verification
- Static consistency checks are pending after this commit; browser testing and CI confirmation remain outstanding.


## [1.4.88] - 2026-10-21

### Improved
- Reworked listener discovery into a clearer, more editorial browsing experience with consistent brand colour, stronger page hierarchy, easier-to-scan artist cards, clearer search and collection controls, and improved mobile layouts.
- Refined shared interface surfaces, forms, buttons, focus states, spacing, and responsive overflow across the portal without changing authentication, route, or data logic.
- Added reduced-motion-aware transitions and stronger touch targets for listener discovery controls.

### Verification
- Confirmed the existing asset audit requires VERSION, HTML build metadata, asset query versions, and service-worker cache allow-list to stay synchronized.
- CI result for this release is pending; visual browser testing remains outstanding.


## [1.4.87] - 2026-10-21

### Fixed
- Hardened band-invite responses with an explicit authenticated-user requirement and row locking so concurrent accept/decline requests cannot both process a pending invitation.
- Added the corresponding versioned Supabase migration to the repository.
- Strengthened static-site release validation: local JavaScript and CSS assets must use the current version query, and app-shell assets must be included in the service-worker allow-list except the intentionally network-only config.js.
- Refreshed HTML asset URLs and service-worker cache namespace to ensure clients request the audited release.

### Verification
- Applied the invite hardening migration to Supabase and added its matching migration file to the repository.
- Corrected release commit ordering so CI evaluates the complete, synchronized v1.4.87 tree instead of an intermediate commit with the previous VERSION file.
- Repository static checks and browser end-to-end tests still need execution in CI and a real browser; no full production-readiness claim is made.

## [1.4.86] - 2026-10-21

### Improved
- Strengthened static-site release validation: every local JavaScript and CSS asset must use the current version query and be included in the service-worker allow-list, except the intentionally network-only config.js.
- Added explicit consistency checks for versioned local assets and offline-cache coverage to catch stale asset references before deployment.
- Refreshed HTML asset URLs and service-worker cache namespace to ensure clients request the audited release.

### Verification
- Repository files and Supabase function permissions reviewed before this change.
- Static checks are expanded in this release; browser end-to-end, live storage access and CI execution still require runtime verification.

## [1.4.85] - 2026-10-21

### Fixed
- Restricted authenticated profile search results to public profiles, the signed-in user's own permitted profile, administrators, and shared-band profiles.
- Restricted profile discography RPC results to profiles visible to the caller, respecting the discography preference while retaining owner, administrator, and permitted shared-band access.
- Cleaned up account-scoped polling and realtime subscriptions on sign-out and account switching to reduce stale subscriptions and cross-session state risk.
- Expanded the static-site audit to validate every stylesheet linked from the HTML shell rather than a fixed subset.

### Verification
- Applied and re-read both Supabase function migrations; confirmed row-level security remains enabled on all 45 public tables.
- Repository asset and service-worker references bumped to v1.4.85. Browser end-to-end testing and the new commit's CI run remain outstanding.


## [1.4.84] - 2026-10-21

### Added
- Added portable appearance presets: export the current validated appearance to a JSON file and import it on another device or account.
- Imports accept only the portal's versioned preset format, enforce a file-size limit, whitelist supported preference keys, and run values through the existing appearance sanitisation/persistence path.
- Added responsive preset controls with clear guidance; preset files contain appearance settings only, not account, release or profile records.
- Bumped static asset URLs and service-worker cache namespace to refresh the release consistently.

### Verification
- Static checks confirm import/export controls and handlers, schema/version checks, key allow-list, file-size limit, and consistent build/cache references.
- Full browser interaction, cross-device import/export, authenticated save/reload and live deployment still require runtime testing.

# Changelog

## [1.4.83] - 2026-10-21

### Expanded personalisation and accessibility
- Added fine-grained contrast, motion preference, line spacing, border thickness and colour intensity controls.
- Preferences are validated, previewed immediately, and stored alongside existing appearance options through the existing account-scoped profile preferences.
- Added high-contrast token overrides, adjustable component outlines, saturation, line-height scaling, reduced-motion override and system reduced-motion support.
- Kept existing dashboard layout, banners, palettes, fonts, density, and card appearance options intact.
- Bumped static asset and service-worker cache versions.

### Verification
- Static source checks verify control markup, event handlers, preference sanitisation, root CSS token application, balanced CSS braces and consistent version references.
- Full browser regression, accessibility audit, authenticated save/reload test and live deployment remain to be completed.

## [1.4.82] - 2026-10-21

### Customisation engine and global appearance controls
- Extended the existing account-backed appearance preferences with explicit Dark, Light and System modes without reusing the existing accent-palette key.
- Added workspace surface tint (graphite, warm charcoal, cool slate), configurable shadow intensity and global text scale to the Settings appearance panel.
- Preserved existing palette, font, card, density, banner and dashboard-layout preferences; new values are sanitized before applying and before being persisted through the existing owner-scoped profile preference update.
- Added semantic light-mode surface, text, input and navigation styling plus system-preference media-query handling and responsive controls.
- Kept the local personalisation panel and account-level appearance settings interoperable through the existing appearance events; no new Supabase table, policy, or migration was required.
- Refreshed static asset query versions and service-worker cache allow-list version together.

### Verification
- Repository and Supabase were audited before editing: vanilla HTML/CSS/JavaScript frontend, Supabase JS client, central core state and event-driven views, and RLS-protected account preferences stored in `profiles.notification_preferences.appearance`.
- Static patch-anchor and source checks passed before writing. Live browser visual QA, console inspection, authenticated preference round-trip testing, and deployment verification are still required; no claim of full end-to-end validation is made.

## [1.4.81] - 2026-10-21

### Major UI overhaul — editorial dark workspace
- Rebuilt the final visual layer around the app's semantic theme tokens: deep graphite surfaces, warm accent details, translucent navigation, fine borders and consistent radii/shadows.
- Restructured the visual hierarchy of the workspace shell, sticky navigation/top bar, dashboard hero, summary metrics, action panels and shortcuts for a more deliberate, premium music-industry workspace.
- Redesigned the dashboard hero as a responsive two-column editorial feature with record artwork, dynamic upcoming-release card and clearer primary/secondary actions; it collapses cleanly on smaller screens.
- Unified form fields, tables, modal surfaces, buttons, cards, loading/auth surfaces, public artist heroes and release artwork presentation.
- Added fluid desktop/tablet/mobile breakpoints, overflow-safe grids, content wrapping, clearer active navigation, keyboard focus, hover feedback and reduced-motion handling.
- Kept existing view rendering, Supabase client/query flows, authentication, role permissions and personalisation state intact; no database migration was needed for this presentation-only release.
- Refreshed app asset URLs and service-worker cache version together.

### Verification
- Audited the static frontend structure and existing Supabase client initialization, and inspected the live public table inventory; all listed public tables have RLS enabled.
- Verified stylesheet linkage, version/cache consistency, CSS brace balance, responsive breakpoints and reduced-motion rules. Browser visual QA, authenticated workflow regression and live deployment verification remain outstanding.




## [1.4.80] - 2026-10-21

### Overhauled — visual system, layout and interaction polish
- Added a dedicated visual refinement layer for more consistent card surfaces, restrained depth, clearer typography hierarchy and stronger, theme-aware interaction states.
- Standardised responsive action rows, form controls, modal viewport containment, profile/release content wrapping and horizontally scrollable tables.
- Improved narrow-screen page gutters, heading scale, card spacing and row wrapping to reduce cramped or overflowing layouts on phones and tablets.
- Preserved existing Supabase operations, route handlers and user appearance preferences; the new layer uses current theme/accent variables and includes reduced-motion handling.
- Added the stylesheet to the app shell and service-worker asset allow-list; refreshed build and cache version references.

### Verification
- Static source, version/cache consistency and CSS structural checks are required; live visual, browser-console and authenticated end-to-end testing remain outstanding.




## [1.4.79] - 2026-10-21

### Improved — dashboard clarity and responsive behaviour
- Refined the action-centre hierarchy, task copy wrapping and button hit areas so next steps remain readable and actionable at tablet and phone widths.
- Reflowed action rows on narrower screens to prevent status counts and buttons competing for space.
- Improved dashboard customisation controls on small screens, including wrapping size/shape selectors and long widget labels.
- Refreshed the service-worker cache version so clients can fetch the latest dashboard styles.

### Verification
- Static checks cover stylesheet link syntax, version/cache consistency, asset-list uniqueness and CSS brace balance. Live browser and authenticated end-to-end testing remains outstanding.


## [1.4.78] - 2026-10-21

### Improved — research-led UI/UX
- Added a visible Quick jump action for the existing keyboard-accessible navigation palette, with Ctrl/⌘+K discoverability and a mobile-menu entry.
- Mobile navigation now identifies the current page with an explicit `aria-current="page"` marker, synced from the desktop active destination.
- Standardised navigation tap targets around a comfortable 44px, strengthened active/focus feedback, and improved form-validation helper/error presentation.
- Aligned browser chrome colour with the current base surface and corrected the duplicated service-worker stylesheet entry from v1.4.77.

### Research basis
- Nielsen Norman Group, [10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) — system status, consistency, recognition and recovery.
- Baymard Institute, [Dashboard card consistency](https://baymard.com/research-articles/cards-dashboard-layout) and [inline form validation](https://baymard.com/research-articles/inline-form-validation?isVariant=b).
- W3C, [What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) — perceivable focus and usable target size.

### Verification
- Updated app shell, style layer, navigation interaction, service-worker cache and version file together.
- Static JS/CSS/version checks required; live browser and authenticated regression testing remains outstanding.


## [1.4.77] - 2026-10-21

### Improved — UI/UX
- Added a finishing design-system layer for clearer focus states, more consistent interaction feedback, resilient headings and action rows, and cleaner responsive overflow handling.
- Improved small-screen form sizing, modal viewport containment, table readability, safe-area-aware navigation spacing and reduced-motion behavior.
- Kept the existing appearance customisation tokens in control; the new layer is additive and does not change application data or route logic.

### Verification
- Reviewed the existing stylesheet cascade and wired the new layer after the current design system.
- Static source and version consistency checks are performed for this commit; live visual and authenticated browser regression testing remains outstanding.


## [1.4.76] - 2026-10-21

### Security
- Restrict release creation and deletion policies to the authenticated role instead of PostgreSQL PUBLIC, while retaining the existing owner, draft-status and label-admin checks.
- Apply the matching Supabase migration and verify the live policy roles after deployment.

### Verification
- Supabase migration applied successfully; live policy inspection confirms both write policies target authenticated users.
- Full browser and invite/release workflow regression testing is still required.


## [1.4.75] - 2026-10-21

### Fixed
- Removed the query string from the installed PWA start URL so the service worker can serve the app shell when launching offline; query-bearing navigations intentionally bypass the cache.
- Synchronized the build marker, asset URLs, service-worker cache key and release notes for the new version.

### Verification
- Repository-wide JavaScript syntax and static deployment checks run in GitHub Actions.
- Offline launch and authenticated browser workflows still require device/browser regression testing.


## [1.3.35] - 2026-10-20

### Fixed
- Apply profile visibility preferences consistently in authenticated profile lookup, search and discography RPCs, including hiding email when its visibility preference is disabled.
- Unsubscribe the early auth listener and suppress queued callbacks if initial session resolution fails or times out, preventing stale startup callbacks and unnecessary background loads.
- Remove the abandoned Netlify configuration and make CI validate the Cloudflare Pages static deployment contract instead.

### Security
- Restrict direct `profiles` table reads to the profile owner and label administrators; other signed-in users use the existing profile RPCs that redact private fields.
- Fix the privileged role-change RPC search path.

### Performance
- Remove a duplicate public-profile-slug unique index and consolidate equivalent smart-link SELECT policies without changing intended visibility.

### Verification
- Auth startup event ordering and failure cleanup checked at source level.
- Live browser, authenticated account and host-specific regression tests remain necessary.


## [1.3.34] - 2026-10-20

### Fixed
- Register the Supabase auth-state listener before reading the initial session, preventing an authentication event from being missed during startup.
- Queue auth events received before initial session resolution and process them once startup is ready.
- Added Netlify build configuration for the existing static-site structure while retaining shared routing and security-header files.

### Verification
- Auth boot ordering, JavaScript syntax, static routing and versioned cache references checked.
- Real browser, authenticated-user and Netlify host regression tests remain necessary.


## [1.3.33] - 2026-10-20

### Fixed
- Artist live preview now includes the existing saved avatar as well as newly selected avatar images.
- Dashboard reordering uses a consistent pointer-driven drag interaction for mouse, pen and touch, with move buttons retained as an accessible alternative.

### Verification
- Frontend JavaScript syntax and CSS brace balance checked.
- Cloudflare Pages deployment for v1.3.32 succeeded; v1.3.33 cache/version update is queued for deployment.
- Full authenticated browser regression remains unverified in this environment.


## [1.3.32] - 2026-10-20

### Improved
- Artist profile editor previews avatar and banner artwork, and updates name, tagline, biography and theme while editing.
- Added theme-specific editor preview styling for Cinematic, Minimal, Neon and Classic.
- Dashboard widget reordering supports pointer/touch dragging as well as desktop drag-and-drop and move buttons.
- Added a dashboard reset control and clearer save feedback.

### Security
- Restricted the invite lookup SECURITY DEFINER function from signed-in callers while preserving anonymous execution required for pre-registration invite validation.
- Retained the function's explicit search path and schema-qualified table references.

### Verification
- Frontend syntax, dashboard event wiring, profile editor bindings, SQL grants and asset/cache version consistency checked.
- Live signed-in interaction and invite signup regression tests still require a real browser session.


## [1.3.31] - 2026-10-20

### Fixed
- Public artist pages now consistently honour the artist's biography, location, links, email and discography visibility settings in the rendered page.
- Removed catalogue links and release counts when the artist has chosen to hide their discography.
- Public release cards now receive their artwork path from the Supabase `verify-turnstile` endpoint and show a graceful fallback when artwork cannot load.
- Refreshed the asset and service-worker cache versions.

### Improved
- Kept public artist links within the editor's eight-link limit.
- Retained the dashboard's persistent widget layout customisation and responsive image-fitting improvements.

### Verification
- Syntax checks passed for the modified frontend JavaScript files.
- Supabase `verify-turnstile` deployed successfully as version 15.
- Cloudflare Pages build and deployment succeeded for commit `35ac2224ab6e09c18148f5e3b6ded0959dbfb1ff`.
- Signed-in browser and device-level regression testing is still required.


## [1.3.24] - 2026-10-20

### Fixed
- Retry Workspace Data now re-resolves the current URL after refreshing data, so a release detail page can recover in place when its first load failed.
- Cleared stale unavailable-release route state when navigating to other views.
- Refreshed static asset and service-worker cache versions for the route recovery fix.

### Verification
- JavaScript syntax, route handler presence, and asset/cache version consistency checked.
- Browser-based route refresh and scrolling tests remain necessary for end-to-end confirmation.


## [1.3.23] - 2026-10-20

### Fixed
- Added a document-scroll recovery guard for mobile browser restores and route changes, while keeping the mobile navigation independently scrollable.
- Preserved release-detail URLs when release data is temporarily unavailable instead of silently routing to the dashboard; the page now offers a retry action.
- Versioned the shell and service-worker cache so the routing and scroll safeguards are refreshed together.

### Verification
- Core/view JavaScript syntax, CSS brace balance, route-to-view coverage, and asset/cache version consistency checked.
- Live refresh, touch scrolling, and authenticated Supabase checks still require browser testing on deployed pages.


## [1.3.22] - 2026-10-20

### Improved
- Public artist profiles resolve profile photos through the same avatar-path and legacy-avatar URL fallback used by signed-in profile cards, and support legacy banner URLs.
- Public profile music is ordered by release date, and the primary hero action links directly to the newest release when one exists.
- Applied the correct tagline styling, improved narrow-screen wrapping, and added visible keyboard focus and release-target feedback.
- Bumped the asset and service-worker cache versions so browsers request the updated profile UI.

### Verification
- JavaScript syntax, CSS brace balance, and HTML/service-worker version consistency checked.
- Authenticated browser, device, and live Supabase/Edge Function checks still need a real session.


## [1.3.21] - 2026-10-20

### Improved
- Rebuilt the public artist hero with profile-image initials fallback, clear music and social navigation, release count, and stronger visual hierarchy.
- Public release cards now display saved release artwork when available and provide a responsive layout for tracklists and streaming links.
- Refined profile biography, link cards, and catalogue spacing for mobile.
- Updated static asset and service-worker versions to invalidate older cached profile UI.

### Verification
- JavaScript parse, CSS brace balance, and asset version consistency checked.
- Clean route fallback remains configured by the existing Pages catch-all rewrite.
- Live public-session visual testing remains outstanding.


## [1.3.20] - 2026-10-20

### Fixed
- Added the nested profile-editor route to the service worker's offline app-shell fallback, so refreshing /profile/{id}/edit can restore the editor when offline after the app shell has been cached.
- Bumped asset and service-worker cache versions to keep the route fix aligned with deployed assets.

### Verification
- JavaScript syntax, service-worker syntax, CSS brace balance, and version references checked.
- Live authenticated mobile testing remains necessary to verify Supabase role and storage policies.


## [1.3.18] - 2026-10-20

### Fixed and improved
- Roster avatars now refresh from canonical profile-media paths using signed URLs, so profile photos can appear consistently when storage is private as well as public.
- Removed the label account's remaining Help & Support item from mobile navigation; support is role-gated in desktop and mobile menus.
- Removed the global body scroll lock while the mobile menu is open. The menu retains its own bounded scroll area while the page remains touch-scrollable.
- Reset the viewport to the top when navigating between workspace views and added a safe dashboard fallback for unknown browser-history routes.
- Bumped shell and service-worker cache versions to invalidate stale assets.

### Verification
- JavaScript syntax, CSS brace balance, and cache-version consistency checked.
- Real authenticated mobile browser and Supabase storage-policy tests are still required for final live verification.


## [1.3.18] - 2026-10-20

### Fixed
- Removed the mobile navigation's root/body scroll lock; the page remains vertically scrollable while the menu is open, and the menu retains its own contained scroll area.
- Updated static asset and service-worker versions.

### Verification
- JavaScript syntax and build version references checked.
- Real-device touch and refresh checks remain outstanding.


## [1.3.17] - 2026-10-20

### Fixed and improved
- Added a Cloudflare Pages SPA fallback for clean workspace routes while preserving dedicated privacy and terms pages.
- Removed the body scroll lock from mobile menu state so the document remains scrollable on every workspace route.
- Made profile image resolution support both storage paths and existing absolute HTTP(S) avatar URLs.
- Added a one-time legacy avatar URL fallback when the preferred profile image fails to load, and prioritised small roster avatars for faster display.
- Bumped static asset and service-worker cache versions.

### Verification
- JavaScript syntax, CSS brace balance, route fallback ordering and version references checked.
- Authenticated mobile visual testing and Supabase image-permission verification remain outstanding.


## [1.3.16] - 2026-10-20

### Improved
- Made blank space within roster artist rows clickable to open the artist profile, while preserving the existing role-management and profile buttons.
- Added keyboard activation and accessible row labelling for the new tap target.
- Bumped asset and service-worker versions after the interaction change.

### Verification
- JavaScript syntax and build/cache version consistency checked.


## [1.3.15] - 2026-10-20

### Fixed
- Roster and discovery avatars now fall back to legacy `avatar_url` values when `avatar_path` is absent, with graceful initials fallback on image errors.
- Profile edit URLs now preserve edit mode across refreshes (`/profile/:id/edit`) instead of reopening the read-only profile.
- Hardened document and app-shell touch scrolling on mobile while keeping the mobile navigation independently scrollable.
- Invalidated cached assets through a consistent build and service-worker version bump.

### Verification
- JavaScript syntax checks, CSS brace balance, and build/cache version consistency checked.
- Live Supabase-authenticated mobile checks remain necessary to verify account image permissions and device behaviour.


## [1.3.14] - 2026-10-20

### Fixed
- Fixed a root-level mobile scroll lock: closing the navigation now releases both the body and document-element overflow locks.
- Routed dashboard Insights artist cards through the main action handler so tapping an artist reliably opens their profile.
- Kept profile avatars sourced from the shared profile record and retained the immediate local roster update after label-side profile edits.
- Bumped stylesheet and service-worker versions to invalidate older cached app shells.

### Verification
- JavaScript syntax, CSS brace balance, and build/cache version consistency checked.
- Real authenticated mobile-browser testing remains necessary to confirm the deployed behavior.


## [1.3.13] - 2026-10-20

### Fixed and improved
- Made document scrolling the explicit default across the app shell and page content, releasing both body and root scroll locks whenever the mobile menu is closed.
- A successful label-side profile edit now updates the local roster row immediately, including avatar and banner paths, rather than waiting for a reload.
- Bumped shell, stylesheet and service-worker cache versions so mobile clients request the latest assets.

### Verification
- JavaScript syntax and CSS brace balance checked; version references reviewed.
- Authenticated live-device interaction and Supabase Realtime delivery cannot be proven by static checks alone.


## [1.3.12] - 2026-10-20

### Fixed
- Startup workspace queries now settle independently, so one failed roster/notification query cannot skip route restoration and silently send a refreshed page back to the dashboard.
- Route changes close the mobile menu and release its body scroll lock; scroll is also explicitly enabled for normal page content.
- Label dashboard artist cards now show an explicit “View artist profile” action.
- Label roster avatars now use the saved profile avatar and both the avatar and artist name open that artist’s profile; the existing role-management actions remain separate.
- Updated the service-worker cache and versioned asset URLs so browsers fetch the corrected code.

### Verification
- JavaScript syntax, CSS brace balance, and build/cache version consistency checked.
- Live authenticated route, avatar and mobile scroll tests still require browser verification.


## [1.3.11] - 2026-10-20

### Fixed
- Fixed a mobile navigation bug that set `body` scrolling to `hidden` on normal page renders, preventing vertical scrolling across the portal.
- Restored the scroll state on each render and when the app falls back to the authentication screen; only an actually open mobile menu keeps the page locked.
- Dashboard artist cards now display the saved profile photo (with initials fallback) and open the selected artist profile when tapped.
- Re-resolve the current extensionless URL after workspace data finishes loading, improving route restoration on refresh and auth rechecks.
- Bumped asset URLs and service-worker cache version to invalidate stale navigation and scroll fixes.

### Verification
- JavaScript syntax, CSS brace balance and version consistency checked before commit.
- Real authenticated mobile-browser checks remain outstanding.


## [1.3.10] - 2026-10-20

### Fixed
- Corrected the profile editor's low-contrast heading and body text against the pale canvas shown on mobile.
- Forced the editor workspace and form cards to a consistent dark surface so inherited theme styles cannot wash out text.
- Removed any sticky/fixed positioning from profile save actions and ensured buttons wrap within narrow mobile screens instead of covering form fields.
- Bumped static asset and service-worker cache versions to invalidate stale styles.

### Verification
- JavaScript syntax is unchanged; CSS braces and version references checked.
- Visual verification on a live authenticated mobile session remains outstanding.


## [1.3.5] - 2026-10-20

### Fixed
- Removed artist-facing Help & Support links from label account navigation and workspace footer.
- Guarded the support route so label accounts are redirected to their dashboard.
- Added a role-aware handler for stale support actions, routing label users to Operations Centre.

### Verification
- JavaScript syntax and CSS brace balance checked before commit.
- Live role-based interaction checks remain outstanding.


## [1.3.9] - 2026-10-20

### Fixed
- Removed Artist Studio from label accounts' mobile navigation, matching the desktop role-specific navigation.
- Invalidated cached static assets after the mobile navigation role correction.

### Verification
- JavaScript syntax and build/cache version consistency checked.
- Live authenticated browser testing is still required.


## [1.3.8] - 2026-10-20

### Fixed
- Added a defensive guard so label accounts cannot open the artist-specific self-profile editor, even if an old or direct action is triggered.
- Routed the self-profile action for label accounts back to workspace settings.
- Bumped the service-worker cache and asset query version after the final role guard.

### Verification
- Re-ran JavaScript syntax, CSS structure and build/cache version checks.
- Live browser and authenticated role testing remain outstanding.


## [1.3.7] - 2026-10-20

### Fixed
- Applied label-versus-artist account routing to the mobile navigation account link as well as desktop account controls.
- Invalidated the service-worker cache after the final role-navigation correction.

### Verification
- Re-ran static syntax and version checks after the final navigation change.
- Browser-level visual and role-permission tests are not available in this execution environment.


## [1.3.6] - 2026-10-20

### Fixed
- Routed label-account avatar controls to account settings instead of the artist public page.
- Replaced artist public-page editing and completeness controls in label settings with direct artist-roster and release-pipeline shortcuts.
- Changed the label account identity label so it no longer says its name is set by the label.
- Versioned the final role-separation changes and service-worker cache.

### Verification
- JavaScript syntax, CSS brace balance, asset version consistency and profile action wiring checked.
- Live-browser tests of role-specific workflows and Supabase permissions are still required.


## [1.3.5] - 2026-10-20

### Fixed
- Removed the light app-shell background that conflicted with the dark workspace, causing low-contrast white headings on a pale canvas.
- Scoped the profile editor to consistent dark surfaces and readable secondary text.
- Removed the duplicate Cancel action in the profile editor.
- Removed sticky positioning from profile-editor save actions so they no longer cover form fields or overlap the mobile viewport.
- Improved mobile profile media controls with a compact two-column layout.
- Bumped the app and service-worker asset version to invalidate stale cached styling.

### Verification
- JavaScript syntax and CSS brace balance checked; role and action handlers statically reviewed.
- Real browser, upload, and Supabase policy tests remain necessary before claiming end-to-end perfection.


## [1.3.4] - 2026-10-20

### Fixed
- Replaced artist-focused dashboard shortcuts on label accounts with roster, release-pipeline and operations shortcuts.
- Hid the Artist Studio navigation entry from label accounts.
- Fixed the empty upcoming-releases state so label accounts are directed to roster management and the release pipeline instead of being prompted to create an artist release.

### Verification
- JavaScript syntax and CSS brace balance checked before commit.
- Role-specific live workflow tests still required.


## [1.3.3] - 2026-10-20

### Improved
- Rebuilt the dashboard content hierarchy to prioritise overview, key metrics, actions, upcoming releases and shortcuts.
- Collapsed secondary tasks, insights, announcements, activity, requested changes and full catalogue into one expandable section to prevent endless dashboard scrolling.
- Consolidated dashboard shortcuts into a compact responsive layout.

### Verification
- JavaScript syntax, stylesheet brace balance and release version checked before commit.
- Live role-specific visual and interaction testing still required.


## [1.3.2] - 2026-10-20

### Optimised
- Reduced first-install service-worker precaching to critical shell assets and legal documents so activation does not wait on every optional script and image.
- Kept the existing allow-listed runtime cache for optional assets as they are requested.
- Prioritised images near the top of the viewport and deferred lower-page images when no explicit loading policy exists.
- Versioned the shell and service-worker cache to invalidate stale assets.

### Verification
- Static JavaScript syntax and CSS brace balance checked before commit.
- Network performance and offline behaviour require live-browser verification.


## [1.3.1] - 2026-10-20

### Fixed
- Prevented the mobile menu's active-page indicator from wrapping into a vertical stack.
- Made the mobile navigation a viewport-contained overlay with internal scrolling rather than extending the page.
- Locked background scrolling while the mobile navigation is open and restored it when the menu closes.
- Restricted mobile navigation to one expanded category at a time to avoid excessively long menus.

### Verification
- JavaScript syntax and CSS brace-balance checked before commit.
- Device-level scroll and navigation tests still need confirmation after deployment.


This project follows Semantic Versioning (MAJOR.MINOR.PATCH).

## [1.3.0] - 2026-10-20

### Improved
- Replaced legacy display-font downloads with a lighter, consistent modern typography stack.
- Reduced visual clutter with flatter surfaces, tighter spacing, quieter borders, cleaner headings and more consistent controls.
- Reworked navigation dropdowns into compact accordions with clear open/closed indicators and a distinct active-page state.
- Added persistent Privacy Policy and Terms of Service links to the workspace footer, while retaining sidebar and mobile links.
- Deferred off-screen images, prioritized visible media and retained asynchronous decoding.
- Improved public artist avatar loading priority and banner rendering.

### Compatibility
- Preserved Supabase operations, route structure, role-based navigation and listener security checks.
- Kept reduced-motion and keyboard-focus support.

### Verification
- Static JavaScript syntax, CSS brace-balance and release-version checks performed before deployment.
- Real-device image timing and signed-in workflow tests remain outstanding.

This project follows Semantic Versioning (MAJOR.MINOR.PATCH).

## [1.2.0] - 2026-10-20

### Fixed
- Removed the unused dashboard banner strip that consumed a large amount of mobile screen space.
- Removed the duplicate mobile navigation title/close bar; the main menu toggle remains the single close control.
- Fixed listener verification on direct artist URLs so successful verification opens the requested artist instead of dropping the visitor into the directory.
- Added a guarded, busy-state-aware listener verification action to prevent duplicate submissions and make progress/error states clearer.
- Corrected the artist editor’s public URL preview to match the actual `/listen/artist/<slug>` route.

### Improved
- Tightened dashboard spacing and simplified the mobile hero so key actions and information appear sooner.
- Preserved the Turnstile security check and server-verified listener sessions.
- Kept existing Supabase data operations and role restrictions in place.

### Verification
- Static source checks and release-version consistency checks performed before deployment.
- Live authenticated Supabase flows still require real-account regression testing.

This project follows Semantic Versioning (MAJOR.MINOR.PATCH).

## [1.1.0] - 2026-10-20

### Changed
- Complete visual redesign of navigation, workspace canvas, cards, metrics, release lists, forms, settings, authentication and loading states.
- Reduced wasted horizontal and vertical space so more useful content appears at once.
- Introduced a punchier dark art direction with acid-lime and electric-cyan highlights, asymmetrical card silhouettes, graphic accent bars and stronger hierarchy.
- Added page-entry motion, animated section accents, floating empty states, hover feedback and tactile button transitions.
- Restyled existing appearance customisation controls to complement the new interface.

### Accessibility and compatibility
- Retained responsive mobile navigation and compact mobile layouts.
- Preserved reduced-motion support.
- Kept Supabase integration and feature logic unchanged.
- Bumped asset query versions and service-worker cache namespace to avoid stale assets.

### Verification
- CSS brace-balance check passed before commit.
- Live visual, browser-console, authenticated Supabase and cross-device regression testing remains outstanding.
