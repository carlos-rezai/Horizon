# 07 — Projection Engine Audit

## Background

`projectBalances` in `server/src/lib/projection.ts` is the single source of truth
for all projected account balances in Horizon. The AI features (Monthly Digest,
Anomaly Detection, Sondertilgung Advisor) will reason directly over its output.
Before those are built, the engine must be verified correct.

Horizon uses a **recurring-only projection model**: recurring transactions own all
regular financial flows (salary, mortgage, transfers, subscriptions). Actual
transactions exist only for variable one-off spending (food, dental, shopping,
cat food). These two streams are completely separate.

## Problem

Three structural bugs make the engine output wrong for real data:

1. `monthOfYear` is stored on `RecurringTransaction` but is never passed to the
   engine or used in `firesInMonth`. Annual recurring transactions fire at
   index 0, 12, 24 — anchored to the projection start date — instead of the
   correct calendar month. A Sondertilgung configured for October fires in April
   (whenever the projection starts), producing deeply wrong balance trajectories.

2. Quarterly recurring has the same root cause: `index % 3 === 0` anchors to the
   projection start date, not the real calendar quarter. If the projection starts
   in a month that does not align with the intended quarterly month, every
   quarterly item fires in the wrong months for the entire 20-year window.

3. The initialiser computes `openingBalance + sum(actualTx before fromDate)`.
   Because recurring transactions are never entered as actuals, all salary,
   transfer, and expense flows that fired in past months are invisible to the
   initialiser. The starting balance fed into the forward projection is wrong by
   however many months of recurring history the account has accumulated.

## Questions and Answers

**Q1: What triggered this audit?**
Pre-AI quality gate. The Sondertilgung Advisor will reason over projection
snapshots; silent errors there produce bad AI advice. ✅

**Q2: What categories does the audit cover?**
Timing bugs (annual `monthOfYear`, quarterly calendar anchoring) and the
initialisation gap. Plus correctness verification of ST clamping and mortgage
payoff logic against known correct values. ✅

**Q3: What is the acceptance bar for a passing audit?**
The engine reproduces correct month-by-month balances for accounts matching
real data. Sparkasse is excluded — it does not map to how Horizon tracks
spending. ✅

**Q4: Should `monthOfYear` be reused for quarterly, or is a separate field needed?**
Reuse `monthOfYear`. A quarterly transaction fires when
`(currentCalendarMonth - monthOfYear) % 3 === 0`. No schema change. ✅

**Q5: Are salary and regular expenses entered as actual transactions?**
No. Recurring-only projection: recurring transactions are the sole source of
truth for all regular flows. Actual transactions exist only for one-off variable
spending. ✅

**Q6: What does `openingBalance` represent?**
A one-time snapshot of the real account balance on the day the user sets up
the account in Horizon. The engine derives the correct current balance by
replaying all recurring transactions from `openingDate` to today. ✅

**Q7: Should the historical replay use the same `firesInMonth` logic as the
forward projection?**
Yes. The timing bugs must be fixed first and the replay must use the same
corrected logic. The two are interdependent and ship together. ✅

**Q8: Are time-bounded recurring transactions (start/end date) in scope?**
Out of scope. Horizon projects the current state of recurring transactions
indefinitely. When something changes in real life — income increases, a
transfer amount changes — the user updates their recurring transactions at
that point. No pre-scheduling or phase feature is planned. If the need
arises it is a separate PRD. ✅

**Q9: Does `ProjectionAccountEntry` need `openingDate`?**
Yes. Each account may have been set up at a different time. The engine needs
per-account `openingDate` to know where to start the replay for that account.
`openingDate` already exists on the Account model. ✅

## Design

### Interface changes

```typescript
// server/src/lib/projection.ts

export interface ProjectionAccountEntry {
  _id: string;
  kind: AccountKind;
  openingBalance: number;
  openingDate: string; // ✅ added — YYYY-MM-DD, drives replay start
}

export interface ProjectionRecurringEntry {
  accountId: string;
  amount: number;
  frequency: Frequency;
  dayOfMonth: number;
  isActive: boolean;
  linkedAccountId?: string;
  monthOfYear?: number; // ✅ added — calendar month anchor (1–12)
}
```

### `firesInMonth` — updated signature

```typescript
function firesInMonth(
  frequency: Frequency,
  index: number,
  fromDate: string, // ✅ needed to resolve calendar month
  monthOfYear?: number
): boolean;
```

- `monthly` → always true (unchanged)
- `quarterly` with `monthOfYear` → `(calendarMonth - monthOfYear) % 3 === 0`
- `quarterly` without `monthOfYear` → legacy `index % 3 === 0`
- `annual` with `monthOfYear` → `calendarMonth === monthOfYear`
- `annual` without `monthOfYear` → legacy `index % 12 === 0`

### Initialisation — replay loop

Before the forward projection loop, replay each account's recurring history:

```
for each account a:
  months = all calendar months from a.openingDate up to (but not including) fromDate
  for each month m in that range:
    for each active recurring r:
      if firesInMonth(r.frequency, indexInReplay, a.openingDate, r.monthOfYear):
        apply r to runningBalances (same transfer/non-transfer logic as forward)
  then add priorActuals (one-off transactions before fromDate) as before
```

✅ Replay and forward projection share identical firing and transfer logic.
❌ Single global replay start date — rejected, accounts have different `openingDate`s.
❌ Require users to update `openingBalance` monthly — rejected, error-prone.

### Route change

`server/src/routes/projection.ts` — map both new fields through:

```typescript
const accountEntries = accounts.map((a) => ({
  _id: String(a._id),
  kind: a.kind,
  openingBalance: a.openingBalance,
  openingDate: a.openingDate, // ✅ added
}));

const recurringEntries = recurringTransactions.map((r) => ({
  accountId: r.accountId,
  amount: r.amount,
  frequency: r.frequency,
  dayOfMonth: r.dayOfMonth,
  isActive: r.isActive,
  ...(r.linkedAccountId != null && { linkedAccountId: r.linkedAccountId }),
  ...(r.monthOfYear != null && { monthOfYear: r.monthOfYear }), // ✅ added
}));
```

## Implementation Plan

**Phase 1 — Fix `firesInMonth` (timing bugs)**
Update the function signature to accept `fromDate` and `monthOfYear`. Implement
calendar-month resolution for annual and quarterly. Update the forward
projection loop call site. All existing tests must still pass; add tests for
`monthOfYear` annual (fires in correct month, not index 0) and `monthOfYear`
quarterly (fires in correct calendar months across a full year).

**Phase 2 — Pass `monthOfYear` through the route**
Add `monthOfYear` to `ProjectionRecurringEntry`. Update the route mapping.
No new tests needed beyond Phase 1 coverage.

**Phase 3 — Fix initialisation (replay loop)**
Add `openingDate` to `ProjectionAccountEntry`. Implement the replay loop before
the forward projection. Update the route mapping to pass `openingDate`. Add
tests: account opened 3 months ago with known recurring — starting balance
for today must equal what manual arithmetic produces.

**Phase 4 — Correctness verification**
Write integration-style tests using realistic account configurations that
verify Girokonto, Tagesgeld, and Mortgage balances month-by-month against
manually verified correct values. ST clamping and payoff behaviour confirmed.
All tests green = audit passes.

## Trade-offs

**Easier:** AI features can trust projection output. ST fires in the right
month. Starting balances are correct from day one. New recurring transactions
just work without calendar alignment surprises.

**Harder:** the replay loop adds O(months × recurring) work before each
projection. For a typical setup (10–15 recurring, opened 1–2 years ago) this
is ~300–600 extra iterations — negligible. If accounts accumulate many years
of history this grows linearly, but remains fast in practice.

**Ruled out of scope:**

- Time-bounded recurring (start/end date on recurring transactions)
- UI changes
- Sparkasse column verification
