# Botpress support integration

## Current boundary

The website has an existing authenticated Support page for artist and label workspace members, plus a separate public listener site. This integration is deliberately loaded only on the authenticated workspace Support route. It must not change Supabase role assignments or let listener accounts enter artist/label tools.

The public, crawlable support knowledge source is `/help/`. Use this URL as the website knowledge source in Botpress. It contains listener, public-profile, account separation, shop and support guidance without requiring a session or passing the Turnstile challenge. Keep knowledge articles factual and remove anything that is internal, personal or secret before publishing.

## Configure the widget

1. Publish the Botpress bot and open its Webchat integration.
2. Use the public Webchat shareable URL supplied for this bot. The site embeds it in a frame only after validating both the `cdn.botpress.cloud` shareable-page host/path and the nested `files.bpcontent.cloud` config URL.
3. Set `BOTPRESS_WEBCHAT_SHAREABLE_URL` in `config.js` to that HTTPS URL. The website validates the exact shareable-page hostname/path and nested config hostname before embedding it.
4. In Botpress, restrict the webchat's allowed origins to the production website hostname and any explicit staging hostname. Do not expose private actions in the bot just because the widget is hidden on other pages.
5. Test with an authenticated artist account, an authenticated label account, a listener account and a signed-out browser. The widget should load only on the workspace Support route.

## Diagnostic tools: mandatory server-side boundary

Do not connect a Botpress action directly to Supabase using a service-role key. Never place service-role keys, provider API keys or database credentials in `config.js`, browser JavaScript, knowledge documents or the widget.

Before adding account-specific diagnostic tools:
- Put each operation behind a dedicated server-side endpoint (for example, a Supabase Edge Function).
- Verify the caller's Supabase access token on every request, derive the user ID from the verified token, and check the current role and resource ownership server-side.
- Expose only named, read-only diagnostic operations with bounded output and timeouts. No arbitrary SQL, generic table access, permission changes, deployments or destructive operations.
- Apply per-user and per-IP rate limits, request-size limits, timeouts, safe error messages and audit events that exclude secrets.
- Do not pass Supabase access tokens into Botpress conversation text or model context. If a Botpress integration cannot securely bind a verified user identity to a request, keep the tool unavailable.
- Test cross-account access, expired tokens, listener-role calls, malformed inputs and rate-limit behaviour.

## Zero-spend and retention

The website-side widget does not guarantee free Botpress usage. Confirm the current plan's message, knowledge-base and integration quotas in the Botpress dashboard before enabling rollout. Do not add a paid fallback or usage-based provider without explicit approval. Configure transcript retention and deletion in Botpress itself; deleting browser state or a Supabase row does not delete provider-side conversation records, backups or logs.

## Launch checklist

- [ ] `/help/` is publicly reachable and crawlable.
- [ ] Botpress knowledge source can read `/help/` without logging in or solving Turnstile.
- [ ] Widget URL is the generated public Webchat configuration URL, not a secret.
- [ ] Allowed origins are restricted in Botpress.
- [ ] Widget only loads on authenticated workspace Support.
- [ ] No diagnostic action is enabled until server-side user/role checks are independently tested.
- [ ] Automatic conversation expiry and provider retention have been verified in Botpress.
- [ ] Usage limits are configured so the project cannot incur unapproved charges.
