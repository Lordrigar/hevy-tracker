# 005 — Hevy API client and initial sync

**Status:** not started.

## Deliverable

Create a typed Hevy client using `HEVY_API_KEY`; fetch paginated workouts, templates, and body measurements; normalize them into PostgreSQL; expose a dashboard **Sync Hevy data** button and explicit sync/status endpoints. This is the only way the application may call Hevy.

## Automated checks

- Mocked pagination and API-error tests.
- Mapping tests using checked-in sanitized fixture responses.

## Manual verification

Set a real API key locally, load the dashboard without observing network traffic to Hevy, click **Sync Hevy data** once, and confirm imported workouts, exercises, sets, and status timestamp against Hevy.

## Done when

Missing keys and remote failures are safe, actionable, and never leak a key.
