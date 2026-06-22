# 20 — Bank Statement Import refactor

## Problem Statement

The Bank Statement Import backend (design log 19) shipped end-to-end across
issues #140–#142 and works. But it was built TDD-first under deadline, and the
build left cleanup behind. Reading the shipped code, six things grate:

1. **A dead, duplicated detection path.** `detectBank(headerRow, presets)` — the
   function the design log specified — is exported but never used in production.
   The real preview flow detects the bank by re-parsing the file with each preset
   (`locateKnownBank`). Two detection strategies, one wired in, the other alive
   only in tests and a JSDoc reference.

2. **Preview orchestration lives in the route.** `POST /imports/preview` is a long
   inline `multer` callback that owns parsing, remembered-mapping reuse,
   duplicate/recurring detection, row-id assignment, and summary building. The
   pure, testable `csvImport` library stops at `detectStatement` /
   `mapStatementRows`; the interesting orchestration sits in the HTTP handler
   where it's awkward to unit-test.

3. **A 514-line wizard component holding business logic.** `ImportWizard.tsx`
   owns the preview-fetch effect, commit-payload assembly, category-option
   derivation, and the row inclusion/category state machine — a direct CLAUDE.md
   violation ("no business logic in components"). `reviewRows.ts` already proved
   the pattern of extracting the pure pieces; the rest never followed.

4. **Naming drift against the ubiquitous language.** The storage DTO is `Import`,
   but ubiquitous-language §797 mandates **Import Record** in the data layer. The
   UI invents `desc` / `cat` abbreviations, forcing translation layers
   (`toParsedRow`, `toImportedTxn`) that exist only to rename fields.

5. **Duplicated formatting.** The KB-size math is copy-pasted between the wizard
   and the history mapper; the wizard re-implements money formatting inline
   instead of reusing the `Money` primitive.

6. **A lossy, partly-incorrect preset round-trip.** Migration 011 collapsed
   `import_presets` to `(bank, mapping)`, dropping the `delimiter` / `decimal` /
   `date_fmt` the design specified. A "remembered" preset therefore restores only
   column _names_; format quirks are re-derived from the freshly _detected_ bank.
   Worse, the generic fallback labels every unrecognized statement `DKB`
   (`DEFAULT_BANK = "DKB"`), so a generic import silently overwrites the real DKB
   preset memory with a generic mapping.

The feature is correct for the three shipped German banks today. This refactor
makes the code honest about its own structure and closes the one place
(#6) where the divergence from the design is an actual latent defect.

## Solution

A behaviour-preserving cleanup pass, sequenced from zero-risk deletions to the
single behaviour-changing migration at the end, each step leaving the suite
green:

- **Delete** the dead `detectBank` path; keep `locateKnownBank` as the single
  detection source of truth.
- **Extract** a pure `buildPreview()` into the `csvImport` library so the route
  becomes thin transport (multer + error mapping) over a unit-tested core.
- **Extract** a `useImportWizard` hook so `ImportWizard.tsx` is composition over
  presentation, matching the layer rules.
- **Rename** `Import` → `ImportRecord` through the data layer and drop the UI's
  `desc` / `cat` abbreviations, deleting the translation layers — a mechanical,
  single-client rename in the spirit of the #54 `_id`→`id` pass.
- **Dedupe** the KB and money formatting onto shared, tested helpers.
- **Fix** the preset round-trip: a forward-only migration restoring
  `delimiter` / `decimal` / `date_fmt`, a non-colliding label for generic
  statements, and the preview/commit wiring to remember and re-apply the full
  format. This is the only behaviour-changing cluster and lands last, isolated.

## Commits

Ordered low-risk → high-risk. Each commit compiles and leaves `npx vitest run`
green.

### Cluster A — delete dead code

1. **Remove `detectBank`.** Delete the function from the parse module and its
   re-export from the library barrel. Delete its unit tests. Confirm `isHeaderRow`
   stays (still used by `parseStatement`). Suite green: nothing in production
   referenced it.

### Cluster B — dedupe formatting

2. **Add a shared `formatFileSizeKB` util** (pure, with its own test per the
   "every util has a test" rule). Replace the copy-pasted KB math in both the
   history mapper and the wizard with it.

3. **Reuse `Money` in the wizard's raw preview.** Replace the inline
   `(amount/100).toFixed(2).replace(".",",")` with the `Money` primitive (no
   sign), removing the one-off money formatting from the component.

### Cluster C — extract `buildPreview()` (server)

4. **Add a pure `buildPreview()` to the `csvImport` library** that takes the raw
   bytes plus its detection inputs (the bank's remembered preset if any, the
   account's existing transactions, the account's recurring transactions, and an
   injectable id generator for deterministic tests) and returns the full preview
   payload — `bank`, `mapping`, `columns`, `rows` (with ids + duplicate/recurring
   flags), and `summary`. Unit-test it directly against the existing bank
   fixtures (it is not yet called by the route). Suite green.

5. **Thin the preview route onto `buildPreview()`.** The route keeps only what is
   genuinely transport: multer config, the multer/size error → 413 mapping, the
   "no file" → 422, the `StatementParseError` → 422 mapping, the storage reads,
   and `res.json`. The orchestration now delegates to the library. The existing
   route tests in the imports route suite are the safety net.

### Cluster D — extract `useImportWizard` (frontend)

6. **Create `useImportWizard`** in the import feature holding the account-selection
   state, the preview-fetch effect, the `rows` / `map` state, `toggle` / `setCat`
   / `updateMap`, the derived `categoryOptions`, the `summary`, and the
   `confirm` commit-payload assembly + submit lifecycle. Give it its own test.

7. **Wire `ImportWizard.tsx` to the hook** and delete the moved logic. The
   component becomes step rendering + the `Step` / `MapField` presentational
   subcomponents. Behaviour identical; the component shrinks well under the
   layer-rule threshold.

### Cluster E — naming alignment (mechanical)

8. **Rename `Import` → `ImportRecord` in the data layer** — storage types, the
   repo interfaces on the Storage facade, the SQLite repo, the parity spec, and
   the route. Pure rename, no behaviour change.

9. **Drop the UI `desc` / `cat` abbreviations.** The import UI types use
   `description` / `category` end-to-end; delete `toParsedRow` /
   `toImportedTxn` (and the field-renaming half of `toStatement`), updating the
   wizard, preview modal, history, and `reviewRows` consumers. The server already
   speaks `description` / `category`, so this removes translation rather than
   adding it.

### Cluster F — preset round-trip fix (behaviour-changing, isolated, last)

10. **Use a non-colliding generic label.** Change the generic-fallback bank label
    away from `"DKB"` (e.g. `"Generic"`) so an unrecognized statement can no
    longer overwrite the real DKB preset memory. Update the affected detection
    default and any assertions. This is a small, deliberate behaviour change and
    is called out as such.

11. **Migration `012`: restore the full preset shape.** Forward-only numbered SQL
    adding `delimiter`, `decimal`, `date_fmt` to `import_presets`, with
    NOT-NULL + German-default values so existing rows upgrade cleanly. No
    down-migration (restore-from-backup is the rollback path, per policy).

12. **Carry the full preset through the repo + wire format.** Widen the stored
    preset type and the preset repo's `get` / `upsert` to the full shape;
    have the preview response return `decimal` / `date_fmt`; have the wizard echo
    them back in the commit payload; widen the commit request schema to accept
    them; have the commit upsert the full preset; and have the preview apply a
    remembered preset's `decimal` / `date_fmt` (not just its column map) when
    mapping rows. Add a preset round-trip test (commit-then-preview remembers the
    full format) to the parity spec.

## Decision Document

- **detectBank is deleted, not wired in.** `locateKnownBank` already detects by
  parsing each preset and is the production path; presets may legitimately carry
  different delimiters, so a single-split rewrite around `detectBank` would be a
  riskier change than the duplication it removes. One detection path wins by
  subtraction.
- **`buildPreview()` is a pure library function with an injected id generator.**
  Orchestration (mapping reuse, duplicate/recurring detection, id assignment,
  summary) belongs in the tested `server/src/lib/csvImport/` module, not the HTTP
  handler — consistent with the design log's "one tested Node module owns the
  pain" and CLAUDE.md's "business logic in `server/src/`". The route retains only
  transport and HTTP-status mapping.
- **`useImportWizard` owns the wizard's logic; the component owns rendering.**
  Mirrors the existing `reviewRows` extraction and the feature/component split in
  the layer table.
- **Full rename: `Import` → `ImportRecord` in the data layer, `desc`/`cat` →
  `description`/`category` in the UI.** Aligns the data layer with
  ubiquitous-language §796–797 and deletes translation layers rather than
  preserving compatibility — Horizon has one client, the same call made on the
  #54 wire-format rename.
- **The generic fallback gets its own label.** `DEFAULT_BANK = "DKB"` conflates
  "unrecognized" with a real bank and corrupts that bank's remembered preset; a
  distinct label is a prerequisite for remembering generic-statement formats
  correctly.
- **`import_presets` is widened via a forward-only migration.** Persisting
  `delimiter`/`decimal`/`date_fmt` in the `.db` is the same survive-a-reinstall
  reasoning log 18/19 used for `showInTrajectory`, `sortOrder`, and mortgage
  origination. Defaults backfill existing rows; no down-migration.
- **Modules touched:** the `csvImport` library (parse, preview/orchestration,
  barrel), the imports route, the SQLite imports + import-presets repos, the
  storage types + Storage facade interfaces, migration set, the storage parity
  spec, the import feature (hook, wizard, preview, history, types, `reviewRows`,
  `useImport`), and a shared formatting util.
- **Contract changes:** the preview response gains `decimal`/`date_fmt`; the
  commit request gains optional format fields; the stored preset shape widens.
  All other API contracts are unchanged.
- **Single-driver:** there is no Mongo imports repo (Mongo permanently deferred);
  the migration/repo work is SQLite-only, and the parity spec exercises only the
  SQLite driver for imports.

## Testing Decisions

- **Good tests assert external behaviour, not internals.** `buildPreview` is
  tested through its inputs/outputs against real bank fixtures (bank detected,
  rows mapped to cents/ISO, dup/recurring flags, summary counts) — never by
  reaching into private helpers. `useImportWizard` is tested through its public
  result and the effects of its actions (select account → reloads; toggle →
  inclusion changes; confirm → commit called with the right payload), not its
  internal `useState` shape.
- **Modules getting tests:** the new `buildPreview` (library unit tests), the
  `useImportWizard` hook, the shared `formatFileSizeKB` util, and a preset
  round-trip case in the parity spec. The existing imports-route suite guards the
  thinned route; the existing `csvImport` and `reviewRows` suites guard the rest.
- **Prior art to mirror:** `csvImport.test.ts` (fixture-driven pure-engine
  tests), `reviewRows.test.ts` (pure UI-logic tests), `storage.parity.ts` (the
  imports persistence + cascade tests), and the imports route suite.
- **Run with `npx vitest run`** from the repo root (the `npm test` bin shim is
  broken on this box); full suite ~3–4 min, occasional forks-pool worker
  timeouts re-run green.

## Out of Scope

- **Re-categorize** and **Re-download** import history actions (deferred /
  impossible offline per log 19).
- **Split debit/credit-column banks** and additional bank presets — the engine
  stays single-signed-column.
- **The Mongo driver** imports implementation (permanently deferred).
- **Category management / colour-picker UI** (log 18).
- **Month Year-Comparison** and **Native Application Menu** — separate roadmap
  items.
- Any change to the duplicate/recurring detection heuristics themselves — they
  move into `buildPreview` unchanged.

## Further Notes

- Cluster F is the only behaviour-changing work and is deliberately last and
  self-contained, so the cleanup clusters (A–E) can merge even if the preset fix
  needs more discussion.
- Worth a dev-journal entry on completion: the generic-fallback-labelled-as-DKB
  collision was a latent defect, not just a tidy-up, and the journal already
  carries a "consistency pass" convention for noting these.
