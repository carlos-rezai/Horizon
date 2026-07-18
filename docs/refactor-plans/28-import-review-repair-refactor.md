# 28 — Import Review Repair refactor

> Source PRD / feature: https://github.com/carlos-rezai/Horizon/issues/189
> Built across issues #190–#195 (design log 26, PRD plan
> `docs/PRDs/26-import-review-repair-plan.md`).

## Problem Statement

The Import Review Repair feature (issues #190–#195) is built, tested, and
green. It was assembled phase-by-phase under TDD, and it shows: the row model
(`reviewRows.ts`), the issue attribution (`importErrors.ts`), and the wizard
hook (`useImportWizard.ts`) are clean and well-documented. This is a
post-build tidy-up, not a rescue.

But building it in five vertical slices left a handful of small seams that a
consolidation pass should close before the surface is considered done:

1. **The `flags` array is not yet the single source it was designed to be.**
   The feature's whole thesis (design log 26, Q1/Q5) is that a row's soft
   reasons live in **one** array so a counted-but-never-rendered flag — the
   original `pending` bug — becomes structurally impossible. `flagsFor` and the
   per-row badges honour that. But `summarizeReview` still counts the raw
   `r.duplicate` / `r.recurring` / `r.pending` booleans, bypassing `flags`
   entirely. The exact drift the array was introduced to kill still lives in
   the summary counts.

2. **The badge tone/icon for each flag is declared twice.** `FLAG_BADGES` in
   `ImportWizard.tsx` maps each `RowFlag` to its icon and tone for the per-row
   badges. The three review-summary badges (`… likely duplicates`, `… recurring`,
   `… pending`) re-declare the same icon and tone inline, as three near-identical
   JSX blocks. Two places must agree by hand.

3. **The "N noun(s)" pluralization ternary is copy-pasted across the import
   surfaces.** `${n} transaction${n !== 1 ? "s" : ""}` and its siblings appear
   in `ImportWizard.tsx` (four times), `ImportView.tsx`, and
   `ImportHistory.tsx`. There is no shared helper; the repo has none. The
   blocked-rows pill compounds it with inverse verb agreement
   (`row${…} need${…}`), which is easy to get backwards.

4. **The wizard component carries the whole review step inline.**
   `ImportWizard.tsx` is ~540 lines: three step bodies plus the review step's
   summary bar, rejected note, and table all rendered in one function. The
   review table (head + body rows) is the densest block and is a clean
   candidate to lift into a co-located presentational component.

None of these are bugs. They are the maintainability debt a five-phase build
leaves behind — exactly what the refactor step exists to pay down.

## Solution

A sequence of tiny, behaviour-preserving commits, each leaving `vitest run`
green against the existing suite (`reviewRows.test.ts`, `importErrors.test.ts`,
`useImportWizard.test.ts`, `ImportWizard.test.tsx` — strong coverage that is
the safety net for every step here).

- Make `flags` the sole source for the summary counts, closing the last
  raw-boolean read.
- Add one tested `pluralize` helper in `src/utils/format` and adopt it across
  the three import surfaces, deleting the copy-pasted ternaries.
- Drive the three review-summary badges from a single flag→spec table so tone
  and icon are declared once.
- Lift the review table into a co-located presentational `ReviewTable`
  component, slimming the wizard toward a step-navigation shell.

No behaviour changes, no API changes, no schema changes, no new feature work.
Every rendered string and every commit outcome stays identical; the tests that
assert them do not move.

## Commits

Ordered smallest-blast-radius first. Each `refactor:` commit leaves the full
suite green; the one new util lands with its own test in the same commit (repo
rule: every `src/utils` function is tested).

1. **refactor: add a tested `pluralize` util.** Add
   `pluralize(count, singular, plural?)` to `src/utils/format/format.ts`,
   returning `"<count> <word>"` with `word` pluralized as `count === 1 ?
singular : plural` and `plural` defaulting to `singular + "s"`. Extend the
   co-located `format.test.ts` with the singular / plural / explicit-plural
   cases. No call sites yet — pure addition. Green.

2. **refactor: adopt `pluralize` in the Import wizard.** Replace the four
   `${n} noun${n !== 1 ? "s" : ""}` ternaries in `ImportWizard.tsx` — the
   Import button label, the "likely duplicates" summary badge, the rejected
   note, and the noun of the blocked-rows pill — with `pluralize(...)`. The
   pill keeps its inverse verb agreement (`… need` / `… needs`) as an explicit
   local expression; only the noun goes through the helper. Rendered strings
   are byte-identical, so `ImportWizard.test.tsx` (which asserts
   `import 1 transaction`, `import 2 transactions`, `1 likely duplicate`)
   stays green. Green.

3. **refactor: adopt `pluralize` in ImportView and ImportHistory.** Replace the
   `transaction${…}` ternary in `ImportView.tsx` and the `statement${…}`
   ternary in `ImportHistory.tsx` with `pluralize(...)`. Existing suites for
   those components stay green. Green.

4. **refactor: count the review summary from `flags`, not raw booleans.** In
   `summarizeReview` (`reviewRows.ts`), derive `duplicates` / `recurring` /
   `pending` from `r.flags.includes(...)` instead of `r.duplicate` /
   `r.recurring` / `r.pending`. `flags` becomes the sole counting source, so a
   future change to `flagsFor` reflects in the summary automatically. Behaviour
   is identical (flags derive from the same booleans); add a `reviewRows.test.ts`
   case asserting the summary tracks `flags` so the invariant is pinned. Green.

5. **refactor: drive the review-summary badges from one flag spec.** Replace the
   three inline summary-badge blocks in `ImportWizard.tsx` with a small
   `RowFlag`-keyed table carrying `{ tone, Icon, summaryLabel(count) }`, mapped
   over the flags that have a non-zero count. Tone and icon for each flag are
   then declared once (reconciled with, or folded into, `FLAG_BADGES`). The
   rendered badges are unchanged, so `ImportWizard.test.tsx` stays green. Green.

6. **refactor: extract the review table into a co-located `ReviewTable`.** Lift
   the review head + body (`StyledReviewHead` … `StyledReviewBody` and the
   `visibleRows.map(...)` row rendering) into
   `ImportWizard/ReviewTable/ReviewTable.tsx` (+ `ReviewTable.styles.ts` holding
   the review-table styled components, moved from `ImportWizard.styles.ts`).
   `ReviewTable` is purely presentational: it takes `rows`, the `toggle` /
   `setCategory` / `setDescription` handlers, the `descRefs` registrar, and the
   flag-badge spec as props. All orchestration state (inclusion, `everBlocked`,
   `attentionOnly`, `blockedRows`, jump cursor) **stays in `ImportWizard`**,
   because the footer pill and Import button depend on it — the extraction is
   presentational only, not a state split. `ImportWizard.test.tsx` renders the
   whole wizard and stays green. Green. _(This is the largest step; it may be
   deferred without affecting commits 1–5 if we want to keep the pass tight.)_

7. **chore: verify end-to-end + dev-journal close-out.** Drive the real app:
   import a CSV with a blank-description row, confirm the row shows the error
   affordance, the pill counts it, typing a description clears it, and the
   import commits. Confirm `npm run test`, the real typecheck (`tsc -b` /
   `npm run build`), and lint are green. Append a dev-journal entry recording
   the consolidation (flags as sole count source, shared `pluralize`, badge
   spec unified, review table extracted).

## Decision Document

- **Behaviour-preserving throughout.** No rendered text, commit payload, error
  contract, or API shape changes. The existing test suite is the contract; it
  is extended (new `pluralize` cases, one `summarizeReview`-from-`flags` case)
  but never loosened to accommodate a change.
- **`pluralize` returns `"<count> <word>"`, not just the suffix.** Every call
  site pairs a count with the noun, so returning the joined pair reads cleanest
  and removes the count-interpolation too. Verb agreement (the pill's
  `need`/`needs`) is deliberately **not** absorbed into the helper — it is an
  inverse-agreement special case that belongs at its one call site, not in a
  general noun helper.
- **`pluralize` lives in `src/utils/format`.** It is a pure string helper
  alongside `formatBytes`, `toOrdinal`, and the month formatters; it obeys the
  "every `src/utils` function has a test" rule. Adoption is scoped to the three
  import surfaces in this pass; other repo call sites are left for their own
  features' refactors rather than pulled into this one.
- **`flags` is the single source for both counts and badges.** After commit 4,
  nothing outside `flagsFor` reads the raw `duplicate` / `recurring` / `pending`
  booleans for display or counting — they remain only as the `ParsedImportRow`
  inputs `flagsFor` derives from.
- **The review-table extraction is presentational only.** State that the footer
  (blocked-rows pill, Import button, `canCommit` gate) reads stays in
  `ImportWizard`. `ReviewTable` receives data and callbacks; it owns no
  inclusion or attention state. This avoids splitting tightly-coupled state
  across a parent/child boundary.
- **Co-location honoured.** The new `ReviewTable` component ships with its own
  `.styles.ts`; the review-specific styled components move out of
  `ImportWizard.styles.ts` into it rather than being imported across the folder
  boundary.

## Testing Decisions

- **Good tests here assert what the user sees and what commits, not wiring.**
  The refactor changes none of that, so the value of the existing suites is
  precisely that they should keep passing untouched. A commit that needs a test
  edited to stay green is a signal the change was not behaviour-preserving and
  must be re-examined.
- **Modules that gain tests:** `format` (the new `pluralize`) and `reviewRows`
  (one case pinning summary counts to `flags`). Everything else relies on its
  existing suite as the regression net.
- **Prior art:** `format.test.ts` (pure-util cases for `formatBytes`,
  `toOrdinal`), `reviewRows.test.ts` (the row-model behavioural suite), and
  `ImportWizard.test.tsx` (the full fetch-mock + render harness that already
  asserts the pluralized button labels and summary badges).

## Out of Scope

- **Any behaviour, API, schema, or copy change.** This is consolidation only.
- **The server tier** (`import.ts`, `imports.ts`, `detectStatement.ts`,
  `buildPreview.ts`). `describeImportIssues` has its own "1 row needs / N rows
  need" phrasing, but it runs in a separate Node process and cannot share the
  frontend `pluralize`; unifying across the tier boundary is not attempted.
- **The knowingly-duplicated validity rule** (`blockersFor` vs
  `ImportRowSchema`). Design log 26 Q2 accepted this drift deliberately; it is
  not reopened here.
- **Row virtualization / render-cost work** on the review table — that belongs
  to the **Performance + UX Polish** roadmap item (1.2.0), as design log 26
  already records.
- **Extracting the Account and Map-columns step bodies.** Only the review table
  is lifted; the other two steps are short and stay inline unless a later pass
  finds cause.

## Further Notes

- **Companion refactor #27 (History Page composition, issue #196).** This plan
  is intentionally kept **separate** from
  `27-history-page-composition-refactor.md`: they touch disjoint code (the
  Import wizard vs. the History page) and the repo's convention is one plan per
  feature. They are not merged. They are, however, meant to be executed as a
  pair in the same session — #28 first (this consolidation), then #27 (compose
  the orphaned `HistoryChart` + `YearArchive` into `HistoryPage`) — closing out
  the import → review → history arc in one sweep.
- The commit whose message read `docs: [import-review-repair] add history-page
composition refactor plan` (`30745a4`) was mistagged: it added #27's file with
  #27's content. This plan (#28) is the import-review-repair refactor that tag
  implied but never delivered.
