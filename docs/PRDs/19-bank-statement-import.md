## Problem Statement

I can already see the Import page in Horizon — the 3-step wizard (Account →
Map columns → Review), the preview table, and an import history list. But none
of it is real. The history is seeded fake data, the preview rows are
hardcoded samples, the column mappings I adjust are forgotten the moment I
reload, and clicking "Confirm" just shows a toast — nothing is ever saved.

I want to drop a real CSV export from my German bank (Sparkasse, DKB, or ING)
onto that page and have Horizon actually parse it, show me the real
transactions, warn me about ones I've already entered or that my recurring
plan already covers, and then save the ones I choose as Variable Spending —
all offline, on my own machine, with no data invented and no buttons that
don't do anything.

## Solution

Build the real engine behind the existing Import UI shell. The Renderer sends
the raw CSV bytes to the local Express server, which sniffs the file's
encoding, parses it with a proper CSV library, maps each bank's columns onto
Horizon's date/description/amount fields, converts decimal-comma amounts to
integer cents and `DD.MM.YYYY` dates to ISO, auto-categorizes each row, and
flags likely duplicates and recurring flows by joining against stored
transactions and recurring rules. The user reviews the rows — toggling
inclusion and adjusting categories — and commits. The server inserts the
chosen rows as `import_id`-tagged Variable Spending transactions plus an
`imports` history record in a single atomic transaction, and remembers the
bank's column mapping for next time. History supports preview and cascade
delete. Everything runs as a local process on `127.0.0.1`; pull the network
cable and it still works.

This replaces the fabricated `features/import` seam (seeded history, sample
rows, in-memory preset map, client-side bank presets) with real API calls,
and removes the two history buttons (Re-download, Re-categorize) that can't
honestly be supported.

## User Stories

1. As a user, I want to drop a real bank CSV onto the Import page and see the
   actual transactions it contains, so that I stop looking at fake sample
   rows.
2. As a user, I want Horizon to recognise which bank a file came from by
   reading its header row, so that I don't have to tell it every time.
3. As a user importing a Sparkasse/DKB/ING export, I want the right columns
   mapped to date/description/amount automatically, so that I don't map them
   by hand.
4. As a user, I want German umlauts (ä, ö, ü, ß) to display correctly even
   when the file is Windows-1252/ISO-8859-1 encoded, so that descriptions
   aren't garbled.
5. As a user, I want files that begin with a metadata preamble (bank info
   before the real column header) to parse correctly, so that the preamble is
   skipped rather than treated as data.
6. As a user, I want amounts written with a decimal comma (`-12,50`) parsed
   as exact integer cents, so that no money is lost to floating-point error.
7. As a user, I want `DD.MM.YYYY` dates converted to ISO dates, so that
   imported rows sort and display consistently with the rest of Horizon.
8. As a user, I want each imported row auto-assigned to one of Horizon's real
   categories (Income, Housing, Food, Subscriptions, Entertainment,
   Investment, Transfer, Miscellaneous), so that I don't categorize every row
   from scratch.
9. As a user, I want a row I can't categorize by keyword to fall back to
   Miscellaneous, so that nothing is left uncategorized.
10. As a user, I want to override any row's category in the review step, so
    that I have the final say.
11. As a user, I want rows that already exist in the target account flagged as
    duplicates and pre-unchecked, so that I don't double-enter spending.
12. As a user, I want duplicate rows within the same file detected too, so
    that a file listing the same transaction twice doesn't import it twice.
13. As a user, I want rows matching my existing recurring transactions flagged
    as recurring and pre-unchecked, so that I don't double-count flows the
    Projection Engine already owns.
14. As a user, I want flagged rows pre-unchecked but still visible and
    re-checkable, so that I can override a false positive without losing the
    row.
15. As a user, I want my final review choices to be authoritative — only the
    rows I leave checked are saved, so that nothing is silently auto-dropped or
    auto-added.
16. As a user, I want a positive credit in the file (e.g. a refund or salary)
    saved as a positive Variable Spending transaction, so that signs are
    preserved exactly as the bank reported them.
17. As a user, I want the whole commit to be all-or-nothing, so that a failure
    midway never leaves a half-imported statement.
18. As a user, I want the bank's column mapping remembered after a successful
    import, so that the next import from that bank reuses my adjusted mapping.
19. As a user, I want remembered mappings to survive an app restart, reinstall,
    and backup/restore, so that they live in my database, not in disposable
    state.
20. As a user, I want to see my real import history — bank, filename, date
    range, row count, imported-on date, and size — so that I have an honest
    record of what I've imported.
21. As a user, I want to preview the transactions of a past import, so that I
    can recall what a given file brought in.
22. As a user, I want to delete a past import and have all of its imported
    transactions removed with it, so that I can cleanly undo a bad import.
23. As a user, I want deleting an import to leave my hand-entered Variable
    Spending untouched, so that only the imported rows disappear.
24. As a user, I want the Re-download and Re-categorize buttons removed from
    history, so that I'm not offered actions Horizon can't perform.
25. As a user importing into a Girokonto, Tagesgeld, or CreditCard account, I
    want only those account kinds offered as import targets, so that I don't
    import into a Mortgage or Investment account.
26. As a user, I want an account with no imports to show a clean empty state
    rather than seeded rows, so that the history reflects reality.
27. As a user uploading an oversized file (~5MB+), I want a clear rejection
    rather than a hang, so that the app stays responsive.
28. As a user uploading a file with too many rows/columns, I want it rejected
    rather than silently truncated, so that I never get a partial import I
    think is complete.
29. As a user uploading a non-CSV or unparseable file, I want a clear error,
    so that I understand why nothing imported.
30. As a user uploading a file whose bank can't be matched, I want a sensible
    default mapping I can adjust in the wizard, so that an unknown bank is
    still importable.
31. As a user, I want every imported cell treated as inert text, so that a
    crafted description can never inject SQL or a spreadsheet formula.
32. As a user offline with no internet, I want the entire import flow to work,
    so that my finance tool never depends on the network.

## Implementation Decisions

**Architecture & boundaries**

- CSV parsing and detection live **server-side** in a pure, tested module at
  `server/src/lib/csvImport/`. "Server-side" is a process boundary, not a
  network one — the Express server is the local `utilityProcess` child bound
  to `127.0.0.1`. CSV flow: disk → Renderer memory → loopback socket → local
  Node → local `horizon.db`.
- Two-call API: `POST /imports/preview` parses + detects with **no writes**;
  `POST /imports` commits the chosen rows. Preview is **stateless** — it holds
  no server session and returns rows with server-assigned ids.

**Persistence**

- New forward-only migration `011_add_imports.sql` adds an `imports` table, an
  `import_presets` table, and a nullable `import_id` column on `transactions`
  (FK to `imports`).
- `import_id` is NULL for hand-entered Variable Spending and set for imported
  rows.
- Cascade delete is a **repo use-case method**, not SQL `ON DELETE CASCADE` —
  consistent with how `transfers` owns its own atomicity, and parity-testable.
- Remembered mappings persist in the `import_presets` DB table (survive
  reinstall/backup/restore) — not electron-store, not localStorage.

**Storage facade**

- Add `ImportsRepo` and `ImportPresetsRepo` to the `Storage` facade.
  - `ImportsRepo`: `create(input)` (atomic: imports row + tagged
    transactions), `findAll()`, `findByAccount(accountId)`,
    `findTransactions(importId)`, `delete(importId)` (cascade).
  - `ImportPresetsRepo`: `get(bank)`, `upsert(bank, preset)`.
- `Transaction` gains an optional `importId`. `transactions.create` continues
  to insert `import_id` as NULL; the imports repo sets it within its atomic
  commit.
- Both drivers must satisfy the Parity Spec; only the SQLite driver ships
  (Mongo permanently deferred, but parity entries are still authored).

**Parse engine (`server/src/lib/csvImport/`)** — pure functions:

- `detectEncoding(bytes)` → `'utf-8' | 'windows-1252'` (BOM → UTF-8, else
  Windows-1252; decode via `TextDecoder`).
- `detectBank(headerRow, presets)` → bank key or `DEFAULT_BANK` (matches the
  parsed **header row** against each preset's `columns`).
- `parseStatement(text, preset)` → raw rows (scan past the metadata preamble
  to the `headerSignature`, then `csv-parse` with `preset.delimiter`,
  quote-aware per RFC-4180).
- `parseAmount(str, decimal)` → integer cents; `parseDate(str, dateFmt)` →
  ISO string.
- `categorize(description)` → category name (case-insensitive substring
  keyword map onto the eight real categories, Miscellaneous fallback; e.g.
  REWE/EDEKA/Aldi → Food, Miete → Housing, Gehalt → Income, Netflix →
  Subscriptions, Sparplan ETF → Investment).
- `detectDuplicates(rows, existingTxns)` — flag when the target account has a
  transaction with the **same signed amount AND same ISO date AND
  normalized-description equality** (lowercased, whitespace-collapsed); also
  dedupe within the file.
- `detectRecurring(rows, recurring)` — flag when a row matches an existing
  recurring transaction: same sign, `|amount|` equal within a small tolerance,
  and description containment in either direction. Day-of-month proximity is a
  soft signal, not required.

**Extended `BankPreset` (server constant)**

- Extends the shipped client shape with `delimiter` (German banks use `;`),
  `headerSignature` (column names identifying the real header row, used to skip
  the preamble), and optional `encoding` (default sniffed).
- Shipped presets are a server-side constant; the client `bankPresets.ts` is
  retired in favour of server detection.
- Deferred: split debit/credit columns or a separate sign indicator — the
  three target banks are single-signed-column.

**Routes (`server/src/routes/imports/`)**

- `POST /imports/preview` — multipart upload (multer `memoryStorage()`),
  returns `{ bank, mapping, columns, rows[], summary }`.
- `POST /imports` — JSON `{ accountId, bank, filename, sizeBytes, mapping,
rows[] }` → atomic commit; re-validates int cents, ISO dates, account
  exists; inserts the `imports` row + all included transactions in one
  better-sqlite3 transaction; upserts `import_presets` with the adjusted
  mapping.
- `GET /imports` and `GET /imports?accountId=` — history.
- `GET /imports/:id/transactions` — preview rows of a past import.
- `DELETE /imports/:id` — cascade delete.
- Multipart is the **only** deviation from the otherwise all-JSON API surface
  (raw bytes must reach the server before any charset decision).

**Upload security posture** (loopback as the trust boundary; threat model is
resource exhaustion + bad input, not exfiltration):

- multer `memoryStorage()` — no temp file (no path-traversal, no disk-fill);
  client `filename` is a display label only, never a filesystem path.
- Hard caps enforced before buffering: `fileSize ~5MB`, `files: 1` → 413.
- Row/column caps at parse time → reject, never silently truncate.
- Every cell is inert text: parameterized SQLite (SQLi structurally
  impossible) and cells are never re-exported (no CSV/formula injection).
- Accepted residual: any local process can hit the loopback port with no auth
  — inherent to the Desktop Build; size/row caps blunt local-DoS.

**Frontend seam swaps (`src/features/import/`)**

- `presetMemory.get/remember` → API-backed (read at preview, upsert at
  commit).
- `useImport` history and `sampleParsedRows` → real `GET /imports` and the
  preview call.
- `bankPresets.ts` client constant retired in favour of server detection.
- Remove the Re-download and Re-categorize affordances from `ImportHistory`
  (no fake buttons ship).

**Commit semantics**

- No silent auto-dedupe — the user's review choices are authoritative. Real
  signs preserved (an included positive credit becomes a positive Variable
  Spending transaction).

**Phasing**

1. **Persistence slice (thinnest end-to-end).** Migration `011`, the two
   repos on the SQLite driver, parity-spec entries, `POST /imports` (JSON
   rows) + `GET /imports` + `DELETE /imports/:id`. Proves rows → persisted
   transactions → history → cascade delete before any parsing exists.
2. **Parse + detect engine.** The pure `csvImport/` module with full unit
   tests against real Sparkasse/DKB/ING fixtures; the extended `BankPreset`
   constant.
3. **Preview route + wire the UI.** `POST /imports/preview` (multipart, caps,
   security posture); swap the `features/import` seams to the real API; remove
   the deferred history buttons. Acceptance: a real DKB CSV imports
   end-to-end, dupes/recurring pre-unchecked, mapping remembered next time.

## Testing Decisions

Good tests assert **external behaviour**, not implementation details — given
input bytes/rows, what the module returns or persists, not how it loops
internally. Coverage spans three layers (confirmed scope):

- **Parse engine (`server/src/lib/csvImport/`)** — fully unit-tested as pure
  functions against **real Sparkasse/DKB/ING CSV fixtures** that exercise the
  hard cases: Windows-1252 umlauts vs UTF-8 BOM, a metadata preamble before
  the header row, decimal-comma → integer cents, `DD.MM.YYYY` → ISO,
  keyword categorization with Miscellaneous fallback, duplicate detection
  (against existing txns and within-file), and recurring detection. These are
  the highest-value tests — pure inputs/outputs, no I/O.
- **Repos (`ImportsRepo`, `ImportPresetsRepo`)** — exercised through the
  shared **Parity Spec** (`storage.parity.ts`), the established pattern every
  driver must pass. Cover: atomic create (imports row + tagged transactions),
  `import_id` set on imported rows and NULL on hand-entered spend, cascade
  delete removes imported transactions but leaves manual spend intact,
  `findByAccount`/`findTransactions`, and preset upsert/get round-trip.
- **Routes (`server/src/routes/imports/`)** — integration-tested following the
  `transfers.test.ts` / `transactions.test.ts` prior art. Cover: multipart
  caps (oversized file and >1 file → 413), unparseable/non-CSV input errors,
  preview returns flagged rows without writing, atomic commit persists only
  checked rows with signs preserved, preset upsert on commit, and cascade
  delete via `DELETE /imports/:id`.

Prior art to mirror: `storage.parity.ts` for repo behaviour, and the existing
route test suites (`transfers.test.ts`, `transactions.test.ts`) for
request/response and atomicity assertions.

## Out of Scope

- Split debit/credit-column banks and separate sign-indicator formats — the
  three target banks use a single signed amount column.
- **Re-download** of a previously imported CSV — the raw file is never
  persisted offline by design, so it is impossible; its button is removed.
- **Re-categorize** an existing import (re-running rules over it) — deferred
  future enhancement; its button is removed.
- Category management / colour-picker UI and category auto-creation — owned by
  log 18; import only assigns existing categories.
- The Mongo driver implementation — permanently deferred (parity entries are
  still authored so the contract holds if it ever ships).
- Month Year-Comparison and Native Application Menu — separate roadmap items.

## Further Notes

- All imported rows land in **Variable Spending** with `import_id` set; this
  is the only category of actual transaction in the Recurring-Only Projection
  Model.
- Migrations are forward-only; `011` is the next number after
  `010_add_category_color.sql`. There is no down-migration — restore from
  backup is the rollback path.
- This epic is the deferred backend for the Import UI shell shipped in log 18
  (Claude Design Handover); log 18 Q2 explicitly scoped it as a separate
  backend epic.
- Source design log: `docs/design-logs/19-bank-statement-import.md`.
