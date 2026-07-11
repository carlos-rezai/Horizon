## Problem Statement

I've been importing bank statements that go back years, and every imported
row lands in Variable Spending for the month it actually happened. But the
only way to look at a past month is the Month Overview's prev/next arrows —
one click per month. Going back three years to check what I spent means
thirty-plus clicks. There is no way to browse or visualize the multi-year
range that my imported data now covers, and no single screen that answers
"what actually happened over the last few years?"

## Solution

Three coordinated, single-purpose additions, delivered as a 1:1 rebuild of
the canonical `history-navigation` prototype
(`docs/handoff/history-navigation/`) in the real stack — **translate, don't
redesign**:

1. A dedicated **History page** — a multi-year "what happened" view with a
   reconstructed-actuals chart (configurable range) and a Year Archive
   accordion that only shows years I've actually imported statements for.
2. A **jump-to picker** on the Month Overview — click the month label to open
   a date-picker popover and jump straight to any in-range month, instead of
   stepping one arrow at a time. The prev/next arrows are unchanged.
3. A quiet **"View history →" link** on the Dashboard's Trajectory Horizon
   card, pointing into the new History page.

Historical balances are **reconstructed from the existing audited projection
engine** — no new balance math, no second mock generator. The forward-looking
Trajectory Horizon and the Recurring-Only Projection Model are untouched.

## User Stories

1. As a long-term planner, I want a dedicated History page, so that I have one
   place to see what actually happened across all my imported years.
2. As a user, I want the History chart to show reconstructed **actual**
   balances (not projections), so that I'm looking at what really happened,
   not a forecast.
3. As a user, I want the History chart's right edge to always be "today", so
   that the view is anchored to the present looking backward.
4. As a user, I want per-account color lines on the History chart matching the
   colors I set elsewhere, so that the same account reads the same everywhere.
5. As a user, I want a dashed Restschuld line on the History chart, so that I
   can see how my mortgage balance came down over the imported period.
6. As a user, I want a Total Liquid line available on the History chart, so
   that I can see my combined liquid balance trend over time.
7. As a user, I want three range chips — 1 Year / 3 Years / All history — so
   that I can zoom the chart to the window I care about.
8. As a user, I want "All history" selected by default, so that I see the full
   reconstructed span on first load.
9. As a user, I want an interactive toggle-chip legend, so that I can click a
   series on or off to declutter the chart.
10. As a user, I want to double-click a legend chip to isolate that one series,
    and a "Show all" affordance to bring them back, so that I can focus on a
    single line quickly.
11. As a user, I want the History chart's series visibility to persist
    independently from the Dashboard chart, so that toggling one never changes
    the other.
12. As a user, I want History's default visibility to be Total Liquid off,
    per-account lines following each account's `showInTrajectory` flag, and
    Restschuld on, so that the first view matches the established convention.
13. As a user, I want a hover tooltip on the History chart that includes Net
    Cashflow for the month, so that I can read exact figures at any point.
14. As a user, I want a Year Archive accordion below the chart, so that I can
    drill from a year down into its individual months.
15. As a user, I want the Year Archive to show **only years with at least one
    imported statement**, so that I never see an empty year with no data behind
    it.
16. As a user, I want the most-recent imported year expanded by default, so
    that I land on my latest data without clicking.
17. As a user, I want each year row to show Total Liquid, Restschuld, Net
    Cashflow for the year, and an imported-statement count badge, so that I get
    a one-line summary per year.
18. As a user, I want a partial (in-progress) year to snapshot its **last
    available month** rather than assume December, so that the current year's
    figures are honest.
19. As a user, I want the statement-count badge to link to the Import page, so
    that I can jump to manage the statements behind that year.
20. As a user, I want each month row in the archive to deep-link into the
    existing Month Overview for that year/month, so that I reuse the screen
    that already exists for browsing a past month.
21. As a user, I want a nav item for History in the sidebar between Month and
    Import with a clock icon, so that the page is reachable from anywhere.
22. As a user, I want the History nav item to show as active when I'm on
    `/history`, so that I always know where I am.
23. As a user, I want a "View history →" link on the Dashboard's Trajectory
    Horizon card, so that I can move from the forward view to the backward view
    in one click.
24. As a user, I want the Trajectory Horizon card otherwise unchanged, so that
    my forward projection stays exactly as it is today.
25. As a user browsing the Month Overview, I want to click the month/year label
    to open a jump-to picker, so that I can go to a distant month without
    stepping.
26. As a user, I want the picker to show a year switcher (◀ year ▶) and a 3×4
    month grid, so that any month is one selection away.
27. As a user, I want months outside my data range (before the earliest import,
    after today) disabled in the picker, so that I can't navigate to a month
    with no data.
28. As a user, I want selecting a month in the picker to jump there and close
    the popover, so that the interaction feels like a standard date picker.
29. As a user, I want the picker to close on outside-click or Escape, so that
    dismissing it is effortless.
30. As a user, I want the picker to stay correctly positioned when I scroll or
    resize, so that it never floats away from its button.
31. As a user, I want the Month Overview prev/next arrows to keep working
    exactly as before, so that single-step navigation is unaffected.
32. As a user with no imported statements yet, I want the History page to show
    an empty state with a call-to-action to the Import page, so that I know how
    to get data in.
33. As a user with no imports, I want the Month Overview picker to pin to the
    current month, so that the control degrades gracefully.
34. As a user with no imports, I want the Dashboard "View history →" link to
    still be shown, so that the affordance is discoverable regardless.
35. As a user, I want the earliest browsable month to be the month of my
    earliest imported transaction, so that the boundary reflects real data, not
    an arbitrary range.
36. As a user, I want the History span and the Month Overview picker to share
    the same lower bound, so that the two surfaces agree on where history
    begins.
37. As a developer, I want History's balance data to come from the audited
    projection engine with zero new balance math, so that reconstructed numbers
    can't silently diverge from the rest of the app.
38. As a user, I want Net Cashflow in History to reflect my **real** stored
    transactions for each month, not the recurring/projected figure, so that
    the "what happened" view is grounded in actuals.

## Implementation Decisions

### Backend — `GET /projection/history`

- A new read-only endpoint mounted on the existing projection router, returning
  a fat, purpose-built `HistoryPoint[]` from earliest imported transaction
  month → current month. It reuses `projectBalances` — no new balance math.
- `HistoryPoint` shape (all monetary values in integer cents):
  - `month: string` — "YYYY-MM"
  - `totalLiquid: number` — Σ of liquid accounts' `actual` balances
  - `restschuld: number` — the mortgage's replayed `projected` balance
  - `netCashflow: number` — Σ of real stored transactions in that month
  - `accounts: Record<string, number>` — per-account `actual` balance
- **Cash lines use `actual`**, because imported statements are the real
  historical ledger (`opening + Σ transactions ≤ month`).
- **Restschuld uses `projected`**, because a mortgage's `actual` is just its
  flat un-replayed opening balance (Sondertilgung is modelled as a recurring
  transfer, not a stored transaction) — the same rationale the Projection
  Accordion already uses.
- **`netCashflow` is server-computed** from real transaction sums, deliberately
  **not** the recurring/projected `netCashflow` the snapshot carries.
- `from` (earliest imported transaction month) is derived server-side; the
  engine runs with `currentDate = current month`.
- Empty result (no imports) → `[]`.
- A thin `MonthlySnapshot[]` passthrough was rejected: it can't yield real
  `netCashflow` without shipping transaction sums anyway, and it leaks engine
  internals.

**Deep module to extract + test:** a pure derivation function that takes the
projection snapshots + the real transaction list + account kinds and returns
`HistoryPoint[]`. It owns the actuals / Restschuld / netCashflow mapping behind
a single call and is testable without HTTP.

### Frontend — `src/features/history/`

- New `history` feature domain containing:
  - `HistoryPage/` — composition only; default-exported page re-exported via
    `src/pages`.
  - `HistoryChart/` — a **sibling** Recharts component (not a refactor of
    `TrajectoryHorizon`). Actuals only: **no** payoff marker, **no** Freedom
    Phase shading, TODAY at the right edge. Range chips (1 Year / 3 Years /
    All history). Toggle-chip legend with double-click-to-isolate + Show all.
    Hover tooltip including Net Cashflow.
  - `YearArchive/` — reuses the Projection Accordion's _interaction vocabulary_
    but with History's own columns (Total Liquid / Restschuld / Net Cashflow /
    Imports badge). Restricted to years with ≥1 import; most-recent year open by
    default; each year snapshots its last available month (partial-year safe).
    Badge → `/import`; month row → `/months/:month`.
  - `useHistory.ts` — fetches `/projection/history` and derives the list of
    years-with-imports from `GET /imports`.
  - `index.ts`.
- **Visibility state is independent** from the Dashboard chart, persisted under
  a separate key `horizon.history.visibility.v1`. It reuses the existing,
  already-tested `utils/trajectory` visibility helpers (`deriveDefaultVisibility`,
  `toggleSeries`, `isolateSeries`, `showAllSeries`, `computeVisibleYDomain`,
  `loadVisibility`, `saveVisibility`) plus `resolveAccountColor` and the Meridian
  legend/chip styles. Defaults: Total Liquid off, accounts per `showInTrajectory`,
  Restschuld on.
- No shared-chrome extraction between `HistoryChart` and `TrajectoryHorizon` in
  this PRD — they share visual language via copied composition. A shared
  extraction is explicitly deferred to a future `request-refactor-plan`.

### Month Overview picker — `src/features/months/MonthYearPicker/`

- A new `MonthYearPicker` replaces the static `StyledStepLabel` between the
  existing (unchanged) prev/next arrows.
- Layout: `◀ year ▶` header + a 3×4 month grid. Months outside
  `[earliest import month, current month]` are disabled/greyed.
- Rendered via `createPortal(document.body)` with `position: fixed` anchored to
  the button rect; closes on outside-click / Escape; repositions on
  scroll/resize. (The prototype's `.stagger` stacking bug doesn't exist in the
  real app, but portaling stays as the proven approach for popovers inside
  animated pages.)
- Bounds are sourced from `GET /imports` (min `startDate` month) — this keeps
  the full history series off the Month page. Collapses to the current month
  when there are no imports.

**Deep module to extract + test:** a pure bounds helper that, given the imports
list (or their `startDate`s) and the current month, returns the
`[earliest, current]` range and the per-cell enabled/disabled state for the
month grid.

### Plumbing

- `App.tsx`: add `/history` → `<AppLayout><HistoryPage /></AppLayout>`.
- `AppLayout`: nav item between Month and Import, lucide `Clock` icon,
  `aria-current` on `/history`.
- `TrajectoryHorizon`: a `View history →` affordance (Clock + ArrowRight) in the
  header next to the series-toggle count, behind an optional prop passed by
  `DashboardPage` (the page owns navigation, matching the prototype).

### Data-source boundaries

- The earliest browsable month is the month of the earliest imported
  transaction; it is shared by the History span and the picker's lower bound.
- The picker derives its lower bound from `GET /imports` (min `startDate`);
  History derives its span from the endpoint itself.
- `src/` never talks to SQLite directly — all reconstruction happens in the
  server via the existing storage facade and projection engine.

## Testing Decisions

A good test here exercises **external behaviour only** — the shape and values a
module returns or the DOM a component renders and how it responds to
interaction — never private internals. All four modules below get written
tests (confirmed with the developer):

1. **Backend history derivation** (pure function + route). Assert the
   actuals-based `totalLiquid`, the `projected`-based `restschuld`, the
   real-transaction `netCashflow`, per-account `actual` map, the earliest-month
   lower bound, and the empty-imports `[]` case. Prior art: the existing
   projection engine tests (`server/src/lib/projection/`) and route tests under
   `server/src/routes/*/*.test.ts` (e.g. `reports.test.ts`).
2. **Picker bounds helper** (pure function). Assert the `[earliest, current]`
   range from a set of imports, the per-cell enabled/disabled grid, and the
   no-imports collapse-to-current-month behaviour. Prior art: `utils/`
   pure-helper tests such as `utils/trajectory/trajectory.test.ts` and
   `utils/monthStats`.
3. **`useHistory` hook**. Test via a rendered hook: it fetches
   `/projection/history`, derives years-with-imports from `GET /imports`, and
   exposes the reconstructed points. Prior art: `features/months/useYearComparison.test.ts`
   and `useAllMonthTransactions.test.ts`.
4. **History UI components** (`HistoryChart`, `YearArchive`, `MonthYearPicker`).
   Render + interaction tests: legend toggle / double-click-isolate / Show all,
   range-chip selection, Year Archive expand-collapse and deep-link targets,
   picker open/close (outside-click + Escape) and disabled out-of-range cells.
   Prior art: `TrajectoryHorizon.test.tsx`, `MonthOverview.test.tsx`,
   `YearComparison.test.tsx`.

The existing `utils/trajectory` helpers are already covered by
`trajectory.test.ts`; History reuses them rather than re-testing them.

## Out of Scope

- Porting the prototype's `buildHistoricalActuals()` mock generator — replaced
  entirely by real reconstruction from the projection engine.
- Any change to the forward Trajectory Horizon chart beyond adding the quiet
  "View history →" link.
- Any change to the Recurring-Only Projection Model or existing screens' data
  contracts.
- A new "browse a past month" screen — Month Overview already is that screen and
  is already parameterized by `/months/:month`.
- Extracting shared chart chrome between `HistoryChart` and `TrajectoryHorizon`
  — deferred to a future `request-refactor-plan`.
- Payoff marker and Freedom Phase shading on the History chart — those are
  projection-only concepts and do not belong on an actuals view.

## Further Notes

- Delivered against the canonical `history-navigation` handoff bundle
  (`docs/handoff/history-navigation/`), which supersedes prior bundles and
  carries `History.jsx`, `HistoryChart`, `MonthYearPicker`, the Dashboard link,
  and the `HZ.history` mock. Reference screens live in
  `docs/handoff/history-navigation/history-navigation/screens/`.
- Recommended build order (each a thin working vertical slice, TDD RED → build):
  1. Backend `GET /projection/history`.
  2. History page skeleton + `/history` route + sidebar Clock nav +
     `useHistory()` + empty state.
  3. `HistoryChart` (range chips, toggle legend, TODAY line, independent
     visibility persistence, tooltip).
  4. `YearArchive` (import-gated years, badge → `/import`, month row →
     `/months/:month`).
  5. Month Overview `MonthYearPicker` (portal popover, bounds from `GET /imports`).
  6. Dashboard "View history →" link via optional prop from `DashboardPage`.
- The prototype persists visibility under `hz-history-visible-v1`; the real
  build uses the app-convention key `horizon.history.visibility.v1`.
