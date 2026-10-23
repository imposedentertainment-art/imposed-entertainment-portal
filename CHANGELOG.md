## 3.3.82 — Resilient preference recovery

- Recover from corrupted JSON in the current personalisation key instead of silently falling back to in-memory defaults on every reload.
- Prefer valid legacy preferences when the current key is malformed, and repair both keys to one canonical validated state.
- If both stored values are corrupt, restore canonical defaults so subsequent loads are healthy.
- Add browser regression coverage for legacy fallback and invalid-JSON repair; refresh stylesheet query and service-worker cache versions.

[object Object]