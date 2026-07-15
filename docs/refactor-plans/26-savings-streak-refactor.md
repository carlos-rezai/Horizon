# Savings Streak — Refactor Plan

> Feature: Savings Streak (PRD #181, design-log `docs/design-logs/25-savings-streak.md`)
> Type: internal refactor — no behaviour change, no data-contract change

## Problem Statement

`computeSavingsGoal` shipped as a single ~140-line procedure that does five
separate jobs in one body: it resolves each account's monthly target (Milestone
weighting or Manual passthrough), derives per-account cumulative progress since
`startedAt`, scans every month to decide which ones were "met", counts the
current and best streaks off that scan, and builds the Jan→Dec calendar strip.
Reading or changing any one of those requires holding all five in your head, and
the streak scan re-walks the same month-over-month balance deltas the Milestone
weighting loop already walked.

Two smaller things drift from the conventions the rest of the codebase follows:

1. **Location.** Every other pure financial compute function in the repo lives in
   `src/utils/<name>/<name>.ts` and is imported by features — `projection`,
   `trajectory`, `outlook`, `mortgage`, `monthBreakdown`, `monthStats`, `kpi`,
   `accountSeries`, `recurring`. `computeSavingsGoal` is the lone one sitting
   under `src/features/`, even though its own design-log calls it "a pure
   frontend util".

2. **Duplicated month/currency formatting in the UI.** `SavingsStreakCard`
   hand-rolls a 12-entry long-month-name array (a duplicate of `MONTHS_LONG` in
   `utils/format`), a `formatTargetMonth` (a duplicate of `formatMonthLong`), a
   `.slice(0, 3)` to derive short names (a duplicate of the exported short
   `MONTHS`), and a whole-euro `formatMonthlyTarget` that belongs in
   `utils/format` next to `formatBalance`. Separately, `SavingsGoalModal`
   re-runs the entire engine and throws away everything but `.monthly` just to
   preview the Milestone split.

## Solution

A pure, behaviour-preserving refactor in small steps, each leaving the full test
suite green:

- Move `computeSavingsGoal` and its test into `src/utils/savingsGoal/`, matching
  every sibling compute util. No rename; the public signature is unchanged.
- Split the function into small, single-purpose **private** helpers inside that
  same module, orchestrated by a thin `computeSavingsGoal`. The public signature
  and behaviour do not change, so the existing exhaustive test stays green
  untouched — the Fowler ideal.
- Extract the one piece of logic that has a genuine second consumer — the
  Milestone per-account split — into a single **exported** helper, and have both
  the engine and the modal call it, so the modal stops faking a whole config and
  discarding the rest of the result.
- Fold the card's ad-hoc month and currency formatting back onto `utils/format`.

The move introduces the codebase's first `import type` from `src/features/` into
`src/utils/` (for `HistoryPoint` and the savings config/derived types). This is
accepted as a **type-only** import — erased at compile time, no runtime coupling —
because the alternative (relocating `HistoryPoint` out of the history feature and
the savings types out of `features/savings`) is a larger, cross-feature change
out of scope here. See the Decision Document.

## Commits

Each commit is independently green (`npx vitest run` + `tsc -b`). Ordered so the
riskiest structural move lands first while the tests that guard it are still the
original, unmodified ones.

1. **Move the compute module into `utils/`, no logic change.**
   `git mv` `computeSavingsGoal.ts` and `computeSavingsGoal.test.ts` from
   `src/features/savings/` to `src/utils/savingsGoal/` as `savingsGoal.ts` /
   `savingsGoal.test.ts`. Keep the exported name `computeSavingsGoal`. Fix the
   relative `import type` paths inside both files (the savings types and
   `HistoryPoint` now resolve up two levels into `features/`). Repoint the four
   importers — `useSavingsGoal.ts`, `useSavingsGoal.test.ts`,
   `SavingsGoalModal.tsx`, `SavingsGoalModal.test.tsx` — at the new path. If
   `src/utils/index.ts` re-exports its siblings, add the new module there.
   Nothing else changes; the moved test asserts the same behaviour.

2. **Extract private helpers inside `savingsGoal.ts`.** Break the body into
   small single-purpose functions — resolve monthly targets, derive per-account
   cumulative progress, scan monthly-met, count current/best streak, build the
   year-tick strip, plus the existing `parseMonth`/`balanceOf` and a small
   "months between two `YYYY-MM`" helper. `computeSavingsGoal` becomes a short
   orchestrator that wires them together and assembles the return object. Purely
   internal; the public signature and every returned value are identical, so
   `savingsGoal.test.ts` is not edited and stays green.

3. **Extract and export the Milestone split; make the modal reuse it.** Pull the
   trailing-12-month positive-average-gain weighting out of the private
   target-resolution helper into one exported function that takes the total,
   target month, points, and trackable ids and returns the per-account cents
   map. The engine's Milestone branch calls it; add a focused test for it in
   `savingsGoal.test.ts` (an exported util owes a direct test, and the existing
   milestone assertions already pin the arithmetic). Then change
   `SavingsGoalModal`'s live-preview `useMemo` to call this helper directly
   instead of constructing a throwaway `milestone` config and reading `.monthly`
   off a full `computeSavingsGoal` result. The modal's rendered output is
   unchanged, so its tests stay green.

4. **Add `formatEuroWhole` to `utils/format`; card reuses it.** Add a whole-euro
   `de-DE` currency formatter beside `formatBalance`, with a case in
   `format.test.ts`. Delete the card's local `formatMonthlyTarget` and call the
   shared one. Card tests stay green (same rendered strings).

5. **Dedup month names in the card via `utils/format`.** Export `MONTHS_LONG`
   from `format.ts` (currently private). In the card, replace the local
   long-month array with `MONTHS_LONG`, the `.slice(0, 3)` short-name derivation
   with the already-exported short `MONTHS`, and `formatTargetMonth(goal.targetDate)`
   with the existing `formatMonthLong`. No visible change; card tests stay green.

6. **Docs.** Dev-journal entry recording the refactor (module move, the private
   split, the shared Milestone-split helper, the format dedup) and the
   convention it aligns to. No README build-status change — the feature was
   already marked complete.

## Decision Document

- **New home:** `computeSavingsGoal` moves to `src/utils/savingsGoal/`, keeping
  its name and `(config, points, trackableIds) => SavingsGoal` signature. This
  matches the established "pure financial compute lives in `src/utils/`" pattern
  (`deriveOutlookSummary`, `deriveBreakdown`, projection, trajectory, mortgage,
  …). `savingsTypes.ts` stays in `src/features/savings/` — the derived display
  shapes are feature-owned — as does the `useSavingsGoal` hook, card, and modal.

- **Type-only cross-layer import (accepted):** the moved util imports
  `HistoryPoint` (from the history feature) and `SavingsGoalConfig` /
  `SavingsGoal` / `PerAccountGoal` / `YearTick` (from the savings feature) as
  `import type` only. No util currently imports from `features/`, so this is a
  new precedent, but it is type-only (no runtime dependency, erased by the
  compiler) and the compute genuinely straddles both domains (a history feed in,
  a savings shape out). The clean-but-larger alternative — relocating
  `HistoryPoint` and the savings types into `src/types/` — is explicitly out of
  scope; it would ripple through the whole history feature (12 importers).

- **Internal split, private by default:** the streak scan, per-account
  progress, target resolution, and year-tick builder become private helpers
  tested only through the public `computeSavingsGoal` — matching how `outlook`
  and `monthBreakdown` keep their internals private and assert on external
  behaviour. Nothing that lacks a second caller is exported.

- **One shared export — the Milestone split:** the trailing-12-month weighting
  is the single piece with a real second consumer (the modal's live preview), so
  it becomes one exported function reused by both the engine and the modal. This
  removes the modal's "build a fake config, run the whole engine, keep only
  `.monthly`" smell and gives the split a single source of truth.

- **Formatting consolidation:** a new `formatEuroWhole` (whole-euro `de-DE`
  currency) joins `utils/format` beside `formatBalance`; `MONTHS_LONG` becomes an
  export there. The card stops carrying its own month arrays and currency
  formatter and uses `MONTHS`, `MONTHS_LONG` / `formatMonthLong`, and
  `formatEuroWhole`.

- **No behaviour, schema, route, or data-contract change.** The `016` migration,
  `SavingsGoalRepo`, `GET`/`PUT /savings-goal`, the balance-delta "met" signal,
  the trackable-kind derivation, and every rendered string stay exactly as
  shipped. This is structure-only.

## Testing Decisions

- **A good test here asserts external behaviour, not structure.** The existing
  `computeSavingsGoal.test.ts` (24 cases: current/best streak, the met rule and
  reset, the AND rule across tracked accounts, no-tracked-accounts, calendar-strip
  classification, manual targets, per-account cumulative since `startedAt`,
  milestone weighting and the floor, `startedAt` before/within/after history,
  empty history) is exactly the safety net a pure refactor needs. It moves with
  the file in commit 1 and is **not otherwise edited** through commits 2–5 — if a
  split changes behaviour, it goes red.

- **Modules under test:** the pure `savingsGoal` util (moved test, untouched
  assertions) and, newly, the exported Milestone-split helper (a small focused
  case added to the same file, since exported utils are directly tested per the
  `src/utils` rule). `utils/format` gains a `formatEuroWhole` case in the
  existing `format.test.ts`. The card and modal keep their current tests as the
  guard that the formatting dedup and the modal's helper swap change nothing
  visible.

- **Prior art:** `outlook.test.ts` / `monthBreakdown.test.ts` (behaviour-only
  tests of a single exported compute function over private helpers) and
  `format.test.ts` (per-formatter cases) are the models to follow.

## Out of Scope

- Relocating `HistoryPoint` or `savingsTypes` into `src/types/` (the fully
  dependency-clean alternative to the type-only cross-import).
- Any behaviour change: the balance-delta "met" proxy, the trackable-kind rule,
  `startedAt` semantics, the Milestone weighting model, or the collapsed/expanded
  and convert-on-edit interactions.
- `SavingsGoal extends SavingsGoalConfig` mixing persisted and derived shapes —
  noted as a possible future tidy, not touched here.
- The unrelated local `MONTHS` arrays in `Clock` and `ImportHistory` — same smell,
  different features, left for their own refactors.
- Backend (migration, repo, routes) and the `useSavingsGoal` fetch/narrowing
  logic, which already matches the sibling-hook convention (raw `fetch(API_BASE)`;
  `apiFetch` is unused legacy auth plumbing).

## Further Notes

The commit order is deliberate: the file move (commit 1) happens while the test
is still the original, so a broken path or import surfaces immediately; the
internal split (commit 2) then happens against a test that has already proven
green in its new home. Commits 3–5 each touch one consumer at a time so a
regression is bisectable to a single small change.
