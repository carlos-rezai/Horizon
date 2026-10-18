# Plan: UI Consistency Audit

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/266

## Architectural decisions

These decisions apply to every phase:

- **Routes**: there are no new routes, and no route, schema, API or
  migration changes. The epic is visual only.
- **Schema**: this epic has no schema. The audit runs against a throwaway
  SQLite database in the scratchpad (`HORIZON_DB_PATH`) filled with
  anonymised fixture data. The real database and real bank exports are never
  opened.
- **Evidence layout**:
  - `docs/ui-audit/findings.md` is the findings register, in the shape of
    `docs/live-use-defects.md`. Each Audit Finding is numbered and records
    Screen, Element, Measured, Expected (the value and the primitive,
    component or token that owns it), Cause (re-styled / re-implemented /
    missing primitive / token gap) and Status.
  - `docs/ui-audit/before-<date>/` and `docs/ui-audit/after-<date>/` hold
    screenshots and measurement JSON, as `docs/perf/` does.
  - The register freezes at the end of Phase 1. Anything found later goes to
    `docs/live-use-defects.md` under Round 2.
- **Key models**:
  - **Control Height**: a sizing token `control: { sm: 32, md: 40, lg: 44 }`.
    It is exported through the tokens index and added to the theme next to
    `radius` and `spacing`. Button, Input, Select and DatePicker all take
    `size: "sm" | "md" | "lg"` (default `md`) and read their height from this
    token and nowhere else.
  - **Recorded deviation**: Button md is 40px, not the Prototype's 38px.
    Every other disagreement with the Prototype is recorded as a finding.
  - **Field Chrome**: one shared styled-components `css` fragment. It lives
    in its own folder under the primitives layer, with no barrel. It provides
    the lowest-ink background, outline-variant border, medium radius, Control
    Height, gold border plus a 3px gold-wash focus ring, and 0.4 opacity when
    disabled. Input, Select and DatePicker all use it.
  - **Button variants**: the existing variants plus `ghostDanger`, which is
    ghost at rest and uses the error colour on hover. An icon button is the
    Button in its ghost, small, icon-only form with an accessible label.
    There is no IconButton primitive.
  - **Stable Label Width**: a label that changes on interaction reserves the
    width of its longest possible value. The width is set in `ch` from a
    named constant derived from the value list, and the label is centred.
  - **Alignment owners**: Money inside DataRow columns right-aligns figures.
    EmptyState and SectionState centre empty and loading states. TableHeader
    and DataRow read alignment from one shared column definition.
  - **New shared pieces**: a pattern becomes a primitive or component only
    once two or more features use it. Every primitive is exported from the
    primitives index.
  - **Primitive Conformance**: a guard test under the global styles folder.
    It reads every feature, component and layout style module raw through
    `import.meta.glob` with `?raw`. It fails on a raw `button`, `input`,
    `select` or `textarea` styled element unless that export is on the
    **Conformance Allowlist**. Each allowlist entry states its reason, and
    the allowlist can only shrink.
- **Invariant for every phase**: event handlers, roles and accessible names
  of every control stay the same. Copy, behaviour and data do not change.
  Existing feature tests stay green, finding controls by role and label. A
  literal is replaced by a token only in a file a finding already touches,
  and only when a token holds the same value.

---

## Phase 1: Audit before

**User stories**: 32, 33, 38, 39

### What to build

Seed a throwaway scratchpad database with anonymised fixture data so that
every surface has content: accounts of each type, a mortgage with an
origination, recurring rules, Variable Spending across several months, an
import history and categories.

Start the dev app on that database. Using the chrome-devtools MCP in Brave
(port 9222 must be free first), go through every surface:

- Dashboard
- Accounts and Account Detail
- Month Overview
- Financial Plan
- History
- every Import wizard step
- Import History
- Categories
- Settings
- the User Manual drawer
- every Modal, including the alert and confirm modals

For each interactive element, record the computed height, width, alignment,
font, radius, background and focus style, and screenshot each surface.

Then run the static pass. Sweep the feature, component and layout style
modules for hand-built controls, hand-sized boxes and literal sizes, and
trace each one to the shared piece it duplicates.

Write every inconsistency into the findings register and freeze it. Log any
behaviour, data or copy problem as a live-use defect instead.

### Acceptance criteria

- [ ] The app ran against the throwaway database only, and the real database
      was never opened
- [ ] `docs/ui-audit/before-<date>/` holds a screenshot and measurement JSON
      for every surface listed above
- [ ] `docs/ui-audit/findings.md` lists every inconsistency as a numbered
      Audit Finding with all six fields filled in
- [ ] The field/button height mismatch, the off-centre text and the resizing
      month switch from the PRD each appear as findings with measured values
- [ ] Every static-pass hand-built control is either a finding or marked as
      a justified exception for the future allowlist
- [ ] Non-visual problems found during the audit are logged in
      `docs/live-use-defects.md`, not in the register
- [ ] The register is marked frozen

---

## Phase 2: Control Height

**User stories**: 1, 2, 6 (height), 30, and the height findings on 20–26

### What to build

Add the Control Height token and put it on the theme. Button drops its local
height map and reads the token. Input, Select and DatePicker gain the `size`
prop and declare their height from the token. After this phase, a field and
a button of the same size line up on every screen. Close the height findings
this resolves.

### Acceptance criteria

- [ ] The tokens test pins `control.sm = 32`, `control.md = 40` and
      `control.lg = 44`
- [ ] Button, Input, Select and DatePicker each render at the Control Height
      for every size (`getComputedStyle` in jsdom)
- [ ] One Button, Input, Select and DatePicker of the same size render the
      same height
- [ ] No control primitive keeps a local height table or a literal height
- [ ] Every existing feature test passes unchanged
- [ ] The height findings this phase resolves are closed in the register
      with this commit

---

## Phase 3: Field Chrome

**User stories**: 3, 4, 6, 7, 31

### What to build

Add the Field Chrome fragment and apply it to Input, Select and DatePicker:

- Select loses its own background and its outline-offset focus.
- DatePicker's custom input becomes the Input primitive with a new
  trailing-icon slot, and its copy of the input styles is deleted.
- The calendar pop-up's font-family interpolation is fixed so it renders in
  the UI font.

### Acceptance criteria

- [ ] Input, Select and DatePicker render the same background, border,
      radius and height
- [ ] All three show the same gold border and focus ring when focused, and
      the same 0.4 opacity when disabled
- [ ] DatePicker renders through Input, and no copied input styles remain in
      it
- [ ] Input supports a trailing icon without changing its height
- [ ] The calendar pop-up uses the UI font
- [ ] Date selection and keyboard behaviour stay the same, and the existing
      DatePicker tests pass
- [ ] Field-chrome findings are closed with this commit

---

## Phase 4: Month switch

**User stories**: 8, 9, 10, 23 (range selector and year headers)

### What to build

The month-year picker trigger renders in the mono face with a `min-width` in
`ch`. That width comes from the longest month-year label it can show,
computed from the month-name list as a named constant, and the label is
centred.

The Month Overview previous and next buttons become ghost, small,
icon-only Buttons. The stepper container stays local to the feature because
only one feature uses it.

Check every other label that changes on interaction (History range, year
headers, tab counts) against the same rule, and fix any that resize.

### Acceptance criteria

- [ ] The month-year picker trigger renders the same width for "May" and
      "September"
- [ ] The label is centred in the trigger
- [ ] The previous and next controls are Buttons with unchanged accessible
      names and handlers, and month navigation tests pass
- [ ] In the running app, the arrows do not move while clicking through
      twelve months (measured)
- [ ] Every other changing label in the register keeps its width, or its
      finding records why it does not need to
- [ ] Label-width findings are closed with this commit

---

## Phase 5: Icon buttons onto Button

**User stories**: 5, 11, 12, 13, 14, 25, 27, 29

### What to build

Add the Button `ghostDanger` variant. Replace every hand-sized icon button in
features and components (edit, delete, close, step, Import History row
actions, Savings Streak and Mortgage Countdown edit) with a ghost, small,
icon-only Button with an accessible label. Delete-style actions use
`ghostDanger`. The Modal close and the User Manual drawer close become the
same Button.

### Acceptance criteria

- [ ] `ghostDanger` renders and is reachable by role and name
- [ ] Every icon button in the register renders at Control Height sm, with
      one hover and one focus ring
- [ ] Every delete-style icon turns the error colour on hover
- [ ] Every Modal close and the ManualDrawer close are the same Button, in
      the same position
- [ ] Every replaced control keeps its role, accessible name and handler;
      tests that reached into a local styled component are rewritten to role
      and label
- [ ] Icon-button findings are closed with this commit

---

## Phase 6: Local inputs onto the primitives

**User stories**: 15, 16, 24, 29

### What to build

Replace hand-built text fields with the Input primitive at the right size:

- the Categories inline rename and add fields
- the Import review step's inline description field (small size)
- any other local text input the register lists

Then remove the local field styles.

### Acceptance criteria

- [ ] The Categories rename and add fields render with Field Chrome at
      Control Height
- [ ] The Import review description field renders as a small Input
- [ ] Inline editing, validation and commit behaviour stay the same, and the
      Categories and Import tests pass
- [ ] No local styled `input` remains for these surfaces
- [ ] Local-input findings are closed with this commit

---

## Phase 7: Alignment and remaining findings

**User stories**: 17, 18, 19, 20–26 (remaining), 36, 37

### What to build

Give each kind of alignment one owner:

- TableHeader and DataRow read their alignment from one shared column
  definition.
- Money right-aligns figures inside DataRow columns.
- EmptyState and SectionState centre empty and loading states.

Remove local `text-align` that duplicates these owners. Export Toggle and
SwatchPicker from the primitives index and switch their deep imports to it.

Fix every finding still open in the register in its owning primitive,
component or token. Promote a pattern to a shared piece only if two or more
features use it.

### Acceptance criteria

- [ ] A heading and its column figures share one alignment source and cannot
      disagree
- [ ] Money figures are right-aligned in every list in the register
- [ ] Empty and loading states centre through EmptyState or SectionState on
      every screen
- [ ] Toggle and SwatchPicker are imported only through the primitives index
- [ ] Any new shared piece has co-located styles and a test, is exported
      from its layer index, and is used by two or more features
- [ ] Every finding is closed with its commit, or rejected with a reason

---

## Phase 8: Guard and audit after

**User stories**: 28, 33 (after evidence), 34, 35

### What to build

Add the Primitive Conformance test. It reads every feature, component and
layout style module raw and fails on a raw `button`, `input`, `select` or
`textarea` styled element whose export is not on the Conformance Allowlist.
Build the allowlist from what remains after Phases 2–7, with one reason per
entry (hidden file input, calendar cell, colour swatch, disclosure header).

Repeat the Phase 1 runtime measurement pass on the same fixture database
into `docs/ui-audit/after-<date>/`. Confirm that every finding is closed and
that nothing changed except appearance.

### Acceptance criteria

- [ ] The conformance test passes on the current code and fails when a style
      module adds an unlisted raw `button` or `input` styled element
- [ ] Every allowlist entry names its export and its reason, and the
      allowlist is no longer than what remains after the fixes
- [ ] `docs/ui-audit/after-<date>/` holds screenshots and measurement JSON
      for every surface in Phase 1
- [ ] The after measurements show matching Control Heights, a stable month
      switch and the expected values for every closed finding
- [ ] Every Audit Finding in the register is closed with a commit or
      rejected with a reason
- [ ] The full test suite and `node scripts/typecheck.mjs` pass, and no
      behaviour, copy or data change landed in the epic
