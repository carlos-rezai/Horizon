## Problem Statement

Horizon tells me where my money is going and where it's headed — balances,
projections, the mortgage payoff countdown — but it never rewards me for the
one behaviour it's supposed to encourage: saving consistently, month after
month. There is no sense of momentum, no "you've kept this up for six months
straight," nothing that turns steady saving into something I can see and want
to protect. The app is entirely diagnostic; the motivational layer is missing.

## Solution

A **Savings Streak**: one new full-width card on the Dashboard, collapsed by
default, that tracks the streak of consecutive months in which every account I
choose to track hit its per-account monthly savings target.

- **Collapsed**, it shows a flame with my current streak and best-ever streak,
  plus a Jan→Dec calendar strip for the current year — each month a tile: filled
  accent when every tracked account met its target, muted when one missed,
  dashed outline for months not yet resolved.
- **Expanded** (click the card or chevron), it adds one row per trackable
  account (my liquid + investment accounts — Mortgage and CreditCard are
  excluded because "save X/month" doesn't apply to debt): an avatar, a progress
  bar of cumulative saved-vs-target since the goal started, the amounts, and the
  monthly target. Accounts I haven't set a target for render dimmed with a
  "Not tracked" badge rather than disappearing.
- A **pencil** (top-right, same affordance as the Mortgage Countdown edit) opens
  a goal editor. I either set one **Milestone** — a total amount by a target
  month, which Horizon auto-splits across my tracked accounts weighted by each
  account's own recent saving pace — or I switch to **Manual** and type each
  account's monthly target directly. Editing any row while in Milestone mode
  quietly converts the whole goal to Manual, pre-filled with the current split,
  so I never lose my starting point.

The streak is derived from the same reconstructed monthly balances that already
power the History view — no new projection model, no new scoring engine. My goal
config is the only new thing that gets stored, and it's one row.

This is a faithful 1:1 translation of the canonical prototype
(`docs/handoff/savings-streak/`) into React + TypeScript + styled-components on
Meridian — not a redesign.

## User Stories

1. As a long-term saver, I want a Savings Streak card on my Dashboard, so that I
   can see at a glance whether I'm keeping up my saving habit.
2. As a user, I want the card collapsed by default, so that it doesn't crowd the
   Dashboard until I choose to look at it.
3. As a user, I want to expand the card by clicking it or its chevron, so that I
   can see the per-account breakdown when I want the detail.
4. As a user, I want to see my current streak count with a flame icon, so that
   the number I'm trying to protect is the most prominent thing on the card.
5. As a user, I want to see my best-ever streak alongside the current one, so
   that I have a personal record to beat.
6. As a user, I want a Jan→Dec calendar strip for the current year, so that I can
   see which months I hit and which I missed at a glance.
7. As a user, I want past months I hit to show as filled accent tiles, missed
   months as muted fill, and future months as dashed outlines, so that resolved
   and unresolved months are visually distinct.
8. As a user, I want the streak to count every consecutive most-recent month in
   which all my tracked accounts met their target, so that the number reflects
   my actual unbroken run.
9. As a user, I want a single missed month to reset the current streak to zero,
   so that the streak honestly reflects consistency.
10. As a user, I want the "best" streak to be the longest run anywhere in my
    history, so that a past achievement still counts even after a break.
11. As a user, I want a month to count as "met" for an account when that
    account's month-over-month balance increase is at least its monthly target,
    so that the rule matches the prototype's mechanic exactly.
12. As a user, I want a month to count for the streak only when _every_ tracked
    account met its target that month, so that "on track" means the whole
    household saved as planned.
13. As a user with no tracked accounts, I want no months to count as met, so that
    the streak is honestly zero until I set at least one target.
14. As a user, I want to expand the card to see one row per trackable account —
    my Girokonto, Tagesgeld, and Investment accounts, ordered by my account sort
    order — so that the breakdown matches how I've organised my accounts
    everywhere else.
15. As a user, I want Mortgage and CreditCard accounts excluded from the card
    entirely, so that debt accounts don't get a nonsensical "save X/month"
    target.
16. As a user, I want each account row to show its avatar, a progress bar, the
    cumulative amount saved, the cumulative target, and the monthly target, so
    that I can see how each account is pacing against its goal.
17. As a user, I want the per-account progress bar to measure cumulative actual
    saved vs cumulative target _since the goal's start date_, so that progress
    reflects the period the goal has been active.
18. As a user, I want accounts with no target (0/mo) to render dimmed with a
    "Not tracked" badge instead of being hidden, so that I can see they exist and
    add a target later.
19. As a user, I want a pencil edit affordance in the card's top-right corner, so
    that opening the goal editor uses the same gesture as editing the Mortgage
    Countdown.
20. As a user, I want the goal editor to offer Milestone and Manual modes via a
    mode toggle, so that I can pick the mental model that suits me.
21. As a user in Milestone mode, I want to enter one total target amount and one
    target month/year, so that I can express "€10,000 by January 2028" without
    doing per-account math.
22. As a user in Milestone mode, I want Horizon to auto-split the required
    monthly savings across my tracked accounts weighted by each account's own
    trailing-12-month average positive monthly gain, so that the split reflects
    how much each account actually tends to grow — not its balance.
23. As a user in Milestone mode, I want the derived per-account split shown live
    and read-only in the same row list Manual mode uses, so that I can preview
    the plan before committing.
24. As a user in Manual mode, I want each account's monthly target as a direct
    editable input, so that I can set exact per-account amounts.
25. As a user editing a row while in Milestone mode, I want the goal to silently
    convert to Manual, pre-filled with the current derived split, so that
    overriding one account doesn't throw away the rest.
26. As a user, I want the card caption and modal helper text to say the milestone
    split is weighted "by each account's recent savings pace" (not "by
    balance"), so that the copy matches what the math actually does.
27. As a user, I want to save my goal and see a "Savings goal updated" success
    confirmation, so that I know my change was persisted.
28. As a user, I want my goal to persist across app restarts, reinstalls, and
    backup/restore, so that I never have to re-enter it.
29. As a first-time user, I want the goal's start date set automatically to the
    current month on my first save and then fixed, so that cumulative progress is
    measured from when I actually began — and I don't have to manage a date I'd
    only get wrong.
30. As a user, I want the start date to drive only the cumulative per-account
    progress bars, while the streak and calendar strip scan all my available
    history, so that a recently-set goal still shows my full historical streak.
31. As a user who hasn't imported any statements yet, I want the card to show an
    honest empty state (no history → no streak) rather than an error or fake
    numbers, so that the feature degrades gracefully with no data.
32. As a user, I want to open the editor before I've ever saved a goal and see
    sensible defaults, so that I'm never faced with a blank or broken form.
33. As a user, I want monetary inputs and displays in euros while values are
    stored in integer cents, so that I never see floating-point rounding errors
    in my targets.
34. As a user, I want the card and modal to match Horizon's existing visual
    language — the same tick-strip, progress bar, mode-toggle, and edit
    affordances used elsewhere — so that the feature feels native, not bolted on.
35. As a user, I want the Savings Streak kept separate from the Trajectory
    Horizon chart, so that a forward projection and an aspirational savings
    target never get visually conflated.
36. As a developer, I want the ported streak logic to be a pure, exhaustively
    tested function, so that the streak, calendar strip, and milestone weighting
    can be verified in isolation without rendering anything.
37. As a developer, I want the goal-config repository to satisfy the shared
    Parity Spec, so that any future storage driver behaves identically.

## Implementation Decisions

### Modules to build

- **`computeSavingsGoal` (pure util, `src/features/savings/`)** — a verbatim
  port of the prototype's `computeSavingsGoal`, refactored from a closure over
  mock globals into an explicit deep function. This is the one deep module:
  everything about the streak, calendar strip, milestone trailing-12-month
  weighting, manual mode, and cumulative actual-vs-target lives behind one
  signature and is testable with no I/O.
  - Signature: `computeSavingsGoal(config: SavingsGoalConfig, points: HistoryPoint[], trackableIds: string[]): SavingsGoal`.
  - Adapts the two edges the prototype leaves implicit: `point[id]` →
    `point.accounts[id]`, and `{year, month}` ↔ `"YYYY-MM"`. The streak/weighting
    arithmetic is otherwise unchanged.
  - Handles empty `points` (no imports) by producing a zeroed goal (streak 0,
    all months upcoming, no cumulative progress) rather than throwing.
- **`SavingsGoalRepo` (storage)** — modelled on `ImportPresetsRepo`. Added to the
  `Storage` interface as `storage.savingsGoal`, implemented for the SQLite
  driver, and covered by the Parity Spec.
  - Interface: `get(): Promise<SavingsGoalConfig | null>` and
    `upsert(config: SavingsGoalConfig): Promise<void>`.
  - First `GET` with no stored row returns a default config (or the route seeds
    one) so the frontend always has something to render.
- **`savingsGoal` route (`server/src/routes/savingsGoal/`)** — `GET /savings-goal`
  returns the stored (or default) config; `PUT /savings-goal` upserts it.
  Registered in `app.ts` alongside the existing routers.
- **`useSavingsGoal` hook (`src/features/savings/`)** — wraps `useHistory()` plus
  a config fetch, runs `computeSavingsGoal`, and exposes
  `{ goal, save, isLoading }`. `save` PUTs the config and re-derives.
- **`SavingsStreakCard` component (`src/features/savings/SavingsStreakCard/`)** —
  the full-width Dashboard accordion card: collapsed (flame, current/best,
  calendar strip) and expanded (+ per-account rows, Not-tracked treatment).
  Rendered in `DashboardPage` between `<TrajectoryHorizon/>` and the
  Accounts/Mortgage/Outlook grid. Open/collapsed state is local `useState`, not
  persisted.
- **`SavingsGoalModal` component (`src/features/savings/SavingsGoalModal/`)** —
  the Milestone/Manual editor with the silent convert-on-edit behaviour, the
  live derived split, and the corrected copy.

### Naming

- Component is **`SavingsStreakCard`** (matches the visible "Savings Streak"
  title and the README), not the prototype's `SavingsGoalCard`.
- Modal stays **`SavingsGoalModal`** — the _goal_ is the editable target; the
  _streak_ is the derived display.

### Trackable accounts

Derived by `AccountKind`: `Girokonto | Tagesgeld | Investment`, ordered by the
existing account `sortOrder`. `Mortgage` and `CreditCard` are excluded. This
replaces the prototype's hardcoded `trackableAccountIds = ["a1","a2","a3","a5"]`.
Untracked accounts (target 0) are dimmed with a "Not tracked" badge, never
hidden.

### Data feed

The card's data source is the existing `GET /projection/history` feed
(`HistoryPoint[]`), which returns a contiguous run of reconstructed month-end
balances from the earliest imported transaction month through the current month,
each carrying `accounts[id]`. No new compute or projection endpoint is added; the
backend's only new responsibility is persisting config.

### Schema change

- Migration `016_add_savings_goal.sql` — a single-row table:

  ```sql
  CREATE TABLE savings_goal (
    id             INTEGER PRIMARY KEY CHECK (id = 1),
    mode           TEXT NOT NULL,
    target_total   INTEGER NOT NULL,
    target_date    TEXT NOT NULL,   -- "YYYY-MM"
    started_at     TEXT NOT NULL,   -- "YYYY-MM"
    manual_monthly TEXT NOT NULL    -- JSON: { accountId: cents }
  );
  ```

  Forward-only, following the existing migration policy (015 is the current
  latest).

### Types (`savingsTypes.ts`)

- `SavingsGoalMode = "milestone" | "manual"`
- `SavingsGoalConfig`: `{ mode, targetTotal (cents), targetDate ("YYYY-MM"), startedAt ("YYYY-MM"), manualMonthly (Record<accountId, cents>) }`
- `PerAccountGoal`: `{ id, target, tracked, cumulativeActual, cumulativeTarget }`
- `YearTick`: `{ year, month (0-based), status: "met" | "missed" | "upcoming" }`
- `SavingsGoal extends SavingsGoalConfig`: `{ monthly, monthsToTarget, monthsElapsed, perAccount, streak: { current, best, yearTicks } }`

### Date handling (judgment call)

The prototype stores `targetDate`/`startedAt` as `{year, month}` objects.
Horizon's rule is "all dates are ISO strings", so they are persisted as
`"YYYY-MM"` and converted to `{year, month}` only inside `computeSavingsGoal`.

### `startedAt` semantics (judgment call)

Set to the current month on the first-ever save, fixed thereafter, and **not**
editable in the modal (the prototype's modal never exposes it). It drives only
the per-account cumulative progress bars; the streak (current/best/calendar
strip) scans all available history independent of `startedAt`.

### Milestone copy (judgment call)

`computeSavingsGoal` already weights the milestone auto-split by each account's
trailing-12-month average positive monthly gain (the correct behaviour). The
prototype's card caption and modal helper text say "by balance", which the
handoff DELTA flags as wrong framing. The compute stays verbatim; the two copy
strings are corrected to "by each account's recent savings pace".

### Reuse

`Card`, `Modal`, `ProgressBar`, `Money`, `Avatar`, `Badge`, `Button`, `Input`,
`FormField`, `ChoiceChip` (mode toggle), `Icon` (`flame` / `pencil` /
`chevronDown`). No new primitives or components required. Save confirmation uses
the existing `useSnackbar().notify(...)`.

## Testing Decisions

**What makes a good test here:** exercise external behaviour, not internals. For
`computeSavingsGoal` that means feeding a config + a hand-built `HistoryPoint[]`

- a `trackableIds` list and asserting the returned `SavingsGoal` — the streak
  numbers, the calendar strip statuses, the per-account split and cumulative
  figures — never reaching into how the function loops. For the repo it means
  asserting round-trip persistence, not SQL. For components it means asserting what
  the user sees and can do (collapsed vs expanded content, Not-tracked badges,
  mode toggle, convert-on-edit), not styled-component internals.

**Modules that will be tested:**

- **`computeSavingsGoal`** — exhaustive `computeSavingsGoal.test.ts`:
  current-streak counting, best-streak across a broken run, met/missed/upcoming
  strip classification, the "every tracked account must meet its target" AND
  rule, the "no tracked accounts ⇒ streak 0" case, milestone trailing-12-month
  weighting (including the `Math.max(avg, 100)` floor), manual mode, empty
  history, and `startedAt` before / within / after the available history range.
- **`SavingsGoalRepo`** — added to the Parity Spec (`storage.parity.ts`):
  default/null on first `get`, round-trip after `upsert`, single-row overwrite on
  second `upsert`.
- **`savingsGoal` route** — `GET` returns default when unset and the stored
  config after a `PUT`; `PUT` validates and persists.
- **`useSavingsGoal`** — history + config → `goal`; `save` round-trips.
- **`SavingsStreakCard`** and **`SavingsGoalModal`** — render/interaction tests
  for the collapsed/expanded toggle, Not-tracked rows, mode toggle, and silent
  convert-on-edit.

**Prior art:** `ImportPresetsRepo`'s parity coverage in `storage.parity.ts` is
the template for the repo tests; `useHistory.test.ts` is the template for the
hook test; the projection route tests
(`server/src/routes/projection/projection.test.ts`) are the template for the
route tests. Existing feature-component tests under `src/features/` model the
card/modal tests.

## Out of Scope

- Any change to the Recurring-Only Projection Model, the Trajectory Horizon
  chart, or any other screen's data contract.
- A new projection or compute endpoint — the History feed already carries the
  per-account monthly balances the streak needs.
- Persisting the card's open/collapsed state — it resets to collapsed each load,
  matching the prototype.
- A per-account `savings_target` column — Milestone mode _derives_ the split; it
  is never stored per account. Only the single global config row is persisted.
- Making `startedAt` user-editable.
- Reworking the milestone-vs-manual weighting model beyond the verbatim port.
- Validating auto-derived targets against demonstrated cash-flow patterns. The
  balance-delta streak signal is a proxy, not literal cash saved — an account
  with a lumpy annual outflow (e.g. a savings account that also auto-pays an
  annual premium) can read a false "missed" month. The 1:1 translation keeps the
  proxy and leaves noisy accounts untracked by default; the handoff DELTA notes a
  real build should eventually validate targets against actual cash flow, but
  that is explicitly deferred.

## Further Notes

- The design log is `docs/design-logs/25-savings-streak.md`; the canonical
  prototype and screens are under `docs/handoff/savings-streak/` — compare the
  built card against `savings-streak/screens/01-collapsed.png`,
  `02-expanded.png`, and `03-edit-modal.png`.
- The prototype anchors its mock "today" to July 2026 purely so the calendar
  strip's resolved/upcoming split reads correctly; the real app uses the actual
  current date, no anchor.
- The prototype's mock `savingsGoalConfig`, `trackableAccountIds`, and history
  generator are **not** ported — only `computeSavingsGoal` is. The mock's seeded
  Manual config (Sparkasse €8/mo, ETF €500/mo) was hand-picked around the mock's
  own noisy generator and carries no meaning for real data.
- Suggested build order (thinnest end-to-end first): backend slice (migration +
  repo + route) → compute port + tests → hook → card → modal → docs (README tick,
  dev-journal entry).
