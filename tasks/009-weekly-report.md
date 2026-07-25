# 009 — Weekly report workflow

**Status:** not started.

## Deliverable

After successful sync, compute and upsert a rolling seven-day report containing PRs, strength changes, muscle-group volume deltas, and total workload changes. Add a manual regenerate endpoint.

## Automated checks

- Workflow test proving a successful sync invokes report generation.
- Weekly comparison tests at date boundaries.

## Manual verification

Run sync, open the report, calculate selected week-over-week deltas from dashboard data, and confirm the report agrees.

## Done when

Failed syncs do not replace the last successful report.
