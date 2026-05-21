## Problem Statement

Five UI polish defects were identified in the monthly-ledger feature after
the build phase:

1. The `RecurringTransactionList` column header is missing a "To account"
   header cell, and linked-account rows render an empty indicator span
   instead of the destination account name.
2. Opening the "Add transaction" modal from `MonthOverview` omits the
   `accounts` prop, so the optional "Transfer to account" picker never
   appears.
3. Account tabs in `MonthOverview` always use the theme's primary color for
   the active state instead of the account's own color.
4. Balance values in `StyledBalanceSummaryBar` render in a single neutral
   color regardless of whether the account is a liability or an asset.
5. Transaction amounts in both `RecurringTransactionList` and the
   `MonthOverview` one-off / recurring rows render in a single neutral color
   regardless of sign.

## Solution

Six focused commits — one per concern — each leaving the app in a working
state.

1. Pass `accounts` prop to `TransactionCreateModal` in `MonthOverview` so
   the transfer picker appears.
2. Add a "To account" column to `RecurringTransactionList`: new header cell,
   resolved account name in rows, `accounts` prop threaded in from
   `AccountDetailPage`.
3. Color recurring transaction amounts green / red by sign in
   `RecurringTransactionList`.
4. Color one-off and recurring amounts green / red by sign in `MonthOverview`.
5. Tint the active account tab with the account's own color.
6. Color balance values in `StyledBalanceSummaryBar` using the same
   liability / asset logic as `AccountOverview`.

## Commits

### Commit 1 — Pass `accounts` prop to `TransactionCreateModal` in `MonthOverview`

`MonthOverview` renders `TransactionCreateModal` without the `accounts` prop,
which gates the linked-account picker inside the modal. Add `accounts={accounts}`
to the modal call.

Update `MonthOverview.test.tsx` to assert that the "To account" select
element is present when the modal opens.

### Commit 2 — Add "To account" column to `RecurringTransactionList`

Add an optional `accounts?: AccountWithBalance[]` prop to
`RecurringTransactionList`. Add a fifth `StyledHeaderCell` ("To account") to
match the existing five-column grid. Replace the conditional
`StyledLinkedIndicator` (currently an empty span) with an always-rendered
text cell that resolves the destination account name when `linkedAccountId`
is set, or "—" otherwise.

Change the grid's fifth column from `auto` to a fixed width consistent with
the other text columns for layout stability.

Remove `StyledLinkedIndicator` from the styles file — it is no longer needed.

Thread `accounts` down from `AccountDetailPage` to `RecurringTransactionList`.

Update tests: remove the `linked-account-indicator` testid assertion; add
assertions for the "To account" header and the resolved account name in
linked rows; assert "—" in non-linked rows.

### Commit 3 — Color transaction amounts by sign in `RecurringTransactionList`

Add a `$isPositive: boolean` transient prop to `StyledAmount`. Map
`amount >= 0` to `theme.colors.secondary` and `amount < 0` to
`theme.colors.error`. Pass `rt.amount >= 0` at the call site.

Update tests to assert the correct color for positive and negative amounts.

### Commit 4 — Color transaction amounts by sign in `MonthOverview`

Add a `StyledSignedAmount` styled span (with `$isPositive: boolean`) to
`MonthOverview.styles.ts`. Use it for the amount cell in both the "Recurring
this month" section and the one-off transaction table.

Update tests to assert color for positive and negative amounts in both
sections.

### Commit 5 — Tint active account tab with account color

Add a `$color?: string` transient prop to `StyledTab` in
`MonthOverview.styles.ts`. When active, use `$color ?? theme.colors.primary`
for both the border-bottom and text. When inactive, preserve the existing
neutral style.

In `MonthOverview`, pass `account.color ?? undefined` to each `StyledTab`.

Update tests to assert that the active tab renders with the account's hex
color, not the generic primary.

### Commit 6 — Color balance values in `StyledBalanceSummaryBar` by account kind

Add a `$isLiability: boolean` transient prop to `StyledBalanceValue` in
`MonthOverview.styles.ts`. When true, use `theme.colors.error`; otherwise
use `theme.colors.secondary`. This mirrors the `$isLiability` pattern in
`AccountOverview.styles.ts`.

In `MonthOverview`, define
`LIABILITY_KINDS = new Set<AccountKind>(["Mortgage", "CreditCard"])` and
derive `isLiability` from `account.kind` when rendering each
`StyledBalanceValue`.

Update tests to assert that a Mortgage balance renders with the error color
and a Girokonto balance renders with the secondary color.

## Decision Document

**RecurringTransactionList "To account" column:**

- The column always renders (shows "—" for non-transfers) rather than
  appearing conditionally. This avoids the header / row misalignment that
  exists today.
- The fifth grid column changes from `auto` to a fixed width matching the
  other text columns for layout stability.
- `AccountWithBalance` is already available at every call site —
  `AccountDetailPage` holds all accounts from `useAccounts()`.
- `StyledLinkedIndicator` is removed entirely; it had no text content and
  is superseded by the new text cell.
- If `linkedAccountId` is set but no matching account is found (e.g. after
  a delete), the cell falls back to "—".

**TransactionCreateModal accounts prop:**

- The transfer picker is already fully implemented inside
  `TransactionCreateModal` — it is gated purely by the presence of the
  `accounts` prop. The fix is a single-prop addition, not new feature work.

**Tab color:**

- Only the active tab uses the account color (border + text). Inactive tabs
  stay neutral to avoid a visually cluttered tab row.
- `account.color` is nullable; the styled component falls back to
  `theme.colors.primary` when `$color` is undefined.

**Balance bar color logic:**

- Follows the identical `LIABILITY_KINDS` pattern already established in
  `AccountOverview`. No new convention introduced.
- `AccountKind` is imported from the shared `src/types/account` module.

**Amount coloring:**

- Sign-based (not account-kind-based) because amounts represent actual
  cashflow direction — positive is income / inflow, negative is expense /
  outflow.
- `amount >= 0` → `theme.colors.secondary` (positive cashflow)
- `amount < 0` → `theme.colors.error` (expense / outflow)
- Zero is treated as positive (neutral / break-even).

## Testing Decisions

Good tests verify external behaviour, not implementation details. They assert
what is rendered to the user — a column header, a color value, an account
name — not which styled component is used internally.

**Modules with new or updated test coverage:**

`RecurringTransactionList`:

- "To account" header cell is present in the rendered output.
- Linked row shows the resolved destination account name.
- Non-linked row shows "—" in the To account column.
- Positive amount has secondary color; negative amount has error color.

`MonthOverview`:

- "To account" select element is present when the add-transaction modal opens
  (confirming `accounts` prop is forwarded).
- Active tab renders with the account's hex color string, not the theme primary.
- Mortgage balance value has error color; Girokonto balance value has secondary
  color.
- Positive one-off amount has secondary color; negative has error color.
- Positive recurring amount has secondary color; negative has error color.

**Prior art for test style:**

- `AccountOverview.test.tsx` — liability color assertion pattern.
- `RecurringTransactionList.test.tsx` — existing header and row rendering.
- `MonthOverview.test.tsx` — existing modal open / close and tab switching.

## Out of Scope

- DD.MM.YYYY display refactor across existing date fields (noted in design
  log as a separate follow-up feature).
- MonthCard dashboard integration (separate tracked gap).
- `MonthPage.styles.ts` and `MonthPage.test.tsx` stub files (cosmetic gap,
  separate commit).
- Coloring the balance label (account name text) in the summary bar — only
  the value is colored.
- Coloring amounts inside `TransactionEditModal` — only the create / list
  contexts are in scope.
