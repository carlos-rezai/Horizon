# Plan: Historical Month Navigation

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/165

Delivered as a 1:1 rebuild of the canonical `history-navigation` prototype
(`docs/handoff/history-navigation/`) in the real stack — **translate, don't
redesign**. Historical balances are reconstructed from the existing audited
projection engine; no new balance math, no second mock generator.

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**
  - Backend: `GET /projection/history` — a new read-only endpoint mounted on the
    existing projection router. Returns `HistoryPoint[]` from the earliest
    imported transaction month → current month; `[]` when there are no imports.
  - Frontend: `/history` → `<AppLayout><HistoryPage /></AppLayout>`. Month
    Overview deep-links stay `/months/:month`; import badge links to `/import`.

- **Schema / data contract** — no DB migration. `HistoryPoint` (all monetary
  values in integer cents):
  - `month: string` — "YYYY-MM"
  - `totalLiquid: number` — Σ of liquid accounts' `actual` balances
  - `restschuld: number` — the mortgage's replayed `projected` balance
  - `netCashflow: number` — Σ of real stored transactions in that month
  - `accounts: Record<string, number>` — per-account `actual` balance
  - Cash lines use `actual` (imported statements are the real ledger);
    Restschuld uses `projected` (a mortgage's `actual` is its flat un-replayed
    opening balance — same rationale as the Projection Accordion); `netCashflow`
    is server-computed from real transaction sums, deliberately **not** the
    recurring/projected figure.

- **Key models / modules**
  - Backend deep module: a pure derivation function taking projection snapshots +
    the real transaction list + account kinds → `HistoryPoint[]`. Testable
    without HTTP. Reuses `projectBalances` — no new balance math.
  - Frontend `history` feature domain: `HistoryPage/`, `HistoryChart/`,
    `YearArchive/`, `useHistory.ts`, `index.ts`.
  - `MonthYearPicker` deep module: a pure bounds helper taking the imports list
    (or their `startDate`s) + current month → `[earliest, current]` range + the
    per-cell enabled/disabled grid.

- **Data-source boundaries**
  - Earliest browsable month = month of the earliest imported transaction,
    shared by the History span and the picker's lower bound.
  - History derives its span from the endpoint itself; the picker derives its
    lower bound from `GET /imports` (min `startDate`) — this keeps the full
    history series off the Month page.
  - `src/` never talks to SQLite directly — all reconstruction happens server-side
    via the storage facade and projection engine.

- **Visibility state** — independent from the Dashboard chart, persisted under a
  separate key `horizon.history.visibility.v1`. Reuses the existing, already-tested
  `utils/trajectory` helpers (`deriveDefaultVisibility`, `toggleSeries`,
  `isolateSeries`, `showAllSeries`, `computeVisibleYDomain`, `loadVisibility`,
  `saveVisibility`) plus `resolveAccountColor` and Meridian legend/chip styles.
  Defaults: Total Liquid off, per-account lines follow each account's
  `showInTrajectory` flag, Restschuld on.

- **No shared-chrome extraction** between `HistoryChart` and `TrajectoryHorizon`
  in this initiative — they share visual language via copied composition. A shared
  extraction is explicitly deferred to a future `request-refactor-plan`.

---

## Phase 1: Backend `GET /projection/history`

**User stories**: 2, 3, 5, 6, 35, 37, 38

### What to build

A read-only `GET /projection/history` endpoint on the existing projection router,
backed by a pure derivation function that maps the projection engine's snapshots +
the real stored transactions + account kinds into `HistoryPoint[]`, spanning the
earliest imported transaction month through the current month. Cash lines use
`actual`, Restschuld uses the mortgage's `projected`, and `netCashflow` is
computed server-side from real transaction sums. No imports → `[]`.

### Acceptance criteria

- [ ] `GET /projection/history` returns `HistoryPoint[]` from the earliest imported
      transaction month through the current month, with the engine run at
      `currentDate = current month`.
- [ ] `totalLiquid` is the Σ of liquid accounts' `actual` balances per month.
- [ ] `restschuld` is the mortgage's replayed `projected` balance per month.
- [ ] `netCashflow` is the Σ of that month's real stored transactions, **not** the
      recurring/projected figure.
- [ ] `accounts` is a per-account map of `actual` balances.
- [ ] The lower bound is the month of the earliest imported transaction.
- [ ] No imported statements → `[]`.
- [ ] The derivation is extracted as a pure function unit-tested without HTTP;
      the route has its own test. No new balance math is introduced (reuses
      `projectBalances`).

---

## Phase 2: History page shell + route + nav + empty state

**User stories**: 1, 21, 22, 32, 36

### What to build

The `/history` route rendering a default-exported `HistoryPage` (re-exported via
`src/pages`), a sidebar `History` nav item with a lucide `Clock` icon between
Month and Import that shows active on `/history`, and a `useHistory()` hook that
fetches `/projection/history` and derives the years-with-imports from
`GET /imports`. When there are no imports, the page shows an empty state with a
call-to-action to the Import page.

### Acceptance criteria

- [ ] `/history` renders `HistoryPage` inside `AppLayout`.
- [ ] A `History` nav item with a `Clock` icon sits between Month and Import and
      is `aria-current` when on `/history`.
- [ ] `useHistory()` fetches `/projection/history` and derives years-with-imports
      from `GET /imports`, exposing the reconstructed points; covered by a
      rendered-hook test.
- [ ] With no imports, the page renders an empty state with a CTA linking to
      `/import`.
- [ ] The page is reachable and demoable end-to-end before any chart exists.

---

## Phase 3: HistoryChart

**User stories**: 4, 7, 8, 9, 10, 11, 12, 13

### What to build

A sibling Recharts `HistoryChart` (not a refactor of `TrajectoryHorizon`) plotting
reconstructed actuals: per-account color lines matching each account's configured
color, a dashed Restschuld line, and an available Total Liquid line, with TODAY
anchored at the right edge. Three range chips (1 Year / 3 Years / All history,
with All default), a toggle-chip legend with double-click-to-isolate and a
Show-all affordance, and a hover tooltip that includes Net Cashflow. Series
visibility persists independently from the Dashboard chart under
`horizon.history.visibility.v1`, reusing the `utils/trajectory` helpers. No payoff
marker, no Freedom Phase shading.

### Acceptance criteria

- [ ] Per-account lines use each account's resolved color; a dashed Restschuld
      line and a Total Liquid line are present.
- [ ] The chart's right edge is TODAY; no payoff marker or Freedom Phase shading.
- [ ] Range chips 1Y / 3Y / All history work; All history is selected by default.
- [ ] Legend chips toggle a series on/off; double-clicking a chip isolates that
      series; a Show-all affordance restores all series.
- [ ] Default visibility: Total Liquid off, per-account lines follow
      `showInTrajectory`, Restschuld on.
- [ ] Visibility persists under `horizon.history.visibility.v1` and toggling it
      never changes the Dashboard chart (independent key).
- [ ] The hover tooltip includes Net Cashflow for the month.

---

## Phase 4: YearArchive accordion

**User stories**: 14, 15, 16, 17, 18, 19, 20

### What to build

A Year Archive accordion below the chart that reuses the Projection Accordion's
interaction vocabulary but with History's own columns. It lists only years with at
least one imported statement, opens the most-recent imported year by default, and
each year snapshots its last available month (partial-year safe). Each year row
shows Total Liquid, Restschuld, Net Cashflow for the year plus an imported-statement
count badge that links to `/import`; each month row deep-links into the existing
Month Overview at `/months/:month`.

### Acceptance criteria

- [ ] Only years with ≥1 imported statement appear; empty years never show.
- [ ] The most-recent imported year is expanded by default.
- [ ] A partial (in-progress) year snapshots its last available month rather than
      assuming December.
- [ ] Each year row shows Total Liquid, Restschuld, Net Cashflow, and an
      imported-statement count badge.
- [ ] The count badge links to `/import`.
- [ ] Each month row deep-links to `/months/:month` (reusing the existing screen).
- [ ] Expand/collapse and deep-link targets are covered by interaction tests.

---

## Phase 5: Month Overview MonthYearPicker

**User stories**: 25, 26, 27, 28, 29, 30, 31, 33

### What to build

A `MonthYearPicker` that replaces the static `StyledStepLabel` between the
(unchanged) prev/next arrows on the Month Overview. Clicking the month/year label
opens a portal popover — `◀ year ▶` header + a 3×4 month grid — rendered via
`createPortal(document.body)` with `position: fixed` anchored to the button rect,
closing on outside-click / Escape and repositioning on scroll/resize. Months
outside `[earliest import month, current month]` are disabled; selecting a month
jumps there and closes the popover. Bounds come from a pure helper fed by
`GET /imports` (min `startDate` month), collapsing to the current month when there
are no imports.

### Acceptance criteria

- [ ] A pure bounds helper returns the `[earliest, current]` range and the per-cell
      enabled/disabled grid from a set of imports; no imports collapses to the
      current month. Unit-tested without a component.
- [ ] Clicking the month/year label opens the picker; it shows a `◀ year ▶`
      switcher and a 3×4 month grid.
- [ ] Months before the earliest import and after today are disabled.
- [ ] Selecting an in-range month jumps there and closes the popover.
- [ ] The popover closes on outside-click and Escape, and stays anchored to its
      button on scroll/resize (portaled, `position: fixed`).
- [ ] The prev/next arrows keep working exactly as before.
- [ ] With no imports, the picker pins to the current month.

---

## Phase 6: Dashboard "View history →" link

**User stories**: 23, 24, 34

### What to build

A quiet `View history →` affordance (lucide `Clock` + `ArrowRight`) in the
Trajectory Horizon card header, next to the series-toggle count, behind an optional
prop passed by `DashboardPage` (the page owns navigation, matching the prototype).
The Trajectory Horizon card is otherwise unchanged, and the link is shown even when
there are no imports.

### Acceptance criteria

- [ ] A `View history →` link (Clock + ArrowRight) appears in the Trajectory
      Horizon card header and navigates to `/history`.
- [ ] Navigation is owned by `DashboardPage` via an optional prop; `TrajectoryHorizon`
      does not navigate on its own.
- [ ] The Trajectory Horizon card is otherwise unchanged (no other visual or data
      changes).
- [ ] The link is shown regardless of whether any statements have been imported.
