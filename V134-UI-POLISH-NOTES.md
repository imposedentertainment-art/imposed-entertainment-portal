# Imposed Entertainment V134 — UI polish

## Changes
- Added an additive UI refinement stylesheet to improve visual hierarchy, surfaces, controls, navigation, loading feedback, and responsive layouts.
- Introduced clearer card boundaries, subtle depth, less disruptive hover motion, and more consistent rounded corners.
- Improved mobile spacing, compact-screen typography, horizontally scrollable tables, and full-width search on small screens.
- Added reduced-motion support and clearer input focus/hover states.
- Bumped the static asset version and included the new stylesheet in the service-worker cache allowlist and critical app-shell assets.
- Preserved existing view logic, routes, and Supabase data flows.

## Validation
- Static source and configuration review performed.
- A live browser regression test is still needed for authenticated views and mobile navigation.
