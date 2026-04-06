## Problem Statement

As a Horizon user, I have a backend that accurately tracks all my account balances, transactions, and a 10-year projection — but no way to see any of it. I need a dashboard that gives me an immediate read on where my money is right now, how my mortgage is progressing, and whether I'm on track to hit the financial targets I've set for myself.

---

## Solution

Build the Horizon dashboard at `/` (root). It has three sections:

1. **Account overview** — all accounts with current balances, grouped by kind, with a Total Liquid summary
2. **Mortgage countdown** — one countdown per Mortgage account showing current Restschuld and projected Payoff Month
3. **Milestone tracker** — user-defined balance targets with estimated completion months derived from the Projection Engine

---

## User Stories

### Account Overview

1. As a user, I want to see all my accounts listed with their current balances on the dashboard, so that I have an immediate overview of where my money sits.
2. As a user, I want to see Total Liquid at the top of the account overview, so that I immediately know my accessible cash without scanning individual accounts.
3. As a user, I want liability accounts (Mortgage, CreditCard) to be visually distinct from asset accounts, so that I can immediately distinguish what I own from what I owe.
4. As a user, I want the account overview to show only current balances — not projections — so that the view is unambiguous and reflects reality right now.
5. As a user, I want each account card to show the account name, AccountKind, and current balance, so that I can identify each account at a glance.
6. As a user with no accounts yet, I want to see an empty state with a prompt to create my first account, so that I understand what to do next.

### Mortgage Countdown

7. As a user, I want to see a mortgage countdown for each of my Mortgage accounts, so that I can track how far I am from paying off each loan.
8. As a user, I want the countdown to show the current Restschuld alongside the projected Payoff Month, so that I understand both where I am and when I'll be done.
9. As a user, I want the countdown to display "X years Y months remaining" from today to the Payoff Month, so that I can feel the progress in human terms.
10. As a user with no Mortgage accounts, I want the mortgage countdown section to be hidden entirely, so that the dashboard doesn't show irrelevant empty states.
11. As a user with multiple Mortgage accounts, I want a separate countdown for each, labelled by account name, so that I can track each mortgage independently.
12. As a user whose Mortgage Payoff Month is not reached within the 10-year projection, I want to see "Not paid off within 10-year horizon" instead of a date, so that I understand the projection limit.

### Milestone Tracker

13. As a user, I want to create a milestone by giving it a name, choosing a target account, and entering a target balance, so that I can track progress toward any financial goal I care about.
14. As a user, I want each milestone to show the estimated month when the projected balance will reach the target, so that I know when I'm on track to hit my goal.
15. As a user whose milestone target is not reached within the 10-year projection, I want to see "Not reached within 10-year horizon" instead of a date, so that I understand the limit.
16. As a user, I want to delete a milestone I no longer need, so that I can keep the tracker focused on current goals.
17. As a user with no milestones yet, I want to see an empty state with a prompt to add my first milestone, so that the feature is self-explanatory.
18. As a user, I want milestone estimated dates to update automatically when I edit a recurring transaction, so that the tracker always reflects my current plan.
19. As a user, I want to be able to set a milestone on any account kind — Girokonto, Tagesgeld, Investment, Mortgage, or CreditCard — so that any financial target can be tracked.
20. As a user, I want the milestone tracker to infer whether I'm trying to grow or reduce a balance based on the AccountKind, so that I don't have to specify a direction manually.

---

## Implementation Decisions

### Milestone data model

- Stored in MongoDB with three fields: `name` (string), `accountId` (string referencing an Account), `targetBalance` (integer cents)
- No direction field — AccountKind drives crossing logic: asset kinds (Girokonto, Tagesgeld, Investment, CreditCard) look for `projected >= targetBalance`; Mortgage looks for `projected <= targetBalance`

### Milestone API

- `GET /milestones` — returns all milestones as raw records (no estimation on the server)
- `POST /milestones` — creates a milestone; validates that `name`, `accountId`, and `targetBalance` are present; validates that `accountId` references a real account
- `DELETE /milestones/:id` — removes a milestone; 404 if not found

### Mortgage Payoff Month

- Derived entirely client-side by scanning `GET /projection` snapshots
- No dedicated endpoint
- One Payoff Month computed per Mortgage account in the projection data

### Milestone Estimated Completion Month

- Derived client-side from `GET /projection` snapshots
- `GET /milestones` returns raw records; frontend joins with projection data to produce the estimated month

### Pure utility functions (deep modules, fully tested)

- `findMilestoneMonth(snapshots, accountId, targetBalance, accountKind)` — returns the first "YYYY-MM" where the projected balance crosses the target, or `null`
- `findMortgagePayoffMonth(snapshots, mortgageAccountId)` — returns the first "YYYY-MM" where the Mortgage projected balance reaches zero, or `null`

Both functions are pure (no side effects, no network calls) and live in `src/utils/`.

### Frontend features

Three independent features compose the dashboard:

- **accounts feature** — fetches `GET /accounts`, exposes account list and Total Liquid; no business logic in components
- **projection feature** — fetches `GET /projection`, exposes raw snapshots and derived `mortgagePayoffMonths` map (accountId → "YYYY-MM" | null)
- **milestones feature** — fetches `GET /milestones`, combines with projection snapshots to compute `estimatedCompletionMonth` per milestone; owns create and delete flows

### Dashboard page

- Route: `/`
- Default export, composition only — no business logic or data fetching directly in the page component
- Composes the three features listed above

---

## Testing Decisions

**What makes a good test here:** test the output given a known input. Never assert that a specific internal method was called. For pure utility functions, pass in a constructed set of snapshots and assert the returned month string.

**Modules with tests:**

- `findMilestoneMonth` — highest priority. Test cases: asset account reaches target (returns correct month); asset account never reaches target (returns null); Mortgage account balance decreases to target (returns correct month); deactivated recurring transactions excluded (balance never changes).
- `findMortgagePayoffMonth` — test cases: Mortgage reaches zero (returns correct month); never reaches zero within 120 snapshots (returns null).

**Prior art:** `server/src/__tests__/cashflow.test.ts` and `server/src/__tests__/projection.test.ts` demonstrate the pattern — construct minimal input, call the pure function, assert output. Frontend utils follow the same pattern using Vitest.

**Not tested:** React components, hooks, or the Milestone API routes (thin HTTP wrappers, covered by integration behaviour).

---

## Out of Scope

- Milestone editing (delete and recreate instead)
- Progress bars or percentage-to-goal indicators on milestones
- System-generated milestones (e.g. auto-detect mortgage payoff)
- Transaction detail view on the dashboard
- Sorting or filtering accounts on the overview
- Historical balance charts

---

## Further Notes

- The Projection Engine (`GET /projection`) already exists and returns 120 MonthlySnapshots. This PRD does not modify it.
- `GET /accounts` already exists and returns current balances. This PRD does not modify it.
- The dashboard is the demo landing page — no authentication in this phase.
