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

| Term                                    | Definition                                                                                                                  | Aliases to avoid                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Transaction**                         | A single financial movement recorded against an account                                                                     | Entry, record, payment                          |
| **Transfer**                            | A movement of money between two Horizon accounts, modelled as two linked Transactions                                       | Internal transaction, move                      |
| **TransferId**                          | The shared identifier that links the two legs of a Transfer                                                                 | —                                               |
| **RecurringTransaction**                | A standing order that fires on a defined schedule and drives the Projection Engine                                          | Standing order, Dauerauftrag, scheduled payment |
| **Active RecurringTransaction** (new)   | A RecurringTransaction with `isActive: true` — included in all Projection Engine calculations                               | Enabled, on                                     |
| **Inactive RecurringTransaction** (new) | A RecurringTransaction with `isActive: false` — paused but retained; excluded from projections                              | Disabled, deleted, off                          |
| **Recurring Transfer** (new)            | A RecurringTransaction with a `linkedAccountId` — models a scheduled movement between two accounts in the Projection Engine | Scheduled transfer                              |
| **One-off Transfer** (new)              | A single, non-recurring Transfer between two accounts recorded directly as two linked Transactions                          | Ad-hoc transfer, manual transfer                |
| **Category**                            | A user-managed label applied to a Transaction for reporting and AI analysis                                                 | Tag, type, label                                |

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

| Term                           | Definition                                                                                                                            | Aliases to avoid               |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **Projection Engine**          | The system that calculates 10-year forward balances from RecurringTransactions and current account balances                           | Forecast engine, planner       |
| **MonthlySnapshot**            | The projected state of all account balances for a given future month                                                                  | Projection row, forecast entry |
| **Plan**                       | The full set of MonthlySnapshots produced by the Projection Engine — there is no separate plan data store                             | Financial plan, budget plan    |
| **Actual**                     | The real account balance derived from recorded Transactions                                                                           | Real balance                   |
| **Variance**                   | The difference between a projected balance and the actual balance for a given account and month                                       | Delta, difference              |
| **Payoff Month**               | The first projected month in which a Mortgage account's balance reaches zero                                                          | Payoff date, payoff year       |
| **Payoff Year** (new)          | The calendar year that contains the Payoff Month                                                                                      | Payoff year, final year        |
| **ST Month** (new)             | A projected month in which an annual Sondertilgung Recurring Transfer fires — detected from RecurringTransaction shape, not hardcoded | ST date, October payment       |
| **Estimated Completion Month** | The first projected month in which a Milestone's target balance is reached                                                            | Target date, goal date         |

## Dashboard

| Term                           | Definition                                                                                                               | Aliases to avoid             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| **Milestone**                  | A user-defined named target: a specific account must reach a specific balance                                            | Goal, target, checkpoint     |
| **Mortgage Countdown**         | The dashboard display showing current Restschuld and Payoff Month for each Mortgage account                              | Payoff tracker, countdown    |
| **Plan Summary** (new)         | The compact dashboard widget showing one clickable Year Summary Row per projected year-end, linking to the Plan Page     | Plan widget, plan preview    |
| **Year Summary Row** (new)     | A single row in the Plan Summary showing end-of-year Total Liquid, Restschuld, and ST amount for one projected year      | Annual row, year row         |
| **Plan Page** (new)            | The dedicated `/plan` route that displays the full Projection Accordion                                                  | Plan view, projection page   |
| **Projection Accordion** (new) | The year-grouped, expandable UI on the Plan Page — collapsed shows Year Summary Row data, expanded shows 12 monthly rows | Plan table, projection table |

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
- Only **Active RecurringTransactions** are applied by the **Projection Engine** — **Inactive RecurringTransactions** are skipped
- A **Recurring Transfer** is a **RecurringTransaction** with a `linkedAccountId` — the Projection Engine credits the linked account and (if it is a Mortgage) reduces **Restschuld**
- A **One-off Transfer** is always composed of exactly two **Transactions** sharing a **TransferId** — it has no schedule
- A **Sondertilgung** is a **Transfer** from a **Tagesgeld** account to a **Mortgage** account — it reduces the **Restschuld**
- The **Plan** is always the output of the **Projection Engine** — it is never entered or stored manually
- **Total Liquid** includes only **Girokonto** and **Tagesgeld** accounts — determined by **AccountKind**
- A **Milestone** targets exactly one **Account** and has exactly one **target balance**
- The **Estimated Completion Month** of a **Milestone** is derived from the **Plan** — never stored
- The **Payoff Month** of a **Mortgage** account is derived from the **Plan** — never stored
- The **Payoff Year** is the calendar year that contains the **Payoff Month** — used to visually distinguish the payoff year in the **Projection Accordion**
- The **Mortgage Countdown** displays one entry per **Mortgage** account
- The **Plan Summary** displays one **Year Summary Row** per projected year-end, derived from the December **MonthlySnapshot** of each year
- The **Projection Accordion** on the **Plan Page** contains one expandable section per projected year — each section's expanded state shows 12 **MonthlySnapshot** rows
- An **ST Month** is identified by the presence of an annual **Recurring Transfer** whose `linkedAccountId` points to a **Mortgage** account — never hardcoded to a calendar month

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

> **Dev:** "If the user wants to pause their monthly savings transfer temporarily,
> do they delete the RecurringTransaction?"
>
> **Domain expert:** "No — they set it to Inactive. The RecurringTransaction is
> retained so they can reactivate it later. The Projection Engine skips Inactive
> RecurringTransactions, so the Plan updates immediately."
>
> **Dev:** "What about a one-off lump-sum transfer — say, moving a bonus into
> Tagesgeld?"
>
> **Domain expert:** "That's a One-off Transfer — two linked Transactions sharing
> a TransferId. It has no schedule and no linkedAccountId. It affects the Current
> Balance immediately but doesn't change any RecurringTransaction."
>
> **Dev:** "And the annual Sondertilgung — is that a Recurring Transfer?"
>
> **Domain expert:** "Yes. It's a RecurringTransaction on the Tagesgeld account
> with a linkedAccountId pointing to the Mortgage. When the Projection Engine
> hits it in October, it debits Tagesgeld and reduces the Restschuld. That's
> what makes the Payoff Month move earlier."

## Design System (new)

| Term         | Definition                                                                               | Aliases to avoid             |
| ------------ | ---------------------------------------------------------------------------------------- | ---------------------------- |
| **Meridian** | The custom design system for Horizon — defines visual tokens, primitives, and components | "the design system", "theme" |

## Example dialogue (Financial Projection Dashboard)

> **Dev:** "On the Plan Page, how does the app know which months to highlight as ST months?"
>
> **Domain expert:** "It's derived — not hardcoded. The app looks for any annual Recurring Transfer whose `linkedAccountId` points to a Mortgage account. Whatever month that fires in is the ST Month. It could be October, it could be March."
>
> **Dev:** "What if the user hasn't set up a Sondertilgung Recurring Transfer yet?"
>
> **Domain expert:** "Then there are no ST Months in the Plan and nothing is highlighted. Correct behaviour."
>
> **Dev:** "The Plan Summary on the dashboard — does it show per-account balances or just totals?"
>
> **Domain expert:** "Just totals. Each Year Summary Row shows Total Liquid, Restschuld, and ST amount fired. The per-account breakdown lives in the Projection Accordion on the Plan Page."
>
> **Dev:** "When does a year get the Payoff Year treatment in the accordion?"
>
> **Domain expert:** "When it contains the Payoff Month — the first month the Mortgage Restschuld reaches zero. The year header gets a badge, and that specific month row is highlighted."

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
- **"Transfer"** is now two distinct concepts — always qualify: **One-off Transfer**
  (two Transactions sharing a TransferId, recorded directly) vs **Recurring Transfer**
  (a RecurringTransaction with a linkedAccountId, applied by the Projection Engine).
  Never use "Transfer" alone when the distinction matters.
