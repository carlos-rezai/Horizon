# 25 — Savings Streak (Motivation)

## Background

Horizon is entirely diagnostic today — balances, projections, payoff
countdown — with nothing that rewards good month-to-month saving behaviour.
The canonical design prototype (`docs/handoff/savings-streak/`) introduces a
**Savings Streak**: a lightweight gamification layer, scoped as one new
full-width Dashboard accordion card plus one edit modal.

Reference source (the spec we translate 1:1):

- `docs/handoff/savings-streak/prototype/src/screens/Dashboard.jsx` →
  `SavingsGoalCard`
- `docs/handoff/savings-streak/prototype/src/modals.jsx` → `SavingsGoalModal`
- `docs/handoff/savings-streak/prototype/src/data.js` → `computeSavingsGoal`,
  `savingsGoalConfig`, `trackableAccountIds`
- `docs/handoff/savings-streak/savings-streak/DELTA.md` (scope + caveats)
- Screens: `savings-streak/screens/01-collapsed.png`, `02-expanded.png`,
  `03-edit-modal.png`

The mandate: **translate the prototype 1:1 into our stack and conventions —
do not redesign.** The prototype's `data.js` is a mock; the real feature wires
to existing infrastructure.

## Problem

Reproduce the prototype's Savings Streak faithfully in
React + TypeScript + styled-components on Meridian, while:

1. Replacing the mock projection generator with real reconstructed monthly
   balances.
2. Persisting a single savings-goal config in SQLite through the repository
   abstraction (no generic key-value store exists).
3. Honouring the code rules (cents integers, ISO date strings, no `any`,
   co-located tests/styles, domain logic in features not components).

## Questions and Answers

**Q1. What is the real "amount saved this month" signal, and where does
compute run?**
A. Keep the prototype's mechanic 1:1: a month is "met" for a tracked account
when `balance[thisMonth] − balance[lastMonth] ≥ monthlyTarget`. The real feed
is `GET /projection/history`, which returns a **contiguous** `HistoryPoint[]`
from the earliest imported transaction month through the current month, each
with `accounts[id]` = reconstructed month-end balance. Port
`computeSavingsGoal` as a **pure frontend util**; the backend only persists
config. No new compute endpoint. (Confirmed: the balance-delta proxy isn't
literal cash "saved" for noisy accounts — the DELTA flags this — but 1:1
translation keeps it, and noisy accounts stay untracked by default.)

**Q2. Where is the goal config persisted?**
A. A new **single-row `savings_goal` table + `SavingsGoalRepo`** (get/upsert,
modelled on `ImportPresetsRepo`). The config is one global object; splitting
`manualMonthly` onto account columns is rejected because Milestone mode
_derives_ the per-account split rather than storing it.

**Q3. What counts as a trackable account?**
A. Derive by kind: `Girokonto | Tagesgeld | Investment`, ordered by the
existing account `sortOrder`. `Mortgage`/`CreditCard` excluded ("save X/month"
doesn't apply to debt). Untracked accounts (target 0) render dimmed with a
"Not tracked" badge — not hidden. Replaces the prototype's hardcoded
`trackableAccountIds = ["a1","a2","a3","a5"]`.

**Q4. `startedAt` semantics?**
A. Set to the current month on the first-ever save, fixed thereafter, **not**
editable in the modal (matches the prototype's modal, which never exposes it).
It drives only the per-account cumulative progress bars; the streak
(current/best/calendar strip) scans _all_ available history independent of
`startedAt`.

**Q5 (judgment call — ISO strings).** Prototype stores `targetDate`/`startedAt`
as `{year, month}` objects. Our rule is "all dates are ISO strings", so persist
them as `"YYYY-MM"` and convert to `{year, month}` only inside compute.

**Q6 (judgment call — milestone copy).** `computeSavingsGoal` already weights
the milestone auto-split by each account's **trailing-12-month average monthly
gain** (correct). The card caption and modal helper text say "by balance",
which the DELTA explicitly flags as the wrong framing. Compute stays verbatim;
the two copy strings are corrected to "by each account's recent savings pace".

**Q7 (judgment call — naming).** Component named `SavingsStreakCard` (matches
the visible "Savings Streak" title and README) rather than the prototype's
`SavingsGoalCard`. The modal stays `SavingsGoalModal` (goal = the editable
target; streak = the derived display).

## Design

New feature module `src/features/savings/`:

```
src/features/savings/
├── SavingsStreakCard/
│   ├── SavingsStreakCard.tsx
│   ├── SavingsStreakCard.test.tsx
│   └── SavingsStreakCard.styles.ts
├── SavingsGoalModal/
│   ├── SavingsGoalModal.tsx
│   ├── SavingsGoalModal.test.tsx
│   └── SavingsGoalModal.styles.ts
├── computeSavingsGoal.ts        ← ported pure fn (domain logic in feature)
├── computeSavingsGoal.test.ts
├── useSavingsGoal.ts            ← loads config + history, runs compute, saves
├── savingsTypes.ts
└── index.ts
```

### Types (`savingsTypes.ts`)

```ts
type SavingsGoalMode = "milestone" | "manual";

interface SavingsGoalConfig {
  mode: SavingsGoalMode;
  targetTotal: number; // cents (milestone mode)
  targetDate: string; // "YYYY-MM"
  startedAt: string; // "YYYY-MM", set on first save, fixed
  manualMonthly: Record<string, number>; // accountId -> cents
}

interface PerAccountGoal {
  id: string;
  target: number; // cents/month
  tracked: boolean; // target > 0
  cumulativeActual: number; // cents saved since startedAt
  cumulativeTarget: number; // cents
}

interface YearTick {
  year: number;
  month: number; // 0-based
  status: "met" | "missed" | "upcoming";
}

interface SavingsGoal extends SavingsGoalConfig {
  monthly: Record<string, number>;
  monthsToTarget: number | null;
  monthsElapsed: number;
  perAccount: PerAccountGoal[];
  streak: { current: number; best: number; yearTicks: YearTick[] };
}
```

### Compute (`computeSavingsGoal.ts`)

Verbatim port of the prototype function. Signature:

```ts
function computeSavingsGoal(
  config: SavingsGoalConfig,
  points: HistoryPoint[], // from GET /projection/history
  trackableIds: string[] // derived by kind, sortOrder-ordered
): SavingsGoal;
```

Adapts prototype `p[id]` → `p.accounts[id]` and `{year,month}` ↔ `"YYYY-MM"` at
the edges. Streak, calendar strip, milestone trailing-12-month weighting,
cumulative actual-vs-target all unchanged.

### Persistence

- Migration `016_add_savings_goal.sql` — single-row table:

```sql
CREATE TABLE savings_goal (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  mode          TEXT NOT NULL,
  target_total  INTEGER NOT NULL,
  target_date   TEXT NOT NULL,   -- "YYYY-MM"
  started_at    TEXT NOT NULL,   -- "YYYY-MM"
  manual_monthly TEXT NOT NULL   -- JSON: { accountId: cents }
);
```

- `SavingsGoalRepo { get(): Promise<SavingsGoalConfig | null>; upsert(cfg): Promise<void> }`
  added to `Storage`, implemented in `sqlite/savingsGoal.ts`, parity-tested.
- Route `server/src/routes/savingsGoal/` → `GET /savings-goal`,
  `PUT /savings-goal`.

### Frontend wiring

- ✅ `useSavingsGoal()` wraps `useHistory()` + a config fetch, runs
  `computeSavingsGoal`, exposes `{ goal, save, isLoading }`.
- ✅ `<SavingsStreakCard accounts={accounts} />` rendered in `DashboardPage`
  between `<TrajectoryHorizon/>` and `<StyledGrid>`, full-width, collapsed by
  default (local `useState`, not persisted).
- ✅ Save → `useSnackbar().notify("Savings goal updated", { variant: "success" })`.
- ❌ New projection/compute endpoint — rejected; the History feed already
  carries per-account monthly balances.
- ❌ Persisting open/collapsed state — rejected; the prototype doesn't.
- ❌ Per-account `savings_target` column — rejected; Milestone mode derives,
  doesn't store.

### Reuse

`Card`, `Modal`, `ProgressBar`, `Money`, `Avatar`, `Badge`, `Button`, `Input`,
`FormField`, `ChoiceChip` (mode toggle), `Icon` (`flame`/`pencil`/
`chevronDown`). No new primitives or components required.

## Implementation Plan

1. **Backend slice (thinnest end-to-end):** migration `016`, `SavingsGoalRepo`
   - SQLite impl + parity test, `GET`/`PUT /savings-goal` route + tests. A
     default config is returned/seeded on first `GET`.
2. **Compute port:** `savingsTypes.ts` + `computeSavingsGoal.ts` +
   exhaustive `computeSavingsGoal.test.ts` (streak current/best, met/missed/
   upcoming strip, milestone weighting, manual mode, empty history, startedAt
   before/after history).
3. **Hook:** `useSavingsGoal.ts` (+ test) — history + config → goal, save.
4. **Card:** `SavingsStreakCard` collapsed + expanded states, calendar strip,
   per-account rows, Not-tracked treatment; render in `DashboardPage`. Compare
   against `01-collapsed.png` / `02-expanded.png`.
5. **Modal:** `SavingsGoalModal` — Milestone/Manual, silent convert-on-edit,
   live derived split, corrected copy. Compare against `03-edit-modal.png`.
6. **Docs:** README build-status tick, dev-journal entry.

## Trade-offs

- **Easier:** reuses the History reconstruction and the whole Meridian
  primitive set; no projection-model changes; config is one row, trivially
  covered by backup/restore.
- **Harder / accepted:** the balance-delta streak signal is a proxy, not true
  cash saved — an account with a lumpy annual outflow can read a false "missed"
  month. Mitigated by leaving noisy accounts untracked by default; the DELTA
  notes a real build should eventually validate auto-derived targets against
  demonstrated cash-flow patterns, but that is **out of scope** for the 1:1
  translation.
- **Out of scope (explicit):** no changes to the Recurring-Only Projection
  Model, the Trajectory Horizon chart, or any other screen's data contract;
  `startedAt` is not user-editable; open/collapsed state is not persisted;
  the milestone-vs-manual weighting model is not otherwise reworked.
