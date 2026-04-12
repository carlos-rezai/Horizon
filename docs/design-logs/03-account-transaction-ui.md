# Design Log 03 — Account + Transaction UI

## Background

The account and transaction core (backend API, data model, projection engine) is fully built.
The dashboard exists and shows AccountOverview, MortgageCountdown, and MilestoneTracker.
No UI exists yet for creating accounts, recording transactions, managing recurring transactions,
or handling transfers. `src/components/` and `src/primitives/` are empty — no component library
has been established yet.

The projection engine depends on recurring transactions with `linkedAccountId` for its core
value proposition (10-year savings and mortgage payoff modelling). Without a UI for setting
these up, the app cannot fulfil its purpose.

## Problem

Design the frontend UI for account creation and transaction management: where it lives, how
users navigate to it, what forms are needed, and how the data flows between euros (user-facing)
and cents (internal storage).

## Questions and Answers

**Q1: Where does the account and transaction UI live?**
Dedicated `/accounts/:id` route per account. Dashboard stays as overview; clicking an account
navigates to its detail page.

**Q2: How does account creation work?**
Modal on the dashboard. An "Add account" button triggers a modal form. After creation, the app
navigates to the new account's `/accounts/:id` detail page.

**Q3: What sections does the account detail page contain?**
Two sections: (1) transactions and (2) recurring transactions. Transfers are handled via a
dedicated "Add transfer" button alongside "Add transaction" — not a separate section.

**Q4: How does the amount input work given cents are stored internally?**
Euro input on all forms. Frontend converts to cents on submit (`Math.round(parseFloat(value) * 100)`).
Display always uses the existing `formatBalance` utility (de-DE locale).

**Q5: How does category selection work on the transaction form?**
Dropdown populated from `GET /categories` with an inline "+ Add category" option. Selecting it
reveals a text input, creates the category on the fly via `POST /categories`, and selects it.

**Q6: How does transaction editing and deletion work?**
Edit modal, pre-populated with the transaction's current values. Delete button inside the modal
with a confirmation step. Same pattern reused from creation modal.

**Q7: Is `linkedAccountId` exposed on the recurring transaction form?**
Yes. Optional "Transfer to account" dropdown showing all other accounts. Required for the
projection engine to model recurring transfers (monthly savings, annual Sondertilgung).

**Q8: Is the `isActive` toggle exposed for recurring transactions?**
Yes. Toggle per row in the recurring transactions list. Inactive items are dimmed but remain
visible. Firing the toggle calls `PATCH /recurring-transactions/:id` with `{ isActive: false/true }`.

**Q9: Where do account edit and delete live?**
On the account detail page header. Inline name edit (icon triggers editable input). Delete button
disabled with a tooltip if the account has transactions (API enforces the same guard).

**Q10: What happens after account creation?**
Navigate directly to the new account's `/accounts/:id` detail page. Natural next step is
configuring recurring transactions.

**Q11: How are one-off transfers handled?**
Dedicated "Add transfer" button on the detail page alongside "Add transaction". Opens a modal
with fields: `toAccountId`, `amount`, `date`, `description`, `category`.

**Q12: Does the transaction list paginate?**
No pagination. Full list rendered, sorted date descending. A back-to-top button appears after
sufficient vertical scroll (threshold TBD in implementation, ~300px suggested).

**Q13: How are transfers deleted from the transaction list?**
The edit modal detects `transferId` on the transaction. It shows a note ("This is one leg of a
transfer") and routes the delete to `DELETE /transfers/:transferId`, removing both legs atomically.

## Design

### Routing

```
/                        → DashboardPage (existing)
/accounts/:id            → AccountDetailPage (new)
```

### New Pages

```
src/pages/AccountDetailPage.tsx   — route-level composition only, no logic
```

### New Features

```
src/features/accounts/
  AccountCreateModal.tsx          — modal form: kind, name, openingBalance, openingDate, sondertilgungAllowance (conditional)
  AccountDetailHeader.tsx         — account name (inline edit), delete button with guard
  AccountCreateModal.test.tsx
  AccountDetailHeader.test.tsx

src/features/transactions/
  TransactionList.tsx             — full list, date desc, back-to-top
  TransactionCreateModal.tsx      — add transaction form
  TransactionEditModal.tsx        — edit/delete modal; detects transferId and routes accordingly
  TransferCreateModal.tsx         — add transfer form (toAccountId, amount, date, description, category)
  useTransactions.ts              — fetch GET /accounts/:id/transactions
  TransactionList.test.tsx
  TransactionCreateModal.test.tsx
  TransactionEditModal.test.tsx
  TransferCreateModal.test.tsx
  useTransactions.test.tsx

src/features/recurring/
  RecurringTransactionList.tsx    — list with isActive toggle per row
  RecurringTransactionModal.tsx   — create/edit form; linkedAccountId optional dropdown
  useRecurringTransactions.ts     — fetch GET /recurring-transactions (filtered client-side by accountId)
  RecurringTransactionList.test.tsx
  RecurringTransactionModal.test.tsx
  useRecurringTransactions.test.tsx

src/features/categories/
  useCategoriesWithInlineAdd.ts   — fetches categories, exposes inline-add handler
  useCategoriesWithInlineAdd.test.ts
```

### Key Type Additions

```typescript
// src/types/transaction.ts
interface Transaction {
  _id: string;
  accountId: string;
  date: string; // ISO string
  amount: number; // cents
  description: string;
  category: string;
  transferId?: string;
  recurringTransactionId?: string;
}

// src/types/recurring.ts
interface RecurringTransaction {
  _id: string;
  accountId: string;
  amount: number; // cents
  description: string;
  category: string;
  frequency: "monthly" | "quarterly" | "annual";
  dayOfMonth: number;
  isActive: boolean;
  linkedAccountId?: string;
}

// src/types/category.ts
interface Category {
  _id: string;
  name: string;
  isDefault: boolean;
}
```

### Amount Conversion

```typescript
// src/utils/currency.ts  (new)
export function eurosToCents(euros: string): number {
  return Math.round(parseFloat(euros) * 100);
}

export function centsToEuros(cents: number): string {
  return (cents / 100).toFixed(2);
}
```

### Chosen Approaches

- ✅ `/accounts/:id` dedicated route — clean separation, dashboard stays as overview
- ❌ Inline expansion on dashboard — mixes detail concerns into overview
- ❌ Separate `/accounts` management page — adds a navigation layer with no benefit

- ✅ Account creation modal on dashboard — infrequent action, keeps user in context
- ❌ `/accounts/new` route — full page navigation for a short form is excessive

- ✅ Euro input + frontend cents conversion — user-facing, uses existing `formatBalance`
- ❌ Raw cents input — hostile UX

- ✅ Category dropdown + inline add — covers 90% of cases with defaults, no flow interruption
- ❌ Free text — loses structured reporting value

- ✅ Edit modal for transactions — reuses creation pattern, clean list, safe delete
- ❌ Inline edit — row-level state complexity, harder to confirm destructive actions

- ✅ Expose `linkedAccountId` — required for projection accuracy
- ❌ Hide it — breaks the app's core 10-year planning value

- ✅ Dedicated "Add transfer" button — explicit, avoids conditional form complexity
- ❌ Type toggle on transaction form — conditional complexity, obscures transfer semantics

- ✅ Show all transactions, back-to-top on scroll — appropriate for single-user personal app
- ❌ Pagination — premature optimisation for this user scale

- ✅ Transfer deletion via modal with `transferId` detection — consistent UX, correct API call
- ❌ Read-only transfers — blocks legitimate correction of mistakes

## Implementation Plan

### Phase 1 — Route + account creation modal

- Add `/accounts/:id` route in App.tsx
- Build `AccountDetailPage` (skeleton — just shows account name and back link)
- Build `AccountCreateModal` on dashboard with full form (kind, name, openingBalance, openingDate, sondertilgungAllowance conditional on Mortgage)
- Navigate to detail page after creation

### Phase 2 — Transaction list + add

- Build `useTransactions` hook
- Build `TransactionList` with full list + back-to-top
- Build `TransactionCreateModal` (date, amount in euros, description, category dropdown)
- Wire "Add transaction" button on detail page

### Phase 3 — Category inline add

- Build `useCategoriesWithInlineAdd` hook
- Integrate into `TransactionCreateModal` and `TransactionEditModal`

### Phase 4 — Transaction edit + delete

- Build `TransactionEditModal` (pre-populated, delete with confirmation)
- Detect `transferId` — show transfer note, route delete to `DELETE /transfers/:transferId`

### Phase 5 — Transfer creation

- Build `TransferCreateModal`
- Wire "Add transfer" button on detail page

### Phase 6 — Recurring transactions

- Build `useRecurringTransactions` hook
- Build `RecurringTransactionList` with `isActive` toggle
- Build `RecurringTransactionModal` (all fields including `linkedAccountId` optional dropdown)

### Phase 7 — Account header actions

- Build `AccountDetailHeader` with inline name edit and guarded delete

## Trade-offs

**Easier:**

- Each modal is independently buildable and testable
- Phase 1 delivers a working route immediately
- Euro/cents boundary is explicit and contained in one utility

**Harder:**

- Transfer deletion requires modal to branch on `transferId` — slightly more complex edit modal
- Category inline-add adds async state to the form — must handle in-flight creation gracefully

**Out of scope:**

- Transaction search / filtering (deferred)
- Bulk transaction import / CSV upload (deferred)
- Transfer editing — transfers can be deleted and recreated but not edited in this phase
- Category management screen — inline add covers the use case without a dedicated page
- Server-side pagination — not warranted at this user scale
