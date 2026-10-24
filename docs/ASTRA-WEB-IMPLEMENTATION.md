# Astra AI — Website implementation notes

## Scope
Astra AI for the Imposed Entertainment website is a separate product from Astra AI Discord Manager. It uses this repository and the Imposed Entertainment Supabase project only.

## First slice
- Authenticated floating assistant UI, keyboard accessible and responsive on mobile.
- Chat requests go through a Supabase Edge Function; provider credentials remain server-side.
- The function validates the Supabase user, bounds message count and length, and returns a safe service-unavailable response until configured.
- No conversation persistence or account-data access is enabled in this initial slice. The UI keeps the current conversation in memory only.
- Existing support assistant and Help Centre remain as fallback.

## Required server secrets before activation
- `ASTRA_AI_API_KEY`: provider API key, stored as a Supabase Function secret (never in `config.js` or browser code).
- Optional `ASTRA_AI_MODEL`: model name supported by the provider.
- Optional `PORTAL_ORIGIN`: exact production website origin for CORS.

## Next phases
1. Configure provider secret and deploy `astra-chat`; smoke-test authenticated, expired-session, malformed payload and provider-error cases.
2. Add persistent conversations/memory only after designing owner-scoped RLS policies and retention/deletion controls.
3. Add read-only knowledge retrieval from approved Imposed help/label guidance.
4. Add role-aware release/task context through explicit server-side queries, never by trusting client-supplied role or IDs.
5. Add automations and integrations only with per-action permission checks and an audit trail.

## Safety constraints
- Keep the Discord Manager repository and Supabase project untouched.
- Never expose service-role or provider secrets to the browser.
- Do not claim a release was submitted or data changed unless a verified server action succeeded.
- Do not alter production migrations or deploy the function as part of this UI-only branch.
