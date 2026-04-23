## Problem Statement

The Projection Engine produces wrong balance trajectories for every account. Three structural bugs compound each other:

1. The annual Sondertilgung fires in the wrong calendar month. It is configured for October, but the engine fires it in whatever month the projection happens to start — so if the projection runs in April, the ST fires in April, April next year, April the year after, and so on. This wipes thousands of euros from the Tagesgeld balance immediately and makes the entire 20-year plan untrustworthy.

2. Quarterly transactions (e.g. Rundfunk, Grundsteuer) fire in the wrong calendar months for the same reason — they are anchored to the projection start date, not the real calendar quarter.

3. The starting balance fed into the projection is wrong. Horizon uses a recurring-only projection model: salary, transfers, and regular expenses are never entered as actual transactions — only recurring transactions capture those flows. But the engine initialises each account from its Opening Balance plus one-off actual transactions only. All the salary and expense recurring transactions that have fired since the account was set up are invisible to the initialiser, so the starting balance can be off by months or years of accumulated income and spending.

The result is that projected balances for Girokonto, Tagesgeld, and Mortgage are all wrong, and the ST fires in the wrong month every year for the full 20-year horizon. The AI features that will reason over this output cannot be built until the engine is correct.

## Solution

Fix all three bugs together so that `projectBalances` produces correct month-by-month balances that a user can trust as the basis for long-term financial decisions.

The fix has two parts. First, make the engine calendar-aware: annual and quarterly recurring transactions should fire based on a `monthOfYear` anchor — a calendar month number stored on the recurring transaction — rather than on the projection start index. Second, make the initialiser replay recurring history: before projecting forward, the engine should replay all recurring transactions from each account's Opening Date up to today, using the same calendar-aware firing logic, so that the starting balance reflects the true current state of the account.

Both fixes ship together because the replay loop must use the corrected firing logic — fixing one without the other produces a different wrong answer.

## User Stories

1. As a user, I want the Sondertilgung to appear in October every year in my projected plan, so that I can see the correct Restschuld trajectory across the full 20-year horizon.

2. As a user, I want the quarterly Rundfunk and Grundsteuer charges to appear in the correct calendar months (January, April, July, October), so that my monthly cashflow projections are accurate.

3. As a user, I want the projected Tagesgeld balance in May to correctly reflect my Opening Balance plus one month of incoming transfers, so that I can trust the numbers I see in the plan table.

4. As a user, I want the projected Girokonto balance to correctly reflect my current account state — including all salary and expense recurring transactions that have already fired since I set up the account — so that the forward projection starts from the right place.

5. As a user, I want the Restschuld trajectory to be correct, so that the Payoff Month shown in the Mortgage Countdown and on the Trajectory Horizon chart is accurate.

6. As a user, I want the Total Liquid line on the Trajectory Horizon chart to start from the correct value and grow at the correct rate, so that the 20-year savings picture is trustworthy.

7. As a user, I want ST clamping to still work correctly — if my Tagesgeld balance is less than the ST amount in October, only the remaining balance is transferred — so that the Mortgage never goes negative.

8. As a user, I want accounts that were set up at different times to each initialise correctly from their own Opening Date, so that a Tagesgeld opened in March and a Girokonto opened in January both start with the right balance.

9. As a user, I want the plan to always reflect the current state of my recurring transactions — if I update a recurring transaction today, the projection updates immediately with no manual re-entry needed.

10. As a user who changes a recurring transaction (e.g. increases my monthly ETF contribution), I want the projection to use the new amount going forward from the moment I make the change, so that I can see the impact of the update immediately.

## Implementation Decisions

**Recurring-only projection model**
Recurring transactions own all regular financial flows (salary, mortgage, transfers, subscriptions). Actual transactions exist only for variable one-off spending (food, dental, shopping). These two streams are separate and must be treated differently throughout the engine.

**Calendar-aware firing via `monthOfYear`**
The `monthOfYear` field already exists on the `RecurringTransaction` model. It must be added to the engine recurring entry interface and passed through the route. The `firesInMonth` function must be updated to resolve the actual calendar month for the current index, then apply the following rules:

- Annual with `monthOfYear`: fire when `calendarMonth === monthOfYear`
- Quarterly with `monthOfYear`: fire when `(calendarMonth - monthOfYear) % 3 === 0`
- Annual without `monthOfYear`: legacy fallback, fire at index 0, 12, 24 (unchanged)
- Quarterly without `monthOfYear`: legacy fallback, fire at index 0, 3, 6 (unchanged)
- Monthly: always fires (unchanged)

**Replay loop**
Before the forward projection loop, the engine replays each account recurring history from its Opening Date up to (but not including) the current month. The replay uses the same transfer logic and the same updated `firesInMonth` as the forward projection. After the replay, one-off actual transactions (Variable Spending) that occurred before the current month are added. Together these give the correct starting balance.

**`ProjectionAccountEntry` gains `openingDate`**
The route already has `openingDate` from the Account model; it just needs to be mapped through to the engine entry. Each account uses its own Opening Date as the replay start — accounts opened at different times replay different amounts of history.

**`ProjectionRecurringEntry` gains `monthOfYear`**
Optional field, passed through only when present on the recurring transaction. No schema change to the database model is required.

**Route mapping**
The projection route maps both new fields when present — `openingDate` unconditionally (it is required on the Account model), `monthOfYear` conditionally (it may not be set on all recurring transactions).

**No UI changes**
All fixes are in the server-side engine and route. Component and hook behaviour is unchanged. The corrected snapshots flow through the existing data path automatically.

## Testing Decisions

A good test for this engine:

- Tests the output of `projectBalances` as a pure function with controlled inputs
- Asserts on projected balance values for specific accounts at specific month indices
- Does not assert on internal implementation details
- Uses realistic cent-denominated amounts (e.g. 70000 for 700 EUR)
- Covers both the happy path and edge cases (clamping, payoff, empty inputs)

**Modules under test**

- `projectBalances` — the pure function, exercised directly without HTTP
- `GET /projection` — the Express route, tested via supertest for shape and field pass-through

**New test cases required**

For the timing fix:

- Annual with `monthOfYear: 10` starting from April fires first in October (index 6), not April (index 0)
- Annual with `monthOfYear: 10` fires again in October the following year (index 18), not April (index 12)
- Annual without `monthOfYear` preserves legacy behaviour (index 0, 12, 24)
- Quarterly with `monthOfYear: 1` starting from April fires in July (index 3), October (index 6), January (index 9) — not April (index 0)
- Quarterly without `monthOfYear` preserves legacy behaviour (index 0, 3, 6)
- Regression: monthly transfer + annual ST with `monthOfYear: 10` does not produce a negative Tagesgeld balance in May

For the replay loop:

- Account opened 3 months ago with a known monthly recurring: starting balance equals Opening Balance + 3 months of that recurring applied
- Account opened 6 months ago with a known annual recurring with `monthOfYear` set: only months where the anchor fires contribute to the starting balance
- Two accounts with different Opening Dates each initialise independently from their own start
- Variable Spending actual transactions are included in the starting balance alongside the replayed recurring history
- Replay uses the corrected firing logic — if an account was opened in April and the ST has `monthOfYear: 10`, the replay fires the ST in October of each elapsed year, not in April

**Prior art**
Existing tests in the server projection test file and the client-side utils test file show the established pattern: construct minimal account, transaction, and recurring arrays; call the pure function; assert on projected values at specific month indices.

## Out of Scope

- **Time-bounded recurring transactions**: no `startDate` or `endDate` on recurring transactions. Horizon projects the current state of recurring transactions indefinitely. When something changes in real life, the user updates their recurring transactions at that point. Pre-scheduling is a separate feature if ever needed.
- **UI changes**: no component, hook, or page changes in this issue.
- **Sparkasse account column**: does not map to how Horizon tracks spending and is excluded from correctness verification.
- **`actual` field redefinition**: the `actual` field in each MonthlySnapshot is not in scope. Its current derivation (Opening Balance + actual transactions through that month) is unchanged.
- **Phase concepts**: Horizon has no notion of financial phases. Users manage future changes by updating their recurring transactions when the change happens.

## Further Notes

The three bugs are interdependent. The `monthOfYear` timing fix must ship in the same change as the replay loop because the replay loop calls `firesInMonth` — if timing is still wrong during replay, the initialisation fix produces a different wrong answer.

The replay loop adds O(months × recurring) work before each projection request. For a typical setup (10–15 recurring transactions, accounts opened 1–2 years ago) this is roughly 300–600 extra iterations — negligible at current scale.
