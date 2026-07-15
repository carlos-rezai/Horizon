# Plan: Savings Streak

> Source PRD: https://github.com/carlos-rezai/horizon/issues/181

A lightweight gamification layer that motivates saving: one new full-width
Dashboard accordion card tracking the streak of consecutive months in which
every tracked account hit its per-account monthly savings target — a Jan–Dec
calendar strip, per-account progress rows, and a milestone-or-manual goal
editor. A faithful 1:1 translation of the canonical prototype
(`docs/handoff/savings-streak/`) into React + TypeScript + styled-components on
Meridian. No change to the Recurring-Only Projection Model, the Trajectory
Horizon chart, or any other screen's data contract.

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes (HTTP)**: `GET /savings-goal` returns the stored config (or a default
  when unset); `PUT /savings-goal` upserts it. Registered in `app.ts` alongside
  the existing routers. No new projection/compute endpoint — the card's data
  source is the existing `GET /projection/history` feed (`HistoryPoint[]`),
  which already carries per-account reconstructed month-end balances.
- **Schema**: forward-only migration `016_add_savings_goal.sql` (015 is the
  current latest), a single-row table:
  ```sql
  CREATE TABLE savings_goal (
    id             INTEGER PRIMARY KEY CHECK (id = 1),
    mode           TEXT NOT NULL,
    target_total   INTEGER NOT NULL,   -- cents
    target_date    TEXT NOT NULL,      -- "YYYY-MM"
    started_at     TEXT NOT NULL,      -- "YYYY-MM"
    manual_monthly TEXT NOT NULL       -- JSON: { accountId: cents }
  );
  ```
  There is no per-account `savings_target` column — Milestone mode _derives_ the
  split, it is never stored per account. Only the one global config row persists.
- **Storage**: `SavingsGoalRepo { get(): Promise<SavingsGoalConfig | null>;
upsert(config): Promise<void> }`, modelled on `ImportPresetsRepo`. Added to the
  `Storage` interface as `storage.savingsGoal`, implemented for the SQLite
  driver, and covered by the shared Parity Spec.
- **Key models** (`savingsTypes.ts`):
  - `SavingsGoalMode = "milestone" | "manual"`
  - `SavingsGoalConfig`: `{ mode, targetTotal (cents), targetDate ("YYYY-MM"),
startedAt ("YYYY-MM"), manualMonthly: Record<accountId, cents> }`
  - `PerAccountGoal`: `{ id, target, tracked, cumulativeActual, cumulativeTarget }`
  - `YearTick`: `{ year, month (0-based), status: "met" | "missed" | "upcoming" }`
  - `SavingsGoal extends SavingsGoalConfig`: `{ monthly, monthsToTarget,
monthsElapsed, perAccount, streak: { current, best, yearTicks } }`
- **Compute boundary**: `computeSavingsGoal(config, points, trackableIds)` is a
  single pure util in `src/features/savings/` — a verbatim port of the
  prototype's function, refactored from a closure over mock globals into an
  explicit deep function. Everything about the streak, calendar strip, milestone
  trailing-12-month weighting, manual mode, and cumulative actual-vs-target lives
  behind one signature and is testable with no I/O. It adapts the two edges the
  prototype leaves implicit — `point[id]` → `point.accounts[id]`, and
  `{year, month}` ↔ `"YYYY-MM"` — and produces a zeroed goal (streak 0, all
  months upcoming) on empty history rather than throwing. The arithmetic is
  otherwise unchanged.
- **Trackable accounts**: derived by `AccountKind` (`Girokonto | Tagesgeld |
Investment`), ordered by the existing account `sortOrder`. `Mortgage` and
  `CreditCard` are excluded. This replaces the prototype's hardcoded
  `trackableAccountIds`. Untracked accounts (target 0) are dimmed with a "Not
  tracked" badge, never hidden.
- **`startedAt` semantics**: set to the current month on the first-ever save,
  fixed thereafter, and not editable in the modal. It drives only the
  per-account cumulative progress bars; the streak (current/best/calendar strip)
  scans all available history independent of `startedAt`.
- **Naming**: the card component is `SavingsStreakCard` (matches the visible
  "Savings Streak" title and the README); the modal stays `SavingsGoalModal`
  (the _goal_ is the editable target; the _streak_ is the derived display).
- **Feature location**: everything domain-specific lives in
  `src/features/savings/` (compute, types, hook, card, modal). Open/collapsed
  state is local `useState`, not persisted.
- **Reuse**: `Card`, `Modal`, `ProgressBar`, `Money`, `Avatar`, `Badge`,
  `Button`, `Input`, `FormField`, `ChoiceChip` (mode toggle), `Icon` (`flame` /
  `pencil` / `chevronDown`), and `useSnackbar().notify(...)` for the save
  confirmation. No new primitives or components required.

---

## Phase 1: Collapsed streak card, end-to-end

**User stories**: 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 31, 33, 35, 36, 37
(and the read side of 28)

### What to build

The thinnest full-stack slice that proves the whole vertical. On the backend:
the `016` migration, `SavingsGoalRepo` (both `get` and `upsert`, since the
Parity Spec round-trips through `upsert`), and the `GET /savings-goal` route
returning a default config when no row exists. On the frontend: `savingsTypes`,
the complete `computeSavingsGoal` pure port with its exhaustive test, a
read-only `useSavingsGoal` hook that pairs the config fetch with
`useHistory()`'s points and runs compute, and `SavingsStreakCard` in its
**collapsed** state — flame icon, current-streak count, best-ever streak, and
the Jan→Dec calendar strip — rendered full-width on the Dashboard between
`<TrajectoryHorizon/>` and the Accounts/Mortgage/Outlook grid.

The whole compute function lands here (it is one indivisible pure module), even
though the milestone-preview and per-account-row surfaces that consume parts of
its output arrive in later phases. With the default config (no targets set), the
card honestly shows streak 0 with resolved-vs-upcoming tiles derived from real
history; a user who has imported statements sees the strip light up for months
already covered by history, and a user with no imports sees the honest empty
state. Kept visually and structurally distinct from the Trajectory Horizon card.

### Acceptance criteria

- [ ] Migration `016_add_savings_goal.sql` creates the single-row `savings_goal`
      table and runs forward-only on top of 015.
- [ ] `SavingsGoalRepo.get()` returns `null` (or the route's default) when no row
      exists and the stored config after an `upsert`; `upsert` overwrites the
      single row rather than inserting a second — covered in the Parity Spec.
- [ ] `GET /savings-goal` returns a sensible default config when unset and the
      stored config once persisted — route-tested.
- [ ] `computeSavingsGoal(config, points, trackableIds)` is a pure function with
      no I/O, exhaustively tested: current-streak counting, best-streak across a
      broken run, met/missed/upcoming strip classification, the "every tracked
      account must meet its target" AND rule, the "no tracked accounts ⇒ streak
      0" case, and empty history producing a zeroed goal without throwing.
- [ ] A month counts as "met" for a tracked account when its month-over-month
      balance increase is at least its monthly target; a single missed month
      resets the current streak to zero; `best` is the longest run anywhere in
      history — all asserted against hand-built `HistoryPoint[]`.
- [ ] `useSavingsGoal()` loads the config, pairs it with `useHistory()` points,
      runs compute, and exposes `{ goal, isLoading }` (save arrives in Phase 3).
- [ ] `SavingsStreakCard` renders collapsed by default on the Dashboard, showing
      the flame, current streak (most prominent), best streak, and the Jan→Dec
      strip with filled-accent / muted-fill / dashed-outline tiles for
      met / missed / upcoming.
- [ ] With no imported history the card shows an honest empty state (streak 0, no
      error, no fabricated numbers).
- [ ] Monetary values are stored in integer cents and rendered in euros.
- [ ] The card is a separate surface from the Trajectory Horizon chart. Matches
      `savings-streak/screens/01-collapsed.png`.

---

## Phase 2: Expanded card — per-account rows

**User stories**: 3, 14, 15, 16, 17, 18, 30, 34

### What to build

Make the card an accordion: clicking the card body or its chevron toggles a
local expanded state (not persisted) that keeps the same header + strip and adds
one row per trackable account. Trackable accounts are derived by `AccountKind`
(`Girokonto | Tagesgeld | Investment`, Mortgage/CreditCard excluded) and ordered
by the existing account `sortOrder`; the derived id list is what
`useSavingsGoal` passes as `computeSavingsGoal`'s `trackableIds`. Each row shows
the account avatar, a progress bar of cumulative saved-vs-target since the goal's
start date, the cumulative amounts, and the monthly target. Accounts with no
target (0/mo) render dimmed with a "Not tracked" badge rather than disappearing.
This slice is still read-only — `perAccount` already comes from Phase 1's
compute; with the default config every row is "Not tracked", which is exactly
the treatment this phase demonstrates.

### Acceptance criteria

- [ ] Clicking the card or its chevron expands and collapses it; state is local
      and resets to collapsed on reload.
- [ ] The expanded card renders one row per trackable account, ordered by
      `sortOrder`, for `Girokonto | Tagesgeld | Investment` accounts only.
- [ ] Mortgage and CreditCard accounts never appear in the card.
- [ ] Each tracked row shows the avatar, a progress bar, the cumulative saved
      amount, the cumulative target, and the monthly target.
- [ ] The per-account progress bar measures cumulative actual saved vs cumulative
      target since `startedAt`, while the streak and calendar strip reflect all
      available history — verifiable by pointing `startedAt` inside a longer
      history and seeing the strip unchanged while the bars scope to the start.
- [ ] Accounts with a 0/mo target render dimmed with a "Not tracked" badge, not
      hidden.
- [ ] The header, strip, progress bars, and badges use the existing Meridian
      visual vocabulary. Matches `savings-streak/screens/02-expanded.png`.

---

## Phase 3: Goal editor — Manual mode (write path)

**User stories**: 19, 20 (Manual side), 24, 27, 28, 29, 32, 33

### What to build

Close the write loop. Add the `PUT /savings-goal` route (upserting through the
repo), extend `useSavingsGoal` with a `save(config)` that PUTs and re-derives,
and build `SavingsGoalModal` in **Manual** mode. A pencil affordance in the
card's top-right corner (same gesture as the Mortgage Countdown edit) opens the
modal; Manual mode presents each trackable account as a direct euro input (euros
in, cents stored). On the first-ever save, `startedAt` is set to the current
month and fixed thereafter; opening the editor before any goal has been saved
shows sensible defaults rather than a blank or broken form. Saving persists the
config and shows the "Savings goal updated" success snackbar; the card and its
streak/rows re-derive from the new targets and survive app restart.

### Acceptance criteria

- [ ] `PUT /savings-goal` validates and persists the config through
      `SavingsGoalRepo.upsert` — route-tested for the round-trip against `GET`.
- [ ] `useSavingsGoal().save(config)` PUTs the config and re-derives the goal so
      the card reflects the new targets without a manual reload.
- [ ] The pencil in the card's top-right corner opens `SavingsGoalModal`, using
      the same affordance as the Mortgage Countdown edit.
- [ ] Manual mode renders one editable per-account monthly-target input; values
      are entered in euros and stored in integer cents.
- [ ] The first successful save sets `startedAt` to the current month and fixes
      it; subsequent saves never move it, and it is not exposed in the modal.
- [ ] Opening the editor before any goal exists shows sensible defaults.
- [ ] A successful save shows the "Savings goal updated" success confirmation and
      the goal persists across an app restart.
- [ ] Setting a real per-account target makes the streak, calendar strip, and
      per-account rows recompute accordingly. Matches
      `savings-streak/screens/03-edit-modal.png` (Manual mode).

---

## Phase 4: Goal editor — Milestone mode, convert-on-edit, docs

**User stories**: 21, 22, 23, 25, 26

### What to build

Add the Milestone half of the editor via the `ChoiceChip` mode toggle.
**Milestone** mode takes one total target amount plus one target month/year and
shows the derived per-account split live and read-only in the same row list
Manual mode uses; the split is `computeSavingsGoal`'s trailing-12-month positive
average-gain weighting (already ported in Phase 1 — no new math). Editing any row
while in Milestone mode silently converts the whole goal to Manual, pre-filled
with the current derived split, so overriding one account never discards the
rest. Correct the two copy strings the handoff DELTA flags — the card caption and
the modal helper text — to say the split is weighted "by each account's recent
savings pace", not "by balance". Close the feature out with the README
build-status tick and a dev-journal entry.

### Acceptance criteria

- [ ] The modal offers Milestone and Manual via the `ChoiceChip` mode toggle.
- [ ] Milestone mode accepts one total target amount and one target month/year
      (e.g. "€10,000 by January 2028"), euros in / cents stored.
- [ ] The derived per-account split is weighted by each account's trailing-12-
      month average positive monthly gain (including the `Math.max(avg, 100)`
      floor) and shown live, read-only, in the shared row list.
- [ ] Editing any row while in Milestone mode silently switches the goal to
      Manual, pre-filled with the current derived split.
- [ ] The card caption and the modal helper text read "by each account's recent
      savings pace" (not "by balance").
- [ ] The milestone weighting path is covered in `computeSavingsGoal.test.ts`
      (trailing-12-month weighting, the floor, and `startedAt` before / within /
      after the available history range).
- [ ] README build-status marks Savings Streak complete and a dev-journal entry
      is added.
