# 33 — Financial History Refactor

> Follows the Financial History epic (PRD issue #238, phases #239–#245; design
> log 31). Picks up the convention drift the epic's seven phases left behind,
> and absorbs #245 (README, CLAUDE.md and manual). #245's copy shipped in
> `b7cf0eb`; what it still owed, the Build Status tick, is this plan's last
> commit, so the epic has one refactor issue that closes it. Solo session: the
> user asked for this plan to be worked out alone, with consistency of naming,
> conventions, patterns and architecture as the goal.

## Problem Statement

Financial History does what it set out to do, and each phase is tested. But it
was built one phase at a time, and the drift refactor 32 had just removed from
Balance Anchor came back in the same forms. Two of the drifts are also user-facing
defects.

**"The current month" is worked out five ways, and two of them are UTC.** The
projection route and the settlements route each keep a private local-time
`currentMonth`. The epic added `buildPastLeadIn`, which takes the current month
from `toISOString()` (UTC). The Trajectory Horizon finds its TODAY Marker the
same way. The client already has `currentMonth` in the month-math util, and
refactor 32 made "today is the local calendar date on both tiers" a rule. The
server projects from the local month, and the chart looks for TODAY by the UTC
month. So from midnight to 01:00 or 02:00 (CET/CEST) on the 1st of a month,
the two disagree. The Past Lead-in leaves out last month, and the TODAY Marker
finds no matching row and disappears. This is the midnight defect refactor 32
fixed, back in a rule this epic introduced. Nothing tests for it.

**`monthsBetween` is written three times on the server.** It appears in the
history lib (new in this epic), the projection engine and the projection route.
The server date lib exists to hold exactly this, and already holds
`parseYearMonth`, `todayIso`, `daysInMonth` and `endOfMonth`.

**Account-kind rules are inline again.** `deriveHistory` filters liquid
accounts with an inline `kind === "Girokonto" || kind === "Tagesgeld"` and
Trackable Accounts with a three-way inline check. The engine's `totalLiquid` has
the same liquid check inline, and the cashflow lib keeps it as a private
`LIQUID_KINDS`. The variable-spending lib already set the pattern for this kind
of rule: one exported `selectSpendingAccounts`, with the kinds behind it. "Which
accounts are liquid" and "which are Trackable" have no such home.

**"Is this Mortgage originated?" is answered twice.** `historySpanStart` and the
history lib's `paydownBridge` each check
`kind === "Mortgage" && originalPrincipal !== undefined && startDate !== undefined`
and slice the Mortgage Start month themselves. `HistorySpanAccount` also
re-declares the origination fields `HistoryAccount` already documents.

**The engine-entry literals are copied again.** Refactor 32 replaced three
copies of the account-entry literal with `toProjectionAccountEntry`. The
transaction and recurring literals next to it were left. They are copied in
`GET /projection`, `GET /projection/history` and `GET /settlements/warnings`.
#244 then added `transferId` and `isAutoSettlement` spreads to two of the
transaction copies. `deriveHistory` needs those fields, but the engine does not
read them, so in `GET /projection` they are dead code that the engine ignores.
`deriveHistory` already takes the stored accounts as a structural superset (log
31 Q3). It can take the stored transactions the same way.

**The Dashboard's history goes stale after a mortgage edit.** Log 31 Q7 said
that every mutation that refreshes `PROJECTION` refreshes `HISTORY` too.
The Dashboard's Mortgage Countdown `onUpdated` refreshes accounts, the
projection and recurring, but not history. After someone sets up a mortgage
or edits its origination there, the Past Lead-in, the Paydown Bridge and the
Savings Streak keep the old history until the page is left and revisited. This
breaks user stories 7 and 37. The cause is a missing hook, not a missing bump:

- Every other cache key has one hook that owns its fetcher (`useAccounts`,
  `useProjection`).
- `HISTORY` has an exported `fetchHistoryPoints` instead, and `useHistory` and
  `useSavingsGoal` each pair it with the key by hand.
- The Dashboard gets its lead-in points from the Savings Streak's hook
  (`savingsPoints`), so it has no `refresh` to call.

`useHistory` also bypasses `fetchJson`, the helper that exists so every cached
read throws the same error. Its imports fetch is labelled "Failed to fetch
history". It still returns `years`, which nothing has read since #239.

**History rules sit in components again.** Refactor 32 moved the Known Since
rules out of HistoryChart and YearArchive into the `knownSince` module. The epic
added four more rules in components:

- HistoryChart's private `paydownBridgeSpan`, the bridge's extent and the amount
  paid off
- YearArchive's private `knownYears`
- HistoryTrends' inline "first month this series is known"
- the range windowing (`HISTORY_RANGE_OPTIONS.find(…)` and a right-edge `slice`),
  copied into both HistoryChart and HistoryTrends

**The tooltip's Unknown rule disagrees with `isUnknownMonth`.** Log 31 Q16 drops
the Net Cashflow row "in a month where every account is Unknown".
HistoryChartTooltip works that out from the _visible_ series. So if you hide
the one account that is known in a month, its Net Cashflow disappears, even
though `isUnknownMonth` says the month is known.

**The chart keys and the bridge's domain rule are duplicated.** Both charts
re-declare `TOTAL_LIQUID_KEY`, `RESTSCHULD_KEY` and `RESTSCHULD_BRIDGE_KEY`,
which the trajectory util also declares privately. Both charts also add
`{ ...visibility, restschuldBridge: restschuldVisible }` before
`computeVisibleYDomain`, with the same comment.

**`HistoryPoint` lives in a feature, and a util now imports it.** The history
feature's `historyTypes` holds the DTO mirror of the server's `HistoryPoint`.
Three features and two utils read it, and the new `buildPastLeadIn` makes
`src/utils/projection` depend on `src/features/`. `MonthlySnapshot`, the other
projection DTO, already lives in `src/types/`, the layer for shared interfaces.

**One piece of copy was missed.** The History page subtitle still reads "Browse
reconstructed balances from your imported statements". History now also comes
from Anchor Balances and the mortgage's origination, as the manual (#245) says.

## Solution

Seven parts, cheapest and most behaviour-neutral first. Every commit leaves the
suite green. The three behaviour changes each sit behind their own failing test:

- the client reads the local current month, so the Past Lead-in and the TODAY
  Marker survive midnight on the 1st
- a mortgage edit on the Dashboard refreshes the history
- the tooltip's Net Cashflow follows `isUnknownMonth`, not series visibility

The fourth behaviour change is the subtitle copy.

**Server.**

- The date lib gains `currentMonth` and `monthsBetween`.
- A new `accountKinds` lib owns `selectLiquidAccounts` and
  `selectTrackableAccounts`, following `selectSpendingAccounts`.
- The history span lib exports `mortgageStartMonth`, and the bridge reads it.
- The projection lib gains `toProjectionTxEntry` and
  `toProjectionRecurringEntry` beside `toProjectionAccountEntry`.
- All three routes map with them, and `deriveHistory` takes the stored
  transactions directly.

**Client data.**

- A `useHistoryPoints` hook owns the `HISTORY` key, the way `useProjection` owns
  `PROJECTION`. `useHistory`, `useSavingsGoal` and the Dashboard read it.
- The Dashboard refreshes it after a mortgage update.
- Every history read goes through `fetchJson`.

**Client rules.**

- A new `paydownBridge` module holds the bridge's extent.
- `knownSince` gains `firstKnownMonthOf` and `knownYears`.
- A new `historyRange` module owns the range options and `pointsInRange`.
- The trajectory util exports the series keys, and its Y domain counts the
  bridge whenever the Restschuld is visible.

**Types.** `HistoryPoint` moves to `src/types/history.ts`. The history feature
barrel re-exports it, and `historyTypes` is deleted.

## Commits

### Part A — Server: date, kinds and origination rules

**A1. Add `currentMonth` and `monthsBetween` to the server date lib.**
`currentMonth()` returns `YYYY-MM` in local time, by the same rule as `todayIso`.
`monthsBetween(from, to)` counts whole months between two `YYYY-MM` strings and
reads `parseYearMonth`. Test `currentMonth` with a frozen clock at 00:30 on the
1st and at 23:30 on the last day of a month, and assert both give that local
month. Test `monthsBetween` within a year, across a year boundary, and with
equal months. No consumer yet.

**A2. The projection and settlements routes read the date lib.**
Delete both routes' private `currentMonth` and the projection route's private
`monthsBetween`. The route tests stay green unedited.

**A3. The engine and the history lib read `monthsBetween`.**
Delete the engine's private `monthsBetween` and the history lib's. The engine
keeps its private `addMonths` (see Out of Scope). The projection and history
tests stay green unedited.

**A4. Add the `accountKinds` lib.**
A new server lib in its own folder, by the Module Filing Rule. It exports
`selectLiquidAccounts` (Girokonto and Tagesgeld) and `selectTrackableAccounts`
(Girokonto, Tagesgeld and Investment). Both are generic over
`{ kind: AccountKind }`, like `selectSpendingAccounts`, so callers keep their
fields. Its doc comment names the client's parity copies (`src/utils/accounts`
for liquid, the Savings Streak for Trackable), in the same way the
variable-spending lib names its client copy. Test each kind in and out of each
selection. No consumer yet.

**A5. Liquid and Trackable read the `accountKinds` lib.**
`deriveHistory`'s `liquidIds` and `trackableIds`, the engine's `totalLiquid`
and the cashflow lib's selection all call it. The cashflow lib's private
`LIQUID_KINDS` is deleted. The history, projection and cashflow tests stay green
unedited.

**A6. One `mortgageStartMonth`.**
The history span lib exports `mortgageStartMonth(account)`. It returns the
Mortgage Start month (`YYYY-MM`) of an originated Mortgage, and `null` for any
other account or for a Mortgage without both origination fields. Add tests for:

- an originated Mortgage
- a Mortgage without a start date
- a Mortgage without an Original Principal
- a Girokonto that carries a stray `startDate`

`historySpanStart` and the history lib's `paydownBridge` both call it. Neither
keeps its own predicate or slice. `HistorySpanAccount` takes its origination
fields from `HistoryAccount` instead of re-declaring them. `kind` stays
optional, because anchor-only span fixtures omit it. The span and history tests
stay green unedited.

### Part B — Server: engine entries

**B1. Add the transaction and recurring entry mappers.**
The projection lib exports `toProjectionTxEntry(tx)` and
`toProjectionRecurringEntry(r)` beside `toProjectionAccountEntry`.
`toProjectionTxEntry` returns the `ProjectionTxEntry` fields, and nothing the
engine does not read. `toProjectionRecurringEntry` returns the recurring fields
with `linkedAccountId` and `monthOfYear` only when they are set, using the
same conditional spreads the routes use now. Test that each omits unset optional
fields and carries set ones. No consumer yet.

**B2. The routes use the mappers, and `deriveHistory` takes stored transactions.**
`GET /projection`, `GET /projection/history` and `GET /settlements/warnings`
map with `toProjectionTxEntry` and `toProjectionRecurringEntry`. The
`transferId` and `isAutoSettlement` spreads go. `GET /projection/history`
passes the stored `transactions` to `deriveHistory`, in the same way it already
passes the stored `accounts`. `HistoryTx` stays as the minimal shape
`deriveHistory` documents, and a stored Transaction satisfies it structurally.
The route tests stay green unedited, which shows Monthly Spending still sees
`transferId` and `isAutoSettlement`.

### Part C — Client: one current month

**C1. RED: the Past Lead-in and the TODAY Marker survive midnight on the 1st.**
Freeze the clock at 00:30 local time on the 1st of a month
(`vi.useFakeTimers({ toFake: ["Date"] })`, refactor 32's pattern):

- `buildPastLeadIn` keeps the previous local month and leaves out the current
  local month.
- The Trajectory Horizon, given a lead-in and projected snapshots that start at
  the local month, draws the TODAY Marker at the lead-in's length.

On a machine east of UTC (the user's, CET/CEST), both fail against the UTC
month. Commit as `test:`.

**C2. Both read the month-math util's `currentMonth`.**
`buildPastLeadIn` and the Trajectory Horizon drop
`new Date().toISOString().slice(0, 7)` and call `currentMonth()`. C1 goes
green, and the rest of both suites stays green unedited.

### Part D — Client: one history resource

**D1. Add `useHistoryPoints`.**
A new history feature hook in its own folder. It reads `HISTORY` through
`useCachedResource` with `fetchJson("/projection/history")`, and returns
`{ points, isLoading, error, refresh }`, the shape `useAccounts` returns. It has
a stable empty array before load, as `useProjection` does. The history feature
barrel exports it. Test that two readers share one request and that `refresh`
refetches. The prior art is the `useProjection` and `useAccounts` tests. No
consumer yet.

**D2. `useHistory` and `useSavingsGoal` read `useHistoryPoints`.**
`fetchHistoryPoints` is no longer exported and is deleted. `useHistory`
composes `useHistoryPoints`, and its imports read uses
`fetchJson("/imports")`. That retires the mislabelled "Failed to fetch history"
error. `useSavingsGoal` calls `useHistoryPoints()` instead of pairing the key and
fetcher by hand. The `useHistory`, `useSavingsGoal` and DashboardPage tests
stay green unedited. The error tests assert only that an error is present.

**D3. `useHistory` stops returning `years`.**
Nothing has read `years` since #239 moved the Year Archive onto known months.
Delete it from the result type and the derivation, and fix the doc comment that
still says the years "drive which periods the History view may browse". This
commit is allowed one kind of test edit: deleting the three `years` assertions.
Every other assertion stays.

**D4. RED: a mortgage update on the Dashboard refreshes history.**
In the DashboardPage tests, use the existing per-URL fetch routing. Complete a
Mortgage Countdown update, then assert that `/projection/history` is fetched
again and that the Trajectory Horizon draws the new lead-in. Commit as `test:`.

**D5. The Dashboard reads `useHistoryPoints` and refreshes it.**
The Trajectory Horizon's `history` prop takes `useHistoryPoints().points`
instead of `savingsPoints`. The Savings Streak keeps its own points from
`useSavingsGoal`, and both read one cached request. The Mortgage Countdown
`onUpdated` adds the history `refresh` beside the accounts, projection and
recurring refreshes. D4 goes green.

### Part E — Client: history rules out of components

**E1. Add the `paydownBridge` module.**
A new history feature module named after the glossary's **Paydown Bridge**. It
exports `paydownBridgeSpan(points)`, which returns `{ from, to, paidOff }` or
`null`. This is HistoryChart's private function and its `PaydownBridgeSpan`
type, moved as they are. Test:

- no bridge
- a bridge over several months
- a bridge that ends at the join month

`paidOff` is the Original Principal minus the Restschuld at the join. No
consumer yet.

**E2. HistoryChart reads `paydownBridgeSpan`.**
Delete the private copy. The HistoryChart tests stay green unedited.

**E3. `knownSince` gains `firstKnownMonthOf` and `knownYears`.**
`firstKnownMonthOf(points, field)` returns the first month in which a numeric
`HistoryPoint` field is non-null, or `null`. `knownYears(points)` returns the
years that hold at least one month that is not Unknown, newest first. That is
YearArchive's private function, moved. Add tests for both, and include a
bridge-only year in the `knownYears` tests. No consumer yet.

**E4. HistoryTrends and YearArchive read `knownSince`.**
HistoryTrends' inline `points.find(…)` becomes
`firstKnownMonthOf(points, field)`. YearArchive's private `knownYears` is
deleted. Both suites stay green unedited.

**E5. Add the `historyRange` module.**
A new history feature module. It takes over `HistoryRange`,
`HistoryRangeOption` and `HISTORY_RANGE_OPTIONS` from `historyTypes`, and adds
`pointsInRange(points, range)`, which keeps the most recent months for the range
(all of them for "all history"). Test 1 Year, 3 Years and All history on a
longer span and on a shorter one. This is a move commit for the three
declarations, so the only test edits allowed are import paths.

**E6. Both charts read `pointsInRange`.**
HistoryChart and HistoryTrends replace their `rangeMonths` and `slice` pair. Both
suites stay green unedited.

**E7. RED: Net Cashflow follows the month, not the visible series.**
A HistoryChart case: the only known account in a month is hidden from the
legend, and hovering that month still shows the Net Cashflow row. The existing
all-Unknown case (no row) is unchanged. Commit as `test:`.

**E8. The tooltip reads `isUnknownMonth`.**
Each chart row carries `isUnknown`, computed with `isUnknownMonth` from its
source point. The tooltip leaves the Net Cashflow row out only when
`point.isUnknown === true`, and its visibility-based `allUnknown` goes. E7 goes
green. The direct HistoryChartTooltip tests pass rows without `isUnknown`, which
reads as known, so they stay green unedited.

### Part F — Client: shared chart keys and types

**F1. The trajectory util exports the series keys, and its Y domain counts the
bridge.**
Export `TOTAL_LIQUID_KEY`, `RESTSCHULD_KEY` and a new `RESTSCHULD_BRIDGE_KEY`.
`computeVisibleYDomain` counts `restschuldBridge` whenever `restschuld` is
visible. That is the rule log 31 gives the bridge: it follows the Restschuld
toggle. Add a test that a bridge value above every other value raises the domain
only while the Restschuld is visible.

**F2. Both charts read the shared keys and drop the bridge spread.**
HistoryChart and the Trajectory Horizon delete their own key constants, and
their `{ ...visibility, [RESTSCHULD_BRIDGE_KEY]: … }` spreads and comments.
Both suites stay green unedited.

**F3. `HistoryPoint` moves to `src/types/`.**
`src/types/history.ts` holds `HistoryPoint`, beside `src/types/projection.ts`.
The history feature barrel re-exports it. The `historyTypes` folder, now empty,
is deleted. Every importer is repointed:

- the history feature
- the savings feature
- the Trajectory Horizon
- the projection and savings-goal utils

This is a move commit, so the only test edits allowed are import paths. After
it, `src/utils/` no longer imports `HistoryPoint` from `src/features/`.

### Part G — Copy and close-out (absorbs #245)

**G1. RED: the History subtitle names every source.**
A HistoryPage case asserts that the subtitle reads "Reconstructed balances from
your statements, account balances and mortgage origination." Commit as `test:`.

**G2. The History subtitle.**
Change the `PageHeader` subtitle. G1 goes green.

**G3. Glossary.**

- **Paydown Bridge** names the client `paydownBridge` module.
- **Known Since** adds `firstKnownMonthOf` and `knownYears`.
- **Trackable Account** names the server `accountKinds` lib beside the client's
  Savings Streak.
- **Monthly Spending** says that it sums the magnitude of every
  Variable-Spending row, the same as Month Year-Comparison. "Outflows" describes
  the intent, not the rule (see Out of Scope).

**G4. Dev journal.**
Add an entry for this refactor. Record:

- the midnight-on-the-1st defect and the stale-history defect, both found in
  review rather than live use
- the follow-ups listed under Out of Scope

**G5. Close the epic.**
README's Build Status row for Financial History goes from 📋 Planned to
✅ Complete. CLAUDE.md's Build Status entry is ticked. CLAUDE.md is gitignored,
so that edit stays on disk, and its overview rewrite from #245 is already
there. Close the PRD issue #238.

## Decision Document

- **One current month per tier, local on both.** This extends refactor 32's
  `todayIso` decision to months. The server date lib's `currentMonth` and the
  month-math util's `currentMonth` are the only definitions. No component or util
  takes a month from `toISOString()`.
- **`monthsBetween` lives in the server date lib.** It is a calendar fact. The
  engine's `addMonths` stays private, because the epic did not add it and only
  the engine uses it.
- **`accountKinds` follows `variableSpending`.** It exports `select…` helpers
  that are generic over `{ kind }`, keeps its kind sets private, and documents
  the client copies it must stay in step with. `src/` and `server/src/` cannot
  import each other. The Trackable rule therefore has two copies, one per tier,
  the same arrangement Variable Spending already has.
- **`mortgageStartMonth(account): string | null`** lives in the history span lib,
  which owns "the Mortgage Start month counts toward the span". The history lib
  imports it. An account with no origination yields `null`, never a fallback
  month.
- **`toProjectionTxEntry` returns only what the engine reads.** The projection
  route's extra spreads were dead code. `deriveHistory` reads `transferId` and
  `isAutoSettlement` from the stored transactions it is now handed, which is the
  same superset rule log 31 Q3 set for accounts.
- **One hook per cache key.** `useHistoryPoints` owns `HISTORY` (and its
  fetcher). `useHistory` keeps `IMPORT_HISTORY` and the statement counts, because
  only the History page reads them. Nothing outside the hook pairs a key with a
  fetcher.
- **The Dashboard refreshes history after a mortgage update by calling the hook's
  `refresh`**, the same way it already refreshes accounts, the projection and
  recurring. It does not switch to `useCacheBump`, because that idiom belongs to
  mutation hooks (`useOptimisticCommit`, `useImport`), not to page callbacks.
- **New history feature modules:**
  - `paydownBridge`, named after the glossary term
  - `historyRange`, the range rule
  - `useHistoryPoints`

  Each is filed by the Module Filing Rule, with no per-folder barrel. Only
  `useHistoryPoints` and the `HistoryPoint` type re-export go through the feature
  barrel, because other features read them.

- **`HistoryPoint` is a shared DTO and lives in `src/types/`.** The rule is: a
  type read by two or more features or by `src/utils/` lives in `src/types/`. The
  client mirror keeps its new fields optional (see Out of Scope).
- **The tooltip's Unknown rule is `isUnknownMonth`.** Visibility is a view
  choice, so it never changes whether a month is Unknown.
- **No API, schema or storage change.** The `GET /projection` and
  `GET /settlements/warnings` responses are byte-identical. The
  `GET /projection/history` response is unchanged.

## Testing Decisions

A good test here asserts what a caller or a user can observe: a returned month,
a selected account, a route response, which requests the Dashboard makes, what
a tooltip shows. It never asserts how a module arranges itself internally.

- **Extraction commits do not edit existing tests.** These commits each move
  logic behind an existing, observable suite: A2, A3, A5, A6, B2, C2, D2, D5,
  E2, E4, E6, E8 and F2. Those suites passing _unedited_ is the evidence that
  the move was faithful. The allowed test edits are:
  - import paths, in the move commits E5 and F3
  - deleting the dead `years` assertions, in D3
- **Each behaviour change gets its own failing-test commit first:**
  - C1: local current month
  - D4: history refresh after a mortgage update
  - E7: Net Cashflow and hidden series
  - G1: subtitle copy

  Each is committed as `test:`, which the `commit-msg` hook typechecks against
  shipping code only.

- **The midnight tests depend on the time zone.** C1 fails only east of UTC. A1
  pins the server rule at both ends of the month, so it holds wherever it runs.
  CI runs no tests, so C1 goes red on the user's CET/CEST machine, as refactor
  32's A2 did.
- **New modules under test:**
  - the server date lib's `currentMonth` and `monthsBetween`
  - `accountKinds`
  - `mortgageStartMonth`
  - `toProjectionTxEntry` and `toProjectionRecurringEntry`
  - `useHistoryPoints`
  - `paydownBridgeSpan`
  - `firstKnownMonthOf` and `knownYears`
  - `pointsInRange`
  - the bridge rule in `computeVisibleYDomain`
- **Prior art:**
  - the server date lib's `todayIso` tests, for A1
  - `variableSpending` tests, for A4
  - refactor 32's `toProjectionAccountEntry` test, for B1
  - the `useProjection` and `useAccounts` cache tests, for D1
  - DashboardPage's per-URL fetch routing, for D4
  - `knownSince` and `reviewRows`, for the feature rules modules
  - the HistoryChart "Unknown months" block, for E7
- **Coverage is already good.** Every module the epic touched has co-located
  tests. The epic added over 2,000 lines of tests. This plan adds no
  backfill beyond the new modules.

## Out of Scope

- **Making the client `HistoryPoint`'s `restschuldBridge`, `monthlySavings` and
  `monthlySpending` required.** The server declares them required, but many
  test files across features and utils build `HistoryPoint` fixtures without
  them. Requiring them is a
  fixture rewrite, not drift. This is the same call refactor 32 made for
  `ProjectionAccountEntry.anchorDate`.
- **Making HistoryChart's `range` controlled-only.** Since the range moved up to HistoryPage, the page always
  passes it. The chart's own fallback state is there only for the chart's own
  tests, which click its chips without a page around them. Removing it means
  rewriting those tests around a wrapper.
- **Monthly Spending counting positive Variable-Spending rows** (refunds,
  imported income left checked). It sums `Math.abs` of every row, exactly as Month
  Year-Comparison does, and #244's parity test pins the two together. Counting
  only outflows would change both features at once. G3 corrects the glossary
  wording, and G4 records the question.
- **The shared chart chrome** (one Paydown Bridge `Line` style, the YearTick, the
  tooltips). Log 31 deferred it. F1 and F2 share the keys and the domain rule,
  which are logic. The repeated `Line` props are presentation, and Recharts reads
  its children by element type, so a wrapper component is not a safe move.
- **One look for the two chip groups.** The range chips are HistoryChart's own
  `StyledRangeChip`, and the Saved / Spent toggle is `ChoiceChip`. Unifying them
  is visual work for `ui-meridian`, which log 31 Q11 already assigned to it.
- **`useImport` reading `IMPORT_HISTORY`.** The Import page still fetches
  `/imports` itself and only bumps the key. Moving it onto the cache changes a
  feature this epic did not own.
- **The repeated per-month transaction filter in `deriveHistory`.** It scans
  every transaction for every month. That is fine at the size of the user's real
  data (about ten years by a few thousand rows). It is a performance concern, not
  drift, with no profile to justify it.
- **Still open from refactor 32:**
  - the other UTC "today" call sites (`linkedSince`, the settlement service's
    `asOf`)
  - the `isoDaysFromToday` midnight flake in the accounts route tests
  - requiring `ProjectionAccountEntry.anchorDate`
  - reshaping `applyRecurringToBalances`
  - KpiStrip's private `restschuldOf`
- **Anything the PRD deferred:**
  - interest modelling
  - multiple anchors
  - multiple Mortgages in history
  - per-category trends
  - net worth
  - widening the Browsable Range
  - clickable trend bars
  - the skipped-recurring gap after the anchor (Month Cash Flow)

## Further Notes

- Both user-facing defects were found by reading the code for this plan, not in
  live use:
  - **The midnight-on-the-1st TODAY Marker.** The Trajectory Horizon's UTC month
    predates the epic. It became a defect when #242 began joining a server-local
    projection to a lead-in cut at the UTC month.
  - **The stale Dashboard history.** It breaks user stories 7 and 37.

  Both are in scope because the consistency fix is the same move that fixes
  them: one `currentMonth` per tier, and one hook per cache key.

- **#245 is merged into this plan.** Its copy shipped and the issue is closed.
  What it owed, the Build Status tick, is G5, so the epic closes with this
  refactor.
- **Part order matters in four places:**
  - A1 comes before A2 and A3.
  - D1 comes before D2 and D5.
  - E5 comes before F3, because `historyTypes` must hold only `HistoryPoint`
    before F3 deletes it.
  - Every other part comes before G5.

  Everything else is independent and can be reordered.
