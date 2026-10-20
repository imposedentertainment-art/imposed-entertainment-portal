# Changelog

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
