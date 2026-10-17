# 35 — Import Category Learning Refactor

> Follows the Import Category Learning epic (PRD issue #257, slices #258–#263;
> design log 33). Picks up the convention drift the slices left behind, and
> takes over the epic's last slice, #264 (release notes, Build Status and
> close-out), so the epic closes from one issue. Solo session: the user asked
> for this plan to be worked out alone, with consistency of naming,
> conventions, patterns and architecture as the goal.

## Problem Statement

Import Category Learning works, and every slice is tested. Built slice by
slice, it also ended up with one defect, several copies of the same fact, and
domain rules in components.

**Approving a Category Proposal can teach the wrong category.** Approval
creates the category, moves the proposed rows into it and bumps `CATEGORIES`,
but it does not publish the new category to the cache the way inline-add does.
Until the refetch lands, each moved row's `CategorySelect` has a controlled
`value` its list does not hold yet. The picker falls back to the first
category, and its selection effect reports that category through `onChange`.
`setCategory` sees a real change, so `propagateCategory` marks the row
`chosen`. A probe test written for this plan reproduced it. With the GET after
the POST held in flight, the "Create category" flow committed the proposed
Dining row as `{ category: "Food", categorySource: "chosen" }` instead of
`{ category: "Dining", categorySource: "suggested" }`. That commit would
teach a Food Category Rule for the merchant, and propagation would move every
untouched row with the same Counterparty Key along with it. The existing tests
miss this because their fetch double answers the refetch at once. The epic is
not released yet (`docs/release-notes/next.md` still holds only Month Cash
Flow), so no user has hit it.

**Creating a category is written three times on the client.**

- `useCategoriesWithInlineAdd.addCategory` calls `fetch` on `/categories`
  itself, beside the `createCategory` request the feature's `categoriesApi`
  already holds. It also reads the error body by hand, without the fallback
  for a body that is not JSON.
- `useCategoryProposals.approve` calls `createCategory`, but reads the error
  body by hand a second time (`res.json().catch(...)`). It bumps the cache but
  does not publish, which is the defect above.
- `useCategoryManager.create` calls `createCategory` and reads the error
  through `readErrorMessage`, the shared helper the categories API re-exports
  for exactly this.

**One Category Rule has three names on the server.** The storage layer's
`CategoryRuleInput` (`counterpartyKey`, `category`) is declared again in the
csvImport lib as `DerivedCategoryRule` (what `deriveCategoryRules` returns)
and as `PreviewCategoryRule` (what `buildPreview` takes). The lib already
imports `Category`, `Transaction` and `StoredImportPreset` from the storage
types, so the copies are not there to keep a boundary.

**The preview row declares its category fields twice.** `CategorizedRow`
(`category`, `categorySource`, `proposedCategory?`) is what `categorizeRow`
returns. `PreviewRow` declares the same three fields again, each with its own
doc comment. `buildPreview` then takes the result apart field by field and
rebuilds it, including the conditional spread that `categorizeRow` already
handles by leaving `proposedCategory` out.

**The dangling-rule skip runs twice.** `buildPreview` drops every Category Rule
whose category no longer exists before it builds the context.
`categorizeRow` then checks the same thing again for every row. Its context
doc says "existing categories only", which contradicts its own check.

**Import code shortens "Category Rule" to "rule".** The glossary is explicit:
"Always qualify it: say **Category Rule**, never 'rule' alone, in import code
and docs". The context field `CategorizeContext.rules`, the comments in
`categorizeRow`, `buildPreview` and `deriveCategoryRules`, and the commit
route's comment all say "rule". `#264` lists this check as an acceptance
criterion.

**The review rows' category rules are spread across three modules.**

- `reviewRows` owns the row model, flags, blockers and `propagateCategory`.
- `useCategoryProposals` holds pure row transforms of its own:
  - the proposal count;
  - "move the still-proposed rows";
  - "return them to Miscellaneous";
  - a private `FALLBACK_CATEGORY`;
  - `withoutProposal`, which deletes the field.
- `propagateCategory` drops a proposal a second way, by setting
  `proposedCategory: undefined`.
- ReviewTable holds the Category Source chip rule (`SOURCE_CHIP`,
  `sourceChip`), and calls it twice per row.

CLAUDE.md keeps business logic out of components, and refactors 32–34 moved
rules like these into feature modules (`paydownBridge`, `fixedFlows`).

**The proposal strip is built inline in ImportWizard.** ImportWizard is 549
lines. ReviewTable already sits beside it as a sub-component with its own
styles, but the strip's JSX and four styled components live inside the wizard
and its stylesheet. The strip also swallows a rejection
(`approveProposal(...).catch(() => undefined)`) that `approve` raises only
after it has already stored the error on the proposal.

**The wire types live in the review model.** `importTypes` says it holds "what
crosses the loopback API", yet it imports `ParsedImportRow` and, since the
epic, `CategorySource` from `reviewRows`. That inverts the dependency: the
preview payload's types depend on the module that decorates them.

**ImportView reads the inline-add hook to list categories.** It only needs the
list it passes to the wizard. `useCategories` is the read-only hook, and both
hooks now read the same `CATEGORIES` cache.

**The epic's close-out (#264) is still open.**

- The User Manual Import topic does not mention Same-Counterparty Propagation.
- The release notes have no Import Category Learning section.
- The glossary still points at `categorize.ts`.
- The glossary's **Category Reassignment** definition still lists only
  Transactions and RecurringTransactions.
- CLAUDE.md and README show the epic as planned.

## Solution

Four parts. The neutral moves come first, and every commit leaves the suite
green. There is one behaviour change, behind its own failing test: approving a
Category Proposal publishes the new category before it moves the rows, so the
rows stay `suggested` in it.

**Server.**

- The csvImport lib reads the storage layer's `CategoryRuleInput`.
- `PreviewRow` extends `CategorizedRow`.
- `categorizeRow` alone skips a dangling Category Rule.
- Import code says "Category Rule".

**Client: one create path.**

- A new `useCreateCategory` hook in the categories feature POSTs through
  `createCategory`, reads failures through `readErrorMessage`, and publishes
  the created category to `CATEGORIES` before it bumps the key.
- Inline-add and proposal approval both read it.
- ImportView reads `useCategories`.

**Client: review-row rules in `reviewRows`.**

- The wire types move to `importTypes`.
- `reviewRows` gains the proposal transforms, the fallback category and the
  Category Source chip rule.
- A new `CategoryProposalStrip` component takes the strip out of ImportWizard.

**Docs and close-out (from #264).**

- Update the manual, the release notes, the glossary, the dev journal and the
  Build Status.
- The user confirms the three demos on a real build.
- Close #257.

## Commits

### Part A — Server: one Category Rule shape

**A1. The csvImport lib reads `CategoryRuleInput`.**
`deriveCategoryRules` returns `CategoryRuleInput[]`, and
`BuildPreviewInput.categoryRules` takes `CategoryRuleInput[]`, both imported
from the storage types. `DerivedCategoryRule` and `PreviewCategoryRule` go.
Types only. No suite is edited.

**A2. `PreviewRow` extends `CategorizedRow`.**
`PreviewRow extends MappedRow, CategorizedRow` and drops its own `category`,
`categorySource` and `proposedCategory` declarations. The doc comments stay on
`CategorizedRow`. `buildPreview` spreads `categorizeRow(row, context)` into
the row instead of rebuilding it. `categorizeRow` never returns
`proposedCategory: undefined`, so no row gains a key. The buildPreview, route
and csvImport suites stay green unedited.

**A3. `categorizeRow` alone skips a dangling Category Rule.**
`buildPreview` passes every stored Category Rule into the context. Its
`existing` set and filter go. `CategorizeContext`'s doc says that a Category
Rule whose category no longer exists is skipped, which is what
`categorizeRow` already does. The #261 dangling-rule cases in the buildPreview
and categorizeRow suites stay green unedited. This is the defensive skip
log 33 Q8 asks for, now in one place.

**A4. Import code says "Category Rule".**

- `CategorizeContext.rules` becomes `categoryRules`.
- The comments in `categorizeRow`, `buildPreview`, `deriveCategoryRules` and
  the commit route say "Category Rule" wherever they say "rule".
- The `MappedRow.counterparty` and `mapStatementRows` doc comments, which the
  epic left wrapped mid-sentence and past the line width, are re-wrapped.

This is a rename commit, so the only test edits allowed are the context field
name in the categorizeRow suite.

### Part B — Client: one create path

**B1. RED: approving a proposal keeps its rows while the category list
refetches.**
An ImportWizard case whose categories double holds the GET after the POST in
flight. It approves the Dining proposal, waits until the strip is gone, and
commits. The assertion is that the proposed rows commit as
`{ category: "Dining", categorySource: "suggested" }`. Add a second
assertion: the propagation the bad pick would cause is absent, so a
same-Counterparty-Key row the user never touched is not `chosen`. Fails today
with Food and `chosen`. Commit as `test:`.

**B2. Add `useCreateCategory`.**
A categories feature hook in its own folder. It returns
`create(body: { name; color? })`, which resolves to
`{ ok: true; category } | { ok: false; error }`. This is the result shape
`useCategoryManager.create` already uses.

- It POSTs through `createCategory`.
- On failure it reads the message with `readErrorMessage(res, "Failed to
create category")`.
- On success it publishes the created category to every `CATEGORIES` reader
  with `setData`, then bumps `CATEGORIES` so the server's list reconciles it.
- `withAdded` moves here from the inline-add hook and is exported.

Tests:

- the request body, with and without a colour;
- a `useCategories` reader sees the category before any refetch answers;
- the bump;
- the server's `error` message;
- the fallback message when the body is not JSON.

Prior art is the inline-add suite and `useOptimisticCommit`. No consumer yet.

**B3. `useCategoriesWithInlineAdd` reads `useCreateCategory`.**
Its raw `fetch`, its hand-rolled error read and its own `setData` / `bump`
go. `addCategory` keeps its contract: on failure it sets `addError` and
throws, and on success it auto-selects the new category. It also keeps its
local `added` list. The inline-add, CategorySelect, TransactionCreateModal and
RecurringTransactionModal suites stay green unedited.

**B4. `useCategoryProposals.approve` reads `useCreateCategory`.**
The created category reaches every picker in the same update that moves the
rows, so B1 goes green. The hand-rolled error read goes. `approve` now
resolves on failure as well as on success: the error is on the proposal,
which is where the strip reads it. The suite's one failure case already
tolerates both (`.catch(() => undefined)`), so it stays green unedited.

**B5. ImportView reads `useCategories`.**
It passes the list to the wizard and needs nothing else from the inline-add
hook. Both read the same cache, so the ImportView and ImportWizard suites stay
green unedited.

### Part C — Client: review-row rules in `reviewRows`

**C1. The preview wire types move to `importTypes`.**
`CategorySource` and `ParsedImportRow` move from `reviewRows` to
`importTypes`. `reviewRows` imports them, and the feature barrel re-exports
`ParsedImportRow` from `importTypes`. After this commit `importTypes` imports
nothing from the review model. This is a move commit, so the only test edits
allowed are import paths.

**C2. Add the proposal transforms to `reviewRows`.**

- `FALLBACK_CATEGORY`: the client's name for the server's Miscellaneous
  fallback, used by the import feature.
- `withoutProposal(row)`: the one way to drop a Category Proposal, by deleting
  the field.
- `proposalsFor(rows)`: one `{ name, count }` per proposed category, in
  first-row order.
- `approveProposal(rows, name, category)`: moves the still-proposed rows to
  `category` as `suggested`.
- `dismissProposal(rows, name)`: returns them to `FALLBACK_CATEGORY` as
  `unmatched`.

`propagateCategory` reads `withoutProposal` instead of setting
`proposedCategory: undefined`. Test each transform. Cover these cases:

- a proposed row the user already changed, which neither transform touches;
- two proposals in one statement;
- a proposal whose rows are all gone.

Prior art is the existing `propagateCategory` and `summarizeReview` cases.
The reviewRows suite's propagation cases stay green unedited.

**C3. `useCategoryProposals` reads the `reviewRows` transforms.**
Its private `FALLBACK_CATEGORY`, `isProposedAs` and `withoutProposal` go, and
so does its counting loop. The hook keeps the I/O, the per-proposal errors and
the declined list. The suite stays green unedited.

**C4. Add `categorySourceChip` to `reviewRows`.**
`categorySourceChip(row)` gives the chip text for the row, or `undefined` for
no chip:

| Category Source | Chip          |
| --------------- | ------------- |
| `learned`       | "Learned"     |
| `suggested`     | "Suggested"   |
| `proposed`      | "New: {name}" |
| `chosen`        | none          |
| `unmatched`     | none          |

A `proposed` row with no name also gets no chip. Test each source. No consumer
yet.

**C5. ReviewTable reads `categorySourceChip`.**
`SOURCE_CHIP` and `sourceChip` go. The chip is computed once per row. The
ReviewTable and ImportWizard suites stay green unedited.

**C6. Add the `CategoryProposalStrip` component.**
It lives at `ImportWizard/CategoryProposalStrip/`, beside ReviewTable, with
its `.tsx`, `.styles.ts` and `.test.tsx`. It takes one `CategoryProposal`
plus `onCreate` and `onDismiss`. It renders:

- "New category: {name} · {n} rows";
- the Dismiss and Create category buttons;
- the error as an alert.

The four `StyledProposal…` components move into its stylesheet. Test:

- the name and the pluralized count;
- that each button calls its handler;
- the alert appears only when there is an error.

Prior art is ReviewTable's suite. No consumer yet.

**C7. ImportWizard reads `CategoryProposalStrip`.**
The inline strip JSX, its four style imports and the `.catch(() =>
undefined)` go. After B4, `approve` no longer rejects. The ImportWizard suite
stays green unedited.

### Part D — Docs and close-out (takes over #264)

**D1. User Manual Import topic.**
The Step 3 and "New categories Horizon proposes" rows, which slices #258–#263
each wrote a piece of, are read as one topic. Make three changes:

- Add Same-Counterparty Propagation: one correction moves every row from the
  same payee that the user has not touched, and the whole group teaches the
  Category Rule on commit.
- Check every sentence against shipped behaviour.
- Add a manualContent case for the propagation copy, the way #262's slice
  covered proposals.

**D2. Release notes.**
`docs/release-notes/next.md` gains an **Import Category Learning** section
that describes the feature. It also carries three notes from #264:

- Learning starts from the next commit. Imports already committed are not
  re-categorized.
- Dismissing a proposal is permanent. Creating the category by hand in
  Category Management is the way back.
- A shared counterparty (PayPal, Amazon Payments) learns one category for
  every merchant behind it. The user corrects it per row, and the majority
  wins.

B1's defect never shipped, so it gets no note.

**D3. Glossary.**

- The **Default Category** row names `categorizeRow.ts`, not `categorize.ts`.
- The **Category Reassignment** definition says it also moves Category Rules.
  The Import Category Learning relationships already say so.
- **Category Proposal** names `CategoryProposalStrip`, and **Category Source**
  names `categorySourceChip`.
- Check that every shipped name matches the glossary: `categorizeRow`,
  `deriveCategoryRules`, `counterpartyKey`, `KEYWORD_GROUPS`,
  `CategoryRulesRepo`, `useCategoryProposals`, `nextFreeCategoryColor`.

**D4. Dev journal.**
Add an entry for this refactor. Record:

- the approval defect, found while reading the code for this plan, with the
  probe's Food / `chosen` result;
- where the plan met code that had moved on;
- the follow-ups under Out of Scope.

**D5. Build Status.**

- CLAUDE.md ticks Import Category Learning and rewrites its entry to what
  shipped, the way the Month Cash Flow entry does:
  - Category Rules learned at commit;
  - Keyword Groups with Suggested;
  - Category Proposals;
  - Same-Counterparty Propagation;
  - no rule editor.
- README's status table reads ✅ Complete.

**D6. HITL: the three demos, then close the epic.**
On a real build, the user confirms:

- a second import of a statement arrives mostly categorized;
- on an untouched install, a first import is partly categorized;
- ten same-counterparty rows need one correction, and the commit teaches the
  Category Rule.

Then close the PRD issue #257 and this issue.

## Decision Document

- **One Category Rule shape.** The storage layer's `CategoryRuleInput` is the
  shape. The csvImport lib reads it, as it already reads `Category` and
  `Transaction`, so no lib-local copies are needed.
- **`categorizeRow` owns the whole precedence**, including the dangling-rule
  skip. `buildPreview` assembles the context and does no categorizing of its
  own.
- **"Category Rule", never "rule", in import code.** This includes identifiers
  as well as comments, which is why the context field is renamed.
  "Recurring rule" elsewhere is unaffected.
- **One create path on the client: `useCreateCategory`.**
  - Every create that the open pickers must see goes through it: inline-add
    and proposal approval.
  - It always publishes before it bumps, which is how inline-add already kept
    every picker in step.
  - Its result is the `{ ok, … }` union `useCategoryManager` already returns.
- **The Category Manager keeps its own list.** `useCategoryManager` does not
  read `CATEGORIES` today, and moving it onto the cache is its own change (see
  Out of Scope).
- **Fix at the publish, not in the picker.** The defect goes away once the
  list holds the controlled value before the rows move. `CategorySelect`'s
  selection effect, which reports the first category when the value is
  missing, is left alone. It serves two other consumers that rely on it.
- **`reviewRows` is the review model.** Every pure rule over review rows lives
  there:
  - flags and blockers;
  - propagation;
  - proposals;
  - the source chip;
  - the fallback name.

  Hooks keep I/O and wizard state. Components render.

- **`importTypes` holds the wire types.** `ParsedImportRow` and
  `CategorySource` describe the preview payload, so they live with the other
  preview types. `reviewRows` depends on `importTypes`, never the reverse.
- **`approve` never rejects.** Its failure is state: the error on the
  proposal. It is not an exception the caller must remember to swallow.
- **`CategoryProposalStrip` is a sub-component of ImportWizard**, beside
  ReviewTable. It renders one Category Proposal and knows only what the strip
  needs.
- **#264 is folded in.** Its docs work is Part D, and its HITL demos are D6.
  #264 is closed as merged into this issue.
- **No schema, storage, migration or API change.** The preview and commit
  payloads keep their shape.

## Testing Decisions

A good test here asserts what a caller or a user can observe: a returned row,
a committed payload, a rendered chip or strip, a request body, a value a cache
reader sees. It never asserts how a module arranges itself internally.

- **Extraction commits do not edit existing tests.** These commits each move
  logic behind an existing, observable suite: A1, A2, A3, B3, B4, B5, C3, C5
  and C7. Those suites passing _unedited_ is the evidence that the move was
  faithful. The allowed test edits are:
  - the context field name, in the rename commit A4;
  - import paths, in the move commit C1;
  - the new manualContent case, in D1.
- **The behaviour change gets its failing-test commit first.** That is B1,
  committed as `test:`, which the `commit-msg` hook typechecks against shipping
  code only.
- **B1 holds the refetch in flight.** The existing proposal tests answer every
  GET at once, which is why the defect went unseen. B1's double answers the
  first GET and never answers the one after the POST. That is the window a
  real refetch opens.
- **New modules under test:**
  - `useCreateCategory`
  - `proposalsFor`, `approveProposal`, `dismissProposal`, `withoutProposal`
    and `categorySourceChip`
  - `CategoryProposalStrip`
- **Prior art:**
  - `useCategoriesWithInlineAdd` and `useOptimisticCommit`, for B2;
  - `propagateCategory` and `summarizeReview`, for C2 and C4;
  - ReviewTable, for C6;
  - #262's manualContent case, for D1.
- **Coverage is already good.** Every module the epic touched has co-located
  tests, and the epic added about 4,000 lines of them. This plan adds no
  backfill beyond the new modules and B1.

## Out of Scope

- **`CategorySelect`'s selection effect.** It reports the first category
  whenever the selected id resolves away from the value. Making a controlled
  picker stay silent until its value is in the list would close the class of
  defect, not just this instance. It changes the contract
  TransactionCreateModal and RecurringTransactionModal rely on, so it is its
  own change.
- **The Category Manager on the cache.** `useCategoryManager` keeps a local
  list and neither publishes nor bumps `CATEGORIES`. A category created or
  renamed there reaches open pickers only on their next fetch. That predates
  the epic.
- **CategoryManagerModal's `MISCELLANEOUS` literal.** It is the categories
  feature's own reassign default. Sharing one client constant across two
  features would mean a cross-feature import for one string.
- **The zod `categorySource` enum.** It spells the five sources inline, like
  `FrequencyEnum` and `AccountKindEnum` in the other route schemas. Deriving
  route enums from domain types is a codebase-wide convention, not this
  epic's to change.
- **Atomicity of the Import Commit's writes.** `imports.create`,
  `importPresets.upsert`, `categoryRules.learn` and `categoryRules.decline`
  are separate writes, following the `importPresets.upsert` precedent.
- **Tuning `KEYWORD_GROUPS` and `COUNTERPARTY_KEY_TOKENS`.** That is a live-use
  matter, logged under a Live-Use Repair round if it comes up.
- **Cross-feature deep imports** (`../../categories/categoriesApi/…`). The
  codebase does the same elsewhere. Refactor 34 left this convention alone.
- **Anything log 33 deferred:**
  - a Category Rules list or editor
  - un-declining a proposal from a UI
  - learning from non-import edits
  - re-categorizing past imports
  - prefix or fuzzy matching
  - any AI
- **Still open from refactors 32–34:**
  - `linkedSince`'s UTC "today"
  - the `isoDaysFromToday` midnight flake
  - the reports route's run-start choice
  - the client's month arithmetic
  - the rest of refactor 34's follow-ups

## Further Notes

- **The approval defect was found while reading the code for this plan, not in
  live use.** It needs two things together: the controlled `value` that #259
  added, and approval that bumps without publishing (#262). Neither slice's
  tests could see it, because their fetch doubles answer at once. It is in
  scope because the consistency move is the fix: one create path that
  publishes before it bumps, read by every create the pickers must see.
- **Order matters in five places:**
  - B1 comes before B4.
  - B2 comes before B3 and B4.
  - B4 comes before C7, because the strip stops swallowing a rejection only
    once `approve` has none.
  - C1 comes before C2, and C2 before C3 and C4.
  - Every other part comes before D6.

  Everything else is independent and can be reordered.
