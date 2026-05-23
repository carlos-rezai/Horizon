## Problem Statement

The Credit Card Auto-Settlement feature was shipped across five implementation
phases, but several issues remain that prevent it from being considered complete
and production-quality:

1. The `InsufficientFundsWarnings` component was built and tested but never
   mounted in the app layout — the warning system is invisible to the user.
2. Read-only enforcement for auto-settlement transactions is fragile. It relies
   only on a disabled click handler in `TransactionList`; the backend accepts
   PATCH and DELETE requests on auto-settlement transactions without complaint,
   leaving the ledger open to accidental corruption.
3. The CreditCard settlement fields (`linkedAccountId` dropdown and
   `settlementDay` input) are implemented inline inside `AccountCreateModal`.
   They are untested, not reusable, and inconsistent: `settlementDay` uses a
   raw `<Input type="number">` rather than the `Stepper` primitive used for the
   analogous `dayOfMonth` field in `RecurringTransactionModal`.
4. The `src/features/settlements/` folder has no `index.ts` barrel export,
   breaking the established feature module pattern shared by every other feature.
5. The `POST /settlements/generate` call fired by `AccountCreateModal` after
   saving a CreditCard account is entirely silent — failures are swallowed and
   the user receives no feedback.
6. The frontend has no client-side tests covering the CreditCard settlement field
   conditional rendering or the settlement generation trigger.

## Solution

Address each gap in isolation, one commit at a time, leaving the codebase in a
working state after every step:

1. Add the missing `index.ts` barrel export to `src/features/settlements/`.
2. Extract the CreditCard settlement form fields into a standalone
   `CreditCardSettlementFields` component inside `src/features/settlements/`,
   with full co-located tests and styles.
3. Replace the raw `<Input type="number">` for `settlementDay` with the
   `Stepper` primitive capped at 28 — consistent with `dayOfMonth` in
   `RecurringTransactionModal`.
4. Add a backend guard in the transactions route that rejects PATCH and DELETE
   on auto-settlement transactions with a 403.
5. Mount `InsufficientFundsWarnings` in `AppLayout` following the `UpdateBanner`
   pattern exactly, completing the warning system.
6. Add non-blocking error feedback for the settlement generation trigger in
   `AccountCreateModal` — warning-variant Snackbar on failure, without blocking
   the account save.
7. Add client-side tests for `AccountCreateModal`'s CreditCard conditional
   rendering and the settlement generation trigger.

## Commits

### Commit 1 — Add barrel export to the settlements feature

Add `src/features/settlements/index.ts` exporting `useSettlementWarnings` and
`InsufficientFundsWarnings`. No behavior change — purely structural, bringing
the settlements folder into line with `features/accounts/` and
`features/updates/`. All imports from outside the feature should update to use
the barrel.

### Commit 2 — Extract CreditCardSettlementFields into its own component

Create `src/features/settlements/CreditCardSettlementFields/` with three
co-located files: the component, a styles stub, and its tests.

The component receives `girokontoAccounts`, `linkedAccountId`, `settlementDay`,
and `onChange` callbacks for each field as props. It renders the funding account
Select dropdown and the settlement day input. It owns no state and contains no
business logic — it is purely presentational.

Remove the inline CreditCard field block from `AccountCreateModal` and replace
it with `<CreditCardSettlementFields>`. Export the new component from
`src/features/settlements/index.ts`.

Tests cover: fields render when non-empty `girokontoAccounts` are passed; the
account options appear in the dropdown; `onChange` fires with the correct value
for both the account Select and the day input; the styles file is present as a
co-located stub.

AccountCreateModal behavior is unchanged — this is a pure extract-component
refactoring.

### Commit 3 — Replace raw number input with Stepper for settlementDay

In `CreditCardSettlementFields`, replace `<Input type="number" min="1" max="28">`
with the `<Stepper>` primitive configured with `min={1}` and `max={28}`. The
Stepper already accepts optional `min` and `max` props, so no changes to the
primitive are required.

This makes `settlementDay` consistent with `dayOfMonth` in
`RecurringTransactionModal`. Update the component's test to interact with
Stepper's increment/decrement buttons rather than a plain input.

The stored value and its valid range are identical — this is a UI consistency
improvement only.

### Commit 4 — Add backend guard for auto-settlement transaction mutation

In the transactions route, read `isAutoSettlement` from the database record
before processing any PATCH or DELETE request. If the transaction is marked as
an auto-settlement, respond with 403 and the body
`{ error: "Auto-settlement transactions cannot be modified" }`.

The guard lives at the route handler level — the same layer as the existing
`in_use` deletion guard on accounts. No changes to the storage layer or schema
are required; the `is_auto_settlement` column already exists.

Add test cases in the transactions route test suite: PATCH on an
auto-settlement transaction → 403; DELETE on an auto-settlement transaction →
403; PATCH on a regular transaction → proceeds as normal.

### Commit 5 — Wire InsufficientFundsWarnings into AppLayout

In `AppLayout`, call `useSettlementWarnings()` and render
`<InsufficientFundsWarnings warnings={warnings} />` as a sibling to
`<UpdateBanner />`, placed after `<StyledMain>` in the layout wrapper. This
mirrors the UpdateBanner integration pattern exactly.

Update `AppLayout.test.tsx` with a test case: when the settlements hook returns
a non-empty warnings array, `InsufficientFundsWarnings` is present in the tree.

This commit is the one that makes the warning system visible to the user for
the first time.

### Commit 6 — Add error feedback for the settlement generation trigger

In `AccountCreateModal`, wrap the `POST /settlements/generate` call in a
try/catch. On failure, flip a local `settlementGenFailed` state flag and render
a warning-variant Snackbar below the form actions with the message: "Account
saved. Settlement generation failed — balances may be out of date. Restart the
app to retry."

The Snackbar is dismissible. The account save is not affected — it has already
completed at the point the generation call is made.

No changes to the server endpoint.

### Commit 7 — Add client-side tests for AccountCreateModal CreditCard integration

In `AccountCreateModal.test.tsx`, add test cases:

- When `kind` is `"CreditCard"`, `CreditCardSettlementFields` is rendered.
- When `kind` is not `"CreditCard"`, settlement fields are absent.
- After a successful CreditCard account save, `POST /settlements/generate` is
  called once.
- When `POST /settlements/generate` returns an error, the warning Snackbar
  appears.

Use the same mock-fetch pattern already established in the existing
`AccountCreateModal.test.tsx`.

## Decision Document

**Modules modified**

- `src/features/settlements/` — add `index.ts` barrel export; add
  `CreditCardSettlementFields` subfolder
- `src/features/accounts/AccountCreateModal/` — remove inline CC fields; add
  settlement generation error feedback; expand tests
- `src/layouts/AppLayout/` — mount `InsufficientFundsWarnings`; expand tests
- Transactions route and its test suite — add `isAutoSettlement` guard on
  PATCH and DELETE

**Interface decisions**

- `CreditCardSettlementFields` props: `{ girokontoAccounts: AccountWithBalance[],
linkedAccountId: string, settlementDay: string,
onLinkedAccountChange: (id: string) => void,
onSettlementDayChange: (day: string) => void }` — plain strings for the
  controlled values, matching the existing state shapes in `AccountCreateModal`.
- `InsufficientFundsWarnings` props: unchanged — `{ warnings:
InsufficientFundsWarning[] }`. `AppLayout` owns the hook call and passes data
  down, following the same split as other layout-level concerns.
- `AppLayout` gains no new public props — the hook call and component render are
  internal implementation details.

**Architectural decisions**

- `CreditCardSettlementFields` lives in `src/features/settlements/` rather than
  `src/features/accounts/`. The component configures settlement behaviour, not
  account metadata — keeping it in the settlements feature makes it reusable and
  keeps settlement-specific UI self-contained. The cross-feature import
  (`AccountCreateModal` ← `features/settlements/`) follows established practice
  (`AppLayout` ← `features/updates/UpdateBanner`).
- The backend guard lives at the route layer, not in storage. No schema change
  is needed — `is_auto_settlement` is already stored. The pattern mirrors the
  `in_use` guard on account deletion.
- `POST /settlements/generate` failure is treated as a non-blocking warning, not
  an error that rolls back the account save. The account is the primary resource;
  settlement generation is a best-effort side-effect.
- `TransactionEditModal` requires no changes. The modal is unreachable for
  auto-settlement transactions via the UI (click is disabled); the backend guard
  is the defensive backstop for any path that bypasses the UI.

**Schema changes**

None. All required columns already exist from migration 006.

## Testing Decisions

A good test verifies external behaviour — what the component renders, what it
calls, what it returns — not internal state or implementation details. Tests must
not assert on CSS class names, styled-component internals, or private functions.

**Modules to test**

- `CreditCardSettlementFields` — new component, fully tested in its co-located
  test file. Prior art: `AccountCreateModal.test.tsx` (conditional rendering,
  field interaction, callback verification).
- `AccountCreateModal` — extend existing test file with CreditCard-specific
  cases and settlement generation trigger. Prior art: same file, existing
  Mortgage conditional-field tests.
- `AppLayout` — extend existing test file with InsufficientFundsWarnings
  integration case. Prior art: `AppLayout.test.tsx` existing UpdateBanner
  presence test.
- Transactions route — extend existing file with auto-settlement guard cases.
  Prior art: `transactions.route.test.ts` existing delete-rejection tests.

## Out of Scope

- No changes to the Projection Engine or settlement computation logic — both are
  solid and fully tested.
- No changes to the Monthly Ledger read-only rendering — already implemented and
  correct.
- No changes to how `linkedSince` is set in the accounts repository — already
  correct.
- No changes to the settlements route endpoints
  (`GET /settlements/warnings`, `POST /settlements/generate`).
- No redesign of the warning message copy or visual treatment.
- No Parity Spec changes — auto-settlement is a SQLite-only concern (Desktop
  Build); the Mongo Driver is permanently out of scope.

## Further Notes

The `useSettlementWarnings` hook currently has no error state — a failed fetch
silently returns an empty warnings array. This is consistent with the
`useUpdateStatus` pattern and is acceptable for now, but worth revisiting if the
warnings system becomes more critical in a future iteration.
