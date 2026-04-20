# 06 — Trajectory Horizon Chart

## Background

The Financial Projection Dashboard (05) surfaces the 120-month projection as a
table/accordion on `/plan` and a year-summary widget on the Dashboard. The data
tells a powerful two-act story — mortgage payoff, then savings acceleration — but
a table cannot convey that arc emotionally. The user wants a visual that makes
the 20-year journey motivating at a glance.

The projection engine already supports arbitrary month counts; extending to 240
is a configuration change. Recharts is the chosen library (not yet installed).

Reference: `financial_plan-april-2026.pdf` — the bottom of the document shows
the intended chart shape (exact values are directional only).

## Problem

The dashboard has no chart. The long-term financial arc — shrinking mortgage,
growing liquid assets, stable cashflow — is invisible as a trend. The user needs
a single visual that answers "am I on track?" and "what happens after payoff?"
without opening the accordion.

## Questions and Answers

**Q1: Does the chart replace the accordion or complement it?**
Complement. Accordion on `/plan` is unchanged. Chart is a new Dashboard widget. ✅

**Q2: Where exactly on the Dashboard does the chart live?**
Below all existing widgets (Accounts, MortgageCountdown, MilestoneTracker, PlanSummary). ✅

**Q3: What data series are shown?**
Three lines: Total Liquid, Restschuld, Net Cashflow. Individual account balances
excluded — too noisy at 20-year scale. ✅

**Q4: Two charts (10Y each) or one unified chart?**
One unified 20-year chart. The mortgage payoff becomes a visible inflection point.
The contrast between the two phases is stronger as a single continuous story. ✅
❌ Two side-by-side 10Y panels — split loses the inflection point narrative.

**Q5: What charting library?**
Recharts. React-native component library, good TypeScript support, lightweight. ✅
❌ Nivo — heavier bundle.
❌ Victory — less actively maintained.
❌ Chart.js — not React-native.

**Q6: X-axis tick strategy?**
All 240 months plotted. X-axis labelled every 2 years (2026, 2028, 2030…).
Custom tick formatter on the Recharts `XAxis`. ✅

**Q7: Y-axis strategy?**
Total Liquid + Restschuld on primary left axis.
Net Cashflow on secondary right axis (much smaller magnitude — would flatline otherwise). ✅

**Q8: Annotations?**

- Vertical dashed reference line at the mortgage payoff month, labelled
- Small ST tick marks on the x-axis for Sondertilgung months
- Hover tooltip showing all three values for the hovered month ✅

**Q9: Widget title?**
"Trajectory Horizon" — ties back to the product name. ✅

**Q10: Backend change?**
Add `?months=` query param to `GET /projection`, default 240.
Existing consumers (PlanSummary, ProjectionAccordion) request 240 — more data,
no breakage. ✅

**Q11: Colors?**
Meridian theme tokens exclusively — never hardcoded values.

- Total Liquid → `positive` (growing wealth)
- Restschuld → `warning` (liability to eliminate)
- Net Cashflow → `accent` (informational)
  ✅

**Q12: Loading and empty states?**
Match existing dashboard widget patterns throughout. ✅

**Q13: Electron deployment?**
Separate workstream decided in this session: Electron wraps the same codebase
for personal desktop use with real data. Web deployment (mock data, portfolio)
continues unchanged. Not in scope for this PRD. ✅

## Design

### Data flow

```
GET /projection?months=240
  → MonthlySnapshot[]  (240 items)
  → useProjection(240) hook (extend existing)
  → TrajectoryHorizon component
      → Recharts ComposedChart
          → Line: totalLiquid   (primary Y-axis, positive token)
          → Line: restschuld    (primary Y-axis, warning token)
          → Line: netCashflow   (secondary Y-axis, accent token)
          → ReferenceLine: payoff month (dashed, warning token)
          → Custom x-axis ticks: every 2 years + ST month markers
          → Tooltip: all three values for hovered month
```

### Backend change

```typescript
// server/src/routes/projection.ts
// ?months defaults to 240, was hardcoded 120
const months = parseInt(req.query.months as string) || 240;
```

### New types

```typescript
// src/types/projection.ts (extend existing)
interface TrajectoryDataPoint {
  monthIndex: number; // 0–239
  label: string; // ISO date string "YYYY-MM"
  totalLiquid: number; // cents
  restschuld: number; // cents
  netCashflow: number; // cents
  isSTMonth: boolean;
  isPayoffMonth: boolean;
}
```

### File structure

```
src/
  features/
    projection/
      TrajectoryHorizon/
        TrajectoryHorizon.tsx          ← new, Recharts chart
        TrajectoryHorizon.styles.ts    ← new, styled wrappers + widget shell
        TrajectoryHorizon.test.tsx     ← new
      useProjection.ts                 ← extend: accept optional months param
  pages/
    DashboardPage.tsx                  ← add <TrajectoryHorizon /> at bottom
server/
  src/
    routes/
      projection.ts                    ← add ?months= query param, default 240
```

### Styling constraints

✅ All colours via Meridian theme tokens (`positive`, `warning`, `accent`, etc.)  
❌ No hardcoded hex values, rgba(), or any colour outside the theme  
❌ No inline `style={{}}` for colour or spacing — styled-components only

## Implementation Plan

**Phase 1 — Backend: extend projection to 240 months**

- Add `?months=` query param to `GET /projection`, default 240
- Extend `useProjection` hook to accept optional `months` param (default 240)
- Verify existing consumers still work

**Phase 2 — TrajectoryHorizon component, static (no annotations)**

- Install Recharts
- Create `TrajectoryHorizon` widget shell with loading/empty states
- Render ComposedChart with three Lines (totalLiquid, restschuld, netCashflow)
- Primary + secondary Y-axes
- X-axis labelled every 2 years with custom tick formatter
- All colours from Meridian theme tokens
- Add to `DashboardPage` at bottom

**Phase 3 — Annotations**

- Vertical dashed ReferenceLine at payoff month
- ST month markers on x-axis
- Hover Tooltip with all three values formatted as €

## Trade-offs

**Easier:** Projection engine is already complete. ST detection and payoff month
logic already exist in `src/utils/projection.ts` — reuse directly.

**Harder:** Recharts secondary Y-axis requires a `ComposedChart` wrapper rather
than a plain `LineChart`. Slightly more verbose but well-documented.

**Out of scope:**

- Electron packaging — separate workstream
- Baseline vs actual comparison lines — future PRD (originally scoped out of 05 too)
- Zoom / pan / range selector — full 20Y default is sufficient
- Per-account balance lines — too noisy at this scale
