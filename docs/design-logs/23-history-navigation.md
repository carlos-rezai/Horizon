# 23 — Historical Month Navigation

## Background

CSV / Bank Statement Import (log 19, 21) can now bring in multiple years
of statements, and imported rows land in Variable Spending. But the only
way to look backward was the Month Overview prev/next stepper — one month
per click, fine for one month back, not for thirty-six. There was no way
to browse or visualize the multi-year range that imported data now covers.

This feature is the deferred UI half of that story, delivered against the
canonical `history-navigation` handoff bundle
(`docs/handoff/history-navigation/`, which supersedes prior bundles and
carries the new `History.jsx`, `HistoryChart`, `MonthYearPicker`,
Dashboard link, and `HZ.history` mock). The goal is a 1:1 rebuild of that
prototype in the real stack (Electron + React + styled-components +
Recharts on Meridian tokens) — **translate, don't redesign**.

The handoff ships three coordinated, single-purpose additions:

- **History page** — the multi-year "what happened" view (new screen + nav).
- **Month Overview jump-to picker** — a date-picker popover for far jumps.
- **Dashboard → History link** — a quiet shortcut out of the Trajectory card.

The forward-looking Trajectory Horizon (Dashboard) and the Month Overview
prev/next arrows are unchanged.

## Problem

How do we reconstruct and browse **real** historical balances — not the
prototype's mock generator — using the existing audited projection engine,
and surface them exactly as the handoff shows, without disturbing the
Recurring-Only Projection Model or existing screens' data contracts?

## Questions and Answers

1. **Data source for reconstructed historical balances?**
   Dedicated read-only `GET /projection/history` endpoint over the existing
   `projectBalances` engine — cash lines from `snapshot.accounts[id].actual`,
   Restschuld from the mortgage's replayed `snapshot.projected`, Net Cashflow
   from real per-month transaction sums. No new balance math.

2. **Where does the feature live, and how is the chart built?**
   New `src/features/history/` domain; `HistoryChart` is a **sibling**
   Recharts component reusing shared trajectory utils — no refactor of
   `TrajectoryHorizon` (shared-chrome extraction is a later refactor plan).

3. **What defines the earliest browsable month?**
   The **earliest imported transaction's month** (honest data boundary),
   shared by the History span and the picker. Upper bound is always the
   current month.

4. **Year Archive — reuse ProjectionAccordion?**
   New `YearArchive` component reusing the accordion's _interaction
   vocabulary_ but with History's own columns (Total Liquid / Restschuld /
   Net Cashflow / Imports badge). Statement badge → `/import`; month row →
   `/months/:month`.

5. **Chart series visibility — shared with Dashboard?**
   Independent state under a separate key `horizon.history.visibility.v1`.
   Defaults: Total Liquid off, accounts per `showInTrajectory`, Restschuld
   on. Toggling History never mutates the Dashboard chart.

6. **Month Overview picker — how rendered?**
   New `MonthYearPicker` replaces the static label (arrows unchanged),
   rendered via `createPortal(document.body)` + fixed positioning. Robust
   against ancestor overflow/stacking (the prototype's `.stagger` bug does
   not exist in the real app, but portaling stays as the proven approach).

7. **Empty / no-import behavior?**
   History page → `EmptyState` with CTA to `/import`; picker pins to the
   current month; Dashboard "View history →" link always shown.

8. **Route, nav, Dashboard link wiring?**
   `/history` route + `HistoryPage`; nav item between Month and Import with
   the lucide `Clock` icon; Dashboard link wired via an optional prop from
   `DashboardPage` (page owns navigation, matching the prototype).

9. **Shape of the `/projection/history` response?**
   Fat, purpose-built `HistoryPoint[]` — server does all actuals /
   net-cashflow derivation; no thin snapshot passthrough.

10. **How does the picker source its bounds?**
    Derives the lower bound from `GET /imports` (min `startDate` month) —
    keeps the full history series off the Month page.

## Design

### Backend — `GET /projection/history`

✅ Fat, purpose-built endpoint reusing `projectBalances`; runs
`from = earliest imported transaction month`, `currentDate = current month`.

```ts
interface HistoryPoint {
  month: string; // "YYYY-MM"
  totalLiquid: number; // Σ liquid account `actual` balances (cents)
  restschuld: number; // mortgage `projected` (replayed, cents)
  netCashflow: number; // Σ real stored transactions that month (cents)
  accounts: Record<string, number>; // per-account `actual` balance (cents)
}
// Response: HistoryPoint[]  (earliest imported tx month → current month)
```

- Cash = `actual` because imported statements are the real historical
  ledger (`opening + Σ transactions ≤ month`).
- Restschuld = `projected` because a mortgage's `actual` is just its flat
  un-replayed opening balance (ST is modelled as a recurring transfer, not
  a stored transaction) — identical rationale to `ProjectionAccordion`.
- `netCashflow` = real transaction sums (server-computed), **not** the
  recurring/projected figure.

❌ Thin `MonthlySnapshot[]` passthrough — can't yield real `netCashflow`
without shipping transaction sums anyway, and leaks engine internals.

Empty result (no imports) → `[]`.

### Frontend — `src/features/history/`

```
src/features/history/
  HistoryPage/            (composition; default-exported page re-exports via src/pages)
  HistoryChart/           (sibling Recharts chart — actuals only)
  YearArchive/            (accordion-vocabulary, History columns)
  useHistory.ts           (fetch /projection/history + import-derived years)
  index.ts
```

- **HistoryChart** — reuses `utils/trajectory` visibility helpers +
  `resolveAccountColor` + Meridian legend/chip styles. ✅ No payoff marker,
  ✅ no Freedom Phase shading, ✅ TODAY at right edge. Range chips
  (1 Year / 3 Years / All history). Toggle-chip legend with
  double-click-to-isolate + Show all. Hover tooltip incl. Net Cashflow.
  Visibility: independent, `horizon.history.visibility.v1`, defaults
  (Total Liquid off · accounts per `showInTrajectory` · Restschuld on).
- **YearArchive** — restricted to years with ≥1 import (from `GET /imports`);
  most-recent year open by default; each year snapshots its **last available
  month** (partial-year safe). Columns: Total Liquid / Restschuld /
  Net Cashflow / Imports-badge. Badge → `/import`; month row → `/months/:month`.

### Month Overview picker — `src/features/months/MonthYearPicker/`

✅ Replaces `StyledStepLabel` (arrows unchanged). `◀ year ▶` + 3×4 month
grid; months outside `[earliest import month, current month]` disabled.
Rendered via `createPortal(document.body)` + `position: fixed` anchored to
the button rect; closes on outside-click / Escape. Bound from `GET /imports`
min `startDate`; collapses to current month when no imports.

### Plumbing

- `App.tsx`: add `/history` → `<AppLayout><HistoryPage /></AppLayout>`.
- `AppLayout`: nav item between Month and Import, lucide `Clock`,
  `aria-current` on `/history`.
- `TrajectoryHorizon`: `View history →` (Clock + ArrowRight) in the header
  next to the series-toggle count, behind an optional prop passed by
  `DashboardPage`.

## Implementation Plan

Each phase is a thin working vertical slice (TDD: RED → build).

1. **Backend history endpoint.** `GET /projection/history` returning
   `HistoryPoint[]` from `projectBalances` (earliest imported tx month →
   today). Unit tests for the actuals/Restschuld/netCashflow derivation +
   empty-imports case. _(Thinnest end-to-end: real reconstructed data over
   the wire.)_
2. **History page skeleton + nav + route.** `HistoryPage`, `/history` route,
   sidebar `Clock` item, `useHistory()` fetch. `EmptyState` when no imports.
3. **HistoryChart.** Recharts actuals-only chart with range chips, toggle
   legend (isolate / Show all), TODAY line, independent visibility
   persistence, hover tooltip.
4. **YearArchive.** Accordion rows from reconstructed points, import-gated
   years, badge → `/import`, month row → `/months/:month`.
5. **Month Overview picker.** `MonthYearPicker` portal popover with bounds
   from `GET /imports`; wired into `MonthOverview` in place of the label.
6. **Dashboard link.** `View history →` in `TrajectoryHorizon` header via
   optional prop from `DashboardPage`.

## Trade-offs

**Easier:** browsing 3+ years of imported history at a glance; jumping to a
distant month in one click; a truthful "actuals" view that reuses the
audited engine with zero new balance math; History and Dashboard charts
answer their own questions without cross-contaminating visibility state.

**Harder / deferred:** `HistoryChart` and `TrajectoryHorizon` now share
visual language via copied composition, not one component — a shared-chrome
extraction is explicitly deferred to a future `request-refactor-plan`. The
picker's portal popover needs reposition-on-scroll/resize handling.

**Out of scope:** porting the prototype's `buildHistoricalActuals()` mock
(replaced by real reconstruction); any change to the forward Trajectory
Horizon, the Recurring-Only Projection Model, or existing screens' data
contracts; a new "browse a past month" screen (Month Overview already is
that screen, and is already parameterized by `/months/:month`).
