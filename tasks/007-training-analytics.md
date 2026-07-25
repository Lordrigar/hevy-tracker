# 007 — Training analytics library

**Status:** not started.

## Deliverable

Build pure shared calculations for volume, sets, reps, RPE average, exercise high-load PRs, muscle-group distribution, and current-versus-previous period changes.

Calculations execute only when an API endpoint or manual dashboard/MCP action requests them; they must not run in a background worker.

## Automated checks

- Unit tests with fixed workout fixtures, null values, empty periods, and tied PRs.

## Manual verification

Select several workouts in Hevy and calculate their volume manually; compare each aggregate to the API response.

## Done when

Analytics behavior is deterministic and documented in tests.
