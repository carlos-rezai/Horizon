# 34 — Month Cash Flow Refactor

> Follows the Month Cash Flow epic (PRD issue #247, phases #248–#255; design
> log 32). Picks up the convention drift the epic's phases left behind and
> closes the PRD issue, which is still open. Solo session: the user asked for
> this plan to be worked out alone, with consistency of naming, conventions,
> patterns and architecture as the goal.

## Problem Statement

Month Cash Flow does what it set out to do, and every phase is tested. Its
central promise was **one rule**: "the Fixed section, the Month-End Balance,
the Current Balance, Outlook and History can never disagree" (log 32,
Problem). Design log 32 rejected copies of the firing rule, the Anchor Gate
and the Mortgage cap by name ("two copies of the rule would drift, the very
fault this epic exposes"). Built phase by phase, the epic still ended up with
three copies of the leg rule, and one of them already disagrees with the
others.

**Outlook disagrees with the Dashboard and History about a transfer into an
older account.** The Replay Loop still skips a rule outright in any month
before its _source_ account's Anchor month (`replayMonth < sourceOpened`). The
Forward Projection and `recurringHistory` do not skip it. Each leg already
goes through its own account's Anchor Gate, so the skip is a leftover. It
makes firing depend on where a run starts, which log 32 Q4 says no longer
happens. Example (reproduced against the shipped engine while writing this
plan): Tagesgeld anchored 15 Jan, Girokonto anchored 15 Jun, a monthly
€100 transfer Girokonto → Tagesgeld on the 1st, today 17 Oct.

| Surface                                        | Tagesgeld, October |
| ---------------------------------------------- | ------------------ |
| Current Balance (`balanceService`, Dashboard)  | €900               |
| History, October (`/projection/history`)       | €900               |
| Outlook, October (`/projection`, from current) | €500               |

The four months February–May fall in the Replay Loop only for the `/projection`
run, so only that run drops them. Nothing tests the case.

**The leg rule is written three times on the server.** The leg rule says which
accounts one firing moves, with what sign, through which Anchor Gate, and with
what Mortgage magnitude and cap. It lives in:

- the engine's `applyRecurringToBalances`;
- `recurringHistory`, which re-derives sign, gate and cap with its own
  `remaining` map;
- the month-cash-flow lib's `blockedAnchorLegs`, which re-derives sign, gate
  and the Mortgage magnitude to list the In Balance Anchor rows.

Each also works out a rule's source Anchor month for itself, with three
different fallbacks (`?? fromDate`, `?? startMonth`, `|| runStart`).

**`addMonths` now exists twice on the server.** Refactor 33 left the engine's
private `addMonths` alone "because only the engine uses it". `recurringHistory`
then added a second copy, written differently. The date lib exists to hold
exactly this kind of helper.

**Two functions called `findAllWithBalance` return two different balances.**
The storage repo's `findAllWithBalance` / `findByIdWithBalance` return the
**Recorded Balance**. The `balanceService` functions with the same names return
the **Current Balance**. The glossary renamed the DTO field so that "`balance`
never means the Recorded Balance", but the method names still say it. Inside
the SQLite repo the row type, the DTO mapper and the statements are still
named `…WithBalance…`.

**`balanceService` is the one engine reader that reads every rule.** Every other
reader of recurring rules (both projection routes, the report, the settlement
service, the settlements route) calls `findActive()`. `balanceService` calls
`findAll()`. The two return the same rows today, so nothing is wrong yet, but
the Current Balance should not be the one place that would count a paused rule.

**The settlement lib keeps its own calendar.** `computeMissingSettlements`, which
the epic changed to add Recurring History, carries private `parseYearMonth`,
`nextYearMonth`, `compareYearMonth`, `firstDayOfNextMonth` and `formatDate`
helpers beside the date lib that owns them. Its `"Auto-settlement"` /
`"Transfer"` literals are re-declared in the month-cash-flow lib as
`SETTLEMENT_DESCRIPTION` / `SETTLEMENT_CATEGORY`. The settlement service still
takes `asOf` from `toISOString()` (UTC), the last server "today" refactors 32
and 33 left open. Every other server "today" is `todayIso`.

**One reports route, two validation contracts.** `GET /reports/month-cash-flow`
validates with a zod `MonthQuerySchema` and answers `400 { issues }`, like every
input-validating route. `GET /reports/year-comparison`, in the same file,
hand-rolls a regex that accepts month `13` and answers `400 { error }`. Log 32
Q8 called `{ issues }` "the reports route's existing shape". That was true of
the other routes, not of this file.

**`"source" | "destination"` is spelled out eight times.** The client already
names it `TransferSide` in the recurring util. On the server it is written inline
in `AppliedFlow`, both `FixedFlow` variants and three local helpers. On the
client, the `FixedFlow` mirror writes it inline again, and it flattens the
server's discriminated union (`RecurringFixedFlow | SettlementFixedFlow`) into
one shape with everything optional.

**The Fixed Flows card holds domain rules.** CLAUDE.md keeps business logic out
of components, and refactors 32 and 33 moved the history rules out of
HistoryChart and YearArchive. MonthCashFlow brought the pattern back:

- the "Net fixed" sum, which leaves out In Balance Anchor rows;
- `linkedAccountId`, which decides which account page a row links to (the
  rule's source, or the CreditCard);
- `beforeAnchorDate`, the "before the Anchor month, statements are the
  history" rule.

**The Month-End Balance map is built in the page.** MonthOverview builds the
per-account `balances` record inline and threads two hooks' loading and error
state into the card's `SectionState` by hand.

**`monthEndBalance` re-derives Known Since.** Its private `firstKnownMonth` is
`firstKnownMonths(points)[accountId]` from the history feature's `knownSince`
module, written again because `src/utils/` cannot import a feature. Only the
Month page reads it, so by refactor 33's rule (`paydownBridge`, `historyRange`)
it is a feature module, not a util. The glossary also names it at
`src/utils/monthEnd/`, a path that was never built.

**The day block is copied.** SpendingList and MonthCashFlow each slice the day
and month out of an ISO date and render the same `StyledDay` /
`StyledDayNum` / `StyledDayMonth` block. MonthCashFlow reaches into
`SpendingList.styles` for it, and its skeleton into `SpendingListSkeleton.styles`.

## Solution

Five parts. The neutral moves come first, and every commit leaves the suite
green. There are three behaviour changes, and each sits behind its own failing
test:

- a transfer's destination legs no longer depend on where the run starts, so
  Outlook agrees with the Dashboard and History;
- the settlement service reads the local today;
- `GET /reports/year-comparison` answers a malformed month with `400 { issues }`
  and rejects month 13.

**Server.**

- The date lib gains `addMonths`.
- `recurringOccurrence` becomes the one home of the leg rule. It gains
  `TransferSide`, `sourceAnchorMonth` and `occurrenceLegs`, and the engine,
  `recurringHistory` and the month-cash-flow lib all read them.
- The storage repo methods are renamed to say Recorded Balance.
  `balanceService` reads `findActive`.
- The settlement lib reads the date lib and exports its settlement copy. The
  settlement service reads `todayIso`.
- Year comparison validates with `MonthQuerySchema`.

**Client.**

- `TransferSide` moves to `src/types/`, and the `FixedFlow` mirror becomes the
  server's discriminated union.
- A new `fixedFlows` module in the months feature takes the card's rules.
- `monthEndBalance` moves into the months feature and reads `knownSince`.
- A `useMonthEndBalances` hook gives the page one balances resource.
- A new `DayBlock` component replaces the copied day block.

## Commits

### Part A — Server: one leg rule

**A1. RED: a transfer's destination legs do not depend on where the run starts.**
A new projection test using the fixture in the Problem Statement:

- the snapshot for the current month in a run from the current month;
- the same month's snapshot in a run from the History Span's start;
- `recurringHistory` for the destination account through today.

Assert that all three give the destination the same `actual`. Add a second case
for a Repayment Transfer into a Mortgage anchored before its paying account.
The run from the current month fails. Commit as `test:`.

**A2. The Replay Loop stops skipping before the source's Anchor month.**
Delete `if (replayMonth < sourceOpened) continue;`. Each leg already passes
through its own account's Anchor Gate. A1 goes green. The three "account opened
N months ago" replay tests stay green unedited, because a single-account rule's
legs are all gated by that account.

**A3. Add `addMonths` to the server date lib.**
`addMonths(yyyyMM, n)` for `n` negative, zero and positive, and across a year
boundary. Prior art is refactor 33's `monthsBetween` tests. No consumer yet.

**A4. The engine and `recurringHistory` read `addMonths`.**
Delete both private copies. The projection and recurring-history suites stay
green unedited.

**A5. Name `TransferSide` on the server.**
`recurringOccurrence` exports `TransferSide = "source" | "destination"`, with
the client's doc comment. `AppliedFlow`, both `FixedFlow` variants and the local
`move` / `add` / `settlementLeg` helpers use it. Types only; no test edits.

**A6. Add `sourceAnchorMonth` and `occurrenceLegs` to `recurringOccurrence`.**

- `sourceAnchorMonth(rule, accountsById, runStart)` gives the rule's source
  account's Anchor month, or `runStart` when that account has no Anchor Date.
  This is the one fallback.
- `occurrenceLegs(rule, date, accountsById, restschuldOf)` gives the legs one
  firing produces. Each leg carries `accountId`, the signed `amount` for that
  account, `counterpartId` and `side` for a transfer, and `passesGate`.
  - A Mortgage destination leg reports the paydown as a positive inflow, like
    `AppliedFlow` does today.
  - While the Mortgage's gate is open, the Mortgage leg and its source leg are
    both capped at `restschuldOf(mortgageId)`. A cap of zero yields no legs.
  - A plain rule on a Mortgage yields no legs.
  - A leg the gate blocks is still returned, with `passesGate: false` and the
    uncapped magnitude, so the In Balance Anchor rows can list it.

Test each branch: plain, plain on a Mortgage, transfer, transfer with each side
gated, Mortgage repayment uncapped / capped / capped to zero, a repayment stored
with a negative sign, and the clamp of `dayOfMonth` through `occurrenceDate`.
Prior art is the existing `recurringOccurrence` tests. No consumer yet.

**A7. The engine reads `occurrenceLegs`.**
`applyRecurringToBalances` keeps its name and its job, which is to move the
running balances and report the `AppliedFlow`s. It now applies the legs that
pass the gate instead of deriving them. The Replay Loop and the Forward
Projection use `sourceAnchorMonth`. The projection suite stays green unedited.

**A8. `recurringHistory` reads `occurrenceLegs` and `sourceAnchorMonth`.**
Its own sign, gate and cap branches and its `remaining`-map arithmetic are
replaced by summing the passing legs for the account in date order. It keeps a
Restschuld map only to answer `restschuldOf`. The recurring-history suite and
A1 stay green unedited.

**A9. The month-cash-flow lib reads `occurrenceLegs` and `sourceAnchorMonth`.**
`blockedAnchorLegs` lists the legs with `passesGate: false` whose account is
anchored in the month. It no longer works out magnitudes and signs itself. The
month-cash-flow and reports suites stay green unedited.

### Part B — Server: balances, settlement and the reports route

**B1. The storage repo says Recorded Balance.**
`findAllWithBalance` / `findByIdWithBalance` on the accounts repo become
`findAllWithRecordedBalance` / `findByIdWithRecordedBalance`. Inside the SQLite
repo, `AccountWithBalanceRow`, `toAccountWithBalanceDTO` and the two
`select…WithBalanceStmt` statements are renamed to match. `mortgages.create`
and `balanceService` follow. This is a rename commit, so the only test edits
allowed are the call names in `storage.parity.ts` and the SQLite repo tests.
The `balanceService` exports keep their names, because they return the
Current Balance.

**B2. `balanceService` reads `findActive`.**
The same rows as today, so the balance-service and accounts route suites stay
green unedited.

**B3. The settlement lib reads the date lib.**
`computeMissingSettlements` walks `YYYY-MM` months with `addMonths`, reads
`parseYearMonth` from the date lib, and builds the settlement date with
`occurrenceDate`. Its five private date helpers go. It exports
`SETTLEMENT_DESCRIPTION` and `SETTLEMENT_CATEGORY`, which the month-cash-flow
lib imports instead of declaring. The settlement and month-cash-flow suites
stay green unedited. `settlementDay` is capped at 28 by the schema, so the
clamp does not change any date.

**B4. RED: the settlement service reads the local today.**
Freeze the clock at 00:30 local time on the 1st of a month
(`vi.useFakeTimers({ toFake: ["Date"] })`, refactor 32's pattern). Assert that
a card whose month just closed gets its settlement generated. Commit as
`test:`.

**B5. `generateSettlements` reads `todayIso`.**
B4 goes green.

**B6. RED: year comparison validates like every other route.**
Reports route cases: `?month=2026-13` answers 400, and a malformed month answers
`400 { issues }`. The existing `{ error }` assertion is the one test edit this
commit is allowed. Commit as `test:`.

**B7. Year comparison reads `MonthQuerySchema`.**
The hand-rolled regex goes. B6 goes green. The client's `useYearComparison`
reads failures through `fetchJson`, which reports only the status, so no client
change follows.

### Part C — Client: types, rules and hooks

**C1. `TransferSide` moves to `src/types/recurring.ts`.**
The recurring util imports it from there, and the `utils/index` re-export
follows it. This is a move commit, so the only test edits allowed are import
paths.

**C2. The `FixedFlow` mirror matches the server.**
`src/types/monthCashFlow.ts` declares `RecurringFixedFlow`,
`SettlementFixedFlow` and `FixedFlow` as their union, with `TransferSide`, the
same shape and doc comments as the server lib. Types only. If a test fixture
stops typechecking, it described a payload the server cannot send. The plan
allows those fixture edits and nothing else, and the dev journal records them.

**C3. Add the `fixedFlows` module.**
A new months feature module, named after the glossary's **Fixed Flow**, in its
own folder by the Module Filing Rule. It exports:

- `netFixed(flows)`: the sum of the flows that are not In Balance Anchor;
- `rowAccountId(group, flow)`: the account page a row links to (the card's
  `linkedAccountId`, moved);
- `statementHistoryBefore(account, month)`: the Anchor Date when the month lies
  before the account's Anchor month, else `null` (the card's
  `beforeAnchorDate`, moved).

Test each, including a settlement row on the funding account and on the card,
and the Anchor month itself, which is not "before". Prior art is `paydownBridge`
and `reviewRows`. No consumer yet.

**C4. MonthCashFlow reads `fixedFlows`.**
Delete the two private functions and the inline net. The MonthCashFlow suite
stays green unedited.

**C5. `monthEndBalance` moves into the months feature.**
`src/features/months/monthEndBalance/` takes the module and its test, and
`utils/index` drops the export. It reads the history feature's
`firstKnownMonths`, now exported from the history barrel, and its private
`firstKnownMonth` goes. This is a move commit, so the only test edits allowed
are import paths. After it, Known Since on the client has one home.

**C6. Add `useMonthEndBalances`.**
A months feature hook in its own folder: `useMonthEndBalances(month, accounts)`
composes `useProjection` and `useHistoryPoints` and returns
`{ balances, isLoading, error }`, `balances` keyed by account id. Test that it
reads both cached resources, reports either one's loading and error, and
answers Projected, Actual and Unknown. Prior art is `useHistory` composing
`useHistoryPoints`. No consumer yet.

**C7. MonthOverview reads `useMonthEndBalances`.**
The inline `balances` record and the page's direct `useProjection` /
`useHistoryPoints` calls go. The card's `SectionState` gates on the accounts,
the report and the hook. The MonthOverview suite stays green unedited.

**C8. Add the `DayBlock` component.**
`src/components/DayBlock/` with `DayBlock.tsx`, `.styles.ts` and `.test.tsx`.
It takes an ISO `date` and renders the day number over the short month. Its
styles also carry the skeleton block. It knows nothing about transactions or
flows. Test the day without a leading zero and the month label. Prior art is
`StatBlock` and its skeleton consumers. No consumer yet.

**C9. SpendingList, MonthCashFlow and their skeletons read `DayBlock`.**
The day-block styles leave `SpendingList.styles` and `SpendingListSkeleton.styles`,
and the two inline date slices go. The SpendingList, MonthCashFlow and
MonthOverview suites stay green unedited.

### Part D — Docs and close-out

**D1. Glossary.**

- **Month-End Balance** names `src/features/months/monthEndBalance/`.
- **Recorded Balance** names the `findAllWithRecordedBalance` /
  `findByIdWithRecordedBalance` repo methods.
- **Fixed Flow** names the client `fixedFlows` module.
- The Month Cash Flow Relationships say that one leg rule
  (`occurrenceLegs` in `recurringOccurrence`) serves the Replay Loop, the
  Forward Projection, **Recurring History** and the In Balance Anchor rows.

**D2. Dev journal.**
Add an entry for this refactor. Record:

- the Replay Loop defect, found while reading the code for this plan rather
  than in live use, with the Tagesgeld example;
- any fixture edits C2 needed;
- the follow-ups listed under Out of Scope.

**D3. Close the epic.**
README and CLAUDE.md already show Month Cash Flow as complete. Close the PRD
issue #247.

## Decision Document

- **The leg rule has one home: `recurringOccurrence`.** Firing
  (`firesInMonth`), date (`occurrenceDate`), gate (`passesAnchorGate`), legs
  and Mortgage cap (`occurrenceLegs`), and the source Anchor month
  (`sourceAnchorMonth`) all live there. Callers keep only their own state: the
  engine its running balances, `recurringHistory` its Restschuld map, the
  month-cash-flow lib nothing. The cap reads the remaining Restschuld through a
  `restschuldOf` callback, so the module stays pure and keeps no balances.
- **`occurrenceLegs` returns blocked legs too**, marked `passesGate: false`.
  Applying them is the caller's choice: the engine and `recurringHistory` skip
  them, and the In Balance Anchor rows list them. This is how a third copy of
  the sign rule is avoided.
- **The Anchor Gate is the only pre-anchor rule.** The Replay Loop's
  source-opened skip is removed, not moved. A leg moves its own account after
  that account's Anchor Date, whatever the other leg's account is doing. Log 32
  Q4 already decided this ("Firing no longer depends on where a run starts").
  A2 makes the code match.
- **`addMonths` lives in the server date lib**, beside `monthsBetween`. Refactor
  33's reason for keeping it private no longer holds.
- **Storage names say what they compute.** Repo methods that return the Recorded
  Balance say `WithRecordedBalance`. The service keeps `WithBalance`, because
  `balance` is the Current Balance in the API. This revises log 32 Q3's "keep
  their names", for the reason the glossary already gives for the field rename.
- **Every engine reader reads `findActive()`.** Whether `findActive` and
  `findAll` should differ is out of scope.
- **The settlement lib's calendar is the date lib.** Its copy (`"Auto-settlement"`,
  `"Transfer"`) is exported from the settlement lib, which owns booking it.
- **One validation contract per route file.** A malformed query answers
  `400 { issues }` from a zod schema, as every input-validating route does.
  `MonthQuerySchema` serves both reports.
- **Shared DTO types live in `src/types/`.** `TransferSide` moves there because
  a type and a util both read it, which is refactor 33's rule. The client
  `FixedFlow` mirrors the server's union rather than flattening it.
- **Domain rules leave components.** `fixedFlows` is a months feature module
  named after the glossary term, like `paydownBridge`. `monthEndBalance` has
  one reader, so it is a months feature module rather than a util. This also
  lets it read `knownSince`, which a util cannot.
- **One hook per page resource.** `useMonthEndBalances` gives the page one
  `{ balances, isLoading, error }` instead of two hooks wired by hand. It owns
  no cache key; it composes the hooks that do.
- **`DayBlock` is a component, not a feature part.** It formats a date and knows
  no domain, so it belongs in `src/components/`.
- **No schema, storage or migration change.** The `/projection`,
  `/projection/history`, `/accounts` and `/reports/month-cash-flow` responses
  change only in the A1 case. Before this refactor `/projection` disagreed there
  with the other three.

## Testing Decisions

A good test here asserts what a caller or a user can observe: a returned leg, a
balance, a route response, a rendered row or caption. It never asserts how a
module arranges itself internally.

- **Extraction commits do not edit existing tests.** These commits each move
  logic behind an existing, observable suite: A4, A7, A8, A9, B2, B3, C4, C7
  and C9. Those suites passing _unedited_ is the evidence that the move was
  faithful. The allowed test edits are:
  - call names, in the rename commit B1;
  - import paths, in the move commits C1 and C5;
  - fixtures that described an impossible payload, in C2 (recorded in D2);
  - the year-comparison `{ error }` assertion, in B6.
- **Each behaviour change gets its own failing-test commit first:**
  - A1: run start and destination legs;
  - B4: the settlement service's local today;
  - B6: the year-comparison contract.

  Each is committed as `test:`, which the `commit-msg` hook typechecks against
  shipping code only.

- **A1 is a parity test across three surfaces.** It pins the engine run from the
  current month, the run from the span start and `recurringHistory` to one
  answer. That is the contract log 32 promised and nothing enforced. Prior art
  is #244's Monthly Spending / Year Comparison parity test.
- **B4 depends on the time zone**, like refactor 32's A2. It fails only east of
  UTC. CI runs no tests, so it goes red on the user's CET/CEST machine.
- **New modules under test:**
  - `addMonths`
  - `sourceAnchorMonth` and `occurrenceLegs`
  - `fixedFlows`
  - `useMonthEndBalances`
  - `DayBlock`
- **Prior art:**
  - `recurringOccurrence` and `recurringHistory` tests, for A6;
  - refactor 33's date lib tests, for A3;
  - refactor 32's frozen-clock tests, for B4;
  - `paydownBridge` and `reviewRows`, for C3;
  - `useHistory` and `useHistoryPoints`, for C6;
  - `StatBlock`, for C8.
- **Coverage is already good.** Every module the epic touched has co-located
  tests, and the epic added about 3,400 lines of them. This plan adds no
  backfill beyond the new modules and the A1 parity test.

## Out of Scope

- **The run-start rule in the reports route.** `GET /reports/month-cash-flow`
  picks its run start "as `/projection` does" or "as `/projection/history`
  does", and says so in a comment. After A2, firing no longer depends on the
  start, so the choice affects only which months the run covers. Extracting it
  would be a three-route change with no rule left to keep in step.
- **`findActive` returning every rule, and the engine's vestigial
  `isActive` filter.** Rules carry no active flag in storage. Removing the
  concept, or giving it meaning, is a product decision.
- **Requiring `ProjectionAccountEntry.anchorDate`.** That would remove
  `sourceAnchorMonth`'s fallback altogether. It is still open from refactors 32
  and 33, for the same fixture-rewrite reason.
- **An opacity token.** The In Balance Anchor row's `0.55` matches the Import
  review's excluded row and CategoryManagerModal's hidden row. All three are
  literals, because the token set has no opacity scale. That is design work
  for `ui-meridian`.
- **Sibling style imports.** MonthCashFlow still reads `StyledDesc`,
  `StyledAccountLine`, `StyledAccountName` and `StyledEmpty` from
  `SpendingList.styles`. ReviewTable reads ImportWizard's styles the same
  way, so this is an accepted pattern, not drift. Only the day block, which
  carried logic, moves.
- **The client's month arithmetic.** MonthOverview's `shiftMonth` and the
  projection util's private `addMonths` predate the epic. One client
  `addMonths` in the month-math util is its own small refactor.
- **Cross-feature deep imports** (`../../history/useHistoryPoints/…` rather than
  the barrel). The savings feature and the Dashboard do the same, so the
  codebase-wide convention is not this epic's to change.
- **The accounts routes' `withBalance ?? updated` fallback.** It can only fire
  if the account vanishes between two reads.
- **Anything log 32 deferred:**
  - per-rule effective dates
  - One-off Transfers on the Month page
  - a start-of-month balance or reconciliation line
  - stat-strip changes
  - editing rules from the Month page
  - multiple Mortgages
  - a future projected settlement refreshing only on the next visit (Q10)
- **Still open from refactors 32 and 33:**
  - `linkedSince`'s UTC "today"
  - the `isoDaysFromToday` midnight flake in the accounts route tests
  - reshaping `applyRecurringToBalances` beyond reading `occurrenceLegs`
  - KpiStrip's private `restschuldOf`

## Further Notes

- **The Replay Loop defect was found while reading the code for this plan, not
  in live use.** It predates the epic. Before Recurring History, the Replay Loop
  and the Forward Projection were the only two readers of the rule. The epic
  added `recurringHistory` and the Dashboard balance as a third reader that
  agrees with the Forward Projection, so the Replay Loop became the odd one out
  and the disagreement became visible. It is in scope because the consistency
  move is the fix: one leg rule, read by every loop.
- **Part order matters in five places:**
  - A1 comes before A2.
  - A3 comes before A4 and B3.
  - A5 and A6 come before A7–A9.
  - C1 comes before C2.
  - Every other part comes before D3.

  Everything else is independent and can be reordered.
