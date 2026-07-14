# Historical Month Navigation — Handoff (delta)

**Scope: new screen + two small additions. No changes to the Recurring-Only Projection Model or existing screens' data contracts.**

Now that CSV import can bring in multiple years of statements, the only way to look backward was clicking the Month Overview stepper one month at a time. This delta adds a dedicated **History** page, a lightweight jump-to picker on Month Overview, and a link from the Dashboard's Trajectory Horizon card into History.

Reference source: `handoff/prototype/src/screens/History.jsx` (open `handoff/prototype/Horizon.html` → **History** in the sidebar to interact with it live).

**Where this lives in the repo:** add as a sibling folder next to the existing `docs/handoff/`: `docs/handoff/history-navigation/`, same shape as `categories-redesign/` (`DELTA.md` + `screens/`). The touched prototype files (`src/screens/History.jsx`, `src/charts.jsx` additions, `src/screens/MonthOverview.jsx` picker, `src/shell.jsx` nav item, `src/data.js` historical actuals, `src/screens/Dashboard.jsx` link) are already folded into the shared `docs/handoff/prototype/src/`.

---

## Why

Historical CSVs can now cover 3+ years, but the product had no way to browse or visualize that range — Month Overview's prev/next arrows are fine for one month back, not thirty-six. Three options were on the table (year controls on the existing Trajectory Horizon card, a better Month Overview stepper, a dedicated History page); we're shipping **all three**, scoped so each does one job:

- **History page** — the multi-year view. Configurable, browsable, the new home for "what happened."
- **Trajectory Horizon (Dashboard)** — unchanged, stays exactly what it is today (forward-looking 10-year projection). Only addition: a quiet "View history →" link out.
- **Month Overview stepper** — same prev/next arrows, plus a jump-to picker for when the target month is more than a click or two away.

## What's new

### 1. History page (new screen, new sidebar nav item)

`src/screens/History.jsx`, nav item added to `src/shell.jsx` (icon: `clock`).

- **Historical Trajectory chart** (`HistoryChart` in `charts.jsx`) — reuses the Trajectory Horizon's visual language (same per-account color lines, dashed Restschuld, interactive toggle-chip legend with double-click-to-isolate / Show all) but scoped to **actuals only**: no payoff marker, no Freedom Phase shading — those are projection-only concepts. Right edge of the chart is always "today."
- **Range control** — three chips: **1 Year / 3 Years / All history**. Simple, matches the existing chip/legend visual vocabulary already used for the toggle legend and Tabs elsewhere. Persists per-series visibility to `localStorage` (`hz-history-visible-v1`), same pattern as the Dashboard chart.
- **Year Archive accordion** — directly reuses the Outlook "Projection Accordion" interaction (`YearSection`-style: click a year row to expand into its months). Restricted to **only years with at least one imported statement** — the accordion pulls its year list from `HZ.importHistory`, not a hardcoded range, so it can never show a year with no data behind it. Each year row shows Total Liquid / Restschuld snapshot, net cashflow for the year, and an import-count badge (click → jumps to the Import page). Each month row deep-links into the existing **Month Overview** screen for that year/month — no new "browse a past month" UI was built; Month Overview already is that screen.

### 2. Month Overview jump-to picker (`MonthYearPicker`, in `MonthOverview.jsx`)

Clicking the month/year label (between the existing prev/next arrows — those are unchanged) opens a small popover: year switcher (◀ 2026 ▶) + a 3×4 month grid. Months outside the available data range (before the earliest import, after "today") are disabled/greyed. Selecting a month jumps directly and closes the popover — standard date-picker UX, no more N-click stepping.

Implementation note: the popover is rendered via `ReactDOM.createPortal(..., document.body)` rather than absolutely positioned inline. The page's `.stagger` entrance animation (`animation: hz-rise ... forwards` on every direct child, see `styles.css`) causes each direct child of a `.stagger` container to establish its own stacking context, so a `position: absolute` popover nested inside an early sibling (the header) can never paint above a later sibling (the KPI card) no matter its `z-index`. Portaling to `body` with `position: fixed` sidesteps this. **Carry this pattern into any other popover placed inside a `.stagger`-animated page** in the real app (or fix at the root by giving stagger children `isolation: isolate` + explicit z-index ordering, if preferred there).

### 3. Dashboard → History link

One line added to the Trajectory Horizon card's header row: a quiet `View history →` text link (icon `clock`), next to the existing "N of M series" toggle count. No other change to that card — it stays the forward-looking 10-year projection exactly as before.

## Data (mock only — do not port)

`src/data.js` gained:

- `buildHistoricalActuals()` — a second, independent mock generator (~24 months, Jan 2024–Dec 2025) producing the same point shape as the existing projection engine (`a1/a2/a3/a5/a6`, `totalLiquid`, `restschuld`, `netCashflow`), reconciled to land near the existing projection's Jan-2026 starting values. This is purely to make History interactive in the prototype.
- `HZ.history = { pts, years }` — `pts` = historical actuals (2024–2025) + the existing projection's Jan–Nov 2026 slice (already-elapsed "today" months), `years` = the sorted list of distinct years present in `HZ.importHistory` (drives which years the Year Archive shows).
- Three additional `importHistory` entries (2024, one per account) so the archive has 3 full years to demonstrate the "past 3+ years" scenario.

**In the real build:** History's chart and Year Archive should be wired to the actual Projection Engine / Storage's reconstructed historical balances (opening balance + all reconciled transactions per month, per the "reconstruct real historical balances" requirement), not a second mock generator. The `HZ.history.years` derivation (years with ≥1 imported statement) is the one piece of _logic_, not data, worth keeping: gate the Year Archive on real imported-year coverage, however that's sourced in the real API.

## Screens (`screens/`)

1. `screens/01-history-page.png` — Historical Trajectory chart + Year Archive accordion, "All history" range selected
2. `screens/02-month-picker.png` — Month Overview's jump-to popover open, current month highlighted, out-of-range months disabled
3. `screens/03-dashboard-history-link.png` — Dashboard Trajectory Horizon card showing the new "View history →" link, otherwise unchanged
