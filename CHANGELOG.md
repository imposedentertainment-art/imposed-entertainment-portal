## 3.3.83 — Verified account preference writes

- Treat zero-row profile updates as failed appearance saves instead of reporting a false successful sync when row-level security or a missing profile prevents the update.
- Verify that both the retryable customiser sync and the account appearance settings path actually updated a profile row.
- Add regression coverage for explicit row-update verification and refresh app/service-worker asset versions.

[object Object]