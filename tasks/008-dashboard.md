# 008 — Dashboard visualisations

**Status:** not started.

## Deliverable

Add Chakra UI dashboard views for overview cards, workout history, exercise progression, muscle-group volume, weight/measurements, and health trends. Add date range and exercise filters, a visible **Sync Hevy data** button, and a **Prepare weekly analysis** button.

The analysis button must display the selected date range and a clear confirmation before it prepares a local MCP/ChatGPT analysis context; it must never make an automatic model request.

## Automated checks

- Component tests for loading, empty, populated, and API-error states.
- Build check.

## Manual verification

Change date ranges and exercise filters; inspect chart tooltips and verify shown values against REST responses. Confirm loading the dashboard or changing filters does not sync Hevy or contact ChatGPT; confirm the two external/analysis actions require a click and show their intent.

## Done when

Every chart has accessible labels and a useful empty state.
