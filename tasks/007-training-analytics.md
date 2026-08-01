# 007 — Training analytics library

**Status:** completed on 2026-08-01.

## Deliverable

Build pure shared calculations for volume, sets, reps, RPE average, exercise high-load PRs, muscle-group distribution, and current-versus-previous period changes.

Calculations execute only when an API endpoint or manual dashboard/MCP action requests them; they must not run in a background worker.

## Automated checks

- Unit tests with fixed workout fixtures, null values, empty periods, and tied PRs.

## Manual verification

Select several workouts in Hevy and calculate their volume manually; compare each aggregate to the API response.

**Result (2026-08-01):** Passed. The project manager queried both analytics endpoints with curl
against imported local data and confirmed the responses worked as expected.

## Done when

Analytics behavior is deterministic and documented in tests.
