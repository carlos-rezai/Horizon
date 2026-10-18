# 36 — UI Consistency Audit Refactor

> Follows the UI Consistency Audit epic (PRD issue #266, slices #267–#277;
> design log 34). Picks up the convention drift the slices left behind, and
> closes the epic: #266 is the only issue still open, and Build Status,
> release notes, glossary and dev journal have not caught up. Solo session:
> the user asked for this plan to be worked out alone, with consistency of
> naming, conventions, patterns and architecture as the goal.

## Problem Statement

The UI Consistency Audit works. Every Audit Finding is closed or rejected,
the after pass measures one Control Height, a stable month switch and shared
column edges, and the suite is green (254 files, 3,484 tests). The epic's
rule was that every visual fact should have one owner. Built slice by slice,
the code ended up breaking that rule in a few places, and its tests drifted
from how this codebase writes tests.

**The Focus Ring has two owners.** #275 added the `focusRing` fragment, "the
Button's gold 2px outline, offset 2px", and moved 21 controls in 18 style modules
onto it. The Button still declares its ring inline, and so do four more:

- `Button`
- `Stepper`'s step button
- `Tabs`' tab (`Tabs.styles.ts` imports `focusRing` for its scroll button and
  copies the ring by hand one component further down)
- `MonthYearPicker`'s trigger and month cell

The guard for finding 32 accepts either form: a regex for the literal ring or
`${focusRing}`. So the two owners are allowed by the test itself. None of the
five has a test that pins its ring.

**The epic introduced the only barrel imports in the app.** Finding 35
switched three imports of `Toggle` and `SwatchPicker` to `../../../primitives`.
Every other import of a primitive or component from a feature, page, layout
or component is a deep import: 158 of primitives, 194 of components, 0 barrel
imports before the epic. A source guard in `remainingFindings.test.ts` now
forbids deep imports of `Toggle` and `SwatchPicker` only, which is the
opposite of the rule everywhere else. The convention for "this primitive is
exported from the index" already exists: an `is importable from
src/primitives/index.ts` case in the primitive's own suite, as `Money` has.
`Toggle` and `SwatchPicker` do not have it.

**Two test files are named after issues, not behaviour.**
`src/styles/remainingFindings.test.ts` (#275, 279 lines) and
`src/styles/alignmentOwner.test.ts` (#274) hold three kinds of assertion:

- **Status lines in `docs/ui-audit/findings.md`**, for example "closes Audit
  Finding 21 with issue #274", or "leaves no finding open". These test a
  document, not the app. The register is frozen and every entry is closed, so
  they can only fail when someone edits the docs.
- **Source text standing in for behaviour.** They regex-match `<ChoiceChip\b`
  in `ImportWizard.tsx`, `<SwatchPicker\b` in `AccountCreateModal.tsx`,
  `sizing\.control\.sm` in the History range and legend chip styles, and the
  react-datepicker selectors in `DatePicker.styles.ts`. Nothing renders, and
  the History range chip, the legend chips and the calendar's gold today cell
  have no rendered test anywhere else.
- **Two rules worth keeping**, "every styled button wears the Focus Ring" and
  "empty states centre through `EmptyState`". Only the first is a real rule:
  the second matches export names containing `Empty`.

Each file also has its own copy of a `styledBlocks` source scanner, beside
the one `rawControls.ts` already holds.

**Cross-primitive tests sit loose at the layer root.**
`src/primitives/controlHeight.test.tsx` and `fieldParity.test.tsx` are the
only test files in `primitives/` that are not inside a module's folder. CLAUDE
says to co-locate tests with the file they belong to.

- `fieldParity` tests what the Field Chrome fragment does to the three fields.
  The fragment has a folder, `primitives/fieldChrome/`, and no test in it.
- `controlHeight`'s rendered parity check is already implied by each
  primitive's own `Control Height` suite. Button, Input, Select and DatePicker
  each assert `theme.sizing.control[size]` for every size. Its other half
  regex-scans the style sources for literal heights, which tests how the
  primitives are written, not what they render.

**Test support is duplicated, and one module is filed with the guards.**
#275 added `src/testing/cascaded/` (`cascaded`, `computedColor`,
`focusOutline`, `outlineValue`). This mirrors `server/src/testing/`. Still:

- `fieldParity.test.tsx` declares its own `computedColor` and `cascaded`.
- `CategoryManagerModal.test.tsx` and `ReviewTable.test.tsx` each declare
  `computedColor` again.
- `src/styles/rawControls.ts` is test support too: only the conformance tests
  import it. It sits flat in `styles/`, not in a folder of its own, while
  `cascaded` and `columnOf` are in `src/testing/`.

**Literals the epic's own rule says to replace were left in finding files.**
Design log 34 Q11 says a literal is replaced by its token when its file is
touched by a finding and a token holds the same value. A few were left:

- `MonthYearPicker`'s trigger is `height: 32px` (Control Height sm) and
  `border-radius: 6px` (`radius.sm`). The file is touched by findings 18 and 20.
- `Stepper`'s box copies Field Chrome's background, border, radius and height
  by hand, while #275's finding 3 says it wears the Field Chrome.
- Other finding-touched style modules still hold exact token values as
  literals, such as `ChoiceChip`'s `padding: 0 12px`, which is `space3`.

**The epic is not closed out.**

- CLAUDE.md shows UI Consistency Audit unticked, and its entry still reads as
  a plan.
- README lists it as 📋 Planned.
- `docs/release-notes/next.md` is empty.
- The dev journal has no entry.
- The glossary has no term for:
  - the Focus Ring;
  - the column definition that `TableHeader` and `DataRow` share, the
    alignment owner of finding 21;
  - the `ghostDanger` variant.
- #266 is still open.

## Solution

Five parts. Every commit leaves the suite green and the app rendering
pixel-identical. There is no visual, behaviour, copy or data change. Where a
move has no test pinning it, a characterization test lands first.

1. **One Focus Ring.** Pin the ring on the five controls that copy it, then
   move them all onto `focusRing`. The Button wears the fragment it defines.
2. **One home for test support.** `rawControls` moves to `src/testing/` and
   becomes the one source scanner. The duplicated `computedColor` and
   `cascaded` copies use `src/testing/cascaded`.
3. **Tests that test behaviour, guards that test rules.**
   - Each source-text assertion becomes a rendered test beside its unit.
   - The register-status assertions go.
   - The Focus Ring rule joins Primitive Conformance.
   - The two issue-named files are deleted.
   - The Field Chrome test moves into the fragment's folder.
   - The three barrel imports go back to deep imports.
4. **The literals Q11 covers.** Exact token values in finding-touched style
   modules become their tokens. The Stepper box composes Field Chrome.
5. **Docs and close-out.** Glossary, register note, release notes, dev
   journal and Build Status; the user checks the running app; #266 closes.

## Commits

### Part A — One Focus Ring

**A1. Pin the Focus Ring on the controls that copy it.**
Add one case to each suite, reading the ring with `focusOutline` and
`outlineValue` from `src/testing/cascaded`, as the Toggle and ChoiceChip
suites do. The cases go in:

- `Button` (each variant)
- `Tabs` (a tab, and the scroll button)
- `Stepper` (a step button)
- `MonthYearPicker` (the trigger and a month cell)

They pass today. Commit as `test:`; the suite is green, so the shipping-only
typecheck the hook runs on `test:` commits is not needed, but it does no
harm.

**A2. The Button wears `focusRing`.**
`Button.styles.ts` replaces its inline `&:focus-visible` block with
`${focusRing}`. Move its `type Variant` declaration below the imports; it
currently sits between them. A1's Button case stays green unedited.

**A3. Tabs, Stepper and MonthYearPicker wear `focusRing`.**
Make three changes:

- `Tabs`' tab drops its inline ring.
- `Stepper`'s step button drops its inline ring.
- `MonthYearPicker`'s trigger and month cell drop their inline rings.

After this commit, the gold 2px ring is declared once in `src/`, in
`focusRing`. Field Chrome's 3px wash ring is a different ring with a
different owner. A1's cases stay green unedited.

### Part B — One home for test support

**B1. `rawControls` moves to `src/testing/`.**
`src/styles/rawControls.ts` and its test become
`src/testing/rawControls/rawControls.ts` and `rawControls.test.ts`. Its
`ConformanceAllowlistEntry` type import points back at
`src/styles/conformanceAllowlist`. The allowlist and the guard stay in
`styles/` beside each other. This is a move commit, so the only test edits
allowed are import paths.

**B2. `rawControls` returns each styled element's body.**
Add `findStyledElements(source)`. It returns `{ exportName, tag, body }` for
every `export const X = styled…`, where `tag` is the member tag (`button`,
`div`) or empty for `styled(Component)`. `findRawControls` is built on it,
and the regex is kept in one place. Test:

- a member element;
- a generic and an `.attrs(...)` element;
- a `styled(Button)` element, which has an empty tag;
- that each body ends where the next export starts.

The existing `findRawControls` cases stay green unedited. No consumer yet.

**B3. One `computedColor` and one `cascaded`.**
These suites drop their local helpers and import from `src/testing/cascaded`:

- `fieldParity.test.tsx` drops `computedColor` and `cascaded`.
- `CategoryManagerModal.test.tsx` drops `computedColor`.
- `ReviewTable.test.tsx` drops `computedColor`.

`cascaded` takes an `Element`, which is wider than `fieldParity`'s
`HTMLElement`. No assertion changes. Commit as `refactor:`.

### Part C — Tests that test behaviour, guards that test rules

**C1. The Field Chrome test moves into its folder.**
`src/primitives/fieldParity.test.tsx` becomes
`src/primitives/fieldChrome/fieldChrome.test.tsx`. It still pins the fragment
only through what Input, Select and DatePicker render. Move only: paths
change and the describes keep their names.

**C2. Remove `controlHeight.test.tsx`.**

- **Rendered parity.** Each control primitive's own `Control Height` suite
  pins `theme.sizing.control[size]` for every size and for the default. Four
  heights equal to one token are equal to each other, so parity adds no
  check.
- **Source scan.** It asserts how the four style modules are written: no
  literal height, no local height table, the token named. A literal height
  that changed the render would fail the primitive's own suite, and one that
  did not is not a defect.
- **Evidence.** Before deleting, confirm each of Button, Input, Select and
  DatePicker has the per-size and default cases. All four do today.

**C3. `Toggle` and `SwatchPicker` follow the index convention.**

- Each suite gains the `is importable from src/primitives/index.ts` case, in
  the shape of `Money`'s.
- `AccountCreateModal`, `CategoryManagerModal` and `AutoUpdateToggle` go back
  to deep imports (`../../../primitives/Toggle/Toggle`,
  `../../../primitives/SwatchPicker/SwatchPicker`), like the other 158
  primitive imports.
- The index keeps both exports; finding 35's export half stands.
- The `remainingFindings` case "leaves no deep import of Toggle or
  SwatchPicker" is deleted in this commit, because it forbids the
  codebase's convention.

The AccountCreateModal, CategoryManagerModal and settings suites stay green
unedited.

**C4. Rendered tests for what the source guards stood in for.**
Each case asserts what renders, by role and label, with `getComputedStyle`
or `cascaded`, as `ChoiceChip`'s height case does.

| Suite              | What it pins                                                                                                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HistoryChart       | Each range chip (1Y / 3Y / All) renders at Control Height sm.                                                                                                                     |
| SeriesLegend       | A series chip and the show-all chip render at Control Height sm.                                                                                                                  |
| ImportWizard       | The step-one account chips are `aria-pressed` buttons at Control Height sm, the ChoiceChip's contract.                                                                            |
| AccountCreateModal | Its colour swatches render at the same size as a `SwatchPicker` swatch.                                                                                                           |
| DatePicker         | With the calendar open, today's cell and the keyboard-selected cell read the gold token. On a picker without `minDate`/`maxDate`, the Previous/Next navigation buttons are shown. |

They pass today. Commit as `test:`.

**C5. Primitive Conformance holds the Focus Ring rule.**
`primitiveConformance.test.ts` gains a describe. It reads the style modules
under `features/`, `components/`, `layouts/` and `primitives/`. Through
`findStyledElements`, it fails on any `styled.button` whose body does not
compose `${focusRing}`. A second case checks that `DataRow`, a clickable row
rendered as a `div`, composes it too.

This is the finding-32 guard with one accepted form instead of two. It can
only pass after Part A, which is why Part A comes first. Add
`findFocusRingViolations` to `rawControls`, with a test, so the guard file
keeps no scanner of its own.

**C6. Delete `remainingFindings.test.ts` and `alignmentOwner.test.ts`.**
Every assertion in them is now one of three things:

- **Covered beside its unit:**
  - the Focus Ring by C5;
  - the chips, swatches and calendar by C4;
  - Toggle and SwatchPicker exports by C3;
  - column alignment by the `columnOf` cases in YearArchive, ImportHistory,
    DataRow and TableHeader;
  - the Map columns hint by ImportWizard's #274 case;
  - Money's face by Money's #274 case.
- **A docs assertion:** the register status lines. They are dropped. The
  register is frozen, and its status lines are evidence, not behaviour.
- **Dropped with a reason:**
  - The `Empty`-named centring guard catches only exports whose name
    contains `Empty`. `EmptyState`'s own suite pins the centring.
  - The two-file `text-align` ban for findings 21 and 22 restates what their
    `columnOf` cases prove by rendering.

No other suite is edited.

### Part D — The literals Q11 covers

**D1. `MonthYearPicker`'s trigger reads its tokens.**
`height: 32px` becomes `theme.sizing.control.sm`, and `border-radius: 6px`
becomes `theme.radius.sm`. The values are identical. The MonthYearPicker
suite's Stable Label Width and placement cases stay green unedited.

**D2. The Stepper box composes Field Chrome.**
`Stepper`'s `Wrapper` composes `fieldChrome` at `md` and overrides only
what a box around two buttons needs:

- `width: auto`, since Field Chrome fills its row;
- its existing `0 space2` padding.

Its hand-copied background, border, radius and height go. The Stepper
suite's Field Chrome case (background, border, radius, height) stays green
unedited.

**D3. Exact token literals in finding-touched primitives.**
In the primitive style modules a finding touched, a `px` literal becomes its
token only when a spacing, radius or Control Height token holds exactly that
value. One example is `ChoiceChip`'s `padding: 0 12px`, which becomes
`space3`. Off-scale values such as `7px`, `13px` and `12.5px` stay, as Q11
says. Every suite stays green unedited.

**D4. The same in finding-touched components and layouts.**
The same rule applies to `components/` and `layouts/`, for example
`DataRow`'s padding, where it holds an exact token value.

**D5. The same in finding-touched features.**
The same rule applies to the feature style modules the findings name. The
list is the set of modules the epic's commits edited (`git diff --stat
1a4a742..2176b54`), not a whole-app sweep.

### Part E — Docs and close-out

**E1. Glossary.**

- Add **Focus Ring**: the `focusRing` fragment (`src/primitives/focusRing/`),
  the gold 2px outline offset 2px that every button-like control wears. It is
  not Field Chrome's 3px wash ring.
- Add **Table Column**: the `TableColumn` definition (`width`, optional
  `label`, `align`) that `TableHeader` and `DataRow` both read. It is the
  alignment owner, so a heading and its figures cannot disagree.
- **Button** relationships name `ghostDanger`: ghost at rest and the error
  colour on hover, for delete-style icon actions. An icon button is the
  Button in its ghost, small, icon-only form, and there is no IconButton.
- **Primitive Conformance** says the guard also fails on a styled button that
  does not wear the **Focus Ring**.
- Add a flagged ambiguity: features import primitives and components by deep
  path. The layer `index.ts` lists every member, and a member's own suite
  proves it is importable from there.

**E2. Findings register note.**
Under **After audit**, add one paragraph: refactor 36 kept finding 35's
index exports and returned the three switched imports to deep imports. Do not
change the frozen entries. Design log 34 is immutable, so it is not edited.

**E3. Release notes.**
`docs/release-notes/next.md` gains a **UI Consistency Audit** section in the
user's terms:

- fields and buttons beside each other are one height;
- the month switch no longer moves under the cursor, and its picker stays on
  screen;
- every button and chip shows the same keyboard focus ring;
- the History archive and Import history columns line up;
- the Categories and Import review fields look like fields;
- the dialog panel no longer flashes a white outline, and its footer stays
  visible.

**E4. Dev journal.**
Add an entry for this refactor. Record:

- the two-owner Focus Ring, and why the guard allowed it;
- the barrel-import reversal of finding 35's import half, with the 158 / 194
  / 0 counts;
- the issue-named test files, and what replaced each kind of assertion;
- where the plan met code that had moved on;
- the follow-ups under Out of Scope.

**E5. Build Status.**

- CLAUDE.md ticks UI Consistency Audit and rewrites its entry to what
  shipped, the way the Import Category Learning entry does:
  - Control Height;
  - Field Chrome;
  - Stable Label Width;
  - Focus Ring;
  - Table Column;
  - `ghostDanger`;
  - Primitive Conformance with its allowlist ratchet;
  - finding 29 rejected as a copy and behaviour change.
- README's status table reads ✅ Complete.

**E6. HITL: check the running app, then close the epic.**
On a real build, the user confirms:

- a form row with a field and a button lines up;
- the month switch holds still through twelve months;
- Tab through a modal, the Month header and the History range: every control
  shows the same ring.

Then close the PRD issue #266 and this issue.

## Decision Document

- **The Focus Ring has one owner: `focusRing`.** The Button wears it rather
  than defining its own, and the fragment's doc ("the Button's gold 2px
  outline") stays true because the Button reads it. Primitive Conformance
  accepts only the fragment, not a literal copy.
- **Deep imports are the convention.** Features, pages, layouts and
  components import a primitive or component by its module path. The layer
  `index.ts` lists every member, and each member's suite proves it is
  importable from there. This reverses the import half of design log 34's
  finding-35 decision. The export half stands. Refactor 35 left the same
  convention alone for cross-feature imports.
- **Test support lives in `src/testing/`, one folder per module.** This
  mirrors `server/src/testing/` and the Module Filing Rule. `rawControls` is
  the one source scanner, and `cascaded` is the one style reader.
- **The Conformance Allowlist and its guard stay in `src/styles/`.** They
  are the rule for the app's style modules, as `fonts.test.ts` is, not
  reusable test support.
- **A test asserts what renders.** A source-text assertion is kept only when
  it is a rule over every module: Primitive Conformance and its Focus Ring
  case. A check that one named file contains one string is replaced by a
  rendered test beside the unit.
- **Docs are not tested.** The findings register is evidence. Its status
  lines are kept by review, not by Vitest.
- **The Field Chrome test belongs to the fragment.** It still asserts through
  the three fields that wear it, never through the fragment's CSS.
- **Control Height parity is transitive.** It is evidence because each
  primitive pins the token for every size, not because one test renders all
  four together.
- **Q11 still bounds the literals.** Only exact token values, and only in
  modules the epic touched. Off-scale values stay. The register is frozen,
  so no new findings are opened.
- **The Stepper composes Field Chrome with two overrides.** These are a
  `width: auto` and its own padding, inside the primitive that owns them. It
  is not a feature-local override. Splitting Field Chrome into a surface
  fragment and a focus fragment was considered and rejected: it would add a
  term for one consumer.
- **No visual, behaviour, copy, data, schema or API change.** Every commit is
  pixel-identical by construction: either token values equal the literals
  they replace, or the change is to tests and docs only.

## Testing Decisions

A good test here asserts what a user or a caller can observe: a computed
height, colour or outline on an element found by role and label, or a
member importable from its layer index. It never asserts how a style module
spells a value.

- **Moves do not edit existing tests.** These commits each move or tidy code
  behind an existing suite: A2, A3, C3, D1, D2, D3, D4 and D5. Those suites
  passing _unedited_ is the evidence that the move was faithful.
- **The allowed test edits are:**
  - import paths in B1 and C1;
  - local helpers replaced by `src/testing` imports in B3;
  - deletions in C2 and C6, each with the covering test named above.
- **Characterization before movement.** A1 pins the five rings before Part A
  moves them, and C4 pins the chips, swatches and calendar before C6 deletes
  their source guards. Both commit as `test:` while green.
- **New tests:**
  - the A1 focus-ring cases;
  - `findStyledElements` and `findFocusRingViolations` in `rawControls`;
  - the C3 index cases;
  - the C4 rendered cases;
  - the C5 Focus Ring guard.
- **Prior art:**
  - `Toggle` and `ChoiceChip` focus-ring cases (`focusOutline`), for A1;
  - `rawControls.test.ts`, for B2 and C5;
  - `Money`'s `is importable from src/primitives/index.ts`, for C3;
  - `ChoiceChip`'s and `Stepper`'s computed-style cases, for C4;
  - `KpiStrip`'s `getComputedStyle` height, the #208 precedent design log 34
    names.
- **Coverage is otherwise good.** The epic added about 2,500 lines of tests,
  and every touched primitive and feature has a co-located suite. This plan
  adds no backfill beyond the cases above.
- **Visual evidence.** Rerunning the `docs/ui-audit/harness/` pass is not
  required, because no commit changes a rendered value. If the user wants it
  at E6, it goes in a dated `after-` folder, like #277.

## Out of Scope

- **Anything that changes appearance.** That includes off-scale literals,
  decorative icon tiles at hand sizes (`ImportWizard`'s file glyph,
  `ManualDrawer`'s and `ManualSection`'s 34px icon tiles, `SavingsStreakCard`'s
  month tiles), and `HistoryChart`'s `7px` chip radius. The register is
  frozen.
- **`HistoryPage`'s call-to-action**, a `Link` styled by hand as a primary
  sm Button (`height: 32px`, button radius, primary fill). The audit missed
  it. It belongs in `docs/live-use-defects.md` Round 2 as a visual
  follow-up, not here, because the register is frozen and no finding touches
  the file.
- **Finding 29, the three modal patterns.** It was rejected because fixing it
  adds headings (copy) and moves submit buttons out of forms (behaviour).
  That stands.
- **The Snackbar close's lowercase `aria-label="close"`.** It is an
  accessible-name copy change, which is a live-use item if anyone wants it.
- **The duplicated `type Variant`** in `Button.tsx` and `Button.styles.ts`.
  `Snackbar` does the same, so it is a codebase-wide pattern, not this epic's
  drift. A2 fixes only its misplaced position between the imports.
- **The month picker's 10px right-edge gap.** It is already logged in
  `docs/live-use-defects.md` Round 2.
- **Live-use defect #6**, deleting an import without confirmation. It is
  behaviour, logged in Round 2.
- **An ESLint rule or visual-regression tooling.** Design log 34 Q12 rejected
  both.
- **Still open from refactors 32–35:**
  - `linkedSince`'s UTC "today";
  - the `isoDaysFromToday` midnight flake;
  - the reports route's run-start choice;
  - the client's month arithmetic;
  - `CategorySelect`'s selection effect;
  - the Category Manager on the cache.

## Further Notes

- **The drift is the epic's own lesson, applied to itself.** The epic found
  feature code re-implementing what a primitive owns. Its own slices did the
  same in small ways:
  - a fragment the primitive it names does not use;
  - a scanner written three times;
  - a helper written four times;
  - a test layout (loose layer-root files, issue-named guards) the rest of
    the suite does not use.
- **Order matters in four places:**
  - A1 comes before A2 and A3.
  - Part A comes before C5.
  - B2 comes before C5.
  - C3, C4 and C5 come before C6.

  Part D is independent of B and C. Part E comes last.
