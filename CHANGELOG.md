# Changelog

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
