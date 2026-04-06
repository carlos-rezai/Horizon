# Plan: Account + Transaction Core

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/1

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: REST API — `/accounts`, `/accounts/:id`, `/accounts/:id/transactions`, `/transactions/:id`, `/transfers`, `/transfers/:transferId`, `/categories`, `/categories/:id`, `/recurring-transactions`, `/recurring-transactions/:id`, `/projection`
- **Schema**: All monetary values in cents (integers). All dates as ISO strings. Currency fixed to `EUR` — not stored per transaction.
- **Key models**: `Account`, `Transaction`, `Category`, `RecurringTransaction`, `MonthlySnapshot`
- **Balance model**: Seeded + derived — opening balance stored once, current balance always computed (`openingBalance + sum(transactions.amount)`), never stored or cached
- **Liability convention**: Mortgage and CreditCard balances are positive debt amounts. AccountKind signals liability interpretation to all consumers.
- **Transfer model**: Two `Transaction` documents sharing a `transferId`, created and deleted atomically. Identified by presence of `transferId`.
- **Projection**: Pure function, stateless, not persisted. Runs on demand on the server.
- **No auth**: Demo instance only — no authentication in this feature.

---

## Phase 1: Server scaffold + Account CRUD

**User stories**: 1, 2, 3, 5, 6, 7, 8, 9

### What to build

Stand up the Express server with a MongoDB connection and full Account CRUD. At this phase, an account's balance equals its opening balance — no transactions exist yet. The Mortgage AccountKind accepts an optional `sondertilgungAllowance` field. Liability accounts (Mortgage, CreditCard) store balance as a positive debt amount. Deleting an account with transactions is blocked (enforced in Phase 2 once transactions exist — guard should be wired now, it will simply never trigger yet).

### Acceptance criteria

- [ ] `POST /accounts` creates an account with a chosen AccountKind, user-defined name, and opening balance in cents
- [ ] Two accounts of the same AccountKind with different names can coexist
- [ ] `GET /accounts` returns all accounts with their current balance (opening balance at this phase)
- [ ] `GET /accounts/:id` returns a single account
- [ ] `PATCH /accounts/:id` updates the account name
- [ ] `DELETE /accounts/:id` succeeds when the account has no transactions
- [ ] `DELETE /accounts/:id` is blocked when the account has transactions (guard wired, tested once transactions exist)
- [ ] Mortgage accounts accept and store an optional `sondertilgungAllowance` in cents
- [ ] All monetary values are stored and returned as integers (cents)
- [ ] All dates are stored and returned as ISO strings
- [ ] Server starts and connects to MongoDB; connection errors surface cleanly

---

## Phase 2: Transactions + Categories

**User stories**: 4, 10, 11, 12, 13, 14, 15, 16, 21, 22, 23, 24, 25, 26

### What to build

Transaction CRUD against a given account, plus category management. Once transactions exist, account balance becomes fully derived: `openingBalance + sum(transactions.amount)`. Categories are seeded on startup with the default set and managed via their own endpoints. A category cannot be deleted if any transaction references it. Default categories cannot be deleted regardless.

Default category seed: `Income | Housing | Food | Subscriptions | Entertainment | Investment | Transfer | Miscellaneous`

### Acceptance criteria

- [ ] `POST /accounts/:id/transactions` records a transaction with date, amount (cents), description, and category
- [ ] `GET /accounts/:id/transactions` returns all transactions for an account, sorted by date descending
- [ ] `PATCH /transactions/:id` updates a transaction's fields
- [ ] `DELETE /transactions/:id` removes the transaction; account balance updates accordingly
- [ ] Account current balance equals opening balance + sum of all transaction amounts
- [ ] `DELETE /accounts/:id` is now correctly blocked when the account has at least one transaction
- [ ] `GET /categories` returns all categories (default + custom)
- [ ] `POST /categories` creates a custom category
- [ ] `DELETE /categories/:id` succeeds for a custom category with no transactions
- [ ] `DELETE /categories/:id` is blocked for any category that has transactions referencing it
- [ ] `DELETE /categories/:id` is blocked for default categories regardless of transaction count
- [ ] Categories are shared across all accounts — the same list is returned regardless of which account is queried
- [ ] Default categories are seeded on server startup if not already present

---

## Phase 3: Transfers

**User stories**: 17, 18, 19, 20

### What to build

A Transfer moves money between two Horizon accounts. It creates two Transaction documents atomically — a debit on the source account and a credit on the destination — sharing a `transferId`. Deleting a transfer by its `transferId` removes both legs atomically. Transfers are identifiable via the `transferId` field on each transaction leg.

### Acceptance criteria

- [ ] `POST /transfers` creates two linked transactions (debit + credit) sharing a `transferId`
- [ ] Both account balances update correctly after a transfer
- [ ] `DELETE /transfers/:transferId` removes both transaction legs atomically
- [ ] Both account balances are restored correctly after a transfer is deleted
- [ ] A transfer with a non-existent source or destination account is rejected
- [ ] `transferId` is present on both transaction legs returned from `GET /accounts/:id/transactions`
- [ ] Attempting to delete only one leg of a transfer directly via `DELETE /transactions/:id` is blocked

---

## Phase 4: Cashflow metrics

**User stories**: 39, 40, 41, 42

### What to build

Three derived metrics computed from the transaction log on demand — never stored. Implemented as pure functions (fully tested) and exposed via the API. Net Cashflow excludes transfers. Free Cashflow operates on a specified Girokonto only. Total Liquid sums only Girokonto and Tagesgeld accounts.

### Acceptance criteria

- [ ] `GET /accounts/:id/cashflow?month=YYYY-MM` returns net cashflow and free cashflow for the given account and month
- [ ] `GET /accounts/liquid` returns Total Liquid (sum of all Girokonto + Tagesgeld balances)
- [ ] Net Cashflow excludes transactions with a `transferId`
- [ ] Free Cashflow returns the net amount remaining in the specified Girokonto after all outflows for the month
- [ ] Total Liquid excludes Mortgage, CreditCard, and Investment accounts
- [ ] All three metrics are computed from the transaction log — no stored/cached values
- [ ] Pure cashflow functions have full test coverage: transfers excluded, correct account scoping, correct AccountKind filtering

---

## Phase 5: Recurring Transactions

**User stories**: 27, 28, 29, 30, 31, 32

### What to build

RecurringTransaction CRUD. A recurring transaction defines a standing order: amount, description, category, frequency (monthly / quarterly / annual), and day of month. A recurring transfer has a `linkedAccountId` pointing to the destination account. Deactivation pauses the standing order without deleting it. No phase support — amount is fixed until the user edits it.

### Acceptance criteria

- [ ] `POST /recurring-transactions` creates a standing order with amount, description, category, frequency, dayOfMonth, and optional `linkedAccountId`
- [ ] `GET /recurring-transactions` returns all recurring transactions (active and inactive)
- [ ] `PATCH /recurring-transactions/:id` updates amount, description, category, or active status
- [ ] `DELETE /recurring-transactions/:id` removes the standing order permanently
- [ ] A recurring transaction can be deactivated (`isActive: false`) and reactivated (`isActive: true`) via PATCH
- [ ] Frequency values `monthly`, `quarterly`, and `annual` are all accepted and stored correctly
- [ ] A recurring transfer (with `linkedAccountId`) is stored and returned correctly
- [ ] Inactive recurring transactions are excluded from projection calculations (Phase 6)

---

## Phase 6: Projection Engine + Plan vs Actual

**User stories**: 33, 34, 35, 36, 37, 38, 43, 44

### What to build

A pure `projectBalances` function takes the current state of all accounts, all recorded transactions, and all active recurring transactions — and returns 120 MonthlySnapshots covering the next 10 years. Monthly, quarterly, and annual recurring transactions fire at the correct months. The annual Sondertilgung RecurringTransaction (linked to a Mortgage account) reduces the Restschuld when it fires — all other recurring transactions on a Mortgage account do not affect its balance. Each snapshot includes projected balances per account, net cashflow, and Total Liquid. The `GET /projection` endpoint also includes the actual balance for months that have passed, enabling Variance (projected minus actual) to be derived per account per month.

### Acceptance criteria

- [ ] `GET /projection` returns exactly 120 MonthlySnapshots
- [ ] Each snapshot contains projected balance for every account, net cashflow, and Total Liquid
- [ ] Monthly recurring transactions appear in every snapshot month
- [ ] Quarterly recurring transactions appear only in the correct months (e.g. months 1, 4, 7, 10)
- [ ] An annual Sondertilgung RecurringTransaction fires once per year in its configured month and reduces the Mortgage account balance
- [ ] The regular Darlehen RecurringTransaction (monthly, from Girokonto) does not affect the Mortgage balance
- [ ] Editing a recurring transaction amount causes `GET /projection` to return updated figures immediately
- [ ] Deactivated recurring transactions are excluded from all projections
- [ ] Each snapshot for a past month includes the actual account balance alongside the projected balance
- [ ] Variance (projected minus actual) can be derived per account per month from the snapshot data
- [ ] The projection engine is a pure function with full test coverage: monthly/quarterly/annual firing, ST Restschuld reduction, deactivated exclusion, 120 snapshots always returned
