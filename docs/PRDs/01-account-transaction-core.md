## Problem Statement

As a user of Horizon, I have no way to track my financial accounts, record transactions, or see how my balances will evolve over the next decade. Without this foundation, none of the AI features (monthly digest, anomaly detection, Sondertilgung advisor) can exist. I need a core that lets me create accounts, record what happens to my money, set up standing orders, and see a 10-year projection of where I'm headed — all without touching a spreadsheet.

---

## Solution

Build the account and transaction core: a backend that stores accounts, transactions, categories, and recurring transactions in MongoDB, with a projection engine that computes 10-year forward balance snapshots and derived cashflow metrics on demand. All values are user-supplied — nothing is hardcoded or defaulted.

---

## User Stories

### Accounts

1. As a user, I want to create an account by choosing an AccountKind, entering a name, and providing an opening balance, so that Horizon starts tracking from my real current state.
2. As a user, I want to create multiple accounts of the same AccountKind with different names (e.g. two Girokontos named "Main" and "Sparkasse"), so that my real account structure is accurately represented.
3. As a user, I want to see all my accounts listed with their current balances, so that I have an immediate overview of where my money sits.
4. As a user, I want the current balance of an account to always be derived from the opening balance plus all transactions, so that I never have a stale or manually-entered balance.
5. As a user, I want to edit an account's name, so that I can correct mistakes or rename accounts as my setup changes.
6. As a user, I want to delete an account that has no transactions, so that I can remove accounts created by mistake.
7. As a user, I want to be prevented from deleting an account that has transactions, so that I don't accidentally lose financial history.
8. As a user creating a Mortgage account, I want to enter the current Restschuld as the opening balance and optionally set a Sondertilgung Allowance, so that my mortgage is correctly modelled from day one.
9. As a user, I want liability accounts (Mortgage, CreditCard) to display their balance as a positive debt amount, so that the UI reflects how I naturally think about what I owe.

### Transactions

10. As a user, I want to manually record a transaction against an account by entering a date, amount, description, and category, so that my account history is accurate.
11. As a user, I want to enter a negative amount for outflows and a positive amount for inflows, so that the balance calculation is always correct.
12. As a user, I want to see all transactions for a given account sorted by date descending, so that recent activity is always visible first.
13. As a user, I want to edit a transaction I recorded incorrectly, so that I can fix mistakes without deleting and re-entering.
14. As a user, I want to delete a transaction, so that I can remove entries recorded in error.
15. As a user, I want all monetary values stored in cents as integers, so that there are never floating-point rounding errors.
16. As a user, I want all dates stored as ISO strings, so that date handling is consistent and unambiguous.

### Transfers

17. As a user, I want to record a transfer between two of my accounts, so that money moving between them is tracked without distorting cashflow reports.
18. As a user, I want a transfer to create two linked transactions (one debit, one credit) sharing a TransferId, so that both account balances update correctly.
19. As a user, I want transfers to be excluded from net cashflow calculations, so that moving money between my own accounts doesn't show up as income or expense.
20. As a user, I want to delete a transfer and have both legs removed atomically, so that I never end up with an orphaned debit or credit.

### Categories

21. As a user, I want a seeded set of default categories available from the moment I create my first account, so that I can start categorising transactions immediately.
22. As a user, I want to create custom categories, so that I can label transactions that don't fit the defaults.
23. As a user, I want categories to be shared across all accounts, so that "Food" means the same thing regardless of which account the transaction is on.
24. As a user, I want to be prevented from deleting a category that has transactions referencing it, so that I don't create orphaned transaction records.
25. As a user, I want to delete a custom category that has no transactions, so that I can clean up categories I no longer need.
26. As a user, I want default categories to be undeletable, so that the seeded set is always available.

### Recurring Transactions

27. As a user, I want to define a recurring transaction (standing order) with an amount, description, category, frequency, and day of month, so that my regular income and outgoings are captured once and used in projections.
28. As a user, I want to set a recurring transfer between two accounts (e.g. Girokonto → Tagesgeld), so that regular internal transfers are included in the projection engine.
29. As a user, I want to choose a frequency of monthly, quarterly, or annual for each recurring transaction, so that standing orders like Rundfunk (quarterly) and Sondertilgung (annual) are modelled correctly.
30. As a user, I want to edit a recurring transaction's amount, so that when my salary or a standing order changes, the projection engine immediately reflects the new figure.
31. As a user, I want to deactivate a recurring transaction without deleting it, so that I can pause a standing order and reactivate it later.
32. As a user, I want to delete a recurring transaction, so that I can remove standing orders that no longer apply.

### Projection Engine

33. As a user, I want to see a 10-year forward projection of all my account balances, so that I can understand where my finances are heading without maintaining a spreadsheet.
34. As a user, I want the projection to update automatically when I edit a recurring transaction or add a new one, so that the forecast is always based on my current setup.
35. As a user, I want the Sondertilgung recurring transaction to reduce the Mortgage account's Restschuld when it fires each year, so that the mortgage payoff trajectory is correct.
36. As a user, I want the regular monthly mortgage payment (Darlehen) to be modelled only as a cashflow outflow — not as a Restschuld reduction — so that the ST-only model is respected.
37. As a user, I want the projection to show a MonthlySnapshot for each of the next 120 months, so that I can inspect any point in the 10-year horizon.
38. As a user, I want each MonthlySnapshot to include the projected balance for every account, net cashflow, and Total Liquid, so that I have a complete picture at each point in time.

### Derived Metrics

39. As a user, I want to see the Net Cashflow for any given month (sum of all non-transfer transactions), so that I know whether that month was positive or negative overall.
40. As a user, I want to see the Free Cashflow for any given month (what remained in my primary Girokonto after all outflows), so that I know my actual monthly breathing room.
41. As a user, I want to see Total Liquid at any point (sum of all Girokonto and Tagesgeld balances), so that I know how much accessible cash I have.
42. As a user, I want all three metrics to be calculated on demand from the transaction log — never stored — so that they are always accurate and never stale.

### Plan vs Actual

43. As a user, I want to compare my actual account balance against the projected balance for any given month, so that I can see whether I'm on track.
44. As a user, I want the Variance (projected minus actual) to be surfaced per account per month, so that deviations from plan are immediately visible.

---

## Implementation Decisions

### AccountKind enum

Fixed set: `Girokonto | Tagesgeld | Mortgage | CreditCard | Investment`. AccountKind determines balance interpretation, field requirements, and inclusion in derived metrics. Not user-extensible.

### Balance model

Seeded + derived. Opening balance is stored once at account creation. Current balance is always computed: `openingBalance + sum(transactions.amount)`. Never stored or cached.

### Liability balance convention

Mortgage and CreditCard balances are stored as positive debt amounts. AccountKind signals to the system that these are liabilities. A Sondertilgung transaction on a Mortgage account is negative (reduces the debt).

### Transfer model

A Transfer is two Transactions sharing a `transferId`. Both legs are created atomically. Deleting a transfer deletes both legs atomically. Transfers are identified by the presence of `transferId` and excluded from cashflow calculations via this field.

### ST-only mortgage projection

The projection engine only reduces the Mortgage account balance when an annual Sondertilgung RecurringTransaction fires. The regular Darlehen RecurringTransaction is an outflow from a Girokonto — it has no effect on the Mortgage balance.

### RecurringTransaction — no phases

A RecurringTransaction has a fixed amount. When a standing order amount changes, the user edits it and all future projections update. No phase/schedule support in this version.

### Projection engine

Pure function: takes current account balances, all transactions, and all active recurring transactions — returns 120 MonthlySnapshots. Stateless and deterministic. Runs on the server; results are not persisted.

### Category management

Categories are stored as documents. A seeded set of defaults is inserted on first run. User-created categories are flagged `isDefault: false`. Categories referenced by transactions cannot be deleted. Default categories cannot be deleted.

### Deep modules

Three modules encapsulate complex logic behind simple interfaces and are the primary test targets:

- **projection** — the projection engine; pure function, no DB access
- **cashflow** — net cashflow, free cashflow, Total Liquid; pure functions
- **transactionService** — owns the atomic two-legged transfer logic

### API shape (REST)

- `GET/POST /accounts`
- `GET/PATCH/DELETE /accounts/:id`
- `GET/POST /accounts/:id/transactions`
- `PATCH/DELETE /transactions/:id`
- `POST /transfers`
- `DELETE /transfers/:transferId`
- `GET/POST /categories`
- `DELETE /categories/:id`
- `GET/POST /recurring-transactions`
- `PATCH/DELETE /recurring-transactions/:id`
- `GET /projection` — returns 120 MonthlySnapshots computed on demand

### Schema

All monetary values in cents (integers). All dates as ISO strings. Currency fixed to `EUR` — not stored per-transaction.

---

## Testing Decisions

**What makes a good test here:** test the output given a known input. Never test that a specific internal function was called. For the projection engine, construct a minimal set of accounts and recurring transactions, run the engine, assert the resulting balances are correct. For cashflow utils, pass in a list of transactions and assert the number returned.

**Modules with tests:**

- **`projection`** — highest priority. Test cases: basic monthly recurrence advances balance correctly; quarterly recurrence fires only on correct months; annual ST reduces Mortgage balance and fires only in the correct month; deactivated RecurringTransaction is excluded; 120 snapshots always returned.
- **`cashflow`** — test `calcNetCashflow` excludes transfers; `calcFreeCashflow` operates on the correct account only; `calcTotalLiquid` excludes Mortgage, CreditCard, Investment.
- **`transactionService`** — test that a transfer always produces two linked transactions with matching `transferId`; deleting one leg deletes both.
- **`accountService`** — test that current balance is correctly derived from opening balance + transactions; test that a Mortgage account's balance never goes below zero in projection.

No tests on route handlers — they are thin HTTP wrappers and are covered by integration behaviour.

---

## Out of Scope

- CSV / bank import
- RecurringTransaction phase changes (amount changes on a future date)
- Full mortgage amortisation schedule (monthly principal/interest split)
- Multi-currency support
- Market value tracking for Investment accounts (cost basis only)
- Authentication (demo instance only — no auth in this phase)
- Frontend UI (API and logic layer only in this phase)

---

## Further Notes

- The PDF financial plan shared during design was used only to understand real-world use cases and edge cases. No values from it appear in the implementation.
- The projection engine must be generic — it must work for any user's account setup, not just the Horizon author's.
- All monetary arithmetic must use integer cents throughout. No floats anywhere in the money path.
