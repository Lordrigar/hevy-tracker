# 008a — Effective-load analytics and Hevy measurement ownership

**Status:** completed — 2026-08-01. Manual verification confirmed by project manager.

## Deliverable

Treat imported Hevy body measurements as the sole body-measurement source. Retire manual entry and mutation of weight, waist, chest, bicep, and other body-size fields; preserve separate local steps, calories, and calorie-target entry support.

For each bodyweight exercise set, calculate effective load as the latest imported Hevy body weight on or before the workout date plus the set's recorded external load (zero when absent). Do not use a later weight, interpolate, or make an estimate. If no qualifying body-weight measurement exists, keep external-load volume only and return an explicit coverage fact so the UI cannot imply complete bodyweight volume.

## Automated checks

- Unit tests for same-day, earlier, missing, and later-only body-weight measurements; weighted and unweighted bodyweight sets; and unchanged non-bodyweight calculations.
- Integration tests for read-only Hevy body measurement ownership and health-entry fields restricted to steps/calories.

## Manual verification

Choose bodyweight pull-ups performed before and after a recorded Hevy weight change. Verify each set's effective load equals the latest weight at that date plus any external load, and confirm no manual body-measurement form or mutation endpoint remains.

## Done when

The dashboard can distinguish external-load and effective bodyweight volume without using later measurements or silently estimating missing body weight.
