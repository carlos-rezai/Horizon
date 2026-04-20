# Plan: Trajectory Horizon

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/37

## Architectural decisions

- **Endpoint**: `GET /projection?months=240` — single endpoint, `months` param defaults to 240; all existing consumers are unaffected
- **Key models**: `TrajectoryDataPoint` — chart-ready shape derived 1:1 from `MonthlySnapshot`; lives in `src/types/projection.ts`
- **Data utility**: `buildTrajectoryData()` — pure function in `src/utils/projection.ts`; reuses existing `deriveSTMonths()` and `findMortgagePayoffMonth()`
- **Component location**: `src/features/projection/TrajectoryHorizon/`
- **Chart library**: Recharts `ComposedChart` with dual Y-axes — Total Liquid + Restschuld on primary left, Net Cashflow on secondary right
- **Styling**: Meridian theme tokens exclusively — no hardcoded colour values anywhere

---

## Phase 1: End-to-end pipeline + bare chart

**User stories**: 1, 2, 3, 4, 8, 9, 10, 11, 12, 13, 14, 16, 18, 19

### What to build

Extend the backend endpoint to accept a `?months=` query param (default 240) so it returns 240 MonthlySnapshots. Update the `useProjection` hook to pass this param. Add `buildTrajectoryData()` — a pure function that maps `MonthlySnapshot[]` to `TrajectoryDataPoint[]` — with full unit tests.

Build the `TrajectoryHorizon` widget and add it to the bottom of the Dashboard. It renders a Recharts `ComposedChart` with three lines (Total Liquid, Restschuld, Net Cashflow), dual Y-axes, and an x-axis labelled every 2 years. All colours use Meridian theme tokens. Loading and empty states match existing dashboard widget patterns. The widget title reads "Trajectory Horizon".

At the end of this phase the full data-to-screen path is live: the Dashboard shows a 20-year chart with all three trajectories visible.

### Acceptance criteria

- [ ] `GET /projection?months=240` returns 240 MonthlySnapshots
- [ ] `GET /projection` (no param) also returns 240 snapshots by default
- [ ] Existing PlanSummary and ProjectionAccordion consumers continue to work correctly
- [ ] `buildTrajectoryData()` unit tests pass: correct shape mapping, `isSTMonth`, `isPayoffMonth` flags, empty input, no payoff month, no ST months
- [ ] "Trajectory Horizon" widget appears at the bottom of the Dashboard
- [ ] Three lines are visible: Total Liquid (positive token), Restschuld (warning token), Net Cashflow (accent token)
- [ ] Total Liquid and Restschuld share the left Y-axis; Net Cashflow uses the right Y-axis
- [ ] X-axis labels appear every 2 years (e.g. 2026, 2028, 2030...)
- [ ] Loading state renders while projection data is fetching
- [ ] Empty state renders with guidance message when no accounts exist
- [ ] Chart spans full widget width, consistent with other dashboard widgets
- [ ] No hardcoded colour values — all colours via Meridian theme tokens

---

## Phase 2: Annotations

**User stories**: 5, 6, 7, 15, 17

### What to build

Add the three annotation layers to the existing chart:

1. **Payoff Marker** — a vertical dashed ReferenceLine at the Payoff Month, coloured with the `warning` token and labelled with the payoff month string. Omitted gracefully if no mortgage exists or payoff is beyond 240 months.

2. **ST tick marks** — small indicators on the x-axis for every ST month. Omitted gracefully if no annual Sondertilgung Recurring Transfer is configured.

3. **Hover tooltip** — a custom Recharts Tooltip renderer showing all three values (Total Liquid, Restschuld, Net Cashflow) formatted as EUR for the hovered month.

At the end of this phase the chart is fully annotated: the mortgage payoff is visible as a labelled marker, Sondertilgung months are called out, and hovering any point reveals exact figures.

### Acceptance criteria

- [ ] A vertical dashed line marks the Payoff Month on the chart
- [ ] The Payoff Marker is labelled with the payoff month (e.g. "Oct 2031")
- [ ] No Payoff Marker renders if no Mortgage account exists
- [ ] No Payoff Marker renders if the mortgage is not paid off within 240 months
- [ ] ST months are indicated on the x-axis
- [ ] No ST indicators render if no annual Sondertilgung Recurring Transfer is configured
- [ ] Hovering any point on the chart shows a tooltip with Total Liquid, Restschuld, and Net Cashflow formatted as EUR
- [ ] All annotation colours use Meridian theme tokens — no hardcoded values
