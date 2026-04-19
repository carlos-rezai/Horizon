## Problem Statement

After the build phase for the Financial Projection Dashboard, eight bugs and UX
issues were identified through manual testing. They fall into three groups:

**Data integrity bugs:** The server PATCH handler for recurring transactions silently
drops `frequency`, `dayOfMonth`, and `linkedAccountId` on every update — so an ST
transfer loses its target account on every save. Annual recurring transactions have
no `monthOfYear` field, so `deriveSTMonths` always fires at the projection-start
month rather than the user's intended month (e.g., October). Transfer amounts have
no positive-value guard, so a user entering -6500 inverts the projection math and
grows the debt instead of reducing it.

**Architectural bugs:** `RecurringTransactionModal` makes its own API calls, and the
parent then also calls the hook mutation functions — resulting in two POSTs on create,
two PATCHes on update, and two DELETEs on delete. Every mutation creates a duplicate
on the server. The projection accordion applies actual-data muted styling to Net
Cashflow and Total Liquid cells based on `monthHasActual`, but those two values are
always engine-computed projections even when some account cells have real actuals.

**UX and layout issues:** Dashboard sections have no vertical spacing. Account detail
header shows a "Back to dashboard" text link alongside the AppLayout's arrow button —
two conflicting back affordances on the same page. The wordmark is plain text rather
than a link. Account opening balance cannot be edited after creation.

---

## Solution

Fix all eight issues in small, independently-shippable commits. The architectural
modal refactor is the most involved change — the modal becomes a pure form (no fetch
calls), and the parent hook owns all mutations. The `monthOfYear` field is a schema
migration: Mongoose model, server routes, TypeScript type, hook interfaces, form UI,
and the `deriveSTMonths` utility all need coordinated updates.

A ninth item — the Restschuld Trajectory Chart — was requested but is a new feature
(explicitly scoped out of the original PRD). It has been added to the README and
CLAUDE.md as the next planned feature, to be tackled via the standard
grill-me → PRD cycle.

---

## Commits

### Phase 1 — Server: fix PATCH handler for recurring transactions

Add `frequency`, `dayOfMonth`, and `linkedAccountId` to the destructure and update
object in the recurring transactions PATCH route handler. Currently only `amount`,
`description`, `category`, and `isActive` are extracted; the other three are silently
ignored. After this commit, editing a recurring transfer will persist the linked
account, frequency, and day without losing them on refetch.

### Phase 2 — Schema: add `monthOfYear` to RecurringTransaction

Add an optional `monthOfYear` field (integer 1–12) to the Mongoose
`recurringTransactionSchema`. The field is optional and unvalidated at the enum level
— any stored document without it behaves exactly as before. No migration script is
needed: existing records continue to work; the new field is only used when present.

Note: this schema change is recorded in the dev journal as a forward-compatible
additive migration with a known behavioural impact on `deriveSTMonths` (annual
transactions without `monthOfYear` continue to fire at projection-start month until
the user re-saves them).

### Phase 3 — Server: expose `monthOfYear` in POST and PATCH

Add `monthOfYear` to the recurring transactions POST body destructure and the
`create` call. Add it to the PATCH destructure and the `update` object (guarded with
`!== undefined`). After this commit the server fully round-trips the field.

### Phase 4 — Types and hook interfaces: add `monthOfYear`

Add `monthOfYear?: number` to the `RecurringTransaction` TypeScript interface.
Add it to `CreatePayload` and `UpdatePayload` in `useRecurringTransactions`.
No logic changes — this is a type-layer only commit that unblocks the form and
utility changes.

### Phase 5 — Architectural fix: modal becomes a pure form

This is the largest single commit. Three changes land together because they are
coupled by the `onSaved`/`onDeleted` callback interface:

- Define a `RecurringFormPayload` interface (amount, description, category,
  frequency, dayOfMonth, monthOfYear?, linkedAccountId?) — the raw form output
  with no `_id` or `accountId`.
- Change `RecurringTransactionModal` `Props.onSaved` to
  `(data: RecurringFormPayload) => void` and `onDeleted` to `() => void`.
- Remove all `fetch` calls from `RecurringTransactionModal`. `handleSave` validates
  and calls `onSaved(formPayload)`. `handleDelete` calls `onDeleted()` after the
  user confirms — no API call.
- Update `AccountDetailPage` create `onSaved`: call `createRecurring(formData)`
  (hook handles POST and state update).
- Update `AccountDetailPage` edit `onSaved`: call
  `updateRecurring(editingRecurring._id, formData)`.
- Update `AccountDetailPage` `onDeleted`: call `removeRecurring(transaction._id)`.

After this commit, each mutation fires exactly once. The modal has no fetch
dependency and is fully unit-testable in isolation.

### Phase 6 — Form: add `monthOfYear` selector for annual frequency

Add `monthOfYear` state to `RecurringTransactionModal` (default: current month).
Show a month-of-year `<Select>` (January–December) only when `frequency === 'annual'`.
Include `monthOfYear` in the `RecurringFormPayload` passed to `onSaved`. When
frequency changes away from annual, do not reset `monthOfYear` — the value is simply
not included in the payload when frequency is not annual.

### Phase 7 — Utility: fix `deriveSTMonths` to respect `monthOfYear`

Update `deriveSTMonths` to use `rt.monthOfYear` when present. The current loop fires
at `i % 12 === 0` from `fromMonth`, which always lands on the projection-start month.
The new logic: for each annual ST recurring transaction, compute the target month
within each projection year from `monthOfYear` (1-based), then check whether that
computed month falls within the projection window. When `monthOfYear` is absent
(existing records), fall back to the current behaviour. This change affects tests:
existing `deriveSTMonths` tests use a projection start of `"2026-01"` and no
`monthOfYear`, so they continue to pass. New tests cover the `monthOfYear` path.

### Phase 8 — Projection accordion: fix actual vs projected styling

In `ProjectionAccordion`, Net Cashflow and Total Liquid are always projection-engine
output — they are never "actual" values regardless of whether account cells have
actuals. Remove the `$isActual` prop from those two `StyledTd` cells. Their styling
should always be the default (projected) style. Only per-account `StyledTd` cells
should use `$isActual` (which they already do, from `getCellValue`).

### Phase 9 — Form: validate positive amounts for transfers

In `RecurringTransactionModal`, add a validation check: if `linkedAccountId` is set
(a transfer), the amount must be greater than zero. Return an error and block save if
the user enters zero or a negative value. This prevents the sign-inversion bug in the
projection engine where `-6500` becomes `+6500` applied to the debt.

### Phase 10 — Dashboard: add section spacing

Create `DashboardPage.styles.ts` with two styled components: `StyledDashboard`
(a flex column with a gap token between children) and `StyledSection` (no layout of
its own — used as a semantic wrapper for each major section). Apply them in
`DashboardPage`. The Accounts section, MortgageCountdown, PlanSummary, and
MilestoneTracker each become a `StyledSection` child of `StyledDashboard`.

### Phase 11 — Account detail: support opening balance editing

Add `openingBalance` PATCH support to the server accounts route. Currently the
accounts PATCH handler unconditionally applies `{ name: req.body.name }`. Extend it
to also apply `openingBalance` when provided.

Add opening balance editing to `AccountDetailHeader`. Alongside the existing rename
flow, add a second edit affordance (pencil icon or inline field next to the displayed
balance). A separate piece of state controls whether the balance is in edit mode.
On save, call a new `onUpdateBalance(value: number)` prop. Wire the prop in
`AccountDetailPage` to call the accounts PATCH endpoint with `openingBalance`.

### Phase 12 — Navigation: remove duplicate back affordance

Remove the `<Link to="/">Back to dashboard</Link>` from `AccountDetailHeader`. The
AppLayout arrow button already provides back navigation for all non-dashboard routes.
The inline link is redundant and creates two competing affordances.

Make the `StyledWordmark` in `AppLayout` a `<Link to="/">` component so the wordmark
is always a navigable home link, consistent with standard web conventions.

### Phase 13 — Docs: register Restschuld chart as next planned feature

Add a "Restschuld Trajectory Chart" row to the README build status table, positioned
before the AI features. Mark it as planned (not in progress). Add the same entry to
the CLAUDE.md Build Status checklist, in the same position. This makes the next
feature visible in both the public README and the developer instructions without
starting implementation.

---

## Decision Document

**Modal as pure form (Bug 2):** The modal owns form state and validation only. No
`fetch` calls. `onSaved` receives raw form data (`RecurringFormPayload`), not a
hydrated `RecurringTransaction`. This gives the parent full control over the mutation
strategy (optimistic update, error handling, retry). `onDeleted` becomes `() => void`
— the parent holds the `_id` and calls the hook.

**`monthOfYear` as optional, forward-compatible field:** No migration script.
Existing records without the field continue to fire at the projection-start month
(the current behaviour). Users who re-save an existing annual RT will then set a
`monthOfYear`. The fallback is explicit in `deriveSTMonths`.

**`deriveSTMonths` fallback behaviour:** When `monthOfYear` is absent, fire at
projection-start month offset as before (`i % 12 === 0` from `fromMonth`). This
preserves backward compatibility for any existing stored records.

**Positive-amount guard scope:** Validation only applies when `linkedAccountId` is
set (transfers). Regular income/expense recurring transactions may be negative
(expenses). The guard is limited to the transfer case.

**Opening balance editing only:** `kind` editing is out of scope — changing an
account's kind has cascading effects on column ordering in the accordion, mortgage
logic, and projection rules. Opening balance is a single numeric field with no
downstream type implications.

**Back button consolidation:** The AppLayout arrow is the canonical back affordance.
Per-page back links in components are removed. The wordmark becomes the home link
for forward navigation symmetry.

**Restschuld chart deferred:** The chart requires installing Recharts, a new
`?withBaseline` projection endpoint, and a separate grill-me session. It is tracked
in README and CLAUDE.md but starts a new PRD cycle.

---

## Testing Decisions

A good test covers only the externally observable behaviour of a module — what it
returns or renders given specific inputs — not internal state or implementation
details. Tests should not change when the implementation is refactored without
changing behaviour.

**`deriveSTMonths` — `src/utils/projection.test.ts`**
Existing tests cover the no-`monthOfYear` path. New tests should cover:

- Annual RT with `monthOfYear: 10` fires in October of each projected year, not in
  the projection-start month
- Annual RT with `monthOfYear: 10` in a projection starting in April does not fire in
  April
- Multiple annual RTs with different `monthOfYear` values each fire in their correct
  month
  Prior art: the existing `deriveSTMonths` describe block is the model.

**`ProjectionAccordion` — `ProjectionAccordion.test.tsx`**
Existing tests cover payoff month row marking. Add tests for:

- Net Cashflow and Total Liquid cells do not carry the `$isActual` prop (or the
  equivalent rendered attribute) even when account cells have actuals
  Prior art: the existing `renderWithTheme` helper and snapshot structure.

**`RecurringTransactionModal`**
No tests exist yet. The modal is now a pure form with no fetch dependency — it can
be tested without mocking `fetch`. Add tests for:

- Transfer amount validation: `onSaved` is not called when `linkedAccountId` is set
  and amount is ≤ 0
- Month-of-year selector appears when frequency is annual, hidden otherwise
  Prior art: `AccountCreateModal.test.tsx` uses a similar modal-with-form pattern.

---

## Out of Scope

- Restschuld Trajectory Chart — deferred to its own PRD cycle
- Account `kind` editing — cascading effects on projection and column logic
- Quarterly `monthOfYear` equivalent — quarterly transactions are not used for ST;
  out of scope for this change
- Server-side validation for `monthOfYear` range (1–12) — low priority; the form
  constrains the value at input time
- Delete confirmation UX — window.confirm is kept as-is; replacing it with an
  in-UI confirm modal is a separate UX improvement
- StrictMode double-invoke of state updaters — the actual cause of any observed
  doubling was the double API call, now fixed; no StrictMode-specific workaround
  is needed

---

## Further Notes

**Dev journal entry for `monthOfYear`:** The migration is forward-compatible and
additive. No existing records are broken. Users with existing annual recurring
transactions will see them continue to fire at the projection-start month until they
open and re-save the transaction, at which point the correct `monthOfYear` is
persisted. This should be noted in the dev journal so future developers understand
why old records may not reflect the user's intended ST month.
