# 012 — Test fixtures, end-to-end checks, and handoff

**Status:** not started.

## Deliverable

Add sanitized Hevy fixtures, API integration tests, browser end-to-end smoke tests, troubleshooting guidance, and final setup verification.

## Automated checks

- `pnpm test`
- `pnpm build`
- API integration suite against Compose PostgreSQL.

## Manual verification

From a fresh clone: configure `.env`, install dependencies, start Compose, migrate, run UI, add health data, sync or load fixtures, inspect dashboard, and use MCP tools.

## Done when

The README and task records allow a new developer to reproduce the complete local demo.
