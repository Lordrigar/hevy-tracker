# 009b — Historical weekly and monthly reports

**Status:** not started.

## Deliverable

Extend weekly reporting into a historical report archive and add monthly reports. The dashboard must list and open previously generated reports instead of showing only the latest report.

Reports use deterministic, inclusive UTC periods:

- **Weekly:** Monday through Sunday, keyed by the ISO week start date.
- **Monthly:** first through last calendar day, keyed by `YYYY-MM`.

Add one explicit **Generate reports** action. On request, it must generate the current completed/in-progress weekly period and every missing weekly period since the most recently stored weekly report, up to the requested/current week. In the user's example, if week 1 exists and the next request occurs in week 4, it generates reports for weeks 2, 3, and 4. It must not regenerate already stored periods unless the user explicitly chooses a single-period **Regenerate** action.

Generate the current month report on the same explicit action, and make earlier missing monthly periods available through a clearly labelled backfill action. No dashboard load, filter change, Hevy workout sync, routine sync, successful sync, or failed sync may create or replace any report.

Persist report type, period key/start/end, generated timestamp, deterministic facts, and source version needed to distinguish weekly from monthly records. Preserve the historical snapshot for each completed period; regeneration replaces only the explicitly selected period after confirmation.

## REST surface

- `POST /api/dashboard/reports/generate` — explicit catch-up weekly generation plus the current monthly report.
- `POST /api/dashboard/reports/:periodKey/regenerate` — explicit confirmed replacement of exactly one stored period.
- `POST /api/dashboard/reports/backfill-months` — explicit generation of missing past monthly reports in a requested bounded range.
- `GET /api/dashboard/reports?type=weekly|monthly` — paginated/archive list with period, generation time, and compact totals.
- `GET /api/dashboard/reports/:periodKey` — one persisted weekly or monthly snapshot.

Update the Postman collection with no-secret examples and tests for each new endpoint.

## Automated checks

- Date-boundary tests for ISO weeks, month ends, leap years, and timezone-independent UTC dates.
- Catch-up test proving a week-1 report followed by a week-4 request creates weeks 2, 3, and 4 exactly once.
- Idempotency tests proving repeated generation does not alter existing snapshots; explicit regeneration changes only its requested key.
- Workflow tests proving all sync outcomes and filter changes leave the archive untouched.
- UI tests for weekly/monthly archive switching, report selection, loading/empty/error states, and regeneration confirmation.

## Manual verification

Generate a report for a known week, then use a test clock/fixture or seeded data to simulate skipped weeks and verify the next **Generate reports** action creates every missing weekly report. Switch between Weekly and Monthly archive views, open historical reports, and verify their totals/deltas against the matching dashboard periods. Regenerate one historical period and confirm no other archive item changes. Run both Hevy sync actions and confirm the archive remains unchanged.

## Done when

Historical weekly and monthly snapshots are browsable, catch-up is deterministic and idempotent, and reports are changed only by explicit report-generation or confirmed regeneration actions.
