## Problem Statement

I imported a full year of my bank statement — around 1,200 rows. The wizard
previewed it cleanly: every row parsed, categories auto-assigned, duplicates and
recurring rows helpfully unchecked. I clicked **Import 1,187 transactions** and
got a single line of red text: **"Failed to import statement."**

That was all. No indication of which row was at fault, no hint at what was
wrong with it, and nothing I could click to find out. I went back and forth
through the review table looking for something that stood out. Nothing did — the
offending rows look exactly like the good ones. My only remaining options were
to unpick the file by hand in a spreadsheet, or give up on the import.

What actually happened: a handful of rows have a blank description. The preview
accepts them; the commit schema rejects them. The server knows precisely which
rows and why, and says so — but it answers with a field the client never reads,
so the reason is discarded on arrival and I get the generic fallback.

Three separate failures compound into that dead end:

1. **No explanation** — the row-level reason exists on the server and never
   reaches me.
2. **No repair** — even if I knew which row, description isn't editable, so
   there's no way forward from inside the app.
3. **No navigation** — three bad rows in twelve hundred are unfindable by eye.

Two things are also silently lost along the way. Rows dropped at parse time are
counted end-to-end into `summary.rejected` and then never rendered, so a file
whose date column is mapped wrong loses rows without a word. And the Map-columns
step lets me change the mapping, remembers my change as a preset for next
time — and never applies it to the import I'm actually looking at.

## Solution

The review step explains what's wrong with each row and lets me fix it where I'm
standing.

- **The description cell becomes an input.** A row with a blank description
  renders with an error border and the placeholder **"Add a description"**. It
  tells me what's wrong, which field is wrong, and it _is_ the fix — no tooltip,
  no legend, no colour to decode. Every row's description is editable, not just
  blank ones, because bank descriptions are frequently cryptic
  (`KARTENZAHLUNG//NR4417`) and cleaning one up is legitimate.

- **Blocked rows stay checked.** A blank description is a real transaction with
  real money. Pre-unchecking it would trade today's loud failure for a silent
  one where my ledger is quietly short. The **Import** button is disabled while
  any _included_ row is blocked — so unchecking a row I genuinely can't describe
  (a balance footer, say) is a real escape hatch, not a workaround.

- **Two visual channels that mean different things.** Dimming means _excluded_
  and only that: duplicates, recurring, and pending rows keep their `opacity:
0.55` because Horizon set them aside for me. A blocked row looks completely
  normal except for one unfilled cell — because it isn't set aside, it's coming
  in and it needs me. They read as different _kinds_ of thing rather than shades
  of one. The two channels compose without special cases: uncheck a blocked row
  and it dims _and_ its error state drops, because an excluded row can't block.

- **Navigation at year scale.** A **"N rows need a description"** pill next to
  the disabled Import button jumps to the next blocked row, and a **"Needs
  attention"** filter collapses the whole table down to just those rows — each
  one an input, with Tab walking straight through them. The filter is view-only;
  it can never change what commits.

- **The server's rejection becomes legible.** The commit route answers with both
  a readable `error` and the structured `issues`. The client maps each issue back
  to the row it came from and lands it as a blocker in exactly the same repair UI
  as the client-detected case — same error cell, same pill, same jump.

- **Honesty about dropped rows.** Rows rejected at parse are surfaced as a count
  plus up to five raw samples, under the review summary. The reframe matters:
  a rejected row is usually a bad _mapping_, not bad data. One rejected row in
  200 is junk; 200 of 200 is a wrong date column. So it's a diagnostic of step 2
  — a signpost, not an apology.

- **Map columns finally works.** The mapping I set in step 2 is sent with the
  preview request and re-maps the rows I'm reviewing. This ships together with
  the rejected-rows note, because telling me to go back and fix my mapping is
  only honest once fixing it does something.

What this explicitly does **not** do: relax `ImportRowSchema`, or invent a
placeholder description. The constraint stays; it just becomes actionable.

## User Stories

1. As a user importing a statement, I want to know _which_ rows are stopping my
   import, so that I'm not hunting through 1,200 rows by eye.
2. As a user, I want to know _why_ a row is stopping my import, so that I know
   what to do about it.
3. As a user, I want to fix a blocked row without leaving the review step, so
   that I don't have to edit my CSV in a spreadsheet and start over.
4. As a user with a blank-description row, I want that cell to render with an
   error border and an "Add a description" placeholder, so that the problem and
   its fix are the same affordance.
5. As a user, I want to type a description into a blocked row and see its error
   state clear immediately, so that I get feedback as I repair.
6. As a user, I want the Import button to enable the moment my last blocked row
   is repaired, so that the path forward is obvious.
7. As a user, I want to edit the description on _any_ row, not just blank ones,
   so that I can clean up a cryptic bank string like `KARTENZAHLUNG//NR4417`.
8. As a user, I want two identical-looking rows to behave identically, so that
   editability never depends on data I can't see.
9. As a user with a junk footer row I can't meaningfully describe, I want to
   uncheck it and proceed, so that one unusable row can't make my file
   permanently unimportable.
10. As a user, I want unchecking a blocked row to visibly resolve it — dim, error
    gone — so that I can see the exit worked.
11. As a user, I want blocked rows to stay checked by default, so that a real
    transaction is never silently dropped from my ledger.
12. As a user, I want the Import button's count to reflect only what will
    actually commit, so that the number is a promise.
13. As a user, I want the Import button to keep saying "Import N transactions"
    when it's disabled, so that the button doesn't shout — the pill beside it
    explains and is the thing I act on.
14. As a user, I want a summary pill reading "2 rows need a description", so that
    I know the scale of the problem before I go looking.
15. As a user, I want to click that pill to jump to the next blocked row, so that
    I can work through them while keeping the surrounding rows in context.
16. As a user, I want a thin error accent on the left of a blocked row, so that I
    can land on it after a jump.
17. As a user with three blocked rows in twelve hundred, I want a "Needs
    attention" filter that collapses the table to just those, so that I can fix
    them all in a few seconds.
18. As a user, I want the filter to never change what commits, so that turning a
    view on can't alter my data.
19. As a user, I want to Tab from one blocked description straight to the next
    while filtered, so that repairing several rows is a keyboard flow.
20. As a user, I want the filter toggle to be obviously off by default, so that I
    always start by seeing my whole statement.
21. As a user, I want to see a dimmed row and understand "Horizon set this aside
    for me", so that dimming has exactly one meaning.
22. As a user, I want a blocked row to look normal apart from its empty cell, so
    that I read it as "this is coming in and needs me", not "this is ignored".
23. As a user with a duplicate row, I want it dimmed and pre-unchecked, so that I
    don't double-count what Horizon already tracks.
24. As a user with a recurring row, I want it dimmed and pre-unchecked, so that
    my imported statement doesn't fight my projection model.
25. As a user with a pending ("vorgemerkt") row, I want it dimmed, pre-unchecked,
    **and badged as pending**, so that I can tell why it was set aside — today it
    is unchecked with no badge at all, which is unexplained.
26. As a user with a row that is both a duplicate _and_ recurring, I want to see
    both badges, so that I'm not shown half the evidence when I'm being asked to
    opt back in.
27. As a user, I want to opt a soft-excluded row back in by checking it, so that
    Horizon's guess is a default and not a verdict.
28. As a user, I want the badge count and the exclusion decision to always agree,
    so that a row is never counted for a reason it never shows me.
29. As a user, I want a row that carries both a soft flag and a blank description
    to be dimmed with no error state, so that the row Horizon has already set
    aside doesn't demand work from me.
30. As a user who checks that row back in, I want its error state to appear at
    that moment, so that including it is what makes it my problem.
31. As a user whose import is rejected by the server, I want a readable message
    rather than "Failed to import statement", so that I learn something.
32. As a user whose import is rejected for a specific row, I want that row
    highlighted in the table with the same error state as a client-detected
    blocker, so that there's one way to fix things, not two.
33. As a user, I want the server's complaint attributed to the _correct_ row, so
    that Horizon never confidently blames an innocent one.
34. As a user, I want a server error that belongs to no particular row (a bad
    account, a malformed mapping) to still show me a readable message, so that
    there's always a floor.
35. As a user, I want to see "3 rows couldn't be read — check your column
    mapping" when the parser dropped rows, so that rows are never silently lost.
36. As a user, I want to see the raw date and amount text from up to five
    rejected rows, so that I can see _why_ they failed and diagnose the mapping.
37. As a user whose file rejected 200 of 200 rows, I want to understand that my
    mapping is wrong rather than that my bank export is corrupt, so that I go
    back one step instead of giving up.
38. As a user, I want the rejected-rows note to _not_ block my import, so that a
    junk row at the bottom of the file doesn't gate the 199 good ones.
39. As a user, I want "rows need a description" and "rows couldn't be read" to
    stay separate messages, so that a problem I fix here isn't confused with one
    I fix a step back.
40. As a user, I don't want rejected rows appearing in the review table, so that
    I'm never shown a date or amount that Horizon invented.
41. As a user who changes the column mapping in step 2, I want the previewed rows
    to actually be re-mapped, so that the step means what it says.
42. As a user, I want my corrected mapping remembered for the next import of the
    same bank _and_ applied to this one, so that the two stop disagreeing.
43. As a user editing a mapping dropdown, I want the re-preview to settle without
    flicker as I make several changes, so that the step feels responsive.
44. As a user, I want my inclusion and description edits to be re-derived from
    the freshly mapped rows after a mapping change, so that stale state never
    commits.
45. As a user, I do not want my description edit to silently change the row's
    category, so that typing in one field never mutates another.
46. As a user, I want the category to stay explicitly mine to set, so that the
    importer stays predictable.
47. As a user, I don't want to edit the date or amount, so that I'm never invited
    to re-type what the parser correctly read.
48. As a user with a clean statement and no blocked rows, I want no pill, no
    filter, and no rejected note, so that the happy path stays quiet.
49. As a user, I want the review step's existing footnote about duplicates and
    recurring rows to stay accurate, so that the explanation matches the
    behaviour.
50. As a developer, I want every reason a row needs attention — soft or hard,
    client-derived or server-detected — to funnel into one array per row and one
    rendering path, so that a counted-but-never-rendered flag becomes
    structurally impossible.

## Implementation Decisions

### Row model — two arrays, not booleans

`ReviewRow` gains two independent arrays:

- `flags: RowFlag[]` — soft reasons the row is pre-excluded: `duplicate`,
  `recurring`, `pending`. The user may opt back in.
- `blockers: RowBlocker[]` — hard reasons the row cannot commit. Today exactly
  one member, `description`.

`RowBlocker` is an **open set**, not a named boolean. This isn't
future-proofing: the row already carries three orthogonal soft flags rendered by
a hand-maintained ternary that **silently never renders `pending`** — a live bug
this PRD kills. A flat boolean would recreate exactly that drift on the hard
side. `flags` drives **both** the pre-uncheck and the badges from one source, so
counted-but-not-rendered stops being possible.

The colour rule, the pill, and the commit gate only ever ask
`blockers.length > 0`.

`reviewRows.ts` exposes `flagsFor`, `blockersFor`, `buildReviewRows`, and
`canCommit`. `included = flagsFor(row).length === 0`.

### The commit gate

`rows.every(r => !r.included || r.blockers.length === 0)` — **included rows
only**. This is what makes unchecking a real exit rather than a trick. It
composes with the existing `summary.included === 0` disable: same button, one
more reason it's off.

### Blockers are client-derived

`blockersFor` is pure over the row's _current_ values and recomputes live on
edit. A server stamp would be stale from the first keystroke, leaving two
mechanisms racing to describe one row.

**Accepted drift:** the validity rule now lives in both `blockersFor` (client)
and `ImportRowSchema` (server). This is not resolved by moving the rule — it's
resolved by making the server's rejection legible. The client rule is a fast
local guess that keeps the user out of dead ends; the schema remains the sole
authority on what commits.

### Two orthogonal visual channels

| Row state            | Opacity | Description cell                                 |
| -------------------- | ------- | ------------------------------------------------ |
| included, valid      | `1`     | plain input                                      |
| included, blocked    | `1`     | error border + `Add a description` + left accent |
| excluded (soft/user) | `0.55`  | plain input                                      |

Opacity encodes _inclusion_. The description cell's error state encodes
_blocked-and-included_. They compose with no special-casing.

Rejected alternatives: a full-row error tint (categorises without explaining,
needs a legend, fails colour-blindness); an info icon with a tooltip (hides the
explanation behind a hover — a dead end wearing a friendlier hat).

### Error contract and issue attribution

`POST /imports` answers a validation failure with **both** fields:

- `error` — a readable string. The floor, never the ceiling.
- `issues` — the structured Zod issues.

A new pure module owns attribution: given the issues and the ordered list of
committed row ids, it returns the blockers per row id plus any unattributed
issue text.

**The critical subtlety:** `issue.path` is `["rows", n, field]` where `n` indexes
the **filtered commit payload**, not the wizard's `rows` state. The commit sends
`rows.filter(r => r.included)`, so payload index 3 may be row 40 on screen.
Reading `rows[3]` would blame an innocent row — worse than today's bug, because
it's confidently wrong. The commit path holds the filtered array and maps index →
row id through it. Issues whose path isn't `["rows", n, field]` (bad
`accountId`, malformed `mapping`) have no row to attach to and fall through to
the `error` floor.

### Rejected samples

`MappedRows.rejected` changes from `number` to `{ count, samples }`, where
samples are the first five **raw, unparsed** date/amount cell strings. Capped
because a fully-wrong mapping rejects all 10,000 rows and none of that belongs in
the payload. `mapStatementRows` already holds the record at the moment it
rejects, so retaining the first five is a couple of lines, not a second pass.
`PreviewSummary.rejected` changes shape in lockstep on both sides of the API.

Rejected rows are **not editable and never enter the review table** — there is no
parsed date or amount to show, and fabricating one is the placeholder this
feature rules out. They render as a note under the review summary.

The two summary messages stay distinct and must not be merged: _"2 rows need a
description"_ (fixable here, gates the commit) versus _"3 rows couldn't be read —
check your column mapping"_ (fixable at step 2, does not gate).

### Mapping override

The preview builder gains an optional `mappingOverride`; precedence becomes
`override ?? remembered ?? detected`. `POST /imports/preview` reads an optional
`mapping` field off the multipart body. The wizard hook re-fetches the preview
(debounced ~300ms) when the mapping changes, and rebuilds rows from the result.

This is **not new scope** — the log-19 sequence diagram already specifies
`POST /imports/preview (multipart: file bytes + accountId + mapping?)`. The
override was designed there and never implemented; this completes it. It ships
with the rejected-rows note because the note's advice is only true once the
override works.

### Delivery phases

1. **Repair the dead end** — `blockersFor` + `blockers`; description as an
   editable input with the error state; `canCommit` gating the button. A
   blank-description statement imports after the user types one. No pill, no
   filter, no server change. Proves explain-and-fix in place.
2. **Tell the truth on failure** — `{ error, issues }` from the route;
   attribution through the filtered payload; server-detected problems land as
   blockers in phase 1's UI.
3. **Navigation at year scale** — the pill with count + jump; the "Needs
   attention" filter. This is the reported pain, and it lands once there is
   something to navigate _to_.
4. **Flags array + all badges** — `flagsFor` → `flags`; render every applicable
   badge; `pending` finally gets one. Grid widths.
5. **Honesty about dropped rows + mapping override** — rejected samples with the
   step-2 note; the override through route + engine + debounced refetch.

### Known cost

The Flag column widens from 72px to ~110px to fit multiple badges, absorbed from
the description column's flexible width. If it's tight at the 774px modal width,
the fallback is icon+count — never hiding flags.

## Testing Decisions

A good test here asserts **external behaviour only**: what a function returns for
a given input, never how it got there. No test should know that `blockers` is
computed by a helper called `blockersFor` rather than inline, or that
attribution walks the array rather than building a map. If a test would fail on a
pure refactor that preserves behaviour, it's testing the wrong thing.

Tests are scoped to the **four pure modules**. Each is deep — real logic behind a
small interface — and each is where a bug would actually hurt:

1. **The review-row model** — `flagsFor` / `blockersFor` / `buildReviewRows` /
   `canCommit`. Covers: a blank description yields a `description` blocker; a
   whitespace-only description does too; a filled one yields none; each soft flag
   individually and in combination excludes the row; a row with both a flag and a
   blank description is excluded; and — the load-bearing case — `canCommit` is
   true when an _excluded_ row is blocked and false when an _included_ one is.
   Prior art: `reviewRows.test.ts` (same file, existing table-style fixtures).

2. **Issue attribution** — the filtered-index trap gets an explicit, named test:
   given a payload built from rows 40 and 41 of a 50-row table, an issue at path
   `["rows", 0, "description"]` must attribute to row 40's id and **never** to
   `rows[0]`. Plus: multiple issues on one row; an issue with a non-row path
   falls to `unattributed`; a malformed or out-of-range path is ignored rather
   than throwing. No prior art — new module, new test file.

3. **`mapStatementRows` rejected samples** — the count still matches today's
   behaviour; samples carry the **raw** cell text exactly as it appeared, never a
   parsed or fabricated value; samples cap at five while the count keeps climbing
   past it; zero rejections yields an empty sample list; an empty-date record is
   still skipped silently and does **not** appear as a sample. Prior art:
   `detectStatement.test.ts`, which already isolates this exact seam with
   synthetic `DetectedStatement` fixtures and no bank file.

4. **Preview mapping precedence** — override beats remembered; remembered beats
   detected; no override falls back to today's behaviour unchanged; and an
   override actually changes which columns the emitted rows are read from. Prior
   art: `buildPreview.test.ts`, which already injects `getRememberedPreset`.

The route, the wizard hook, and the wizard component are **not** given new tests
in this PRD. The route's contract change is thin and its behaviour is covered
transitively by the attribution tests; the hook and component are integration
surfaces whose existing suites (`useImportWizard.test.ts`,
`ImportWizard.test.tsx`) must keep passing — a regression there is a signal, and
extending them is a judgement call for the build, not a requirement of this PRD.

## Out of Scope

- **Relaxing `ImportRowSchema`, or inventing placeholder descriptions.** The
  explicit constraint this feature is built around. The schema stays; it becomes
  actionable.
- **Editable date and amount.** They cannot be blank by construction — dateless
  records are dropped, unparseable ones are rejected before review. Editing them
  invites re-typing what the parser correctly read, which is data invention.
- **Auto-recategorizing on description edit.** Tempting (type `REWE` → Food), but
  silently mutating a second field while the user types in the first is exactly
  the magic that erodes trust in an importer.
- **Rejected rows as editable table entries.** They have no parsed date or amount
  to render; fabricating one is the ruled-out placeholder.
- **Row virtualization.** A 1,200-row table rendering an input plus a
  `CategorySelect` per row is already heavy today, and this adds a second input.
  The "Needs attention" filter blunts it in practice. Virtualization belongs to
  **Performance + UX Polish** (1.2.0), the next roadmap item.
- **Server-stamped blockers.** Rejected in favour of client-derived; see
  Implementation Decisions.
- **New detection heuristics.** Duplicate, recurring, and pending detection are
  unchanged — this feature changes how their results are _rendered_, not how
  they're computed.

## Further Notes

**This feature is language work as much as UI work.** Three states are routinely
confused and the distinction _is_ the feature:

- **Rejected** — dropped at parse; never reaches the review step; fixed at Map
  columns.
- **Soft exclusion** — in the table, unchecked, dimmed; the user may opt back in;
  nothing is wrong with it.
- **Hard blocker** — in the table, **checked**, full opacity, gating the commit;
  fixed in place or unchecked.

Never call a blocked row "rejected": a rejected row cannot be repaired in the
review step, and a hard blocker cannot be repaired anywhere else. Likewise
"flag" is soft-only — a blocker is never a flag, and the table's "Flag" column
renders flags exclusively. See `docs/ubiquitous-language.md`, "Import Review
Repair", which carries the full term set and the flagged ambiguities.

**Two live bugs die here as a side effect.** `pending` rows are counted by
`summarizeReview` and rendered by nothing — the Flag column's ternary handles
only `duplicate` and `recurring`, and the summary bar shows only those two. And
`summary.rejected` is computed in the engine, threaded through the API, typed on
the client, and referenced by no component. Both are the same class of failure:
a value counted in one place and rendered in another, kept in sync by hand. The
flags array fixes the first by construction.

**Design log:** `docs/design-logs/26-import-review-repair.md` carries the full
question-by-question rationale, including the rejected alternatives for each of
the 13 decisions.
