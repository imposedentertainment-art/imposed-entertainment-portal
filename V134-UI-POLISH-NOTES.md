# Imposed Entertainment V135 — artist profile and discover polish

## Changes
- Refined the public artist header and action layout so long artist names and narrow screens wrap without crowding.
- Improved profile follow/connect links, release cards, track lists and smart-link actions for clearer hierarchy and more reliable alignment.
- Added subtle, reduced-motion-aware interactions and clearer release-anchor arrival feedback.
- Improved Discover profile cards, search controls, skeleton spacing and keyboard focus visibility.
- Kept the update additive: no Supabase schema, policies, authentication or release data flows were changed.
- Bumped the static asset version and service-worker cache so returning visitors can receive the updated CSS.

## Validation
- Checked the stylesheet additions against the existing public artist, discover, release-card and responsive selectors.
- Source-level checks can confirm the version and cache wiring; authenticated browser and live deployment regression checks remain necessary before calling the release fully verified.
