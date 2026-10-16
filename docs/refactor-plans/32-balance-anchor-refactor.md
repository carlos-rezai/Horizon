# 32 — Balance Anchor Refactor

> Follows the Balance Anchor epic (PRD issue #229, phases #230–#236; design
> log 30). Picks up the convention drift the epic's seven phases left
> behind. Solo session: the user asked for this plan to be worked out alone,
> with consistency of naming, conventions, patterns and architecture as the
> goal.

## Problem Statement

Balance Anchor does what it set out to do, and each phase is tested. But it
was built one phase at a time, and each phase solved its own corner locally.
The result reads like seven patches next to the code they should have reused.
Six kinds of drift are now in the code, and each makes the next change
(Financial History builds directly on this) harder than it should be.

**Date helpers were written again instead of shared.** The server already
has a date lib, but it holds only `parseYearMonth`. The epic added three more
date rules elsewhere:

- the projection engine's private `occurrenceDate`, which clamps a
  `dayOfMonth` to the month's length
- settlement's private `lastDayOfMonth`, which does the same arithmetic
- the engine's "`-31` is the end of any month" string trick, where the end
  of a month is needed

So "the last day of a month" is now worked out three ways. "Today" fared
worse. The account route has a private `todayIso` built on
`toISOString()`, which gives the **UTC** date. The account form caps its
DatePicker with its own private `todayIso` in **local** time, a copy of the
one Mortgage Setup's form module already exports. Two copies of the same
rule on the client, and a server that disagrees with both: from midnight to
01:00 or 02:00 in Germany (CET/CEST), the form offers today's date and the
server rejects it with "anchorDate must not be later than today". This is a
bug in a rule the epic introduced, and nothing tests for it.

**The Anchor Date is validated in two ways.** Design log 30 Q11 and the
glossary say an Anchor Date is never later than today. `POST /accounts` and
`PATCH /accounts/:id` enforce that, but only with `z.string().min(1)`, so
any non-empty string passes as a date. `POST /mortgages` carries the same
field, renamed in the same epic, and checks that it is an ISO date but not
that it is no later than today. Mortgage Setup's "As of" DatePicker has no
cap either. One glossary term, two validations, and a gap where they differ.

**The import's anchor rule lives outside the module that owns it.**
`flagRows` is the module that flags rows "against the target account's
history". Design log 30 put the anchor rule in its `detectRecurring`.
Instead, the build added it as a post-pass inside `buildPreview` that maps
over `detectRecurring`'s output. So `detectRecurring` now answers a
different question from the one Recurring Detection asks, and anyone who
calls it directly gets the pre-anchor behaviour back.

**The history surfaces re-derive Known Since in components.** HistoryChart
has a private `firstKnownMonths`. YearArchive has a private `isAllUnknown`
and its own `CashflowCell` rule built on it. Both are domain rules about
Unknown months, sitting inside components, which the layer table forbids.
Worse, YearArchive dropped `aggregateYearSummaries`. Refactor 31 had just
made that the one year aggregator for every year view, and YearArchive now
re-implements it inline ("the final available month's balances, the year's
summed Net Cashflow"). The reason is a type problem, not a design one: the
aggregator only accepts `number`, and history balances are now
`number | null`.

**The three projection routes still copy one mapping.** The projection
route (twice) and the settlement warnings route each build the engine's
account entries with the same eight-line literal. The epic had to rename the
anchor fields in all three. Financial History will touch them again.

**Small pieces filed in the wrong place.**

- The account form's "As of" help text is a feature-local
  `StyledFieldHint`. FormField has no hint, though StatBlock has the same
  `hint` prop with the same styles.
- The Current Balance parity test lives in its own file in the SQLite
  folder, with its own local-time `isoDate` helper. Design log 30 Q5 placed
  it in the storage parity suite, which exists so that every storage
  invariant runs against the shared `runStorageSpec` factory.

## Solution

Six clusters, cheapest and most behaviour-neutral first. Every commit leaves
the suite green. The three behaviour changes are each isolated behind their
own failing test:

- server "today" in local time, so the midnight rejection goes away
- one Anchor Date schema for accounts and mortgages: an ISO date no later
  than today
- Mortgage Setup's "As of" DatePicker capped at today

**Shared date helpers.** The server date lib gains `todayIso` (local time),
`daysInMonth` and `endOfMonth`. The account schema, the engine's occurrence
date, its end-of-month lookup and settlement all read them. The client's two
copies of `todayIso` become one, in the month-math util beside
`currentMonth`.

**One Anchor Date schema.** The account route's `AnchorDate` becomes an ISO
date (the `IsoDate` regex Mortgage Setup already uses) no later than
today, exported once. Both account schemas and the Mortgage Setup schema use
it. Mortgage Setup's DatePicker gets the same cap as the account form's.

**Import.** `detectRecurring` takes the Anchor Date and skips rows on or
before it. `buildPreview` passes the date through and loses its post-pass.

**History.** A new feature module, `knownSince`, owns the two client-side
Known Since rules: each series' first known month, and whether a month is
entirely Unknown. HistoryChart and YearArchive import it. The year
aggregator becomes generic over its balance type, so YearArchive goes back
to using it.

**Projection entries.** One exported mapper from a stored Account to a
`ProjectionAccountEntry`, which all three routes use.

**Filing.** FormField gains a `hint` prop, and the account form uses it.
The Current Balance parity cases move into the storage parity suite.

## Commits

### Part A — Server date helpers

**A1. Add `todayIso` to the server date lib.**
Export `todayIso()` from the date lib: today as `YYYY-MM-DD` in **local**
time, the same rule as the client's copy. Test it with a frozen clock at
00:30 and at 23:30 local time on a day, and assert that both give that
day's date. No consumer yet. No behaviour change.

**A2. RED: the account routes accept today's local date after midnight.**
In the accounts route tests, freeze the clock at 00:30 local time
(`vi.useFakeTimers({ toFake: ["Date"] })`, the projection route tests'
pattern). Assert that `POST /accounts` and `PATCH /accounts/:id` both
answer 2xx for an `anchorDate` equal to that local date, and that the
following day still answers `400`. On a machine east of UTC (the user's,
CET/CEST), the 00:30 case fails against the UTC rule. Commit as `test:`.

**A3. The account schema reads the shared `todayIso`.**
Delete the route's private `todayIso` and its comment about the
linkedSince idiom. `AnchorDate` refines against the date lib's `todayIso`.
A2 goes green, and the rest of the accounts route suite stays green
unedited.

**A4. Add `daysInMonth` and `endOfMonth` to the server date lib.**
`daysInMonth("YYYY-MM")` returns the number of days, and
`endOfMonth("YYYY-MM")` returns that month's last ISO date. Test both with
February in a leap year and a common year, a 30-day month and a 31-day
month. No consumer yet.

**A5. The engine reads the date helpers.**
`occurrenceDate` keeps its name and its job (an occurrence's date is the
month's `dayOfMonth`, clamped), but clamps with `daysInMonth`. The
`"-31"` end-of-month string goes, and the anchored `endOf` uses
`endOfMonth`. For an ISO comparison against real transaction dates the two
are identical, so the projection tests stay green unedited.

**A6. Settlement reads `endOfMonth`.**
Delete settlement's private `lastDayOfMonth`. The closing balance calls
`balanceAt` at `endOfMonth` of the settled month. The settlement tests
stay green unedited. Settlement's older private date helpers
(`firstDayOfNextMonth`, `formatDate`) predate this epic and stay where they
are.

### Part B — One Anchor Date schema

**B1. RED: one Anchor Date rule for accounts and mortgages.**
New cases:

- `POST /accounts` answers `400` for an `anchorDate` that is not an ISO
  date (for example `16.10.2026`).
- `POST /mortgages` answers `400` for an `anchorDate` later than today,
  and stores nothing: no account, no origination, no repayment recurring.
  This uses the existing "stores nothing" assertions in the mortgage route
  tests.
- `POST /mortgages` still accepts an `anchorDate` of today.

Commit as `test:`.

**B2. Mortgage Setup uses the account's `AnchorDate`.**
`AnchorDate` becomes `IsoDate` refined to no later than today. The account
route exports it, and the Mortgage Setup schema uses it for `anchorDate`.
Mortgage Setup keeps its `IsoDate` for `startDate` and the repayment dates.
B1 goes green, and every other route test stays green unedited. Each test
already sends ISO dates.

### Part C — Import

**C1. RED: `detectRecurring` honours the Anchor Date.**
Add flagRows cases for a row that matches a RecurringTransaction:

- dated before the anchor: not flagged
- dated on the anchor: not flagged
- dated after the anchor: flagged
- no anchor date given: flagged as today

Commit as `test:`.

**C2. `detectRecurring` takes the Anchor Date.**
It gains an optional `anchorDate` parameter. A row dated on or before it is
never flagged. Its doc comment gains the reason (the Anchor Balance already
contains the row, and the Anchor Gate means nothing replays it), which
moves here from `buildPreview`'s input doc. C1 goes green.

**C3. `buildPreview` passes the anchor through.**
The post-pass `.map` over the recurring flags goes. `buildPreview` calls
`detectRecurring(mappedRows, input.recurring, input.anchorDate)`. The
`anchorDate` input keeps its field and its "absent when the target account
is unknown" note. The buildPreview and import route tests stay green
unedited.

### Part D — Projection account entries

**D1. Add the account-entry mapper.**
The projection lib exports `toProjectionAccountEntry(account)`, beside
`ProjectionAccountEntry`. It returns the id, kind and both anchor fields,
plus `linkedAccountId`, `settlementDay` and `linkedSince` only when they
are set: the same conditional spreads the routes use. Test that it omits
null settlement fields and carries set ones.

**D2. The three routes use the mapper.**
`GET /projection`, `GET /projection/history` and
`GET /settlements/warnings` replace their inline literals with
`accounts.map(toProjectionAccountEntry)`. The route tests stay green
unedited.

### Part E — Client shared helpers and the form hint

**E1. Move `todayIso` into the month-math util.**
`todayIso` moves from the Mortgage Setup form module to the month-math
util, beside `currentMonth`, and goes into the utils barrel. Its existing
`describe("todayIso")` block moves with it into the month-math tests. The
form module stops exporting it,
and Mortgage Setup imports it from the util. This is a move commit, so the
only test edits allowed are import paths.

**E2. The account form reads the shared `todayIso`.**
Delete the account form's private copy. The DatePicker cap is unchanged,
and the account form tests stay green unedited.

**E3. RED: Mortgage Setup's "As of" stops at today.**
A Mortgage Setup modal test asserts that the "As of" DatePicker cannot
pick a day after today, the same assertion the account form's #231 test
makes. Commit as `test:`.

**E4. Cap Mortgage Setup's "As of".**
Pass `maxDate={todayIso()}` to Mortgage Setup's "As of" DatePicker. E3 goes
green. Client and server now agree on the Anchor Date in both places it is
entered.

**E5. FormField gains a hint.**
FormField takes an optional `hint?: string`. It renders below the control
and above the error, in a `StyledHint` co-located in FormField's styles
with StatBlock's hint styles. Add tests for the hint being present and
being absent. No consumer yet.

**E6. The account form uses the FormField hint.**
The "As of" field passes `hint={ANCHOR_HELP_TEXT}`. `StyledFieldHint` is
deleted from the account form's styles. The account form tests, which find
the help text by its text, stay green unedited.

### Part F — History: Known Since on the client

**F1. Add the `knownSince` feature module.**
A new history feature module, filed by the Module Filing Rule (its own
folder, a co-located test, no barrel). It exports:

- `firstKnownMonths(points)`: the first month each series (Total Liquid,
  Restschuld and each account id) carries a non-null value, keyed by
  series key
- `isUnknownMonth(point)`: true when Total Liquid, Restschuld and every
  account are all `null`

Test: an all-known series, a series that starts Unknown, a series that is
never known (absent from the result), and a partially known month (not
Unknown). The prior art is `reviewRows`, the import feature's pure rules
module. The module is named after the glossary's **Known Since**, the same
name the server lib uses. No consumer yet.

**F2. HistoryChart reads `firstKnownMonths`.**
Delete the private copy. The HistoryChart tests stay green unedited.

**F3. YearArchive reads `isUnknownMonth`.**
Delete the private `isAllUnknown`. `CashflowCell` keeps its job and reads
the module. The YearArchive tests stay green unedited.

**F4. The year aggregator is generic over its balance type.**
`YearAggPoint` and `YearSummary` take a balance type parameter, defaulting
to `number`. `totalLiquid`, `restschuld` and the per-account values use it.
Net Cashflow stays `number`. The projection callers (Plan Summary and the
Projection accordion) compile unchanged, because they use the default. Add
a test showing that a `null` final-month balance is carried as `null`, not
coerced to 0. The existing aggregator tests stay green unedited.

**F5. YearArchive goes back to the shared aggregator.**
The collapsed year row reads `aggregateYearSummaries<number | null>` for
end-of-year Total Liquid and Restschuld and the summed Net Cashflow,
instead of its inline `months.at(-1)` and `reduce`. Whether the year's Net
Cashflow cell is shown stays YearArchive's call:
`months.some((p) => !isUnknownMonth(p))`. The YearArchive tests stay green
unedited, and that is the evidence the move was faithful.

### Part G — The parity suite

**G1. Current Balance parity joins the storage parity suite.**
Move the cases from the SQLite folder's Current Balance test into
`runStorageSpec` as a "Current Balance" describe block:

- the live-use fixture (anchored today, 12 months imported)
- an anchor before every transaction
- a transaction on the anchor date
- Total Liquid

Use the spec's `makeStorage` lifecycle, and use the server date lib's
`todayIso` in place of the file's local `isoDate`. Delete the old file. The
test count does not change, and every case runs through the shared factory
that design log 30 Q5 named.

### Part H — Docs

**H1. Glossary.**
**Anchor Date** says "never later than today (the local calendar date)".
The **Known Since** entry names the client `knownSince` module beside the
server lib.

**H2. Dev journal.**
Add an entry for this refactor. Record the midnight UTC/local defect
(found in review, not in live use) and the follow-ups listed under Out of
Scope.

## Decision Document

- **"Today" is the local calendar date on both tiers.** Horizon is a
  single-user desktop app, and the Express server runs as an Electron
  utility process on the same machine as the UI. The user's "today" is the
  wall-clock date of that machine, not UTC. The server date lib's
  `todayIso` is the single server definition, and the month-math util's
  `todayIso` is the single client definition. They follow the same rule.
- **End of month comes from a calendar helper, not a string trick.**
  `endOfMonth` replaces `"-31"`. The two give the same answer for every
  real ISO date comparison, so this is a readability move. Financial
  History will ask "balance at end of month" constantly, and it should read
  as that.
- **`occurrenceDate` stays in the engine.** It is the Anchor Gate's notion
  of when a recurring occurrence happens, so it is a projection rule, not a
  calendar fact. Only its clamping arithmetic moves to the date lib.
- **One `AnchorDate` schema, owned by the account route.** It is
  `IsoDate`-shaped and refined to no later than today. Mortgage Setup
  imports it, because a Mortgage's Restschuld "as of" is an Anchor Date
  (design log 30 Q15). The account schemas tighten from `min(1)` to the ISO
  regex. This is the CLAUDE.md "All dates are ISO strings" rule, enforced
  at the boundary. The client has only ever sent ISO.
- **`detectRecurring(rows, recurring, anchorDate?)`.** The anchor date is
  optional for the same reason it is optional on `BuildPreviewInput`: an
  unknown target account has no anchor, and every row is then checked as
  before.
- **`toProjectionAccountEntry(account: Account): ProjectionAccountEntry`**
  lives in the projection lib. It is the boundary between the storage DTO
  and the engine input, and the engine owns its input type.
- **`knownSince` is a feature module, not a `src/utils/` function.** It
  knows `HistoryPoint`, a history-feature type, and the layer table puts
  domain rules in `features/`. It is not exported from the history feature
  barrel, because nothing outside the feature needs it.
- **The year aggregator's type parameter defaults to `number`.** Projection
  callers never see `null`, and they keep the type that says so.
- **FormField's `hint` mirrors StatBlock's `hint`.** The same prop name and
  the same styles give the same visual language for "the small dim line
  under a value".
- **No API or schema changes.** No migration, no route path change and no
  DTO change. The only contract changes are stricter validation:
  `POST /mortgages` rejects a future `anchorDate`, and the account routes
  reject a non-ISO `anchorDate`.

## Testing Decisions

A good test here asserts what a caller or a user can observe: which rows
are flagged, which status code a request gets and what the database holds
afterwards, what a cell shows. It never asserts how a module arranges
itself internally.

- **Extraction commits do not edit existing tests.** A3 (except the new A2
  cases), A5, A6, B2, C3, D2, E2, E6, F2, F3, F4 and F5 each move logic
  behind an existing, observable test suite. Those suites passing
  _unedited_ is the evidence that the move was faithful. If one needs an
  edit, the commit changed behaviour and is wrong. The only allowed test
  edits are import paths in move commits (E1, G1).
- **Each behaviour change gets its own failing-test commit first:** A2
  (local today), B1 (one Anchor Date schema), C1 (`detectRecurring` and
  the anchor) and E3 (Mortgage Setup cap). These are committed as `test:`
  commits, which the `commit-msg` hook typechecks against shipping code
  only. C1 is a behaviour change for `detectRecurring` only. The import as
  a whole behaves the same, as C3's unedited suite shows.
- **The midnight test depends on the time zone.** A2 fails only when the
  machine's zone is east of UTC (the 00:30 case) or west of it (A1's
  23:30 case). A1 tests both ends of the day so the rule is pinned wherever
  it runs. CI runs no tests, so the user's CET/CEST machine is where A2
  goes red.
- **New modules under test:**
  - the server date lib's `todayIso`, `daysInMonth` and `endOfMonth`
  - `toProjectionAccountEntry`
  - the client `todayIso`: its existing tests move with it to `src/utils/`
  - the `knownSince` module's `firstKnownMonths` and `isUnknownMonth`
  - FormField's `hint`
  - the generic year aggregator's `null` carrying
- **Prior art:**
  - the projection route tests' frozen clock for A1 and A2
  - the mortgage route tests' "stores nothing" block for B1
  - the existing flagRows `detectRecurring` table for C1
  - `reviewRows` for a feature-owned pure rules module
  - StatBlock's hint tests for FormField's
  - `runStorageSpec`'s existing describe blocks for G1
- **Coverage is already good.** Every module the epic touched has
  co-located tests, so this plan adds no backfill beyond the new modules.

## Out of Scope

- **Making `ProjectionAccountEntry.anchorDate` required.** Every production
  caller passes it, because `Account.anchorDate` is `NOT NULL`. But about
  fifty engine test fixtures leave it out to mean "no replay, known from
  the start", and no single Anchor Date reproduces that. An early date
  replays recurring from that month, and a late one derives earlier
  transactions backwards. Requiring it means rewriting those fixtures'
  intent, which is a test-suite redesign and not drift.
- **Restructuring `applyRecurringToBalances`.** The Anchor Gate made it
  longer, and the Mortgage leg's magnitude rule now appears twice. It is
  covered case by case by #232's tests, and reshaping it is an engine
  refactor in its own right.
- **The other UTC "today" call sites:** `linkedSince` in the accounts
  repo, and the settlement service's `asOf`. They have the same
  midnight skew. Moving them to the shared `todayIso` would shift a link
  date or a settlement by a day around midnight, so each is a behaviour
  change for a feature this epic did not own. These are the first follow-up
  candidates, and H2 records them.
- **Settlement's older private date helpers** (`firstDayOfNextMonth`,
  `formatDate`). They predate the epic.
- **The rename guard test** stays in the storage folder beside the other
  isolation guards (the SQLite driver's Electron and environment isolation
  tests). It is cheap, and it is the only thing stopping an
  `opening*` identifier from creeping back.
- **The mirrored server and client `HistoryPoint` types.** Every DTO
  crosses the tiers this way. It is a repo-wide pattern, not epic drift.
- **KpiStrip's private `restschuldOf`.** It is still open from refactor
  31's journal entry, and it is outside this epic.
- **Anything the PRD deferred:** Restschuld back-derivation to the
  Mortgage Start Date, multiple anchors, a reconciliation hint, a
  today-cutoff for future-dated transactions, and widening the Browsable
  Range.

## Further Notes

- The midnight defect was found by reading the code for this plan, not in
  live use. It is in scope because it sits in a rule the epic introduced
  (`anchorDate ≤ today`), and its fix is the same move as the consistency
  fix: one `todayIso` per tier.
- Part order matters in two places. Part A comes before G1, which uses the
  server `todayIso`. E1 comes before E3/E4, which use the client one.
  Everything else is independent and can be reordered.
