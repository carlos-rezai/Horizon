# Plan: Monthly Ledger

> Source PRD: https://github.com/crezai/horizon/issues/93

## Architectural decisions

- **Route**: `/months/:month` where `month` is `YYYY-MM`; registered in `App.tsx` alongside existing routes; `MonthPage` reads `:month` param
- **Feature folder**: `src/features/monthly/` — owns `MonthOverview`, `MonthCard`, `useMonthTransactions`
- **Schema**: no new tables; month filtering handled server-side via `?month=YYYY-MM` query param on `GET /accounts/:id/transactions`
- **Key models**: `MonthlySnapshot` (already exists in projection types); one-off transactions use the existing `Transaction` shape
- **Balance data**: `MonthOverview` balance summary bar reads from `useProjection` snapshot array — no new backend endpoint
- **Transfer CRUD**: `TransferCreateModal` deleted; all transfer creation goes through `TransactionCreateModal` with optional `linkedAccountId`
- **New primitives**: `DatePicker` and `Stepper` added to `src/primitives/`
- **New utility**: `toOrdinal` added to `src/utils/format/`

---

## Phase 1: Route scaffold + navigation entry points

**User stories**: 1, 3, 4, 23, 24

### What to build

Register `/months/:month` in `App.tsx`. Create `MonthPage` (reads the `:month` param) with a `MonthOverview` shell that renders account tabs defaulting to the first account. Add a stub `MonthCard` to the dashboard between the Accounts Summary and Plan Overview sections — it shows the current month label and navigates to `/months/YYYY-MM` on click, with a placeholder empty state. Convert each month label cell in `ProjectionAccordion` into a `<Link>` to `/months/YYYY-MM`. Implement back-navigation so MonthOverview returns the user to whichever page they came from.

### Acceptance criteria

- [ ] Navigating to `/months/2026-05` renders `MonthOverview` without crashing
- [ ] Account tabs render one tab per account; first tab is active by default
- [ ] `MonthCard` appears on the dashboard and links to the current month
- [ ] Each month cell in `ProjectionAccordion` is a link that navigates to the correct month route
- [ ] Browser back button from `MonthOverview` returns to the originating page

---

## Phase 2: Balance summary bar

**User stories**: 5, 6, 21

### What to build

`MonthOverview` calls `useProjection` and locates the `MonthlySnapshot` matching the `:month` param. A balance summary bar at the top of the page displays projected and actual balances per account for that month, using actual data where available and projected data otherwise — matching the same logic as the Financial Plan. Account tabs remain one per account.

### Acceptance criteria

- [ ] Balance summary bar renders projected balance for each account for the selected month
- [ ] When actual data exists for an account in that month, actual balance is shown instead of projected
- [ ] Selecting a different account tab updates the active tab highlight (bar data is per-account)
- [ ] Navigating to a past or future month shows the correct snapshot values

---

## Phase 3: New primitives + `toOrdinal` utility

**User stories**: 15, 16, 17

### What to build

Add `toOrdinal` to `src/utils/format/` with a full boundary test suite. Build a `DatePicker` primitive: controlled, displays dates in DD.MM.YYYY, emits ISO strings, opens a calendar on click, accepts optional `minDate`/`maxDate`. Build a `Stepper` primitive: controlled number input with decrement/increment buttons, `min`/`max`/`step` props. Wire `DatePicker` into `TransactionCreateModal`, `TransactionEditModal`, and the `openingDate` field in `AccountCreateModal`, replacing all `type="date"` inputs. Wire `Stepper` into `RecurringTransactionModal` for the `dayOfMonth` field (constrained 1–31).

### Acceptance criteria

- [ ] `toOrdinal` converts 1 → "1st", 2 → "2nd", 3 → "3rd", 4–20 → "th", 21 → "21st", 22 → "22nd", 23 → "23rd", 31 → "31st"; all boundary cases have passing tests
- [ ] `DatePicker` displays a given ISO date string as DD.MM.YYYY and emits an ISO string on selection
- [ ] `DatePicker` respects `minDate` and `maxDate` — dates outside the range are not selectable
- [ ] `Stepper` increments and decrements the displayed value; clamps to `min` and `max`
- [ ] All existing date inputs in `TransactionCreateModal`, `TransactionEditModal`, and `AccountCreateModal` use `DatePicker`
- [ ] `RecurringTransactionModal` `dayOfMonth` uses `Stepper`; 1–31 range is enforced

---

## Phase 4: Recurring context + one-off transaction list

**User stories**: 7, 8, 9, 19

### What to build

Add an optional `?month=YYYY-MM` query parameter to `GET /accounts/:id/transactions` on the server; when present, filter results to transactions whose `date` falls within that calendar month. Build `useMonthTransactions(accountId, month)` exposing the filtered transaction list plus `create`, `update`, and `remove` operations. In `MonthOverview`, add a "Recurring This Month" section showing recurring transactions as read-only rows, and below it an editable one-off transaction list with an add button. The add form uses `DatePicker` constrained to the selected month. Show an empty state when no one-off transactions have been recorded.

### Acceptance criteria

- [ ] `GET /accounts/:id/transactions?month=2026-05` returns only transactions dated in May 2026
- [ ] `useMonthTransactions` fetches the correct URL and exposes create/update/remove
- [ ] "Recurring This Month" section renders recurring transaction rows as disabled (not editable)
- [ ] One-off transaction rows appear below the recurring section
- [ ] Empty state renders when no one-off transactions exist for the month
- [ ] `DatePicker` in the add form only allows dates within the selected month
- [ ] Switching account tabs shows transactions for the newly selected account

---

## Phase 5: Transfer entry + edit/delete

**User stories**: 10, 11, 22

### What to build

Extend `TransactionCreateModal` with an optional `linkedAccountId` picker (a select showing all other accounts). Leaving it blank creates a plain transaction; selecting one creates a transfer. Add an optional `month` prop to constrain the `DatePicker`. Wire this into the `MonthOverview` add flow. Add click-to-edit behaviour on one-off transaction rows in `MonthOverview`, opening `TransactionEditModal`. Add a delete action that, for transfers, calls the existing remove-transfer endpoint to delete both legs. Delete `TransferCreateModal` and remove any references to it.

### Acceptance criteria

- [ ] Selecting a destination account in `TransactionCreateModal` creates a transfer visible on both accounts
- [ ] Leaving the destination account blank creates a plain transaction
- [ ] Clicking a one-off transaction row in `MonthOverview` opens the edit modal pre-populated
- [ ] Deleting a transfer from `MonthOverview` removes both legs; neither account shows the orphaned entry
- [ ] `TransferCreateModal` is gone from the codebase; its tests are removed

---

## Phase 6: Account Detail simplification

**User stories**: 12, 13, 14, 18

### What to build

Extend `AccountCreateModal` with an optional `account: AccountWithBalance` prop. When present the modal is in edit mode: all fields pre-populated, submit issues `PATCH /accounts/:id`, title reads "Edit account", button reads "Save changes". Strip both inline edit flows (name, opening balance) from `AccountDetailHeader` and replace them with a single pencil icon button that opens `AccountCreateModal` in edit mode. Remove the Transactions card (containing `TransactionCreateModal` and `TransferCreateModal`) from `AccountDetailPage` entirely. Add column headers (Name | Amount | Frequency | Day) to `RecurringTransactionList`; render `dayOfMonth` via `toOrdinal`. Collapse the recurring section header and add button into a single flex row.

### Acceptance criteria

- [ ] Opening the pencil button on Account Detail pre-populates all account fields and issues `PATCH` on submit
- [ ] `AccountDetailPage` no longer shows a transaction entry form or transfer entry form
- [ ] `RecurringTransactionList` shows column headers: Name, Amount, Frequency, Day
- [ ] `dayOfMonth` values in the list display as ordinals (e.g. "15th")
- [ ] The recurring section header and add button occupy a single compact row
- [ ] `AccountCreateModal` edit mode test asserts pre-population, `PATCH` call, and "Save changes" label

---

## Phase 7: MonthCard full

**User stories**: 2, 20

### What to build

Flesh out `MonthCard` with real data from `useMonthTransactions` for the current month. Display the total spent, transaction count, and a stacked category bar that groups `Transaction.category` values client-side. Show an empty state when no transactions exist for the current month.

### Acceptance criteria

- [ ] `MonthCard` shows the correct total and transaction count for the current month
- [ ] Category bar renders one segment per category, sized proportionally
- [ ] Empty state renders when no transactions exist for the current month
- [ ] `MonthCard` test asserts month name, total, count, category segments, and empty state
