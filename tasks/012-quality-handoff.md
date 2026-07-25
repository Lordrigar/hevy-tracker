# 012 — Test fixtures, end-to-end checks, and handoff

**Status:** not started.

## Deliverable

Add sanitized Hevy fixtures, API integration tests, browser end-to-end smoke tests, troubleshooting guidance, and final setup verification.

## Automated checks

- `pnpm test`
- `pnpm build`
- API integration suite against Compose PostgreSQL.

## Manual verification

From a fresh clone: configure `.env`, install dependencies, start Compose, migrate, run UI, add health data, press **Sync Hevy data** or load fixtures, explicitly prepare a weekly analysis, inspect dashboard, and manually use MCP tools. Confirm no external request or ChatGPT interaction occurs without a deliberate user action.

## Done when

The README and task records allow a new developer to reproduce the complete local demo.
