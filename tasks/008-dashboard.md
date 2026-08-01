# 008 — Dashboard visualisations

**Status:** not started.

## Deliverable

Add Chakra UI dashboard views for overview cards, workout history, exercise progression, selectable muscle-group volume/reps/sets, Hevy-imported weight/measurements, and local steps/calorie trends. Add date range and exercise filters, a visible **Sync Hevy data** button, and a **Prepare weekly analysis** button.

The muscle-group view is a ranked, clickable list inspired by the Hevy routine summary: sort it by the selected metric, select a muscle group, and show its contributing exercises in an adjacent details panel. It must not imply secondary-muscle attribution that has not been imported.

Date controls provide **This week**, **This month**, and **YTD** presets in addition to editable inclusive `from` and `to` dates. Exercise progression provides an accessible autocomplete from exercises available in the selected local period, while preserving manual template-id/name entry.

The analysis button must display the selected date range and a clear confirmation before it prepares a local MCP/ChatGPT analysis context; it must never make an automatic model request.

## Automated checks

- Component tests for loading, empty, populated, and API-error states; metric sorting and selection; range presets; and exercise autocomplete.
- Build check.

## Manual verification

Change date ranges and exercise filters; use each quick date preset; sort and select muscle groups; inspect chart tooltips and contributing exercises; and verify shown values against REST responses. Confirm loading the dashboard or changing filters does not sync Hevy or contact ChatGPT; confirm the two external/analysis actions require a click and show their intent.

## Done when

Every chart has accessible labels and a useful empty state.
