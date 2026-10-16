# 31 — Live-Use Repair — Round 1 Refactor

> Follows the Live-Use Repair — Round 1 epic (issue #220, phases #221–#227;
> design log 29). Picks up the two items design log 29 Q31 and the PRD
> deferred to "a `request-refactor-plan` after the round", plus the
> convention drift the round's seven phases left behind.

## Problem Statement

Round 1 fixed every defect it set out to fix, and each fix is tested. But
the round was built one defect at a time, phase by phase. The result reads
like five separate patches rather than one codebase. Four kinds of drift
are now in the code, and each makes the next change harder than it should be.

**The projection surfaces each re-derive the same facts.** Defect #5 settled
a single rule for "a Sondertilgung happened", but the rule is applied by
pasting the same `effectiveSTMonths(deriveSTMonths(…), snapshots,
mortgageIds)` composition into four components: the Outlook summary, the Plan
Summary, Trajectory Horizon and the Projection accordion. That is business
logic in components, which the layer table forbids. It is also four places
that have to stay in step. Under it, "add up the Restschuld of every Mortgage
in this month" is written six times: a private helper in the projection utils,
a private helper in the accordion, inline in the Outlook summary, and inside
three util functions. "When is the mortgage paid off" is written five ways,
and they disagree. The accordion and the chart ask only about the _first_
Mortgage account. The ST cap, the Outlook tile and the chart's
post-payoff nulling use the combined total. With one mortgage they agree;
with two they draw a payoff flag in one month and stop counting Sondertilgung
in another.

**The round left the two duplicates it promised to clean up.** The
projection utils still export a second `deriveOutlookSummary` that nothing
calls. It is typed by an `OutlookSummary` interface in the shared types
that shares its name with the outlook util's type _and_ with the component.
`deriveYearSummaries` (Plan Summary) and `aggregateYearSummaries` (Projection
accordion, Year Archive) both group a month-by-month series into closing
yearly figures. They do it in two shapes, and the accordion has a private
`groupByYear` on top of both. The module that now serves three year views is
still named after the accordion.

**The recurring-transfer rule is spelled three times, and its errors go
nowhere.** "How does this recurring relate to the account I am looking at"
(its source, its destination, or neither) is answered separately by
`recurringAmountFor`, by the list's inline `mirrored` check and by the
modal's `isIncoming` check. The modal also builds the direction-to-owner
flip inline. The hook declares two payload interfaces that match each other
and the modal's exported payload field for field. The modal still hardcodes
a January–December array that the format utils already export.

Worse, defect #1 added server-side transfer rules whose messages can never
reach the user. The route answers `{ issues }`, but the hook reads
`{ error }`. The page fires the save and forgets it (`void create(…)`), and
the modal closes before the request settles. So a rejected save looks like a
saved one until the list fails to update. This is the same defect class
Import Review Repair fixed in the import wizard. The `PATCH` route loads the
stored row with `findAll().find(…)` because the recurring repo has no
`findById`.

**Mortgage Setup copied what it should have shared.** The mortgage repo
re-states four writes: the accounts repo's INSERT, its next-sortOrder query,
its origination UPDATE, and the recurring repo's INSERT. Balance Anchor is
about to rework the opening-balance fields, and every copy is a place it
will have to find. The repo also picks the new account's colour on the
server from the _category_ palette. Every other account gets its colour on
the client from the account palette, which is what design log 29 Q18
specified. The repayment payload's `fundingAccountId` and the modal's
`FUNDING_KINDS` reuse **Funding Account**, a glossary term that already means
a CreditCard's settlement Girokonto. The form's validation, about a hundred
lines of pure rules, lives inside the component file. The "Girokonto or
Tagesgeld only" rule for the paid-from account exists only on the client.
The Mortgage Countdown card keeps its own short-month array and two private
month-arithmetic helpers.

**The glossary trails the code.** Round 1 introduced **Repayment Transfer**,
**Mirrored Transfer Row** and **Mortgage Setup** in the design log and in
code comments, but none of them has a glossary entry. **ST Month** does not
yet say it stops at payoff. Once the paid-from rename lands, the manual's
transfers topic still says "funding account".

## Solution

Four clusters, cheapest and most behaviour-neutral first. Every commit leaves
the suite green. The four behaviour changes are each isolated behind their
own failing test:

- the error path
- the combined payoff rule with two or more mortgages
- the client-chosen colour
- the server-side paid-from rule

**Projection derivations** gain three named helpers, and every surface reads
them instead of re-deriving:

- one Restschuld total per month
- two payoff helpers: the existing per-account **Payoff Month** for the
  Mortgage Countdown card, and a new combined **Debt-free Month** for every
  plan-level surface
- one ST-months helper that wraps the defect #5 composition

The dead `deriveOutlookSummary` and its clashing type go. Plan Summary moves
onto the shared year aggregator, so `deriveYearSummaries` and its row type
go too. The aggregator module is renamed for what it now is and gains the
accordion's `groupByYear`.

**Recurring transfers** gain one pure relation helper that the amount
helper, the list and the modal all read. They also gain a feature module that
owns the form's seed-and-payload rules, and a single shared input type. The
modal uses `MONTHS_LONG`. The recurring repo gains `findById`. The error path
is fixed end to end: the hook reads `{ issues }` through a small shared
reader that Mortgage Setup also uses, the modal awaits the save, and on
rejection it stays open with the server's message in its alert.

**Mortgage Setup** is renamed off **Funding Account** to `paidFromAccountId`.
Its validation moves into a feature module with its own tests. The accounts
and recurring repos expose synchronous writers that both their async methods
and the mortgage transaction call, so each write has one SQL statement. The
modal chooses the colour from the account palette, as account creation
does. `POST /mortgages` rejects a paid-from account that is missing or not a
Girokonto or Tagesgeld. The Countdown card reads the shared short-month array
and a new month-arithmetic util.

**Glossary and manual** catch up in the last commits.

## Commits

### Part A — Projection derivations

**A1. Delete the dead outlook summary.**
Remove the projection utils' `deriveOutlookSummary`, its test block, its
barrel export, and the `OutlookSummary` interface in the shared projection
types. Nothing imports any of them. The utils barrel test is updated to drop
the name. No behaviour change. This also removes the three-way name clash:
`OutlookSummary` afterwards means the component and the outlook util's
return type, and nothing else.

**A2. Add the Restschuld total helper.**
Export a pure `totalRestschuld(snapshot, mortgageIds)` from the projection
utils: the sum of each Mortgage's _projected_ balance in that month, 0 with no
mortgages. Its doc comment carries the accordion's explanation of why the
projected balance is used and never the actual one. The explanation is
moved, not lost. Add it to the barrel, with tests. No consumer yet.

**A3. Projection utils read the Restschuld helper.**
Replace the private `restschuldIn` and the inline sums inside
`deriveYearSummaries` and `buildTrajectoryData` with the helper. Existing
util tests stay green unedited.

**A4. Components read the Restschuld helper.**
The accordion's private `restschuldOf` and the Outlook summary's inline
reduce both call the helper. Component tests stay green unedited.

**A5. Failing tests for the Debt-free Month.**
Tests for a new combined payoff helper, `findDebtFreeMonth(snapshots,
mortgageIds)`. It returns the first month whose total Restschuld is ≤ 0,
null with no mortgages, and null when the total never reaches zero. With one
mortgage it returns exactly what `findMortgagePayoffMonth` returns, and a
test pins that equivalence. Add accordion and Trajectory Horizon tests with
**two** mortgages paid off in different years: the payoff flag, the payoff
marker and the ST cutoff all land on the later month. Red.

**A6. Add the Debt-free Month helper and route plan-level payoff through it.**
Implement the helper and use it in four places:

- `effectiveSTMonths` uses it instead of its private payoff scan.
- The outlook util uses it instead of its own `find`. The "no debt at the
  start of the projection reads —" guard stays in the outlook util, where it
  is a presentation rule.
- The accordion and Trajectory Horizon call it instead of
  `findMortgagePayoffMonth(snapshots, mortgageIds[0])`.
- `buildTrajectoryData` derives its post-payoff nulling from the payoff
  month it already receives, instead of re-scanning.

`findMortgagePayoffMonth` stays, per account, for the Mortgage Countdown
card. Turns A5 green; with one mortgage, nothing observable changes.

**A7. Add the ST-months helper.**
Export `stMonthsFor(recurringTransactions, accounts, snapshots)` from the
projection utils. It is the defect #5 composition in one place: the
`deriveSTMonths` map over the snapshots' span, cut by `effectiveSTMonths`,
and an empty map when there are no snapshots. Tests reuse the reference case
(€955/month, €6,500 each November, payoff Oct 2031 → five entries). Barrel
export.

**A8–A11. One commit per Sondertilgung surface.**
In order: Outlook summary, Plan Summary, Trajectory Horizon, Projection
accordion. Each replaces its pasted composition with `stMonthsFor`, and each
component's tests stay green unedited. In A11 the accordion's
`recurringTransactions` prop also becomes required, like on the other three
surfaces. The `NO_RECURRING` default goes, and any accordion test that
rendered without the prop passes an empty array.

**A12. Rename the year-summary module.**
A pure move: the accordion util module becomes a year-summaries module
(folder and file named after itself, per the filing rule), carrying its
test. Importers update their paths, and nothing else in any file changes.

**A13. Move `groupByYear` into the year-summaries module.**
Lift the accordion's private month grouping into an exported pure function,
with tests. The accordion calls it.

**A14. Plan Summary moves onto the shared aggregator.**
Add a small exported helper that totals an ST map per calendar year, with
tests. Plan Summary builds its rows from `aggregateYearSummaries` plus that
helper. It keeps its existing rendering rules: "—" with no mortgage, no ST
cell for a year without a Sondertilgung. Plan Summary's tests stay green
unedited; they are the evidence the swap was faithful.

**A15. Delete `deriveYearSummaries`.**
Remove it, its two test blocks, its barrel export and the `YearSummaryRow`
type. Nothing imports any of them after A14.

### Part B — Recurring transfers

**B1. Add the transfer relation helper.**
Export a pure `transferSideFor(recurring, accountId)` from the recurring
utils. It returns `"source"` when the row is a Recurring Transfer stored on
that account, `"destination"` when the transfer lands on it, and `null` for a
plain recurring or a row that does not touch the account. Tests and barrel
export. Rewrite `recurringAmountFor` on top of it; its tests stay green
unedited.

**B2. The list and the modal read the relation helper.**
The list's `mirrored` check becomes `transferSideFor(…) === "destination"`,
and so does the modal's `isIncoming`. Component tests stay green unedited.

**B3. One recurring input type.**
Move the modal's exported payload interface into the shared recurring types
as `RecurringTransactionInput`, mirroring the server's
`RecurringTransactionCreateInput`. Delete the hook's two copies. The hook,
the modal and the page all import the one type. No behaviour change.

**B4. Extract the transfer form rules.**
A new feature module in the transactions feature, filed in a folder named
after itself. It owns the modal's two pure decisions:

- seeding the form from an existing row: direction, counterpart account,
  and the transfer amount as an absolute value
- building the payload from the form: the "From flips the owner" rule, and
  `monthOfYear` only for annual rows

It has its own unit tests. The modal calls both, and its own tests stay
green unedited.

**B5. The modal reads `MONTHS_LONG`.**
Replace the inline month-name array with the format utils' export.

**B6. Add `findById` to the recurring repo, and use it in `PATCH`.**
Add `findById` to the recurring repo interface and the SQLite repo, with a
storage test: found, not found, and an invalid id returns null, matching
`accounts.findById`. The `PATCH` route loads the stored row through it
instead of `findAll().find(…)`. The route tests stay green unedited.

**B7. Add the shared API error reader.**
A pure util that takes a parsed error body and a fallback and returns the
user-facing message. The precedence is the first `issues` message, then
`error`, then the fallback. It is tested and exported, and Mortgage Setup's
inline equivalent switches to it. No behaviour change.

**B8. Failing tests for the recurring error path.**

- **Hook:** a rejected create or update throws the server's first `issues`
  message, not the generic fallback.
- **Modal:** when its save callback rejects, the modal stays open, shows that
  message in its alert, and keeps the form's values. When the callback
  resolves, it closes as today.
- **Account detail page:** a transfer the server refuses, for example a
  self-link written around the UI and returned as `{ issues }`, surfaces the
  message instead of closing silently.

Red.

**B9. Wire the error path.**

- The hook reads errors through B7's reader.
- The modal's save and delete callbacks may return a promise. The modal
  awaits them, closes only on success, and shows the error otherwise.
- The page passes the hook's `create`, `update` and `remove` straight
  through instead of `void`-ing them, and drops its own close-on-save
  bookkeeping.

The modal's client-side guard stays. It still catches the common case before
any request is sent. Turns B8 green.

### Part C — Mortgage Setup

**C1. Rename `fundingAccountId` to `paidFromAccountId`.**
One commit across the setup schema, the storage `MortgageRepayment` type,
the mortgage repo, the modal's payload and its kind constant (which becomes
`PAID_FROM_KINDS`), and every test that names them. The form's "Paid from"
label already uses this name, and nothing else changes. Afterwards **Funding
Account** means only the CreditCard settlement link again.

**C2. Extract the Mortgage Setup form rules.**
A new feature module in the mortgage feature, filed in a folder named after
itself. It owns:

- the form-values type and the payload types
- the cents parser
- today's ISO date
- `validate` and `validateRepayment`, unchanged

It gets its own unit tests: each rule's message, the
no-repayment-when-both-blank case, and the first broken rule winning. The
modal keeps its state, its submit and its markup. The modal's tests stay green
unedited.

**C3. Add the account writers.**
Extract, from the accounts repo, a synchronous writer module prepared once
per database. It holds the account INSERT with the next-sortOrder lookup,
and the origination UPDATE. The accounts repo's async `create` and its
origination method call the writers. Every accounts storage and route test
stays green unedited.

**C4. Add the recurring writer.**
Same treatment for the recurring repo's INSERT. The id/account existence
checks stay in the async `create`, which is where the route relies on them.

**C5. The mortgage repo composes the writers.**
The mortgage transaction calls the account writer, the origination writer
and the recurring writer inside its `db.transaction`. It deletes its own four
prepared statements. The rollback test (a failing recurring insert leaves no
account) and every setup test stay green unedited, and that is the evidence
the composition is faithful. The repo's doc comment is corrected to mention
the repayment transfers.

**C6. Failing tests for the client-chosen colour.**
The modal's payload carries a `color` drawn from the account palette, as
account creation does. The route stores a supplied colour, and stores none
when the field is absent. Red.

**C7. Choose the colour on the client.**

- The setup schema gains an optional `color`.
- The mortgage repo writes it, and no longer imports the category palette or
  its own random-pick helper.
- The modal picks the colour once per open, using the same palette source
  as account creation.

Turns C6 green.

**C8. Failing tests for the server-side paid-from rule.**
`POST /mortgages` with a repayment whose paid-from account is missing, a
Mortgage, a CreditCard or an Investment account answers 400 with `{ issues }`
and stores nothing. A Girokonto and a Tagesgeld are accepted. Red.

**C9. Enforce the paid-from rule.**
After schema parsing, the route looks up the paid-from account and adds the
issue when the account is absent or the wrong kind. The allowed kinds are a
constant beside the setup schema. This deliberately duplicates the client's
`PAID_FROM_KINDS`, because the client and the server cannot share code. That
is the same trade-off as the import review rules, recorded below. Turns C8
green.

**C10. Add the month-arithmetic util.**
A new pure util module holds `currentMonth()` (this month as ISO `YYYY-MM`)
and `monthsBetween(from, to)` (whole months, may be negative), with tests.
The tests pin `Date` for `currentMonth`. Barrel export.

**C11. The Countdown card reads shared month helpers.**
The card deletes its private short-month array and both helpers. It reads
the format utils' `MONTHS` and C10's util instead, and its tests stay green
unedited.

### Part D — Glossary and manual

**D1. Bring the glossary up to date.**

- Add **Repayment Transfer**: a Recurring Transfer into a Mortgage. The
  monthly Darlehen rate and the annual Sondertilgung are both Repayment
  Transfers.
- Add **Mirrored Transfer Row**: a Recurring Transfer as its destination
  account shows it, +amount in green, linked to its source, never edited
  there.
- Add **Mortgage Setup**: the one-form create of a Mortgage account, its
  origination and its Repayment Transfers.
- Add **Paid-from Account**: the Girokonto or Tagesgeld a Repayment Transfer
  leaves.
- Add **Debt-free Month**: the first projected month in which the combined
  Restschuld of every Mortgage reaches zero. It equals the Payoff Month with
  one mortgage, and it is what plan-level surfaces flag.
- Amend **ST Month**: only up to and including the Debt-free Month, its
  amount capped at the Restschuld left.
- Amend **Payoff Month**: it is per Mortgage account, as the Countdown card
  shows it.

**D2. Sync the manual.**

- The transfers topic's "funding account" becomes "the account it is paid
  from".
- The recurring topic gains one sentence: a transfer the server refuses
  keeps the dialog open with the reason.

Any other sentence describing a behaviour this plan changes is updated in
the same commit, and its pinned sentence in the manual tests is updated with
it. No other copy is edited.

**D3. Sweep and verify.**

- No component calls `deriveSTMonths` or `effectiveSTMonths` directly.
- No file sums Restschuld by hand.
- `findMortgagePayoffMonth` has exactly one caller, the Countdown card.
- No import names `deriveYearSummaries`, `YearSummaryRow`, the accordion
  util path or `fundingAccountId`.
- Run `node scripts/typecheck.mjs`, `node_modules/.bin/vitest run` and lint.
- Record the close-out in the dev journal.

## Decision Document

- **Two payoff helpers, not one.** **Payoff Month** stays per Mortgage
  account (`findMortgagePayoffMonth`), because the Countdown card shows one
  card per mortgage and each has its own date. **Debt-free Month** is the
  plan-level rule (`findDebtFreeMonth`): the first month the _combined_
  Restschuld reaches zero. The accordion's payoff flag, the Trajectory
  Horizon payoff marker and Freedom Phase, the Outlook tile and the
  Sondertilgung cutoff all read it. "Debt-free" is already the Outlook tile's
  label, so the code name `debtFreeMonth` is kept and becomes a glossary
  term rather than drift. With one mortgage both helpers return the same
  month, so single-mortgage behaviour is unchanged.
- **The Outlook's "no debt at the start reads —" rule stays in the outlook
  util.** It is a rule about how the tile presents a projection that starts
  debt-free, not part of what "debt-free month" means.
- **`stMonthsFor` is the only way a surface gets Sondertilgung months.**
  `deriveSTMonths` and `effectiveSTMonths` remain exported, because they are
  the two tested halves. But components call only the composition. This is
  the "four surfaces cannot disagree" promise from design log 29 Q29, now
  enforced by having a single call site.
- **One year aggregator.** `aggregateYearSummaries` serves the Projection
  accordion, the Year Archive and Plan Summary. Its module is renamed from
  the accordion to year summaries, because a module named after one of its
  three consumers misleads the other two. `netCashflow` stays on its input
  and output, because the Year Archive renders it. The accordion supplying a
  field it does not render is cheaper than two aggregator shapes.
- **`transferSideFor` returns `"source" | "destination" | null`.** "Source"
  and "destination" are design log 29's words for the two ends of a
  Recurring Transfer. `null` covers both plain rows and unrelated rows,
  because no caller needs to tell those apart.
- **The transfer form rules and the Mortgage Setup form rules are feature
  modules, not utils.** They encode domain decisions: who owns a "From"
  transfer, what a valid setup is. So they belong to their feature, filed
  per the Module Filing Rule. The API error reader and the month arithmetic
  are domain-free and go to `src/utils/`.
- **`RecurringTransactionInput` lives in the shared recurring types.** The
  modal, the hook and the page all use it. A type exported from a component
  file and imported by a hook runs against the layer direction.
- **The recurring modal awaits its save.** The callbacks may return a
  promise; the modal closes on resolve and shows the message on reject. The
  modal's client-side positive-amount guard is kept: it gives the same
  message without a round trip.
- **The API error reader's precedence is `issues[0].message`, then `error`,
  then the fallback.** Every route answers validation failures with
  `{ issues }` and not-found with `{ error }`. This is a client-side reader
  only; the server's error shapes do not change.
- **`paidFromAccountId` replaces `fundingAccountId`** in the API contract of
  `POST /mortgages`, in the storage type and in the client payload. The API
  is internal to the desktop app (the renderer and the bundled server ship
  together), so there is no compatibility shim.
- **Shared synchronous writers, not shared async repo methods.** A
  better-sqlite3 transaction cannot await, so the mortgage transaction
  cannot call the async repo methods. Each repo instead exposes the
  synchronous writer its own async method already wraps, prepared once.
  Validation that the routes rely on (uuid shape, account existence on
  recurring create) stays in the async methods. The writers only write.
- **Colour is a client decision.** `POST /mortgages` takes an optional
  `color`, as `POST /accounts` does, and the server never picks one. The
  server-side category palette goes back to being only about categories.
- **The paid-from kind rule is enforced on both tiers.** The client filters
  the "Paid from" options. The server rejects anything else with
  `{ issues }`. The two kind lists are a known, recorded duplication across
  the tier boundary, like the import review's `blockersFor` and
  `ImportRowSchema`.
- **The schema change is limited to the API.** No migration and no column
  changes. `color` already exists on `accounts`.

## Testing Decisions

A good test here asserts what a caller or a user can observe: which month
is flagged, which rows a list shows and in which colour, what message the
dialog shows, what the database holds after a refused request. It never
asserts how a module arranges itself internally.

- **Extraction commits do not edit existing tests.** A3, A4, A6 (for the
  single-mortgage cases), A8–A11, A14, B1, B2, B4, B6, C2, C3, C4, C5 and
  C11 each move logic behind an existing, observable test suite. Those
  suites passing _unedited_ is the evidence the move was faithful. If one
  needs an edit, the commit changed behaviour and is wrong. The only allowed
  test edits are path updates in move commits (A12) and deleting the tests
  of deleted code (A1, A15).
- **Each behaviour change gets its own failing-test commit first:**
  A5 (two mortgages), B8 (error path), C6 (colour) and C8 (paid-from rule).
  These are committed as `test:` commits, which the `commit-msg` hook
  typechecks against shipping code only.
- **New modules under test:**
  - `totalRestschuld`
  - `findDebtFreeMonth`, including its equivalence to
    `findMortgagePayoffMonth` with one mortgage
  - `stMonthsFor`, with the reference case
  - `groupByYear`, and the per-year ST totals
  - `transferSideFor`
  - the transfer form rules: seed and payload, To and From, plain and annual
  - the API error reader
  - the Mortgage Setup form rules
  - the month-arithmetic util
  - the recurring repo's `findById`
  - the account and recurring writers, through the existing repo tests
    rather than directly
- **Prior art:**
  - `effectiveSTMonths` and the outlook util's reference-case block for the
    projection helpers
  - the existing `recurringAmountFor` table tests for `transferSideFor`
  - `reviewRows` in the import feature for a feature-owned pure rules module
    with its own tests
  - the mortgage storage rollback test for C5
  - the recurring route's transfer-rule block for C8's `{ issues }` and
    "stores nothing" assertions
  - the projection route tests' frozen-clock pattern (`vi.useFakeTimers({
toFake: ["Date"] })`) for `currentMonth`
- **Coverage is already good.** Every module Round 1 touched has co-located
  tests, so this plan adds no backfill. The one gap it closes is
  `currentMonth`/`monthsBetween`. They are private and untested in the
  Countdown card today, and become exported and tested.

## Out of Scope

- **The other copies of `currentMonth` / `monthsBetween` / `addMonths`.**
  They live in the app layout, the savings goal util, the client projection
  utils and three server modules. The new util makes adopting them trivial,
  but each lives in a feature this round did not touch.
- **The other local `MONTHS_SHORT` copies** (in Spending List) and **the
  Clock's own month array**. Same reason.
- **The recurring modal's `window.confirm` on delete.** It predates Round 1.
  Moving it to the in-app confirm is a native-dialogs follow-up, not
  live-use drift.
- **Number-input vs decimal-text amount fields.** The mortgage modals use
  `type="number"`, while the transaction modals use text with
  `inputMode="decimal"`. These are two existing conventions, and unifying
  them is its own decision.
- **The unused `apiFetch` auth wrapper** in the utils. It is a leftover of
  the removed web/auth direction and unrelated to this round.
- **Changing `AccountCreateModal`'s Mortgage path, the KPI tile empty states,
  interest modelling, and anything Balance Anchor owns.** All of these were
  ruled out by design log 29 and are not reopened.
- **Any change to the projection engine or the stored recurring model.**

## Further Notes

The two-mortgage change in A5/A6 is the only part of this plan that changes
what an existing user could see. It changes nothing for anyone with one
mortgage, which is the only configuration live use has exercised. It is
included because a refactor that collects payoff into one rule has to pick
_which_ rule. Picking the first-mortgage-only rule would have kept a
behaviour nobody chose.

The error-path fix (B8/B9) is the part most likely to grow. If another modal
turns out to follow the same "close before the save settles" pattern, that
is a follow-up issue for that surface, not an extension of this plan.
