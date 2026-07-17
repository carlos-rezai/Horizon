# Plan: Import Review Repair

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/189

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: no new routes. `POST /imports` gains a richer validation-failure
  body — `{ error, issues }`, both fields, always. `POST /imports/preview`
  gains an optional `mapping` field on its multipart body. Neither is a
  breaking change to the success path.
- **Row model**: `ReviewRow` carries two independent arrays, never booleans:
  - `flags: RowFlag[]` — soft, pre-excluding reasons: `duplicate`,
    `recurring`, `pending`. The user may opt back in.
  - `blockers: RowBlocker[]` — hard reasons the row cannot commit. Today one
    member: `description`. An **open set**, so a new hard reason can never
    reintroduce the hand-maintained-ternary drift this feature kills.
  - `included = flagsFor(row).length === 0` at build time; user-toggleable
    after.
- **The commit gate**: `rows.every(r => !r.included || r.blockers.length === 0)`
  — **included rows only**. Unchecking is a real escape hatch, not a
  workaround. Composes with the existing `summary.included === 0` disable.
- **Blockers are client-derived**: `blockersFor` is pure over the row's
  _current_ values and recomputes live on edit. The server never stamps a
  blocker. Accepted drift: the validity rule lives in both `blockersFor` and
  `ImportRowSchema`; the schema stays the sole authority on what commits, and
  the client rule is a fast local guess that keeps the user out of dead ends.
- **Two orthogonal visual channels**: opacity encodes _inclusion_ (`0.55` =
  excluded, and only that). The description cell's error state encodes
  _blocked-and-included_. They compose with no special cases.
- **Preview mapping precedence**: `override ?? remembered ?? detected`.
- **Rejected shape**: `MappedRows.rejected` and `PreviewSummary.rejected` both
  become `{ count, samples }`, in lockstep on both sides of the API. Samples
  are raw, unparsed cell text, capped at five.
- **Schema unchanged**: `ImportRowSchema` is not relaxed and no placeholder
  description is ever invented. The constraint stays; it becomes actionable.
- **Terminology** (see `docs/ubiquitous-language.md`, "Import Review Repair"):
  _rejected_ = dropped at parse, never reaches review; _soft exclusion_ = in
  the table, unchecked, dimmed; _hard blocker_ = in the table, checked, full
  opacity, gating the commit. A blocked row is never called "rejected", and
  "flag" is soft-only.

---

## Phase 1: Repair the dead end

**User stories**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 45, 46, 47, 50

### What to build

The review step's description cell becomes an editable input on **every** row,
and a row whose description is blank renders with an error border and an "Add a
description" placeholder — the problem and its fix are the same affordance. The
row model gains the `blockers` array, derived purely from the row's current
values, so typing clears the error on the keystroke. The Import button is
disabled while any _included_ row is blocked, and unchecking a blocked row
resolves it. A statement with blank descriptions — today a dead end — imports
after the user types them in.

No pill, no filter, no server change. This phase proves explain-and-fix in
place.

### Acceptance criteria

- [ ] `ReviewRow` carries `blockers: RowBlocker[]`; `blockersFor` is pure over
      the row's current values
- [ ] A blank or whitespace-only description yields a `description` blocker; a
      filled one yields none
- [ ] Every row's description renders as an editable input, regardless of
      whether it is blocked
- [ ] A blocked, included row renders at full opacity with an error border, an
      "Add a description" placeholder, and a thin left error accent
- [ ] Typing a description clears the row's error state immediately
- [ ] `canCommit` is false when an included row is blocked, true when only an
      excluded row is blocked
- [ ] Unchecking a blocked row dims it and drops its error state
- [ ] The Import button is disabled while `canCommit` is false, keeps its
      "Import N transactions" label, and N counts only what will commit
- [ ] Editing a description never changes the row's category
- [ ] Date and amount are not editable
- [ ] A statement with a blank-description row imports successfully once a
      description is typed
- [ ] The review-row model's tests cover blockers, flags-driven exclusion, and
      the `canCommit` included-vs-excluded case
- [ ] Existing `useImportWizard` and `ImportWizard` suites still pass

---

## Phase 2: Tell the truth on failure

**User stories**: 31, 32, 33, 34

### What to build

When the commit schema rejects the payload, the route answers with **both** a
readable `error` string and the structured `issues`. A new pure module owns
attribution: given the issues and the ordered list of committed row ids, it
returns blockers per row id plus any unattributed issue text. The client lands
each attributed issue as a blocker in phase 1's exact repair UI — same error
cell, same left accent, same gate. Anything with no row to attach to falls
through to the readable `error` floor.

The critical subtlety: `issue.path` is `["rows", n, field]` where `n` indexes
the **filtered commit payload**, not the wizard's `rows` state. The commit path
holds the filtered array and maps index → row id through it. Reading `rows[n]`
would confidently blame an innocent row.

### Acceptance criteria

- [ ] `POST /imports` answers a validation failure with both `error` (readable)
      and `issues` (structured)
- [ ] A server rejection shows a readable message, never "Failed to import
      statement"
- [ ] An issue at path `["rows", n, field]` attributes to the id of the nth
      _included_ row, not to `rows[n]`
- [ ] A named test covers the filtered-index trap: rows 40 and 41 of a 50-row
      table, an issue at `["rows", 0, "description"]` attributes to row 40's id
- [ ] Multiple issues on one row all attribute to it
- [ ] An issue with a non-row path (bad `accountId`, malformed `mapping`) falls
      to `unattributed` and surfaces via the `error` floor
- [ ] A malformed or out-of-range path is ignored rather than throwing
- [ ] A server-detected blocker renders identically to a client-detected one —
      one repair path, not two

---

## Phase 3: Navigation at year scale

**User stories**: 14, 15, 16, 17, 18, 19, 20, 48

### What to build

The reported pain: three blocked rows in twelve hundred are unfindable by eye.
A **"N rows need a description"** pill sits next to the disabled Import button
and jumps to the next blocked row on click, keeping surrounding rows in
context. A **"Needs attention"** filter collapses the table to just the blocked
rows — each an input, with Tab walking straight through them.

The filter is view-only and can never change what commits. On a clean
statement, none of this appears.

### Acceptance criteria

- [ ] A pill reads "N rows need a description" beside the Import button
- [ ] Clicking the pill jumps to the next blocked row
- [ ] A "Needs attention" filter collapses the table to blocked rows only
- [ ] The filter is obviously off by default
- [ ] Toggling the filter never changes inclusion, descriptions, or what
      commits
- [ ] Tab moves from one blocked description input to the next while filtered
- [ ] A statement with no blocked rows shows no pill and no filter

---

## Phase 4: Flags array + all badges

**User stories**: 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 49

### What to build

`flagsFor` replaces the hand-maintained ternary: the `flags` array drives
**both** the pre-uncheck and the badges from one source, so a
counted-but-never-rendered flag becomes structurally impossible. Every
applicable badge renders — including `pending`, which today is counted by
`summarizeReview` and rendered by nothing. A row that is both duplicate and
recurring shows both badges.

Dimming settles into its single meaning: Horizon set this aside for me. The
Flag column widens from 72px to ~110px to fit multiple badges, absorbed from
the description column's flexible width.

### Acceptance criteria

- [ ] `flags: RowFlag[]` drives both pre-exclusion and badge rendering from one
      source
- [ ] Duplicate, recurring, and pending rows are each dimmed, pre-unchecked,
      and badged
- [ ] A row with two flags renders both badges
- [ ] The badge count and the exclusion decision always agree
- [ ] Checking a soft-excluded row back in restores full opacity
- [ ] A row with both a soft flag and a blank description is dimmed with no
      error state; checking it in is what raises the error
- [ ] The summary bar accounts for pending alongside duplicates and recurring
- [ ] The review step's footnote about duplicates and recurring stays accurate
- [ ] Flags fit at the 774px modal width; the fallback is icon+count, never
      hiding flags

---

## Phase 5a: Honesty about dropped rows

**User stories**: 35, 36, 37, 38, 39, 40

### What to build

Rows dropped at parse — today counted end-to-end into `summary.rejected` and
rendered by nothing — are surfaced as a count plus up to five raw samples under
the review summary. `mapStatementRows` already holds the record at the moment
it rejects, so retaining the first five is a couple of lines, not a second
pass. The shape change from `number` to `{ count, samples }` lands in lockstep
on both sides of the API.

The reframe matters: a rejected row is usually a bad _mapping_, not bad data.
One rejected row in 200 is junk; 200 of 200 is a wrong date column. So the note
is a diagnostic of step 2 — a signpost, not an apology. It does not gate the
commit, and it stays a separate message from "N rows need a description".

Rejected rows never enter the review table: there is no parsed date or amount
to show, and fabricating one is the placeholder this feature rules out.

### Acceptance criteria

- [ ] `MappedRows.rejected` and `PreviewSummary.rejected` are
      `{ count, samples }` on both sides of the API
- [ ] Samples carry the raw, unparsed date and amount cell text exactly as it
      appeared
- [ ] Samples cap at five while the count keeps climbing past it
- [ ] Zero rejections yields an empty sample list and no note
- [ ] An empty-date record is still skipped silently and never appears as a
      sample
- [ ] The count still matches today's behaviour
- [ ] A note reads "N rows couldn't be read — check your column mapping" with
      the raw samples beneath the review summary
- [ ] The note does not gate the Import button
- [ ] The rejected note and the blocked-rows pill stay distinct messages
- [ ] No rejected row appears in the review table

---

## Phase 5b: Mapping override

**User stories**: 41, 42, 43, 44

### What to build

The Map-columns step finally works. Today it lets the user change the mapping
and remembers the change as a preset for next time — but never applies it to
the import in front of them. The preview builder gains an optional
`mappingOverride` with precedence `override ?? remembered ?? detected`, and
`POST /imports/preview` reads an optional `mapping` field off its multipart
body. The wizard hook re-fetches the preview (debounced ~300ms) on a mapping
change and rebuilds rows from the result, so inclusion and description edits
are re-derived from freshly mapped rows rather than committing stale state.

This is not new scope: design log 19's sequence diagram already specifies
`POST /imports/preview (multipart: file bytes + accountId + mapping?)`. It
ships alongside 5a because the rejected note's advice — go back and fix your
mapping — is only honest once fixing it does something.

### Acceptance criteria

- [ ] The preview builder accepts an optional `mappingOverride`
- [ ] Precedence is override > remembered > detected
- [ ] No override falls back to today's behaviour unchanged
- [ ] An override actually changes which columns the emitted rows are read from
- [ ] `POST /imports/preview` reads an optional `mapping` field off the
      multipart body
- [ ] Changing a mapping dropdown re-previews the rows the user is reviewing
- [ ] Several rapid mapping changes settle without flicker (~300ms debounce)
- [ ] Inclusion and description edits are re-derived from the freshly mapped
      rows after a mapping change
- [ ] A corrected mapping is both remembered for next time and applied to this
      import
