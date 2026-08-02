# 009a — Hevy routine sync and critique context

**Status:** completed (manual verification confirmed 2026-08-02).

## Deliverable

Add a separate, user-triggered **Sync Hevy routines** action that imports the account's routines using only the documented Hevy `GET` routine endpoints. Persist both the raw response and normalized routine structure: routine identity/title/folder metadata, exercise template references, exercise order, planned sets, planned load/reps/RPE/rest values, and any imported notes.

Add an accessible dashboard navigation shell with hash-addressable **Dashboard**, **Workouts**, **Weekly report**, and **Routines** subpages. Keep each page focused: overview/muscle analytics on Dashboard, imported workout history and progression on Workouts, report generation and its persisted facts on Weekly report, and the new routine import/details on Routines.

Expose local read-only routine endpoints for the dashboard and later MCP tools. Include deterministic routine facts suitable for a later AI critique: planned exercise count, direct and indirect muscle-group set allocation, duplicate exercises, and missing/unknown template mappings. This task must not call an AI model or present coaching conclusions; task 010 may use these computed facts when the user explicitly requests analysis.

Routine sync is independent from workout sync and weekly-report generation. Neither a workout sync nor a successful/failed routine sync may generate, replace, or critique a weekly report. The application must never create, edit, delete, or otherwise mutate a Hevy routine.

## REST surface

- `POST /api/hevy/sync-routines` — explicit manual routine import only.
- `GET /api/routines` — list locally stored routines and compact deterministic facts.
- `GET /api/routines/:id` — retrieve one locally stored normalized routine and its deterministic facts.

Update `docs/hevy-tracker.postman_collection.json` with safe examples and no-secret tests for every endpoint.

## Automated checks

- Hevy client tests prove routine requests are documented `GET` requests, paginate correctly, and never expose credentials.
- Persistence/integration tests prove repeated manual routine syncs upsert rather than duplicate routines and nested exercises/sets.
- Workflow tests prove routine sync does not create or replace a weekly report, and workout sync does not trigger routine sync.
- Analytics tests cover direct/indirect planned-set allocation, duplicate-exercise detection, and unknown-template handling.

## Manual verification

Use every dashboard subpage and confirm its URL hash is preserved on refresh. Click **Sync Hevy routines** and confirm the local routine list updates. Run it again and confirm routines are updated without duplication. Inspect a routine's planned exercises and direct/indirect allocation, then run both Hevy workout sync and routine sync; confirm the existing weekly report remains unchanged. Verify browser/API responses contain no API key or raw secrets.

## Done when

The dashboard and local REST API provide deterministic, read-only routine facts that task 010 can pass to AI only after a separate explicit user request.
