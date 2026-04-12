# Plan: Account + Transaction UI

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/14

## Architectural decisions

- **Routes**: `/` (dashboard, existing) and `/accounts/:id` (new account detail page)
- **No server changes**: all required API endpoints are already built and tested
- **Money boundary**: all amounts stored as integer cents; `currency.ts` is the single conversion point (`eurosToCents` / `centsToEuros`); `formatBalance` handles display formatting
- **Shared types**: `Transaction`, `RecurringTransaction`, and `Category` interfaces added to `src/types/`
- **Hook pattern**: each data domain gets its own hook that owns fetch + all mutations; components receive data and callbacks as props, never call the API directly
- **Modal pattern**: create and edit use the same modal approach established by `MilestoneTracker`; modals manage their own local form state

---

## Phase 1: Route + Account Creation + Header Actions

**User stories**: 1–18

### What to build

Wire a `/accounts/:id` route in the existing router. The detail page is a thin composition layer — it shows the account name and current balance in a header, a back link to the dashboard, and placeholder sections for transactions and recurring transactions.

Build an account creation modal on the dashboard triggered by an "Add account" button. The form captures kind, name, opening balance (in euros), opening date, and — conditionally when kind is Mortgage — a Sondertilgung Allowance. On success, navigate to the new account's detail page. On failure, display the server error inline. The modal can be dismissed without saving.

Update `AccountOverview` so each account entry is a link that navigates to `/accounts/:id`.

In the detail header, add inline rename (an edit icon that makes the name editable in place, with save/cancel) and a delete button. The delete button is disabled with a tooltip when the account has transactions; when enabled, it shows a confirmation prompt before calling the API. On delete success, navigate back to the dashboard.

Introduce `currency.ts` with `eurosToCents` and `centsToEuros`. Introduce the `Transaction`, `RecurringTransaction`, and `Category` shared types.

### Acceptance criteria

- [ ] "Add account" button on the dashboard opens the account creation modal
- [ ] All five account kinds are selectable; Sondertilgung Allowance field appears only when Mortgage is selected
- [ ] Submitting with missing required fields shows inline validation errors before calling the API
- [ ] A successful creation navigates to `/accounts/:id` for the new account
- [ ] A server error on creation is shown inline; the modal stays open
- [ ] Closing the modal without saving leaves the account list unchanged
- [ ] Each account entry in `AccountOverview` links to `/accounts/:id`
- [ ] The detail page header shows the account name, current balance, and a back link to the dashboard
- [ ] The account name can be renamed inline; the new name is reflected immediately on save
- [ ] The delete button is disabled with an explanation when the account has transactions
- [ ] Confirming delete removes the account and navigates back to the dashboard
- [ ] `eurosToCents` and `centsToEuros` are covered by unit tests including rounding edge cases

---

## Phase 2: Transaction List + Add

**User stories**: 19–28, 31–32

### What to build

Build `useTransactions(accountId)` — fetches `GET /accounts/:id/transactions` and exposes a create mutation that calls `POST /accounts/:id/transactions`. Amounts from the server (cents) are kept as-is in the hook; conversion happens only at the form boundary.

Build `TransactionList` — renders the full transaction list sorted by date descending, with each row showing date, formatted amount, description, and category. Transfer entries (those with a `transferId`) get a visual indicator. Shows an empty state when the list is empty. Shows a back-to-top button when the user has scrolled past approximately 300px.

Build `TransactionCreateModal` — form with date, euro amount input, description, and a simple category `<select>` populated from `GET /categories`. Validates required fields before submitting. Converts the euro input to cents via `eurosToCents` on submit. Shows server errors inline.

Wire both components into the account detail page with an "Add transaction" button that opens the modal.

### Acceptance criteria

- [ ] All transactions for the account appear in the list, sorted by date descending
- [ ] Each row shows date, amount formatted in euros, description, and category
- [ ] Transfer entries have a visible indicator distinguishing them from regular transactions
- [ ] The empty state is shown when the account has no transactions
- [ ] The back-to-top button appears after scrolling ~300px and scrolls smoothly to the top
- [ ] "Add transaction" button opens the creation modal
- [ ] Submitting with missing required fields shows inline validation before calling the API
- [ ] A successful submission appends the transaction to the list and closes the modal
- [ ] A server error is shown inline; the modal stays open
- [ ] The amount is stored as integer cents; the euro input is the only place conversion occurs
- [ ] `useTransactions` create operation is covered by tests

---

## Phase 3: Category Inline Add

**User stories**: 29–30

### What to build

Build `useCategoriesWithInlineAdd()` — fetches `GET /categories` and exposes an `addCategory(name)` handler that calls `POST /categories`, appends the result to the local list, and auto-selects it. Manages in-flight state so the form is disabled while the new category is being created.

Replace the simple `<select>` in `TransactionCreateModal` with the inline-add version: the dropdown includes a special "+ Add category" option; selecting it reveals a text input; submitting the input triggers `addCategory`, then returns focus to the form ready to submit.

### Acceptance criteria

- [ ] The category dropdown is populated with all existing categories
- [ ] Selecting "+ Add category" reveals a text input
- [ ] Submitting the text input creates the category, appends it to the dropdown, and selects it automatically
- [ ] The form is disabled while category creation is in flight
- [ ] If category creation fails, an error is shown and the dropdown returns to its prior state
- [ ] `useCategoriesWithInlineAdd` inline-add behaviour is covered by tests

---

## Phase 4: Transaction Edit + Delete

**User stories**: 33–38

### What to build

Build `TransactionEditModal` — opens when a transaction row is clicked; pre-populated with the transaction's current values. Exposes save (calls `PATCH /transactions/:id`) and delete (with a confirmation step).

The modal inspects `transferId` on the transaction. If set, it renders a note ("This is one leg of a transfer — deleting it will remove both legs"), disables the fields, and routes the delete button to `DELETE /transfers/:transferId`. If not set, full editing is available and delete calls `DELETE /transactions/:id`.

Extend `useTransactions` with update and delete mutations.

### Acceptance criteria

- [ ] Clicking a transaction row opens the edit modal pre-populated with its values
- [ ] Saving edits updates the transaction in the list and closes the modal
- [ ] The delete button prompts for confirmation before calling the API
- [ ] A successful delete removes the transaction from the list and closes the modal
- [ ] Transfer entries show the two-leg note; their fields are not editable
- [ ] Deleting a transfer entry calls `DELETE /transfers/:transferId` and removes both entries from the list
- [ ] Server errors on save or delete are shown inline; the modal stays open
- [ ] `TransactionEditModal` transfer branch behaviour is covered by tests

---

## Phase 5: One-off Transfers

**User stories**: 39–44

### What to build

Build `TransferCreateModal` — form with a destination account selector (populated from the accounts list, excluding the current account), euro amount, date, description, and category (using `useCategoriesWithInlineAdd`). On submit, calls `POST /transfers` with `fromAccountId`, `toAccountId`, amount in cents, date, description, and category. On success, refreshes the transaction list (the new debit leg appears) and closes the modal.

Wire an "Add transfer" button on the detail page, displayed alongside "Add transaction".

### Acceptance criteria

- [ ] "Add transfer" button is visible on the detail page alongside "Add transaction"
- [ ] The destination account selector shows all accounts except the current one
- [ ] Submitting with missing required fields shows inline validation before calling the API
- [ ] A successful submission adds the debit leg to the current account's transaction list
- [ ] The new entry has a transfer indicator in the list
- [ ] A server error is shown inline; the modal stays open

---

## Phase 6: Recurring Transactions

**User stories**: 45–53

### What to build

Build `useRecurringTransactions(accountId)` — fetches `GET /recurring-transactions` and filters client-side by `accountId`. Exposes create, update, toggleIsActive, and delete mutations.

Build `RecurringTransactionList` — renders all recurring transactions for the account. Each row shows amount, description, category, frequency, day of month, and linked account (if set). Dimmed styling for inactive entries. Each row has an isActive toggle (calls `PATCH /recurring-transactions/:id` with `{ isActive: !current }`). Clicking a row opens the edit modal.

Build `RecurringTransactionModal` — single modal for both create and edit. Fields: amount in euros, description, category (with inline add), frequency select (monthly / quarterly / annual), day of month, and an optional "Transfer to account" dropdown showing all other accounts. Includes delete (with confirmation) when in edit mode.

Wire a "Add recurring transaction" button and the `RecurringTransactionList` into the account detail page as a second section below transactions.

### Acceptance criteria

- [ ] All recurring transactions for the account appear in the list
- [ ] Active and inactive recurring transactions are visually distinct
- [ ] The isActive toggle fires immediately and reflects the updated state
- [ ] "Add recurring transaction" opens the creation modal
- [ ] All fields are present including the optional "Transfer to account" dropdown
- [ ] Submitting with missing required fields shows inline validation before calling the API
- [ ] A successful creation adds the entry to the list
- [ ] Clicking a recurring transaction row opens the edit modal pre-populated
- [ ] Saving edits updates the entry in the list
- [ ] Deleting prompts for confirmation, then removes the entry from the list
- [ ] Server errors on any operation are shown inline
- [ ] `useRecurringTransactions` toggle, create, and delete operations are covered by tests
