# 006 — Incremental sync and audit log

**Status:** not started.

## Deliverable

Use Hevy workout events after the initial import, reconcile updates/deletions idempotently, and retain sync logs with status, count, and safe failure message.

## Automated checks

- Event update/delete reconciliation tests.
- Idempotency test: same event page applied twice produces identical database state.

## Manual verification

Run sync twice, then modify a Hevy workout and run sync again; verify no duplicates and updated local data.

## Done when

The dashboard can show a trustworthy last-sync status and audit result.
