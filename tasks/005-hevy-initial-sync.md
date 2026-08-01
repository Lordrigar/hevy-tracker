# 005 — Hevy API client and initial sync

**Status:** completed on 2026-08-01.

## Deliverable

Create a typed, read-only Hevy client using `HEVY_API_KEY`; fetch paginated workouts, templates, and body measurements through `GET` requests only; normalize them into PostgreSQL; expose a dashboard **Sync Hevy data** button and explicit sync/status endpoints. This is the only way the application may call Hevy. Writing data to Hevy is deferred to a separately approved future task.

## Automated checks

- Mocked pagination and API-error tests.
- Mapping tests using checked-in sanitized fixture responses.

## Manual verification

Set a real API key locally, load the dashboard without observing network traffic to Hevy, click **Sync Hevy data** once, and confirm imported workouts, exercises, sets, and status timestamp against Hevy.

**Result (2026-08-01):** Passed. The project manager configured a real API key, manually triggered a
read-only import, and confirmed local imported data and sync status.

## Done when

Missing keys and remote failures are safe, actionable, and never leak a key.
