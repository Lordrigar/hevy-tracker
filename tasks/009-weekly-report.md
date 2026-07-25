# 009 — Weekly report workflow

**Status:** not started.

## Deliverable

Create a user-triggered weekly report action that computes and upserts a rolling seven-day report containing PRs, strength changes, muscle-group volume deltas, and total workload changes. Add a **Prepare weekly analysis** dashboard action and manual regenerate endpoint. A successful sync must not generate the report automatically.

## Automated checks

- Workflow test proving a report is generated only by the explicit report-generation action, never by sync completion.
- Weekly comparison tests at date boundaries.

## Manual verification

Run sync and confirm no report refresh occurs. Then click **Prepare weekly analysis**, review the confirmation/context, open the generated report, calculate selected week-over-week deltas from dashboard data, and confirm the report agrees.

## Done when

Failed syncs and successful syncs do not replace the last report unless the user explicitly requests report generation.
