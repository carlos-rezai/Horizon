## Problem Statement

The dashboard shows account balances, a mortgage countdown, and a plan summary — but nothing that makes the 20-year financial journey _feel_ real. The user can read the numbers, but the emotional story — debt shrinking to zero, savings accelerating into a Freedom Phase — is invisible. A long-term thinker needs a visual that answers "am I on track?" at a glance and provides daily motivation to stay the course.

## Solution

Add a **Trajectory Horizon** chart widget at the bottom of the Dashboard. It plots 240 months (20 years) of projected data as three lines — Total Liquid, Restschuld, and Net Cashflow — on a single continuous chart. The mortgage Payoff Marker is annotated as a vertical dashed line, Sondertilgung months are marked on the x-axis, and a hover tooltip shows exact values for any month. The chart tells the full two-act story in one view: the mortgage payoff arc and the Freedom Phase that follows.

## User Stories

1. As a user, I want to see a 20-year line chart on the Dashboard so that I can understand my full financial trajectory at a glance.
2. As a user, I want to see Total Liquid plotted over 20 years so that I can track how my liquid wealth grows.
3. As a user, I want to see Restschuld plotted over 20 years so that I can watch the mortgage shrink to zero.
4. As a user, I want to see Net Cashflow plotted over 20 years on a secondary axis so that I can confirm my monthly surplus stays healthy.
5. As a user, I want a vertical dashed Payoff Marker on the chart so that I can see exactly when my mortgage is paid off.
6. As a user, I want Sondertilgung months marked on the x-axis so that I can see when annual extra repayments fire and their effect on the trajectory.
7. As a user, I want a hover tooltip showing all three values for any month so that I can read exact figures without leaving the dashboard.
8. As a user, I want the x-axis labelled every two years (2026, 2028, 2030...) so that the chart is readable without being cluttered.
9. As a user, I want Total Liquid and Restschuld on the left axis and Net Cashflow on a secondary right axis so that the smaller cashflow values are legible and not flattened.
10. As a user, I want each line coloured using the Meridian design tokens so that the chart is visually consistent with the rest of the dashboard.
11. As a user, I want to see a loading state while projection data is fetching so that I know something is happening.
12. As a user, I want to see an empty state if I have no accounts set up so that I understand what to do next.
13. As a user, I want the chart to span the full widget width like other dashboard widgets so that the long-term arc is as clear as possible.
14. As a user, I want the widget to be titled "Trajectory Horizon" so that I can orient myself within the dashboard.
15. As a user, I want the chart to show the Freedom Phase (post-payoff period) visually so that I can see the acceleration in Total Liquid after the Restschuld reaches zero.
16. As a user, I want all 240 months plotted (not aggregated to yearly averages) so that the curve is smooth and month-level events like ST payments are visible.
17. As a user, I want the Payoff Marker labelled on the chart so that I can read the payoff month without hovering.
18. As a user, I want the chart to remain visible and correct even if I have no Mortgage account so that non-mortgage users still see a meaningful Total Liquid and Net Cashflow chart.
19. As a user, I want the chart to update automatically when I add or modify accounts or recurring transactions so that it always reflects my current plan.

## Implementation Decisions

### Modules to build or modify

**1. Projection endpoint — extend backend**

- Add a `?months=` query parameter to `GET /projection`, defaulting to 240.
- All existing consumers (PlanSummary, ProjectionAccordion) benefit from the larger dataset automatically; no consumer breaks from receiving more data.

**2. `useProjection` hook — extend**

- Accept an optional `months` parameter, default 240.
- Pass it as a query param when fetching from the endpoint.
- All existing callers pass no argument and get 240 months.

**3. `buildTrajectoryData()` utility — new pure function**

- Lives in `src/utils/projection.ts` alongside existing projection utilities.
- Input: `MonthlySnapshot[]`, `stMonths: Map<string, number>`, `payoffMonth: string | null`
- Output: `TrajectoryDataPoint[]`
- Maps each snapshot to a chart-ready shape including `isSTMonth` and `isPayoffMonth` flags.
- Pure function — no side effects, fully unit-testable.
- Reuses existing `deriveSTMonths()` and `findMortgagePayoffMonth()` — no new mortgage logic needed.

**4. `TrajectoryHorizon` component — new feature component**

- Lives in `src/features/projection/TrajectoryHorizon/`
- Accepts `snapshots`, `accounts`, and `recurringTransactions` as props (consistent with existing Dashboard widget patterns).
- Internally derives `TrajectoryDataPoint[]` via `buildTrajectoryData()`.
- Renders a Recharts `ComposedChart` with:
  - Line: totalLiquid — primary Y-axis, `positive` token colour
  - Line: restschuld — primary Y-axis, `warning` token colour
  - Line: netCashflow — secondary Y-axis, `accent` token colour
  - ReferenceLine: Payoff Marker — vertical dashed line at payoff month, `warning` token colour, labelled with the payoff month
  - Custom XAxis tick formatter: labels every 24th data point (every 2 years); ST months receive a small indicator mark
  - Tooltip: custom renderer showing all three values formatted as EUR for the hovered month
- Loading state and empty state match existing dashboard widget patterns.
- All styled-components use Meridian theme tokens exclusively — no hardcoded colour values anywhere.

**5. `DashboardPage` — add widget**

- Add `<TrajectoryHorizon />` as the last section, below MilestoneTracker.
- Passes `snapshots`, `accounts`, and `recurringTransactions` from existing hook calls — no new data fetching required.

### New type

Add `TrajectoryDataPoint` to `src/types/projection.ts`:

- `monthIndex: number` — 0–239
- `label: string` — ISO month string "YYYY-MM"
- `totalLiquid: number` — cents
- `restschuld: number` — cents
- `netCashflow: number` — cents
- `isSTMonth: boolean`
- `isPayoffMonth: boolean`

### Recharts dependency

- Install `recharts`. It ships its own TypeScript types — no `@types/recharts` needed.
- Secondary Y-axis requires `ComposedChart` wrapper rather than plain `LineChart`.

### Styling rule

- All colours reference Meridian theme tokens via the styled-components theme object.
- No hardcoded hex values, rgba(), or inline `style` props for colour or spacing.

## Testing Decisions

Good tests here verify the output of pure transformation functions given known inputs — not Recharts internals, not DOM rendering details. The chart library is trusted; the data pipeline is ours.

**`buildTrajectoryData()` — unit tests in `src/utils/projection.test.ts` (extend existing file)**

- Maps snapshots correctly to `TrajectoryDataPoint` shape
- Sets `isSTMonth: true` for months present in the stMonths map
- Sets `isPayoffMonth: true` for the correct month and `false` for all others
- Handles empty snapshots array (returns empty array)
- Handles no payoff month (all `isPayoffMonth: false`)
- Handles no ST months (all `isSTMonth: false`)
- Prior art: `deriveSTMonths`, `deriveYearSummaries`, `findMortgagePayoffMonth` tests in the same file

**`TrajectoryHorizon` component — `TrajectoryHorizon.test.tsx`**

- Renders loading state when loading
- Renders empty state message when snapshots array is empty
- Renders chart container when data is present (no assertion on Recharts internals)
- Prior art: `ProjectionAccordion.test.tsx`

**Not tested:**

- Recharts rendering behaviour (trusted third-party library)
- Exact pixel positions or colours
- Tooltip interaction (Recharts manages internally)

## Out of Scope

- **Electron packaging** — separate workstream decided in the design session; not part of this PRD.
- **Baseline vs actual comparison lines** — future PRD; chart shows projected values only.
- **Zoom, pan, or time range selector** — full 20-year default is sufficient for the motivational use case.
- **Per-account balance lines** — too noisy at 20-year scale; Total Liquid is the right aggregate.
- **Variance column / anomaly detection** — belongs to the anomaly detection PRD.
- **ETF growth rate modelling** — out of scope for the projection engine at this stage.

## Further Notes

- The Freedom Phase is a visual concept: the region of the chart after the Payoff Month where Restschuld flatlines at zero and Total Liquid curves upward. It requires no stored value or separate annotation beyond the Payoff Marker.
- The Payoff Marker should be omitted gracefully if no Mortgage account exists or if the mortgage is not paid off within 240 months.
- ST tick marks should be omitted gracefully if no annual Sondertilgung Recurring Transfer is configured.
- The `buildTrajectoryData()` function reuses `deriveSTMonths()` and `findMortgagePayoffMonth()` — both already tested. No new mortgage logic is needed.
