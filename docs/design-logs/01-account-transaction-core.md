# 01 — Account + Transaction Core

## Background

Horizon is a personal finance tracker for long-term thinkers. The account
and transaction core is the foundation everything else builds on: accounts
hold balances, transactions move money, recurring transactions drive a
10-year projection engine, and derived metrics feed the dashboard and AI
features.

The design was informed by a real-world use case involving multiple account
types (two Girokontos, Tagesgeld, mortgage, credit card, ETF investment),
annual Sondertilgung payments, and a phased financial plan running to 2032.
No values from that personal plan appear in this design — all values are
always user-supplied.

---

## Problem

Define the data model, architectural boundaries, and behaviour for:

- Account types and their specific fields
- Transaction recording (manual entry)
- Transfer modelling between accounts
- Recurring transactions (standing orders)
- 10-year projection engine
- Derived metrics: net cashflow, free cashflow, Total Liquid

---

## Questions and Answers

**Q1: What account types does Horizon need to support?**
A: `Girokonto | Tagesgeld | Mortgage | CreditCard | Investment`

**Q2: Can users create multiple accounts of the same kind?**
A: Yes. Each account instance has a user-defined `name`. e.g. two
Girokontos named "Main" and "Sparkasse".

**Q3: How is account balance tracked?**
A: Seeded + derived. User enters an opening balance at account creation —
no backtracking. Current balance = openingBalance + sum of all transactions.

**Q4: How are transactions entered?**
A: Manual entry only. CSV import is a future feature.

**Q5: What fields does a transaction need?**
A: `date` (ISO string), `amount` (cents integer, negative = outflow),
`description` (string), `category`, `accountId`.

**Q6: How are categories managed?**
A: Shared across all accounts. Seeded defaults, user can add custom
categories. Cannot delete a category if transactions reference it.
Default set: `Income | Housing | Food | Subscriptions | Entertainment |
Investment | Transfer | Miscellaneous`

**Q7: How are transfers between accounts modelled?**
A: Two linked transactions sharing a `transferId`. One debit on the
source account, one credit on the destination. Prevents double-counting
in cashflow reports.

**Q8: What fields does the Mortgage account need?**
A: Opening balance = current Restschuld (user-entered). Monthly mortgage
payment is a user-defined `RecurringTransaction`. Restschuld only
decreases from Sondertilgung payments — no amortization math.

**Q9: Should the ETF Sparplan be an account?**
A: Yes — `Investment` AccountKind. Tracks cost basis only. No market
value complexity.

**Q10: How does the credit card work?**
A: Simple balance tracking (positive = debt owed). User logs each charge
as a transaction. Payment from Girokonto is a Transfer. No statement
cycle logic.

**Q11: Should Horizon store plan projections or compute them?**
A: Plan + actuals. The projection engine computes projections from
recurring transactions + current balances. The projection IS the plan.
Variance = projected balance − actual balance per account per month.

**Q12: How does plan data get into Horizon?**
A: Entirely from user input — recurring transactions and account opening
balances. No seeding, no hardcoded values.

**Q13: Should RecurringTransaction support phase changes?**
A: No — deferred to a future feature. User edits the amount manually
when something changes. Projections recalculate from that point forward.

**Q14: How does Restschuld decrease in the projection engine?**
A: ST-only model. Restschuld only changes when a Sondertilgung
RecurringTransaction fires. The regular monthly mortgage payment is
just a standard recurring outflow — it does not reduce Restschuld.

**Q15: How far forward does the projection engine look?**
A: 10 years, fixed.

**Q16: How is monthly cashflow defined?**
A: Two derived values, never stored:

- Net cashflow = sum of all non-transfer transactions for the month
- Free cashflow = net remaining in the primary Girokonto after all outflows

**Q17: Should Horizon have a Total Liquid concept?**
A: Yes — fixed definition: sum of all `Girokonto` + `Tagesgeld` balances.
`AccountKind` drives inclusion. Never stored — always calculated on demand.

**Q18: How are liability account balances stored?**
A: Positive debt amount. `AccountKind` determines interpretation.
A Sondertilgung transaction on the Mortgage account is a negative
transaction (reduces the debt).

---

## Design

### AccountKind enum

```typescript
// src/types/account.ts
type AccountKind =
  | "Girokonto"
  | "Tagesgeld"
  | "Mortgage"
  | "CreditCard"
  | "Investment";
```

✅ Fixed enum — `AccountKind` determines field requirements, balance
interpretation, and inclusion in derived metrics.
❌ Fully generic user-defined types — rejected because different kinds
have different data shapes and the AI needs to reason about kind.

### Account

```typescript
// src/types/account.ts
interface Account {
  _id: string;
  kind: AccountKind;
  name: string; // user-defined, e.g. "Main", "Sparkasse"
  openingBalance: number; // cents, positive = asset or debt
  openingDate: string; // ISO date
  currency: "EUR";
  // Mortgage-only
  sondertilgungAllowance?: number; // cents, max annual ST permitted by lender
}
```

### Transaction

```typescript
// src/types/transaction.ts
interface Transaction {
  _id: string;
  accountId: string;
  date: string; // ISO date
  amount: number; // cents, negative = outflow, positive = inflow
  description: string;
  category: string; // references Category.name
  transferId?: string; // present on both legs of a transfer
  recurringTransactionId?: string;
}
```

### Category

```typescript
// src/types/category.ts
interface Category {
  _id: string;
  name: string;
  isDefault: boolean;
}
```

Default seed: `Income | Housing | Food | Subscriptions | Entertainment |
Investment | Transfer | Miscellaneous`

### RecurringTransaction

```typescript
// src/types/recurringTransaction.ts
type Frequency = "monthly" | "quarterly" | "annual";

interface RecurringTransaction {
  _id: string;
  accountId: string;
  linkedAccountId?: string; // for transfers — the other account
  amount: number; // cents
  description: string;
  category: string;
  frequency: Frequency;
  dayOfMonth: number; // 1–28
  activeFrom: string; // ISO date
  isActive: boolean;
}
```

### Derived metrics (never stored)

```typescript
// src/utils/cashflow.ts
function calcNetCashflow(transactions: Transaction[]): number;
function calcFreeCashflow(
  transactions: Transaction[],
  mainAccountId: string
): number;
function calcTotalLiquid(accounts: Account[]): number;
// AccountKind 'Girokonto' | 'Tagesgeld' only
```

### Projection engine

```typescript
// src/utils/projection.ts
function projectBalances(
  accounts: Account[],
  transactions: Transaction[],
  recurringTransactions: RecurringTransaction[],
  months: 120 // 10 years fixed
): MonthlySnapshot[];

interface MonthlySnapshot {
  month: string; // ISO date, first of month
  balances: Record<string, number>; // accountId → projected balance (cents)
  netCashflow: number;
  totalLiquid: number;
}
```

### File locations

```
src/types/account.ts
src/types/transaction.ts
src/types/category.ts
src/types/recurringTransaction.ts
src/utils/cashflow.ts
src/utils/projection.ts
server/src/routes/accounts.ts
server/src/routes/transactions.ts
server/src/routes/recurringTransactions.ts
server/src/services/accountService.ts
server/src/services/transactionService.ts
server/src/services/projectionService.ts
```

---

## Implementation Plan

**Phase 1 — Account CRUD**
Create, read, update, delete accounts. Seeded opening balance. Balance
derived from opening balance only (no transactions yet). API + basic UI.

**Phase 2 — Transaction CRUD**
Manual transaction entry against an account. Balance updates correctly.
Category CRUD with seeded defaults.

**Phase 3 — Transfers**
Two-legged transfer with `transferId`. Both accounts update correctly.
Transfers excluded from cashflow totals.

**Phase 4 — Recurring Transactions**
CRUD for recurring transactions. Standing orders visible per account.

**Phase 5 — Projection Engine**
10-year forward projection from recurring transactions + current balances.
ST-only model for Mortgage. MonthlySnapshot output.

**Phase 6 — Derived Metrics**
Net cashflow, free cashflow, Total Liquid — all calculated on demand
from transaction log.

---

## Trade-offs

**Easier:**

- Balance is always accurate — derived from transactions, never stale
- Projection auto-updates when recurring transactions change
- AccountKind drives all business logic — no ambiguity
- Generic enough for any user, not just the Horizon author's setup

**Harder:**

- No CSV import — all entry is manual; volume may become tedious
- ST-only mortgage model means Restschuld projection is approximate
  (regular amortization ignored)
- No phase support on RecurringTransaction — user must manually update
  standing orders when amounts change

**Explicitly out of scope:**

- CSV/bank import
- RecurringTransaction phase changes (activeFrom/activeTo amount changes)
- Full mortgage amortization schedule
- Multi-currency support
- Market value tracking for Investment accounts (cost basis only)
