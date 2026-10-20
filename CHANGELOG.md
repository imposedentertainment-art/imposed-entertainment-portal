# Changelog

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
