# 24 — Historical Month Navigation refactor

## Problem Statement

The `history-navigation` feature (design log 23, issues #169–#171) shipped
`HistoryChart` as a deliberate **sibling** of the Dashboard's
`TrajectoryHorizon`. The design log was explicit about the debt: "HistoryChart
and TrajectoryHorizon now share visual language via **copied composition, not
one component** — a shared-chrome extraction is explicitly deferred to a future
request-refactor-plan." This is that plan.

In practice the two charts share far more than the log admits. Essentially
byte-for-byte, both `HistoryChart.tsx` and `TrajectoryHorizon.tsx` (and their
`.styles.ts` files) carry:

- a local `MONTH_NAMES` array + `formatMonthLabel` helper — which **already
  exists** as `MONTHS` / `formatMonth` in `utils/format` (and `MonthYearPicker`
  keeps a _third_ copy, `MONTHS_SHORT`);
- an identical `Series` interface (`{ key, name, color, kind, dashed }`);
- an identical `series` builder (Total Liquid → per-account → Restschuld);
- an identical visibility block: `useState` seeding defaults + merging persisted
  state, a `useEffect` that saves, and the `toggle` / `isolate` / `showAll`
  handlers + `visibleCount` — differing only in the localStorage key string;
- an identical toggle-chip **Legend** component (only the `data-testid` differs);
- an identical "Filter · N of M series · click to toggle" indicator;
- ~13 identical styled components (card, header, overline, title, series-toggle,
  chart wrapper, loading state, tooltip box/label, and the whole legend chip
  set) — the card wrapper differs only by one margin token.

Two smaller architecture defects ride along:

- `HistoryChart` casts `data as unknown as TrajectoryDataPoint[]` to satisfy
  `computeVisibleYDomain`, whose parameter is typed too narrowly. A double-cast
  is a "no `any`" workaround for a signature that should have been looser.
- The month-name array is duplicated three times across the codebase despite a
  ready utility.

What genuinely diverges between the two charts — and must stay per-feature — is
the Recharts `<ComposedChart>` **body** (Trajectory's freedom-gradient Area +
payoff markers vs History's range-windowing + stroke weights), the `YearTick`
cadence, and the tooltip **row bodies** (History ends on Net Cashflow;
Trajectory uses positive/warning/muted rows).

## Solution

Extract the identical, domain-agnostic chart **chrome** into the correct
architectural layers and have both features consume it, while leaving each
feature its own `<ComposedChart>` body. No single "god chart" with divergence
flags — the plotted layers really do differ, so unifying the bodies would trade
duplication for a heavily-parameterised component (rejected: Option A).

Target placement, per the project's layer rules:

- **`hooks/useSeriesVisibility`** — the React state + localStorage-persistence
  bundle. The `hooks/` layer is defined as "only hooks used across 2+ features";
  this is its first resident. It composes the already-shared pure math in
  `utils/trajectory`.
- **`utils/trajectory`** — gains `buildSeriesDescriptors` (the series list) and a
  loosened `computeVisibleYDomain` row type. Stays React-free (theme colours are
  passed in).
- **`components/`** — dumb, reusable, domain-agnostic UI: `SeriesLegend`
  (toggle-chip legend), `ChartFrame` (card + header with a controls slot + chart
  wrapper + loading state), `SeriesToggleIndicator` (the "N of M series" line),
  and a `ChartTooltip` shell (the tooltip box + label; each feature still renders
  its own rows as children). Registered in the `components` barrel.

The two extra fixes fold in: loosen the domain util to delete the cast, and
route all three month-name arrays through `utils/format`.

Every commit is a tiny, independently-green step: each shared piece is **added
with its own tests first (consumed by nobody)**, then adopted in `HistoryChart`
and `TrajectoryHorizon` in separate commits, so the blast radius of each swap is
one file and its existing test suite is the behaviour-preserving net.

## Commits

Ordered cheapest/safest → higher-blast-radius. Each leaves `npx vitest run`
green.

1. **Dedup the month-name arrays.** Export the existing short-month array from
   `utils/format` (today it is a private const backing `formatMonth`). Replace
   the local `MONTH_NAMES` + `formatMonthLabel` in `HistoryChart` and
   `TrajectoryHorizon` with `formatMonth`, and `MONTHS_SHORT` in
   `MonthYearPicker` with the exported array. Pure substitution; existing tests
   for all three cover it. _(Independent, no new module.)_

2. **Loosen `computeVisibleYDomain`; delete the cast.** Widen the util's row
   parameter from `TrajectoryDataPoint[]` to a shared loose chart-row type
   (an index signature of `number | string | boolean | null`). Both concrete
   point types already satisfy it structurally. Remove the
   `as unknown as TrajectoryDataPoint[]` cast in `HistoryChart`. Update the
   util's test only if the type change surfaces. _(Type-only; behaviour
   unchanged.)_

3. **Add `useSeriesVisibility` hook (+ test), consumed by nobody.** New
   `src/hooks/` directory and `useSeriesVisibility.ts`: given the visibility
   accounts, the series keys, and a storage key, it returns
   `{ visibility, visibleCount, toggle, isolate, showAll }`, wrapping the
   `useState`(defaults + persisted merge) + `useEffect`(save) + handlers. Test
   with `renderHook`: default seeding, persisted-merge, each handler, and
   save-on-change. Add-only → green.

4. **Adopt `useSeriesVisibility` in `HistoryChart`.** Replace the inline
   visibility block. `HistoryChart.test.tsx` is the net. Green.

5. **Adopt `useSeriesVisibility` in `TrajectoryHorizon`.** Same swap, separate
   commit so the Dashboard change is isolated. `TrajectoryHorizon.test.tsx` is
   the net. Green.

6. **Add `buildSeriesDescriptors` util (+ test), consumed by nobody.** Extract
   the series-list builder into `utils/trajectory` with an exported
   `SeriesDescriptor` type. Signature takes the non-mortgage accounts, a
   has-mortgage flag, and the two theme colours (liquid, Restschuld); returns the
   ordered descriptor list. Reuses `resolveAccountColor`. Test: ordering,
   no-mortgage case, colour resolution. Add-only → green.

7. **Adopt `buildSeriesDescriptors` in `HistoryChart`.** Replace the local
   `series` memo + delete the local `HistorySeries` interface. Green.

8. **Adopt `buildSeriesDescriptors` in `TrajectoryHorizon`.** Same; delete the
   local `TrajectorySeries` interface. Green.

9. **Add `components/SeriesLegend` (+ test), consumed by nobody.** Move the
   Legend component and its styled parts (legend, chip, swatch, SUM badge,
   show-all button) into `components/SeriesLegend/`. Props: series descriptors,
   visibility, the three callbacks, and a `testId` prop so each feature keeps its
   existing `data-testid` ("history-legend" / "trajectory-legend"). Register in
   the barrel. Test: chip render, `aria-pressed`, toggle / double-click-isolate /
   show-all callbacks, SUM badge on the liquid series, `testId` passthrough.
   Add-only → green.

10. **Adopt `SeriesLegend` in `HistoryChart`.** Delete the local `HistoryLegend`
    and its now-orphaned styled parts. Green.

11. **Adopt `SeriesLegend` in `TrajectoryHorizon`.** Delete the local
    `TrajectoryLegend` and its styled parts. Green.

12. **Add `components/SeriesToggleIndicator` (+ test), consumed by nobody.** The
    "Filter · N of M series · click to toggle" line as a dumb component taking
    `visibleCount` and `total`. Its styled part sets no `align-self` — placement
    is the caller's job (History renders it in the body, Trajectory in the header
    controls). Barrel + test. Add-only → green.

13. **Adopt `SeriesToggleIndicator` in `HistoryChart`.** Green.

14. **Adopt `SeriesToggleIndicator` in `TrajectoryHorizon`.** Green.

15. **Add `components/ChartFrame` (+ test), consumed by nobody.** The card
    `<section>` + header (overline + title + a right-hand `controls` slot) +
    chart wrapper + loading state. Props: `overline`, `title`,
    `controls?: ReactNode`, `isLoading`, `loadingTestId?`, an optional
    top-spacing token (defaults to the Dashboard value so no pixels move), and
    children. Feature-specific branches (Trajectory's empty state, the
    conditional visibility of its header controls) stay in the feature and are
    passed in as `controls`/children. Barrel + test. Add-only → green.

16. **Adopt `ChartFrame` in `HistoryChart`.** Render the range chips as
    `controls`; delete the local card/header/overline/title/wrapper/loading
    styled parts. Green.

17. **Adopt `ChartFrame` in `TrajectoryHorizon`.** Compose the header
    `controls` (toggle indicator + divider + View-history link) and keep the
    empty-state branch in the feature; delete the corresponding styled parts.
    Green.

18. **Add `components/ChartTooltip` shell (+ test), consumed by nobody.** The
    tooltip box + label as a small wrapper that renders children rows. Barrel +
    test. Add-only → green.

19. **Adopt `ChartTooltip` shell in `HistoryChart`.** Keep the History-specific
    rows (coloured swatch rows + the Net Cashflow footer) as children; delete the
    local box/label styled parts. Green.

20. **Adopt `ChartTooltip` shell in `TrajectoryHorizon`.** Keep the
    positive/warning/muted rows as children; delete the local box/label styled
    parts. Green.

21. **Cleanup sweep.** Remove now-dead styled exports (including the already-unused
    `StyledTooltipRowAccent`), unused imports, and any orphaned local types in
    both features. Confirm `npx vitest run`, typecheck, and lint are green.
    Append a dev-journal close-out entry.

_Commits 4/5, 7/8, 10/11, 13/14, 16/17, 19/20 are symmetric add-then-adopt
pairs; they are kept separate so each swap touches one component and leans on
that component's own test suite. A developer may collapse a History+Trajectory
pair into one commit if preferred, but the default is one file per commit._

## Decision Document

- **Extract the chrome, keep two chart bodies.** The two `<ComposedChart>`
  bodies genuinely differ (freedom Area + payoff markers vs range-windowing);
  they are not unified. A single flag-driven chart component was considered and
  rejected as a god-component trade.
- **Layer placement follows the project's own rules.** Shared React state → a
  new `hooks/` module (the "used across 2+ features" layer); shared pure logic →
  `utils/trajectory`; shared dumb UI → `components/` (registered in the barrel).
  No shared UI lives inside a feature, since a feature must not import another
  feature's internals.
- **New shared modules:** `hooks/useSeriesVisibility`; `utils/trajectory`
  additions (`buildSeriesDescriptors`, `SeriesDescriptor` type, a loosened
  chart-row type on `computeVisibleYDomain`); `components/SeriesLegend`,
  `components/SeriesToggleIndicator`, `components/ChartFrame`,
  `components/ChartTooltip`.
- **`SeriesLegend` exposes a `testId` prop** so both features keep their existing
  legend `data-testid` values — the adopt commits do not touch the existing
  behavioural tests.
- **`ChartFrame` keeps feature-specific branches in the feature.** The
  empty-state and the conditional header controls are composed by the feature
  and passed as `controls`/children; the frame is layout-only.
- **`ChartFrame` takes an optional top-spacing token** (defaults to the Dashboard
  value) so the History card's slightly smaller top margin is preserved rather
  than silently changed.
- **Colours stay injected, not read from a theme inside utils.**
  `buildSeriesDescriptors` receives the liquid/Restschuld colours as arguments so
  the util remains React-free and testable.
- **`utils/format` becomes the single source for month names.** Its short-month
  array is exported; the two charts use `formatMonth`, the picker uses the
  exported array for its grid cells.
- **No behavioural, data-contract, or visual change is intended.** The
  `GET /projection/history` endpoint, the visibility localStorage keys, the
  legend/tooltip/chart appearance, and both charts' rendered output are
  unchanged.

## Testing Decisions

- **Good tests here assert external behaviour, not wiring.** For the extracted
  units that means: the hook's observable outputs and persistence effects; the
  util's returned descriptor list; the components' rendered output, ARIA state,
  and callback firing. None should assert internal call sequences.
- **Modules that get new tests:** `useSeriesVisibility` (default seeding,
  persisted-merge, toggle/isolate/showAll, save-on-change — `renderHook`);
  `buildSeriesDescriptors` (ordering, no-mortgage case, colour resolution);
  `SeriesLegend` (chip render, `aria-pressed`, the three callbacks, SUM badge,
  `testId`); `SeriesToggleIndicator` (rendered count text); `ChartFrame`
  (overline/title/controls/children + loading branch); `ChartTooltip` shell
  (renders box + label + children).
- **The existing `HistoryChart.test.tsx` and `TrajectoryHorizon.test.tsx` are the
  regression net.** They must stay green and unmodified across every adopt
  commit — that is the proof the extraction is behaviour-preserving. The only
  reason to touch them would be an unavoidable import path; a changed assertion
  is a signal the extraction changed behaviour and must be reworked.
- **Prior art:** `utils/trajectory/trajectory.test.ts` (pure util tests),
  `components/Donut/Donut.test.tsx` (a chart-adjacent `components/` unit),
  `components/DataRow` / `components/SettingRow` tests (dumb component render +
  props), and the existing `SnackbarProvider` hook tests (`renderHook` shape).

## Out of Scope

- **The divergent chart bodies.** The two `<ComposedChart>` blocks, `YearTick`
  cadence, and tooltip row bodies stay per-feature by design.
- **`YearArchive`'s styled rows and `MonthYearPicker`.** `YearArchive` already
  reuses the shared `aggregateYearSummaries` aggregator; its accordion-like
  styled rows visually echo `ProjectionAccordion` but are not touched here — a
  future accordion-chrome extraction is a separate candidate. `MonthYearPicker`
  is untouched apart from the month-name dedup (commit 1); its portal
  reposition-on-scroll handling is already correct and stays as-is.
- **The `chart-line-${id}` hidden test spans.** These test affordances are
  identical in both charts but tie to each chart's own account set; they stay
  per-feature (test-only markup, low extraction value).
- **The server `GET /projection/history` endpoint** and every data contract,
  localStorage key, and rendered pixel — all unchanged.

## Further Notes

The `hooks/` directory is created for the first time by this refactor;
`useSeriesVisibility` is its first resident, matching CLAUDE.md's definition of
the layer ("only hooks used across 2+ features"). Note that
`components/SnackbarProvider` also exports hooks, but those are component-coupled
and correctly co-located with their component; `useSeriesVisibility` is
genuinely cross-feature and belongs in `hooks/`.

A natural follow-on, once both charts consume the shared chrome, is to reconsider
whether the two `<ComposedChart>` bodies have converged enough to justify a
single chart component — but that is a decision to make _after_ this extraction,
not a goal of it.
