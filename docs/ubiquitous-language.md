# Ubiquitous Language

## Accounts

| Term                | Definition                                                                                | Aliases to avoid                    |
| ------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------- |
| **Account**         | A named financial account instance tracked in Horizon                                     | —                                   |
| **AccountKind**     | The classification of an account that determines its behaviour and fields                 | AccountType, account category       |
| **Girokonto**       | A current/checking account kind — used for income and day-to-day spending                 | Checking account, current account   |
| **Tagesgeld**       | An overnight savings account kind — used as a Sondertilgung reserve                       | Savings account, high-yield account |
| **Mortgage**        | A loan account kind that tracks outstanding Restschuld                                    | Home loan, Darlehen account         |
| **CreditCard**      | A credit card account kind — tracks debt owed, paid in full monthly                       | Card account                        |
| **Investment**      | An investment account kind — tracks ETF cost basis only, not market value                 | Brokerage, portfolio                |
| **Opening Balance** | The user-entered balance at the moment an account is created in Horizon — no backtracking | Starting balance, initial balance   |
| **Current Balance** | The derived balance of an account: Opening Balance + sum of all transactions              | Live balance                        |

## Transactions

| Term                     | Definition                                                                            | Aliases to avoid                                |
| ------------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Transaction**          | A single financial movement recorded against an account                               | Entry, record, payment                          |
| **Transfer**             | A movement of money between two Horizon accounts, modelled as two linked Transactions | Internal transaction, move                      |
| **TransferId**           | The shared identifier that links the two legs of a Transfer                           | —                                               |
| **RecurringTransaction** | A standing order that fires on a defined schedule and drives the Projection Engine    | Standing order, Dauerauftrag, scheduled payment |
| **Category**             | A user-managed label applied to a Transaction for reporting and AI analysis           | Tag, type, label                                |

## Mortgage

| Term                        | Definition                                                                                                         | Aliases to avoid                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| **Restschuld**              | The outstanding mortgage principal remaining — the balance of the Mortgage account                                 | Remaining balance, outstanding debt |
| **Sondertilgung (ST)**      | An annual extra mortgage repayment that directly reduces the Restschuld                                            | Extra payment, overpayment          |
| **Darlehen**                | The regular monthly mortgage payment (covers Zinsen + Tilgung) — modelled as a RecurringTransaction                | Mortgage payment, monthly payment   |
| **Zinsen**                  | The interest portion of the Darlehen payment — not tracked separately in Horizon                                   | Interest                            |
| **Tilgung**                 | The principal repayment portion of the Darlehen payment — not tracked separately in Horizon                        | Principal repayment                 |
| **ST-only Model**           | The projection approach where Restschuld decreases only from Sondertilgung payments, not from the monthly Darlehen | Amortization model                  |
| **Sondertilgung Allowance** | The maximum annual ST amount permitted by the lender — stored on the Mortgage account                              | ST cap, ST limit                    |

## Projections

| Term                                 | Definition                                                                                                  | Aliases to avoid               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **Projection Engine**                | The system that calculates 10-year forward balances from RecurringTransactions and current account balances | Forecast engine, planner       |
| **MonthlySnapshot**                  | The projected state of all account balances for a given future month                                        | Projection row, forecast entry |
| **Plan**                             | The full set of MonthlySnapshots produced by the Projection Engine — there is no separate plan data store   | Financial plan, budget plan    |
| **Actual**                           | The real account balance derived from recorded Transactions                                                 | Real balance                   |
| **Variance**                         | The difference between a projected balance and the actual balance for a given account and month             | Delta, difference              |
| **Payoff Month** (new)               | The first projected month in which a Mortgage account's balance reaches zero                                | Payoff date, payoff year       |
| **Estimated Completion Month** (new) | The first projected month in which a Milestone's target balance is reached                                  | Target date, goal date         |

## Dashboard

| Term                         | Definition                                                                                  | Aliases to avoid          |
| ---------------------------- | ------------------------------------------------------------------------------------------- | ------------------------- |
| **Milestone** (new)          | A user-defined named target: a specific account must reach a specific balance               | Goal, target, checkpoint  |
| **Mortgage Countdown** (new) | The dashboard display showing current Restschuld and Payoff Month for each Mortgage account | Payoff tracker, countdown |

## Derived Metrics

| Term              | Definition                                                                                          | Aliases to avoid                         |
| ----------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Net Cashflow**  | Sum of all non-Transfer Transactions for a month across all accounts                                | Monthly income, monthly result           |
| **Free Cashflow** | Net amount remaining in the primary Girokonto after all outflows for a month                        | Breathing room, surplus                  |
| **Total Liquid**  | Sum of all Girokonto and Tagesgeld account balances — excludes Investment, Mortgage, and CreditCard | Net worth, liquid assets, available cash |
| **Cost Basis**    | The total amount invested in an Investment account — never market value                             | Market value, portfolio value            |

## Relationships

- An **Account** has exactly one **AccountKind**
- A **Current Balance** is always derived from an **Opening Balance** + all **Transactions** — never stored directly
- A **Transfer** is always composed of exactly two **Transactions** sharing a **TransferId**
- A **RecurringTransaction** may produce a **Transaction** on each occurrence date
- A **Sondertilgung** is a **Transfer** from a **Tagesgeld** account to a **Mortgage** account — it reduces the **Restschuld**
- The **Plan** is always the output of the **Projection Engine** — it is never entered or stored manually
- **Total Liquid** includes only **Girokonto** and **Tagesgeld** accounts — determined by **AccountKind**
- A **Milestone** targets exactly one **Account** and has exactly one **target balance**
- The **Estimated Completion Month** of a **Milestone** is derived from the **Plan** — never stored
- The **Payoff Month** of a **Mortgage** account is derived from the **Plan** — never stored
- The **Mortgage Countdown** displays one entry per **Mortgage** account

## Example dialogue

> **Dev:** "When the user records a Sondertilgung, is that a Transaction
> or a Transfer?"
>
> **Domain expert:** "It's a Transfer — money leaves the Tagesgeld account
> and reduces the Restschuld on the Mortgage account. Two linked
> Transactions sharing a TransferId."
>
> **Dev:** "Does the monthly Darlehen payment also reduce the Restschuld?"
>
> **Domain expert:** "No — Horizon uses the ST-only model. The Darlehen is
> just a regular RecurringTransaction outflow from the Girokonto. Only a
> Sondertilgung touches the Restschuld."
>
> **Dev:** "So the Projection Engine never does any amortization math?"
>
> **Domain expert:** "Correct. The Projection Engine applies RecurringTransactions
> forward in time. When it hits an annual ST RecurringTransaction in October,
> it reduces the Mortgage balance by that amount. That's the full extent of
> mortgage math."
>
> **Dev:** "And Total Liquid — does it include the Investment account?"
>
> **Domain expert:** "Never. Total Liquid is Girokonto plus Tagesgeld only.
> The Investment account tracks Cost Basis — it's illiquid and excluded
> by AccountKind."
>
> **Dev:** "On the dashboard, what's the difference between the Mortgage
> Countdown and a Milestone targeting the Mortgage account?"
>
> **Domain expert:** "The Mortgage Countdown is always there — it's the
> Payoff Month derived from the Plan, shown automatically for every Mortgage
> account. A Milestone is something the user creates explicitly — they name
> it, pick any account, and set a target balance. The Estimated Completion
> Month comes from the same Plan, but the user decides what to track."

## Flagged ambiguities

- **"balance"** is overloaded — always qualify: **Opening Balance**,
  **Current Balance**, or **Restschuld**. Never use "balance" alone in code or docs.
- **"plan"** was used informally during design to mean both the user's
  financial intentions and the Projection Engine output. In Horizon,
  **Plan** always means the set of MonthlySnapshots produced by the
  Projection Engine. There is no separate plan data store.
- **"payment"** is ambiguous — it could mean the monthly Darlehen, a
  Sondertilgung, or a CreditCard settlement. Always use the specific term.
- **"savings"** — avoid. Use **Tagesgeld** (the account kind) or
  **Sondertilgung reserve** (its purpose) instead.
- **"AccountType"** — rejected in favour of **AccountKind** (DDD convention
  to avoid collision with framework-level type concepts).
