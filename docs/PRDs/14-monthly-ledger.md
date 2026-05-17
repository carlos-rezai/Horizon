# Monthly Ledger

## Problem Statement

Horizon has no structured way to view or record what was actually spent
in a given month. One-off transactions are entered from the Account Detail
page — a per-account entry point that gives no sense of the full month.
Recurring commitments and ad-hoc spending share the same interface,
blurring the distinction between what is fixed and what is variable.
Editing an account is also fragmented: name and balance are separate
inline forms that don't expose icon or colour.

## Solution

Introduce a dedicated Month Overview page reachable from both the
dashboard and the Financial Plan. The dashboard gains a Month Card that
always shows the current month at a glance. The Account Detail page is
simplified to account configuration and recurring transactions only.
One-off spending is recorded exclusively in the Month Overview, where
recurring commitments are shown as read-only context alongside editable
transaction entry. A reusable DatePicker primitive replaces all native
date inputs across the app.

## User Stories

1. As a user, I want to open the current month from the dashboard so that
   I can quickly see and record this month's spending.
2. As a user, I want the Month Card to show how much I have spent this
   month and a breakdown by category so that I understand my spending at
   a glance.
3. As a user, I want to navigate to any month's overview from the
   Financial Plan so that I can record actuals directly from the plan I
   am reviewing.
4. As a user, I want to browse months with prev/next arrows in the Month
   Overview so that I can move between months without returning to the
   dashboard.
5. As a user, I want to see all my accounts as tabs in the Month Overview
   so that I can switch between them without leaving the page.
6. As a user, I want to see projected and actual account balances at the
   top of the Month Overview so that I know where each account stands for
   that month.
7. As a user, I want my recurring transactions shown as read-only context
   in the Month Overview so that I know what is already committed without
   being able to accidentally edit them there.
8. As a user, I want to add a one-off transaction in the Month Overview
   so that I can record actual spending scoped to that month.
9. As a user, I want the date picker when adding a transaction to be
   constrained to the selected month so that I cannot accidentally date a
   transaction outside the month I am recording.
10. As a user, I want to add a transfer between accounts from the Month
    Overview so that I can record inter-account movements in the same
    place as my spending.
11. As a user, I want to click a transaction row in the Month Overview to
    edit or delete it so that I can correct mistakes without navigating
    away.
12. As a user, I want the Account Detail page to show only recurring
    transactions so that I can focus on my fixed commitments when managing
    an account.
13. As a user, I want to open an edit modal from the Account Detail page
    that lets me update the account name, kind, icon, colour, and opening
    balance in one place so that I do not have to use separate fragmented
    fields.
14. As a user, I want the recurring transaction list to have column headers
    so that I know what each column represents.
15. As a user, I want the day of month for a recurring transaction to be
    shown as an ordinal (1st, 15th, 22nd) so that it reads naturally.
16. As a user, I want to set the day of month for a recurring transaction
    using a stepper control so that the 1–31 constraint is obvious and
    easy to adjust.
17. As a user, I want every date input in the app to open a calendar picker
    displaying dates in DD.MM.YYYY format so that dates feel consistent
    with my locale.
18. As a user, I want the recurring transactions section header and the
    add button to sit in one compact row so that the page is less
    vertically padded.
19. As a user, I want the Month Overview to show an empty state when no
    one-off transactions have been recorded so that I know I can start
    adding them.
20. As a user, I want an empty state on the Month Card when no transactions
    exist for the current month so that the dashboard does not show a
    blank or broken chart.
21. As a user, I want the balance summary bar in the Month Overview to
    reflect actual data when available and projected data otherwise, using
    the same logic as the Financial Plan, so that I can trust the numbers.
22. As a user, I want deleting a transfer from the Month Overview to remove
    both legs so that my account balances stay consistent.
23. As a user, I want the account tabs in the Month Overview to default to
    the first account so that the page is immediately useful on open.
24. As a user, I want navigating back from the Month Overview to return me
    to whichever page I came from so that my context is preserved.

## Implementation Decisions

### New route

- `/months/:month` where `month` is `YYYY-MM` (ISO month string)
- Registered in `App.tsx` alongside existing routes
- `MonthPage` reads the `:month` param and passes it to `MonthOverview`

### New feature folder: `monthly`

Contains all business logic and UI for the Monthly Ledger:

- `useMonthTransactions(accountId, month)` — fetches one-off transactions
  for the given account and month; exposes create, update, and remove
  operations
- `MonthOverview` — the full page body: balance summary bar, account
  tabs, Recurring This Month section, editable transaction list
- `MonthCard` — the dashboard widget; derives totals and the stacked
  category bar from the current month's transactions

### New primitives

- `DatePicker` — controlled component; receives and emits ISO date
  strings; displays in DD.MM.YYYY; opens a calendar on input click;
  accepts optional `minDate` and `maxDate` to constrain the selectable
  range; used wherever a date is entered
- `Stepper` — controlled number input with decrement and increment
  buttons; accepts `min`, `max`, and `step` props; used for the
  `dayOfMonth` field in `RecurringTransactionModal`

### New utility: `toOrdinal`

- Pure function added to `src/utils/format/`; converts an integer to its
  English ordinal string (1 → "1st", 2 → "2nd", 3 → "3rd", 15 → "15th")
- Must have a test

### Server: month-scoped transaction query

- `GET /accounts/:id/transactions` gains an optional `?month=YYYY-MM`
  query parameter
- When present, the server filters results to transactions whose `date`
  falls within that month before returning
- No schema change required; `date` is already an ISO string on every
  transaction

### `TransactionCreateModal` changes

- Gains an optional `linkedAccountId` picker (the destination account for
  a transfer) — same pattern as `RecurringTransactionModal`; leaving it
  blank produces a plain transaction, selecting one produces a transfer
- Gains an optional `month` prop; when provided, the `DatePicker` is
  constrained to that month (`minDate` = first day, `maxDate` = last day)
- Replaces the `type="date"` input with the new `DatePicker` primitive
- `TransferCreateModal` is removed; all transfer creation flows through
  `TransactionCreateModal`

### `TransactionEditModal` changes

- Replaces the `type="date"` input with the new `DatePicker` primitive
- No other changes

### `AccountCreateModal` changes

- Gains an optional `account: AccountWithBalance` prop
- When present: modal is in edit mode — all fields pre-populated from the
  account; submit issues `PATCH /accounts/:id`; button label reads "Save
  changes"; title reads "Edit account"
- When absent: existing create behaviour unchanged

### `AccountDetailHeader` changes

- Both inline edit flows (name, opening balance) are removed
- A single pencil icon button is added; clicking it opens
  `AccountCreateModal` in edit mode
- The delete button and confirmation flow are retained unchanged
- The component becomes a pure display component with two action buttons

### `AccountDetailPage` changes

- The Transactions card (containing `TransactionCreateModal` and
  `TransferCreateModal`) is removed entirely
- The `hasTransactions` fetch is retained for the delete guard
- The Recurring Transactions section header and add button move into one
  flex row (heading left, button right)
- Button margins are added throughout

### `RecurringTransactionList` changes

- A column header row is added: Name | Amount | Frequency | Day
- `dayOfMonth` is rendered via `toOrdinal` instead of a bare integer

### `RecurringTransactionModal` changes

- `dayOfMonth` input replaced with the new `Stepper` primitive,
  constrained to 1–31

### `ProjectionAccordion` changes

- Each month label cell becomes a `<Link>` to `/months/YYYY-MM`
- Underline on hover; no additional button chrome

### `DashboardPage` changes

- `MonthCard` inserted between the Accounts Summary section and the Plan
  Overview section
- `MonthCard` navigates to `/months/YYYY-MM` for the current month on
  click

### `AccountCreateModal` — Opening Date

- The `type="date"` input for `openingDate` is replaced with the new
  `DatePicker` primitive

## Testing Decisions

Good tests assert external behaviour — what the component or function
renders or returns — not internal state or implementation details. Tests
should not mock the module under test or rely on internals.

### What to test

- **`toOrdinal`** — pure function; test the full boundary set: 1st, 2nd,
  3rd, 4th–20th (all "th"), 21st, 22nd, 23rd, 24th–30th, 31st. Prior
  art: `src/utils/format/format.test.ts`
- **`useMonthTransactions`** — hook test; assert it fetches the correct
  URL, returns transactions filtered to the month, exposes create/update/
  remove, handles loading and error states. Prior art:
  `src/features/transactions/useTransactions.test.ts`
- **`MonthCard`** — render test; assert month name, total, count, and
  the category bar segments are present; assert empty state renders when
  no transactions. Prior art: `src/components/BalanceCard/BalanceCard.test.tsx`
- **`MonthOverview`** — render test; assert account tabs render one per
  account; assert Recurring This Month section renders recurring items as
  disabled; assert one-off transaction rows are present; assert empty
  state for no transactions. Prior art:
  `src/features/accounts/AccountOverview/AccountOverview.test.tsx`
- **`AccountCreateModal` edit mode** — assert all fields are pre-populated
  from the `account` prop; assert submit calls `PATCH`; assert button
  label is "Save changes". Prior art: `src/features/accounts/AccountCreateModal/AccountCreateModal.test.tsx`
- **`RecurringTransactionList`** — assert column headers render; assert
  `dayOfMonth` values appear as ordinals. Prior art:
  `src/features/transactions/RecurringTransactionList/RecurringTransactionList.test.tsx`
- **`DatePicker`** — assert it displays the value in DD.MM.YYYY format;
  assert it emits an ISO string on selection. No prior art — first
  calendar primitive in the codebase.
- **`Stepper`** — assert increment and decrement buttons update the
  displayed value; assert it clamps to min/max. No prior art.

### What not to test

- Styled-components output or specific CSS values
- Internal hook state variables
- Whether `navigate` was called with exact string arguments — test the
  rendered link target (`href`) instead

## Out of Scope

- **DD.MM.YYYY display refactor** across all existing date displays in
  the app (projection rows, transaction lists) — a separate follow-up
  feature
- **Budget targets or spending limits** per month — Horizon has no budget
  model
- **Filtering or searching** within the month transaction list
- **Bulk import or export** of monthly transactions
- **Google Auth, cloud deployment** — permanently out of scope for Horizon

## Further Notes

- The `MonthlySnapshot` for a given month is already computed by the
  Projection Engine; the `MonthOverview` balance summary bar reads
  directly from the snapshot array already fetched by `useProjection` —
  no new backend endpoint is needed for balance data
- The Category Bar in `MonthCard` groups `Transaction.category` values
  client-side; no new API is needed
- `TransferCreateModal` is deleted as part of this feature — any tests
  referencing it are removed alongside it
- The `hasTransactions` guard on the account delete button continues to
  check for any transaction on the account, including those entered via
  the Month Overview
