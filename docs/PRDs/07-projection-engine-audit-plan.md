# Plan: Projection Engine Audit

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/43

## Architectural decisions

- **Routes**: `GET /projection` — unchanged, no new routes or URL changes
- **Schema**: No database model changes — `openingDate` and `monthOfYear` already exist on their respective models
- **Key interfaces**: `ProjectionAccountEntry` gains `openingDate: string`; `ProjectionRecurringEntry` gains `monthOfYear?: number`
- **Engine contract**: `projectBalances` remains a pure function — same signature shape, same output type, no side effects
- **No UI changes**: corrected snapshots flow through the existing hook and component data path automatically

---

## Phase 1: Calendar-aware firing

**User stories**: 1, 2, 7

### What to build

Make the engine resolve the real calendar month for every recurring transaction before deciding whether it fires. Annual recurring transactions with `monthOfYear` set should fire only when the current projected month matches that calendar month — not at the projection start index. Quarterly recurring transactions with `monthOfYear` set should fire every three months from that calendar anchor.

The recurring entry interface gains `monthOfYear` as an optional field. The route maps it through when present on the recurring transaction. Legacy recurring transactions without `monthOfYear` keep their existing index-based behaviour unchanged.

ST clamping (Mortgage never goes negative) must continue to work correctly under the new timing.

### Acceptance criteria

- [ ] An annual recurring with `monthOfYear: 10` starting from April fires first at the October snapshot, not the April snapshot
- [ ] The same annual recurring fires again at October the following year, not April
- [ ] An annual recurring without `monthOfYear` still fires at projection indices 0, 12, 24 (legacy behaviour preserved)
- [ ] A quarterly recurring with `monthOfYear: 1` starting from April fires at July, October, and January — not April, July, October
- [ ] A quarterly recurring without `monthOfYear` still fires at indices 0, 3, 6 (legacy behaviour preserved)
- [ ] A monthly transfer into Tagesgeld combined with an annual ST (`monthOfYear: 10`) does not produce a negative Tagesgeld balance in May
- [ ] All previously passing projection tests continue to pass

---

## Phase 2: Replay loop

**User stories**: 3, 4, 5, 6, 8, 9, 10

### What to build

Before running the forward projection, the engine replays each account's recurring history from its Opening Date up to (but not including) the current month. This replay uses the same calendar-aware `firesInMonth` logic from Phase 1 and the same transfer rules as the forward projection. After the replay, Variable Spending actual transactions that occurred before the current month are added. The result is the correct starting balance for each account.

The account entry interface gains `openingDate`. The route maps it through from the Account model. Each account replays independently from its own Opening Date — accounts set up at different times accumulate different amounts of history.

### Acceptance criteria

- [ ] An account opened exactly 3 months ago with a known monthly recurring starts the forward projection at Opening Balance + 3 months of that recurring
- [ ] An account opened 14 months ago with an annual recurring (`monthOfYear: 10`) has the ST applied once in its replay if October fell within the elapsed window, and not at all if it did not
- [ ] Two accounts with different Opening Dates each initialise from their own start date independently
- [ ] Variable Spending actual transactions recorded before the current month are included in the starting balance alongside the replayed recurring history
- [ ] The replay uses corrected `firesInMonth` — an account opened in April with a ST of `monthOfYear: 10` fires the ST in October during replay, not in April
- [ ] All previously passing projection tests continue to pass

---

## Phase 3: Correctness verification

**User stories**: 1–10

### What to build

A suite of integration-style tests that exercise `projectBalances` with a realistic multi-account, multi-recurring configuration — Girokonto, Tagesgeld, and Mortgage, with monthly salary, monthly transfers, quarterly costs, and an annual Sondertilgung — and assert correct month-by-month balances against manually calculated values. These tests serve as the audit's acceptance gate: all green means the engine is trustworthy for the AI features to build on.

No new engine logic is written in this phase. The tests either pass on the Phase 2 implementation or they surface a remaining bug to fix before the audit is declared done.

### Acceptance criteria

- [ ] Girokonto balance after N months of salary and outgoing recurring matches the manually calculated value
- [ ] Tagesgeld balance grows correctly each month from incoming transfers and drops correctly in the ST month
- [ ] Restschuld decreases only in October (ST month) and never goes negative
- [ ] Total Liquid at end of each projected year matches manually calculated values
- [ ] Net Cashflow per month reflects only non-transfer recurring amounts
- [ ] Payoff Month is the first month where Mortgage projected balance reaches zero
- [ ] ST clamping: when Tagesgeld balance is less than the ST amount in October, only the available balance transfers and the Mortgage reaches zero without going negative
- [ ] All new and existing projection tests pass — audit is complete
