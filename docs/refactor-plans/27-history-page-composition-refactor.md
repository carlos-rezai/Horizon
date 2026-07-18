# 27 — History Page composition refactor

## Problem Statement

I imported a CSV covering January through mid-July 2026, the import
succeeded and shows in the Import History, but the **History page shows
nothing** — no chart, no year archive, no imported months. My first
instinct was that the page needed a refresh button.

It does not. The data is fetched correctly on every visit; there is simply
no UI rendering it.

The `history-navigation` feature (design log 23, issues #168–#172) was
specced as a vertical slice: phase 2 built the History page skeleton + nav

- empty state, phase 3 built `HistoryChart`, phase 4 built `YearArchive`.
  Phases 3 and 4 shipped both components **fully built and fully tested** —
  but they were never composed into the page. `HistoryPage` was never
  advanced past its phase-2 skeleton:

* `HistoryPage` renders only the `PageHeader` and, when there are no
  imports, an `EmptyState`. When imports exist (`years.length > 0`) the
  empty state's guard goes false and **nothing renders in its place** — a
  bare header.
* `HistoryChart` and `YearArchive` are imported by nobody (a grep confirms
  they are referenced only by their own files and tests). They are
  orphaned.
* The page ignores `useHistory`'s `error`. On a failed fetch, `years`
  degrades to `[]`, so `isEmpty` becomes true and the page shows **"No
  history yet"** — a fetch error masquerades as an empty state.
* There is no loading state; the header renders bare during the fetch.

The existing `HistoryPage.test.tsx` "loaded state" block only asserts that
the empty state is _absent_ — it never asserts the chart or archive
renders. The suite passes precisely because the page is a stub.

A refresh button is the wrong fix: `useHistory` re-runs its fetch on every
mount (each navigation to `/history`), and `useImport.commit` already calls
`refresh()` after a successful import. Freshness is not the problem;
composition is.

## Solution

Complete the History page composition the design log already specified:
render `HistoryChart` and `YearArchive` inside `HistoryPage`, and give the
page the full load / error / empty / content state treatment that
`DashboardPage` already models.

- **Accounts source.** `HistoryChart` needs the account list for its
  per-account series. The page composes `useAccounts()` alongside
  `useHistory()` and passes `accounts` down — exactly how `DashboardPage`
  feeds `TrajectoryHorizon`. `useHistory` stays focused on history data and
  does not grow a second fetch responsibility.
- **State treatment.** While either hook is loading, show the shared
  `Spinner` (matching `DashboardPage`). If either hook errors, show a
  distinct error state so a failed fetch no longer reads as "No history
  yet". When both settle with no imported years, keep the existing
  `EmptyState`. Otherwise render the chart Card + the Year Archive.
- **Layout** follows the canonical prototype
  (`docs/handoff/history-navigation/prototype/src/screens/History.jsx`):
  header, then the chart, then the Year Archive. `HistoryChart` already
  owns its own range chips, legend, and visibility state internally (per
  refactor 24's `ChartFrame` adoption), so the page is pure composition —
  it holds no range or visibility state.

No new balance math, no data-contract change, no change to `useHistory`,
`HistoryChart`, or `YearArchive`'s public props. This is wiring plus the
page's own state branches.

## Commits

Ordered as tiny TDD pairs (failing test → implementation), matching the
repo's established `test:` → `feat:` rhythm. Each `feat` commit leaves
`npx vitest run` green.

1. **test (RED): chart renders in the loaded state.** Extend
   `HistoryPage.test.tsx`: in the loaded-state block, add a `/accounts`
   stub to `mockFetch` and assert the reconstructed chart is present
   (an assertion tied to `HistoryChart`'s own stable output — e.g. its
   card/section marker or a series affordance already used by
   `HistoryChart.test.tsx`). Fails against the current stub.

2. **feat (GREEN): render HistoryChart in HistoryPage.** Compose
   `useAccounts()` alongside `useHistory()`; render `HistoryChart` with
   `points`, `accounts`, and `isLoading={false}` below the header when
   there are imported years. Green.

3. **test (RED): Year Archive renders in the loaded state.** Assert the
   "Year Archive" section and at least one imported year row render for the
   mocked points/imports. Fails.

4. **feat (GREEN): render YearArchive in HistoryPage.** Render
   `YearArchive` with `points`, `years`, and `statementCounts` beneath the
   chart. Green.

5. **test (RED): loading and error states.** Add a test that a slow/pending
   fetch shows the spinner, and a test that a rejected/`!ok` fetch shows the
   error state (and specifically **not** the "No history yet" empty state).
   Fails against the current stub.

6. **feat (GREEN): loading spinner + error branch.** Gate the page on the
   combined loading of both hooks with the shared `Spinner`; render a
   distinct error branch when either hook reports an error; keep the empty
   state only for the genuine no-imports case. Green.

7. **chore: verify end-to-end + dev-journal close-out.** Drive the real app
   (import a multi-month CSV, open `/history`, confirm the chart and archive
   render and a month row deep-links to `/months/:month`). Confirm
   `npx vitest run`, the real typecheck (`tsc -b` / `npm run build`), and
   lint are green. Append a dev-journal entry recording that the orphaned
   phase-3/phase-4 components are now composed and the error-masquerade gap
   is closed.

_Commits 1/2, 3/4, 5/6 are symmetric RED→GREEN pairs and may be collapsed
pairwise if preferred; the default is one concern per commit so each
assertion's blast radius is a single change._

## Decision Document

- **This completes the composition the design log already specified** — it
  is not a redesign. `HistoryChart`, `YearArchive`, and `useHistory` keep
  their existing public shapes; only `HistoryPage` (and its test) change.
- **The page composes two hooks.** `HistoryPage` calls both `useAccounts()`
  and `useHistory()` and passes their data into the two components, the
  same pattern `DashboardPage` uses. `useHistory` is deliberately **not**
  extended to fetch accounts — that would duplicate `useAccounts` and give
  the hook a second responsibility.
- **`HistoryChart` receives `isLoading={false}`.** The page gates on a
  top-level `Spinner` while either hook loads (the `DashboardPage`
  convention), so by the time the chart mounts, loading is already
  resolved.
- **Four explicit page states.** loading (spinner) · error (distinct
  message) · empty (existing `EmptyState`, no-imports only) · content
  (chart + archive). This closes the gap where a fetch error rendered as
  "No history yet".
- **Layout order** matches the canonical prototype: header → chart card →
  Year Archive card. Range chips / legend / visibility remain internal to
  `HistoryChart`; the page owns no chart state.
- **No backend, data-contract, or localStorage change.** `GET
/projection/history`, `GET /imports`, `GET /accounts`, and the
  `horizon.history.visibility.v1` key are all untouched.

## Testing Decisions

- **Good tests here assert what the user sees, not wiring.** For
  `HistoryPage` that means: given mocked history/imports/accounts
  responses, the loaded page shows the chart and the Year Archive; a
  pending fetch shows the spinner; a failed fetch shows the error state and
  not the empty state; a no-imports response shows the empty state. None
  should assert internal hook call order.
- **The module that gains tests is `HistoryPage`.** Its existing test file
  is extended rather than replaced; the current header / empty-state / CTA
  tests stay green and unmodified.
- **`mockFetch` must stub `/accounts`.** The page now calls `useAccounts`,
  which hits `GET /accounts`; the existing helper only stubs
  `/projection/history` and `/imports` (its fallback returns `[]`). Add an
  explicit `/accounts` branch returning representative accounts so the
  chart's per-account series have data.
- **Prior art:** the existing `HistoryPage.test.tsx` (fetch-mock + router +
  theme render harness), `HistoryChart.test.tsx` and `YearArchive.test.tsx`
  (the components' own behavioural suites, which remain the regression net
  for the pieces being composed), and `DashboardPage`'s tests for the
  loading/error-gate pattern being mirrored.

## Out of Scope

- **Any change to `HistoryChart`, `YearArchive`, or `useHistory`.** Their
  props and behaviour are unchanged; this refactor only composes them.
- **The backend `GET /projection/history` endpoint** and every data
  contract and localStorage key — unchanged.
- **The `MonthYearPicker`, the Dashboard "View history" link, and the
  forward `TrajectoryHorizon`** — all already shipped and unaffected.
- **A "refresh" button** — explicitly rejected; refetch-on-navigation and
  post-commit `refresh()` already keep the data current.
- **Verifying the import pipeline itself.** The reported symptom is a
  render gap; the import path (parse → commit → `imports` record →
  import-derived years) is assumed correct and is confirmed only
  incidentally by the end-to-end check in the final commit.

## Further Notes

This is the third "built-but-not-composed" gap to surface in the history
feature's wake; the components were delivered and tested in isolation
(phases 3–4) but the page that was supposed to host them stayed at its
phase-2 skeleton. The end-to-end verification step in the final commit is
the guard that would have caught this originally — a passing unit suite did
not, because the "loaded state" test asserted only the absence of the empty
state, never the presence of content.
