# 21 — Month Year-Comparison refactor

## Problem Statement

The Month Year-Comparison feature (design log 20) shipped end-to-end across
issues #144–#146 and works: the Month Overview now draws the real per-category
year-over-year bars from a dedicated `/reports/year-comparison` endpoint. But it
was built TDD-first, and reading the shipped code five things grate:

1. **The Variable-Spending rule is now duplicated, unnamed, on the server.**
   `computeYearComparison` re-implements "drop transfer legs and auto-settlement"
   inline (`!tx.transferId && !tx.isAutoSettlement`) and owns a private
   `NON_SPENDING_KINDS` set for the Mortgage/Investment exclusion. The client
   already names the first half of this rule as `selectVariableSpending`. The two
   sides are separate build targets and can never share one function, so a second
   copy on the server is unavoidable — but right now that copy is anonymous and
   inlined, so the next `/reports` card will copy it a third time. The concept
   deserves a name on the server, in one place, with a parity note.

2. **The route hand-maps domain rows into the library's `*Entry` shapes for no
   reason.** `reports.ts` loops `accounts.map(...)` and `transactions.map(...)`
   to build `YcAccountEntry` / `YcTxEntry` objects before calling the library.
   The storage `Account` and `Transaction` DTOs are already structural supersets
   of those interfaces, so the arrays are directly assignable. The mapping is
   dead boilerplate — it compiles to a copy of the data and nothing else.

3. **The fetch hook has no failure path.** `useYearComparison` does
   `fetch(...).then(r => r.json())` with no `res.ok` check and no `.catch`. A
   500, a dropped connection, or a non-JSON body leaves `isLoading` stuck `true`
   forever and the card spinning. The sibling `useMonthTransactions` already
   models the correct pattern (an `error` field, an `ok` guard, a `catch`); this
   hook simply never adopted it.

4. **`parseYearMonth` is re-rolled locally.** `computeYearComparison` carries its
   own `value.split("-").map(Number)` month parser. The same shape is open-coded
   in `lib/projection` and `lib/settlement`. There is no shared server date
   helper; each module reinvents the split.

5. **The route loads every transaction in history on every request.**
   `storage.transactions.findAll()` pulls the entire table, then the library
   discards everything outside a two-year window. The PRD accepted "recompute per
   request, no caching" at single-user desktop scale — but loading _all_ history
   to answer a two-year question is a data-load problem, not a caching one, and
   the storage layer already has the half-open date-range pattern
   (`findByAccount(id, { month })` uses `date >= ? AND date < ?`) to do better.

## Solution

Five independent cleanups, each a small commit that leaves the suite green,
sequenced cheapest-first so the risky one lands last:

- **Delete the dead mapping** in the route and pass the storage DTO arrays
  straight into the library (the types already line up).
- **Extract a named server date helper** `parseYearMonth` into its own tiny
  module with a test, and point `computeYearComparison` at it.
- **Extract a named server Variable-Spending helper** — a transaction predicate
  plus a spending-account selector — owning the rule and the
  Mortgage/Investment set once, with a comment pinning the parity contract
  against the client's `selectVariableSpending`. Refactor the library onto it.
- **Give the hook a failure path** mirroring `useMonthTransactions`: an `ok`
  guard, a `catch`, and an `error` field the card renders honestly instead of
  spinning forever.
- **Narrow the query** by adding a half-open `findByDateRange` to the
  transactions repository, implementing it in the SQLite driver, covering it in
  the shared storage parity spec, and having the route fetch only the two-year
  span. The library is unchanged and still re-filters, so the narrowing is a
  pure optimization with no behavioural change.

## Commits

Ordered so each commit compiles, passes the full suite, and is independently
revertible. Groups are independent of one another except where noted.

### A. Remove the dead row-mapping in the route (#2 — tiniest, first)

1. **Pass storage DTOs straight to the library.** In the reports route, drop the
   two `.map(...)` blocks that rebuild `YcAccountEntry` / `YcTxEntry` and pass
   the `findAll()` results directly into `computeYearComparison`. The storage
   `Account` and `Transaction` types already satisfy the library's input
   interfaces structurally, so this type-checks unchanged. No test edits; the
   route and library suites stay green. Manually confirm the endpoint still
   returns the same payload.

### B. Extract a shared server `parseYearMonth` (#4)

2. **Add the helper module.** Create a small server date module exporting
   `parseYearMonth(value) -> { year, month }`, with a colocated test covering a
   normal value, a single-digit month, and leading zeros. Nothing imports it
   yet — new code only, suite green.

3. **Adopt it in `computeYearComparison`.** Replace the library's private
   `parseYearMonth` with an import of the new helper and delete the local copy.
   Behaviour is identical; the library suite passes unchanged. (Adopting it in
   `lib/projection` / `lib/settlement` is deliberately left out of scope — see
   Out of Scope.)

### C. Extract a named server Variable-Spending helper (#1)

4. **Add the helper module.** Create a server module that names the rule: a
   transaction predicate for "is variable spending" (no transfer leg, not
   auto-settlement) and a spending-account selector that owns the
   Mortgage/Investment exclusion set. Colocate a test for each. Add a comment
   recording the parity contract with the client's `selectVariableSpending`.
   New code only — suite green.

5. **Refactor `computeYearComparison` onto the helper.** Replace the inline
   `transferId || isAutoSettlement` guard and the private `NON_SPENDING_KINDS`
   set with calls to the new helper. The library's external behaviour and its
   existing tests are unchanged.

### D. Give the fetch hook a failure path (#3)

6. **Add error handling to `useYearComparison`.** Mirror `useMonthTransactions`:
   add an `error: string | null` to the result, guard on `res.ok` (throwing on a
   non-OK status), and add a `.catch` that sets `error` and clears `isLoading`.
   Extend the hook test with a failure case (rejected/non-OK fetch resolves to
   `error` set and `isLoading` false). Suite green.

7. **Render the error state in the card.** Thread `error` from the hook through
   `MonthOverview` into `YearComparison`, and render an honest one-line error
   message in place of the bars when `error` is set (distinct from the existing
   empty state). Update the card test for the new branch.

### E. Narrow the transactions query (#5 — largest, last)

8. **Add `findByDateRange` to the repository contract.** Extend the
   `TransactionsRepo` interface with `findByDateRange(fromInclusive,
toExclusive)` returning the transactions whose ISO date falls in the half-open
   span, ordered by date. Interface-only change plus the SQLite implementation in
   the same commit (a prepared `WHERE date >= ? AND date < ? ORDER BY date`
   statement, mirroring the existing month query). No caller yet — suite green.

9. **Cover it in the storage parity spec.** Add a parity test: seed transactions
   across several months and two accounts, then assert `findByDateRange` returns
   exactly those inside the half-open window (lower bound inclusive, upper bound
   exclusive), across accounts, in date order. The spec runs against the SQLite
   driver today and pins the contract for any future driver.

10. **Point the route at the narrowed query.** In the route, compute the span
    from the validated `?month` using `parseYearMonth`: lower bound = January 1
    of the prior year, upper bound (exclusive) = the first day of the month after
    the viewed month. Replace `transactions.findAll()` with
    `findByDateRange(...)`. The library still re-applies its own window/year
    filters, so the rows are identical — confirm the existing route tests pass
    unchanged, and that out-of-span data could no longer reach the library.

### F. Close-out

11. **Docs.** Add a dev-journal entry recording the five cleanups and the new
    `findByDateRange` contract; refresh the ubiquitous-language note if the
    server Variable-Spending helper's name warrants an entry.

## Decision Document

- **#2 is a deletion, not a redesign.** The library keeps its own minimal
  `*Entry` input interfaces — that matches the established convention in
  `lib/cashflow` and the other server libraries. Only the redundant route-side
  mapping is removed; the storage DTOs are passed through because they already
  satisfy those interfaces structurally.
- **#4 helper placement.** `parseYearMonth` becomes its own small server module
  alongside the other `server/src/lib/*` units, with its own test, returning a
  `{ year, month }` pair. Only `computeYearComparison` adopts it in this
  refactor; `projection` and `settlement` are noted as future adopters but left
  untouched to keep each commit tiny and the blast radius small.
- **#1 cannot be a single source of truth across the client/server boundary.**
  `src/` and `server/src/` are separate build targets and may not import one
  another, so the Variable-Spending rule will always exist twice. The decision is
  to give the _server's_ copy a name and a single home (a predicate for the
  transaction-level rule and a selector for the spending-account rule), owning
  the Mortgage/Investment set, and to record the parity contract with the
  client's `selectVariableSpending` in a comment so the two are knowingly kept in
  step. Future `/reports` cards reuse the server helper instead of re-inlining.
- **#3 mirrors the canonical hook.** `useYearComparison` adopts the exact
  error-handling shape already used by `useMonthTransactions` (an `error` field,
  an `ok` guard, a `catch`) rather than inventing a new convention. The card
  gains a dedicated error branch separate from its "No spending yet this year."
  empty state — an error is not the same as an honest zero.
- **#5 changes the data load, not the result.** A new half-open
  `findByDateRange(fromInclusive, toExclusive)` joins the `TransactionsRepo`
  contract, following the half-open `date >= ? AND date < ?` pattern the
  per-account month query already uses. The route computes a two-year span and
  the library is left completely unchanged: it still re-applies its window, year,
  Variable-Spending, and account-kind filters, so narrowing the fetch is a pure
  optimization that cannot alter the rows. There is exactly one storage driver
  (SQLite); the interface and the parity spec carry the contract forward.
- **No schema change, no API-contract change.** The endpoint URL, query
  parameter, response shape, ranking, and cap are all untouched. This refactor is
  invisible to the frontend except for the new `error` field on the hook.

## Testing Decisions

A good test here asserts externally observable behaviour — the rows a function or
endpoint returns, the elements the card renders, the records a query yields —
never call counts or internal helper wiring. The refactor is structured so that
most commits change _no_ behaviour and therefore need _no_ new assertions; the
existing suites are the safety net that proves the moves were faithful.

- **`parseYearMonth` helper** — a focused unit test (normal value, single-digit
  month, zero-padded month). Prior art: the small pure helpers under
  `server/src/lib/*` and `src/utils/*`.
- **Server Variable-Spending helper** — unit tests for the predicate (transfer
  leg excluded, auto-settlement excluded, plain spending included) and the
  account selector (Mortgage and Investment excluded, spending kinds kept). Prior
  art: `lib/cashflow` account/transaction filtering tests, and the client's
  `monthStats` Variable-Spending tests as the parity reference.
- **`computeYearComparison`** — no new tests; its existing suite (window math,
  Variable-Spending filtering, account-kind filtering, ranking, cap, empty and
  first-year cases) must stay green across commits 3 and 5, proving the helper
  swaps were behaviour-preserving.
- **`findByDateRange`** — a new case in the shared storage parity spec: half-open
  boundary inclusivity (lower inclusive, upper exclusive), cross-account
  coverage, and date ordering. Prior art: the existing `findByAccount` month-range
  parity coverage.
- **Reports route** — existing supertest coverage (200 shape/ordering, `?month`
  validation, 400 on malformed month) must pass unchanged after commits 1 and 10,
  proving the mapping deletion and the query narrowing are invisible at the HTTP
  boundary.
- **`useYearComparison`** — extend the existing hook test with a failure path
  (non-OK / rejected fetch yields `error` set and `isLoading` false). Prior art:
  `useMonthTransactions` error-path coverage.
- **`YearComparison` card** — add the error-branch assertion (error message
  renders, distinct from the empty state) to the existing card test. Prior art:
  the existing empty-state and rows assertions in the same file.

## Out of Scope

- Adopting the new `parseYearMonth` helper in `lib/projection` and
  `lib/settlement` — worthwhile, but a separate sweep; bundling it here would
  bloat the diff and the blast radius.
- Unifying the client and server Variable-Spending definitions into one shared
  module — impossible across the two build targets; the parity comment is the
  chosen mechanism instead.
- Caching or memoising the aggregation — the PRD's "recompute per request"
  stands; #5 narrows the _fetch_, it does not add a cache.
- Any change to the endpoint URL, query parameter, response shape, ranking,
  cap, or the card's visual design.
- Per-row delta indicators and any window other than Jan 1 → Viewed Month —
  already out of scope per the design log, unchanged here.

## Further Notes

- The five items are independent; if time is short, commits A–D deliver four of
  the five cleanups with effectively zero risk, and group E (the query
  narrowing) can land on its own later.
- Design log: `docs/design-logs/20-month-year-comparison.md`. PRD:
  `docs/PRDs/20-month-year-comparison.md`. Canonical visual source:
  `docs/handoff/prototype/src/screens/MonthOverview.jsx`.
- Parity reference for the Variable-Spending rule: client
  `selectVariableSpending` in `src/utils/monthStats`. Half-open date-range
  precedent: the per-account month query in the SQLite transactions repository.
