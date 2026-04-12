## Problem Statement

Users can view their account balances and mortgage projections on the dashboard, but they have no way to create accounts, record transactions, or set up recurring transactions. The app's core value — a 10-year financial projection — depends entirely on recurring transactions being configured correctly. Without a UI for creating accounts and recording transactions, Horizon is read-only and cannot be used for real financial tracking.

## Solution

Add an account creation modal to the dashboard and a dedicated account detail page (`/accounts/:id`) where users can record transactions, manage recurring transactions, and handle transfers. The detail page is the primary surface for configuring the projection engine.

## User Stories

### Account Creation

1. As a user, I want to open an "Add account" modal from the dashboard, so that I can create a new account without leaving the overview.
2. As a user, I want to select an account kind (Girokonto, Tagesgeld, Mortgage, CreditCard, Investment) when creating an account, so that the system tracks it correctly.
3. As a user, I want to enter an account name when creating an account, so that I can distinguish multiple accounts of the same kind.
4. As a user, I want to enter an opening balance in euros when creating an account, so that the current balance is correct from day one.
5. As a user, I want to enter an opening date when creating an account, so that the balance history is anchored correctly.
6. As a user, I want to enter a Sondertilgung Allowance only when creating a Mortgage account, so that the field is not shown for irrelevant account kinds.
7. As a user, I want to be taken directly to the new account detail page after creation, so that I can immediately set up recurring transactions.
8. As a user, I want to see a validation error if I submit the account creation form with missing required fields, so that I understand what to fix.
9. As a user, I want to see an error message if account creation fails server-side, so that I know something went wrong.
10. As a user, I want to close the account creation modal without saving, so that I can cancel without side effects.

### Account Detail Page

11. As a user, I want to navigate to an account detail page by clicking its entry in the dashboard account list, so that I can manage its transactions.
12. As a user, I want to see the account name and current balance in the detail page header, so that I know which account I am viewing.
13. As a user, I want a back link from the detail page to the dashboard, so that I can return to the overview.

### Account Edit and Delete

14. As a user, I want to rename an account from the detail page header, so that I can correct a mistake or update a label.
15. As a user, I want to delete an account from the detail page header, so that I can remove accounts I no longer need.
16. As a user, I want to see a confirmation prompt before deleting an account, so that I do not delete it accidentally.
17. As a user, I want the delete button to be disabled with an explanation when the account has transactions, so that I understand why deletion is blocked.
18. As a user, I want to see an error message if the rename fails server-side, so that I know something went wrong.

### Transaction List

19. As a user, I want to see all transactions for an account on the detail page, sorted by date descending, so that I can review recent activity at a glance.
20. As a user, I want to see each transaction's date, amount in euros, description, and category in the list, so that I can identify entries quickly.
21. As a user, I want to see a visual indicator on transfer entries in the list, so that I can distinguish them from regular transactions.
22. As a user, I want to see an empty state when an account has no transactions, so that the page is not confusing on first use.
23. As a user, I want a back-to-top button to appear after scrolling down sufficiently, so that I can return to the top of a long transaction list without scrolling manually.

### Recording Transactions

24. As a user, I want to open an "Add transaction" form from the detail page, so that I can record a financial movement.
25. As a user, I want to enter a date for the transaction, so that the history is accurate.
26. As a user, I want to enter an amount in euros (positive or negative), so that I do not have to think in cents.
27. As a user, I want to enter a description for the transaction, so that I can identify it later.
28. As a user, I want to select a category from a dropdown populated with existing categories, so that transactions are consistently labelled.
29. As a user, I want to add a new category inline within the transaction form, so that I do not have to leave the form to create it.
30. As a user, I want the new category to be selected automatically after inline creation, so that the form is ready to submit immediately.
31. As a user, I want to see a validation error if I submit the transaction form with missing required fields, so that I understand what to fix.
32. As a user, I want to see an error message if transaction creation fails server-side, so that I know something went wrong.

### Editing and Deleting Transactions

33. As a user, I want to open an edit modal by clicking a transaction in the list, so that I can correct mistakes.
34. As a user, I want the edit modal to be pre-populated with the transaction's current values, so that I only change what needs changing.
35. As a user, I want to save my edits and see the updated transaction in the list, so that the correction is confirmed.
36. As a user, I want to delete a transaction from the edit modal with a confirmation step, so that I do not delete it accidentally.
37. As a user, I want the edit modal to identify transfer entries and show a note explaining that deletion will remove both legs, so that I understand the side effect before confirming.
38. As a user, I want deleting a transfer entry to remove both legs atomically, so that the account balances remain consistent.

### Recording Transfers

39. As a user, I want to open an "Add transfer" form from the detail page, so that I can record a one-off movement between two accounts.
40. As a user, I want to select a destination account for the transfer, so that both legs are created correctly.
41. As a user, I want to enter an amount, date, description, and category for the transfer, so that both legs are fully described.
42. As a user, I want to see the transfer appear in both the source and destination account transaction lists after creation, so that I can verify the movement.
43. As a user, I want to see a validation error if I submit the transfer form with missing required fields, so that I understand what to fix.
44. As a user, I want to see an error message if transfer creation fails server-side, so that I know something went wrong.

### Recurring Transactions

45. As a user, I want to see all recurring transactions for an account in a dedicated section on the detail page, so that I can review my standing orders.
46. As a user, I want to create a new recurring transaction with an amount, description, category, frequency, and day of month, so that the projection engine uses it.
47. As a user, I want to optionally link a recurring transaction to another account, so that recurring transfers are projected correctly by the projection engine.
48. As a user, I want to toggle a recurring transaction between active and inactive, so that I can pause it without losing the configuration.
49. As a user, I want inactive recurring transactions to remain visible but visually dimmed, so that I can reactivate them later.
50. As a user, I want to edit a recurring transaction's amount, description, category, frequency, day of month, or linked account, so that I can keep it accurate as my finances change.
51. As a user, I want to delete a recurring transaction, so that I can remove standing orders that no longer apply.
52. As a user, I want to see a validation error if I submit the recurring transaction form with missing required fields, so that I understand what to fix.
53. As a user, I want to see an error message if any recurring transaction operation fails server-side, so that I know something went wrong.

## Implementation Decisions

### Routing

- Add a `/accounts/:id` route to the existing router. The dashboard remains at `/`.
- `AccountDetailPage` is a thin composition layer with no business logic or styling.
- Clicking an account entry in `AccountOverview` on the dashboard navigates to `/accounts/:id`.

### New Hooks

- `useTransactions(accountId)` — fetches all transactions for the account; exposes create, update, and delete operations
- `useRecurringTransactions(accountId)` — fetches all recurring transactions, filtered client-side by accountId; exposes create, update, toggle isActive, and delete
- `useCategoriesWithInlineAdd()` — fetches all categories; exposes an inline-add handler that calls `POST /categories` and auto-selects the newly created entry

### New Feature Components

- `AccountCreateModal` — form with kind select, name, opening balance in euros, opening date, and conditional Sondertilgung Allowance shown only for Mortgage
- `AccountDetailHeader` — account name with inline rename and guarded delete with confirmation
- `TransactionList` — full sorted list, empty state, transfer indicator per row, back-to-top button on scroll
- `TransactionCreateModal` — transaction form with `useCategoriesWithInlineAdd` integrated
- `TransactionEditModal` — pre-populated edit/delete modal; branches on `transferId` to show transfer note and route delete to the correct endpoint
- `TransferCreateModal` — form with destination account selector, amount, date, description, category
- `RecurringTransactionList` — list with per-row isActive toggle
- `RecurringTransactionModal` — create/edit form with optional linked account dropdown labelled "Transfer to account (optional)"

### Amount Handling

- All form inputs accept amounts in euros as a decimal string
- A new `currency.ts` utility provides `eurosToCents(string): number` and `centsToEuros(number): string`
- `eurosToCents` uses `Math.round(parseFloat(value) * 100)` to avoid floating-point drift
- The existing `formatBalance` utility continues to handle formatted display
- The euro/cents boundary in `currency.ts` is the single conversion point — never duplicated inline in components or hooks

### New Shared Types

- `Transaction` — `_id`, `accountId`, `date`, `amount`, `description`, `category`, `transferId?`, `recurringTransactionId?`
- `RecurringTransaction` — `_id`, `accountId`, `amount`, `description`, `category`, `frequency`, `dayOfMonth`, `isActive`, `linkedAccountId?`
- `Category` — `_id`, `name`, `isDefault`

### Transfer Detection in Edit Modal

- `TransactionEditModal` inspects `transferId` on the loaded transaction
- If present: renders a note ("This is one leg of a transfer"), disables field editing, routes delete to `DELETE /transfers/:transferId`
- If absent: full edit capability, delete routes to `DELETE /transactions/:id`

### Delete Guard on Account

- The delete button in `AccountDetailHeader` is disabled when `useTransactions` returns a non-empty list
- No additional API call is needed — the transaction list already loaded on the page provides the signal
- A tooltip or inline message explains why deletion is blocked

### Back-to-Top Button

- Rendered inside `TransactionList`; appears when the page scroll position exceeds approximately 300px
- Implemented with a scroll event listener in a `useEffect` scoped to `TransactionList`

### No Server Changes Required

- All API endpoints needed for this feature are already implemented and tested. No server-side changes are needed.

## Testing Decisions

**What makes a good test:** assert what the user sees and what network requests are made in response to user actions. Do not assert internal state, hook internals, or React lifecycle details.

**Modules to test:**

- `eurosToCents` and `centsToEuros` — pure functions; test representative inputs including rounding edge cases such as 1.005 euros
- `useCategoriesWithInlineAdd` — inline-add fires `POST /categories`, appends the result to the list, and auto-selects the new entry
- `useTransactions` — create, update, and delete operations call the correct endpoints and reflect the updated list
- `useRecurringTransactions` — toggle isActive, create, and delete operations call the correct endpoints
- `AccountCreateModal` — required field validation fires before submit; Sondertilgung Allowance field appears only when kind is Mortgage; successful submit calls `POST /accounts`
- `TransactionEditModal` — transfer branch: entry with `transferId` renders the note and calls `DELETE /transfers/:transferId` on delete
- `TransactionList` — renders empty state when no transactions; renders transfer indicator on entries where `transferId` is set

**Prior art in the codebase:**

- `MilestoneTracker.test.tsx` — async form submit with inline error display pattern
- `AccountOverview.test.tsx` — list rendering with loading, error, and empty states pattern
- `src/utils/projection.test.ts` — pure utility function tests

## Out of Scope

- Transaction search and filtering
- Bulk transaction import or CSV upload
- Transfer editing (delete and recreate instead)
- Category management screen (inline add covers the use case without a dedicated page)
- Server-side pagination (not warranted at single-user scale)
- Account kind changes after creation
- Meridian design system (deferred to its own phase)

## Further Notes

- Once recurring transactions are configured via this UI, the existing projection endpoint automatically reflects them — no projection changes are needed.
- The optional "Transfer to account" field on the recurring transaction form should be clearly labelled so users understand it drives the Projection Engine for Sondertilgung and savings flows.
- The euro/cents conversion in `currency.ts` is the only place this transformation should happen — any duplication in components or hooks is a bug waiting to happen.
