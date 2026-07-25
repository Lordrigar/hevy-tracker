# 003 — Health-entry API

**Status:** not started.

## Deliverable

Implement validated REST CRUD for one daily metric health entry: weight, waist, chest, bicep, steps, calories, and calorie target. A repeated date must upsert the same record.

## Automated checks

- Unit tests for validation bounds and date upsert behavior.
- Integration tests for create, list, update, and delete against PostgreSQL.

## Manual verification

Use curl or Swagger-compatible requests to create an entry, update the same date, list it, delete it, and verify persistence after API restart.

## Done when

Invalid values return clear 4xx errors and valid data remains after restart.
