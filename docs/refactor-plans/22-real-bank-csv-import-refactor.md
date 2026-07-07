# 22 — Real Bank CSV Import refactor

## Problem Statement

The **Real Bank CSV Import** epic (design log 21, issues #152–#154) shipped the
four real German-bank presets and hardened the parser end-to-end. It works. But
it was built TDD-first, replacing the guessed presets in place, and reading the
shipped code as a whole, seven things grate — five in the parse engine, two in
the Import wizard UI.

**Parse engine (`server/src/lib/csvImport/`):**

1. **`detectEncoding` is now dead in production.** `parse.ts` still exports the
   old BOM-or-Windows-1252 guesser, the barrel re-exports it, and unit tests
   cover it — but the real detection path replaced it with a `hasUtf8Bom` check
   plus a signature-driven encoding retry that lives in the statement-detection
   module. `detectEncoding` is never called by production code, and the UTF-8 BOM
   byte constant is now duplicated in two files. This is the exact shape of the
   dead `detectBank` path the #20 refactor deleted.

2. **`preset.columns` is dead data that four hand-maintained arrays must keep in
   sync.** Production parsing derives the columns from the file's actual header
   row (de-duplicated); it never reads `preset.columns`. The field survives only
   because two tests assert the parsed columns _equal_ it. For the Postbank
   credit-card preset, someone had to hand-write the de-duplicated `Betrag (2)`
   name into the array to mirror what the de-dupe step produces at runtime — a
   manual duplicate of ground truth that can silently drift from the fixtures.

3. **Module naming no longer says what each file does.** "Detection" is split
   across two files with misleading names: one module is _duplicate/recurring_
   detection (row-level, against the account's history), while _statement/bank_
   detection lives in a file named after the _preview_ — and the actual preview
   orchestrator is a **different** file. The trio reads as three near-synonyms and
   none of the names match its responsibility.

4. **Duplicated row-record building.** The "map each record's cells to the header
   column names" loop is copy-pasted between the known-bank parser and the
   generic fallback.

5. **The generic fallback skips the header de-duplication the known-bank path
   does.** An unknown bank that ships two identically-named columns would collide
   one cell onto the other in the generic path, where the known-bank path handles
   it correctly. Divergent behaviour between two code paths that should parse a
   header the same way.

**Import wizard UI (`src/features/import/ImportWizard/`):**

6. **A long filename overruns the format badge on the Account step.** The file
   card is a flex row `[glyph] [file info] [format badge]`; the filename element
   carries no truncation rule, so a long bank export name (e.g.
   `Postbank-Kontoumsaetze_398_7774714_00_20260707_151130.csv`) overflows its box
   and paints over the "…format" badge. It is a missing-truncation bug, not a
   sizing bug — any width can be overrun by a longer name.

7. **The review-step list is cramped.** The review body is capped at a fixed
   ~320px (≈5–6 rows) and scrolls internally, leaving most of the modal's height
   budget unused, so editing a row's category means scrolling a small window.

## Solution

A behaviour-preserving cleanup pass sequenced zero-risk deletions → parsing
consistency → mechanical renames → isolated UI fixes, each step leaving the suite
green:

- **Delete** the dead `detectEncoding` path and its duplicated BOM constant; the
  signature-driven retry in the statement-detection module is the single source
  of encoding truth.
- **Remove** the unused `columns` field from the bank preset shape and re-point
  the two tests that pinned it to assert against the real fixture header literal
  (ground truth) instead of a mirror field.
- **Extract** one shared record-builder used by both the known-bank parser and
  the generic fallback, and bring the known-bank **header de-duplication** to the
  generic path so both parse a header identically.
- **Rename** the two mis-named engine modules so "flag rows against account
  history" and "detect the statement/bank + map its rows" say what they are, and
  the preview _orchestrator_ keeps its already-correct name. Export names are
  preserved, so the barrel and the route are untouched — a mechanical rename.
- **Fix** the two UI bugs: truncate the Account-step filename with an ellipsis
  plus a hover tooltip carrying the full name, and raise the review body to a
  viewport-responsive height so the list breathes while keeping the internal
  scroll as the safety valve for very long statements.

## Commits

Ordered low-risk → high-risk. Each commit compiles and leaves `npx vitest run`
green.

### Cluster A — delete dead code (no behaviour change)

1. **Remove `detectEncoding`.** Delete the function and its duplicated UTF-8 BOM
   constant from the low-level parse module, drop its re-export from the library
   barrel, and delete its unit tests. Confirm the statement-detection module's
   own BOM check + retry is the only encoding path left. Suite green: nothing in
   production referenced it.

2. **Drop the unused `columns` field from the bank preset.** Remove `columns`
   from the `BankPreset` interface and from the four preset literals. Re-point the
   two tests that asserted the _parsed_ columns equalled `preset.columns` to
   assert them against the real fixture header (a literal array, ground truth).
   This strengthens the tests — they now pin the parser to the actual export, not
   to a field that mirrored it.

### Cluster B — parsing consistency (one small behaviour add)

3. **Extract a shared record-builder.** Lift the copy-pasted "map each record's
   cells onto the header column names" loop into one small pure helper, and have
   both the known-bank parser and the generic fallback call it. Pure refactor, no
   behaviour change; existing fixture tests are the safety net.

4. **De-duplicate the generic fallback's header too.** Route the generic
   fallback's header through the same de-dupe the known-bank path uses, so an
   unknown bank with two identically-named columns addresses distinct cells.
   RED test first: a generic (unknown-signature) statement with a duplicate header
   column maps both cells rather than collapsing them. (Generic **encoding**
   stays Windows-1252 — see Out of Scope.)

### Cluster C — module renames (mechanical, isolated, export names preserved)

5. **Rename the row-flagging module.** The module holding duplicate/recurring
   detection (row-level matching against the account's existing and recurring
   transactions) is renamed to a name that says "flag rows against account
   history," freeing the word "detect" from its collision with statement
   detection. Update intra-library imports, the barrel, and the test file's
   import. Exported symbol names are unchanged.

6. **Rename the statement-detection module.** The module that locates the bank,
   chooses the encoding, and maps rows is renamed to say it detects the statement
   (not that it builds the preview — the orchestrator already owns that name).
   Update intra-library imports, the barrel, and the test files' imports;
   optionally rename the colocated test files to match. Exported symbol names are
   unchanged, so the imports route (which imports from the barrel) is untouched.

### Cluster D — Import wizard UI fixes (frontend, isolated)

7. **Truncate the Account-step filename.** Give the filename element the
   single-line ellipsis rule (its flex parent already allows it to shrink) and add
   a `title` attribute carrying the full filename so it is readable on hover. The
   rendered DOM text is unchanged, so existing wizard tests pass untouched.

8. **Give the review list room.** Raise the review body's max-height to a
   viewport-responsive value (`min(56vh, …)`) so a normal screen shows ~10–12 rows
   before scrolling; keep the internal vertical scroll as the safety valve for
   statements up to the row cap. CSS-only; the modal is already viewport-bounded,
   so it cannot overflow the screen.

## Decision Document

- **`detectEncoding` is deleted, not rewired.** The statement-detection module's
  signature-driven retry (BOM → UTF-8; otherwise decode under Windows-1252 and
  UTF-8 and keep whichever surfaces a cleanly-decoded known bank) is the
  production encoding authority. The old BOM-or-1252 guesser is strictly weaker
  and unreferenced — one encoding path wins by subtraction, as the #20 refactor
  did for `detectBank`.
- **`preset.columns` is removed; tests assert against the fixture header
  literal.** The parser's contract is "reproduce the export's real header
  (de-duplicated)," and the real header is the fixture. Pinning a preset field
  that merely mirrors that header adds a second thing to hand-maintain and a place
  for drift. The de-duplicated `Betrag (2)` name is a runtime product of parsing,
  not preset configuration.
- **The generic fallback adopts the shared record-builder and header de-dupe, but
  keeps its Windows-1252 decode.** Parsing a header row should be identical in
  both paths (dedupe + record-building are format-agnostic). Encoding **retry**,
  however, relies on the header signature as its "decoded correctly" oracle, and
  the generic path has no signature — so a generic encoding retry would be a
  guess. Design log 21 (Q7) already fixed the generic fallback at Windows-1252.
- **Module responsibilities and names.** After the renames the engine reads as:
  low-level parsing primitives (split, header de-dupe, amount/date parsing); a
  "detect the statement + map its rows" module (bank location, encoding choice,
  row mapping, parse caps, parse error); a "flag rows against account history"
  module (duplicate + recurring detection); and the preview **orchestrator** that
  composes them. Exact filenames are the implementer's call; the constraint is
  that each name matches its one responsibility and that exported symbol names do
  not change (so only intra-library imports, the barrel, and test imports move).
- **The two UI fixes are orthogonal to modal sizing.** The filename bug is fixed
  by truncation, not by widening the modal (a longer name overruns any width). The
  cramped list is fixed by raising the review body's own height cap, not the
  modal's — the modal already permits 90vh and the 320px body cap was the actual
  constraint. The step-3 modal width and the review row layout are left unchanged.
- **Modules touched:** the `csvImport` library (the low-level parse module, the
  statement-detection module, the row-flagging module, the bank-presets module,
  the barrel) and its test files; and the Import wizard's styles/component in the
  frontend. The imports route, the storage layer, the migration set, and the
  preview/commit API contracts are all untouched.
- **No contract change.** No API endpoint, request/response shape, stored-preset
  shape, or migration changes in this refactor.

## Testing Decisions

- **Good tests assert external behaviour, not internals.** The engine is already
  covered by fixture-driven tests that feed real (anonymized) bank bytes in and
  assert the detected bank, the de-duplicated columns, the mapped rows
  (signed-cents / ISO date), the duplicate/recurring/pending flags, and the
  summary counts. Those fixtures are the safety net for the extraction (commit 3)
  and both renames (commits 5–6), which change no behaviour.
- **New tests only where behaviour changes.** Commit 4 (generic header de-dupe) is
  a genuine behaviour addition and gets a RED test first: a generic,
  unknown-signature statement carrying a duplicate header column, asserting both
  cells are addressable rather than collapsed.
- **Re-pointed, not deleted, coverage.** The two assertions that pinned
  `preset.columns` are redirected to assert the parsed columns against the real
  fixture header literal — same guarantee, anchored to ground truth.
- **UI changes are CSS-only and verified by driving the app.** Truncation and the
  taller body are pure style changes (plus one `title` attribute); the rendered
  text nodes are unchanged, so the existing `ImportWizard` / `useImportWizard`
  behaviour tests continue to pass without edits. Visual confirmation is by
  running the desktop app and re-taking the Account-step and Review-step
  screenshots (note the local-run gotchas: API base must be `127.0.0.1` for CSP,
  and the `better-sqlite3` ABI rebuild dance between the dev server and Electron).
- **Prior art to mirror:** the fixture-driven engine tests (`csvImport.test.ts`,
  `detection.test.ts`, the per-format suites), the `buildPreview` unit tests, and
  the `reviewRows` pure-logic tests.
- **Run with `npx vitest run`** from the repo root (the `npm test` bin shim is
  broken on this box); occasional forks-pool worker timeouts re-run green.

## Out of Scope

- **Encoding retry for the generic fallback.** No header signature exists for an
  unknown bank, so a bad decode cannot be reliably detected there; the design log
  already fixes generic at Windows-1252. Only header **de-duplication** is brought
  to the generic path.
- **Rewriting `parseDate`.** The token-name-based date parser is guarded by the
  ISO-shape check in the try-wrapper and is covered by the single-digit,
  2-digit-year, and 4-digit-year fixtures. Left as-is.
- **Consolidating the per-format test files.** The per-bank test files stay as
  they are; this refactor only re-points imports where a module is renamed.
- **Widening the step-3 modal or redesigning the review row.** The chosen fix is
  the taller responsive review body only.
- **New bank presets, positional/header-less parsing, composite descriptions, and
  split debit/credit-column handling** — permanent non-goals carried over from
  design log 21.
- **Duplicate/recurring detection heuristics and the categorization keyword map**
  — behaviour unchanged; the row-flagging module only gets renamed.
- **The imports route, storage repos, migrations, and API contracts** — untouched.

## Further Notes

- Cluster D (UI) and Cluster C (renames) are independent of each other and of the
  engine cleanups; they can land in any order relative to A–B as long as each
  commit stays green.
- The one place this plan knowingly diverges from what was ticked during scoping
  is the generic-fallback **encoding** retry — dropped for the oracle reason above
  and documented so the developer can veto it on review.
- Worth a dev-journal entry on completion, in the "consistency pass" convention
  the journal already uses: the dead `detectEncoding` and the hand-synced
  `preset.columns` were latent drift risks, not just tidy-ups.
