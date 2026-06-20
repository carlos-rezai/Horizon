# Plan: Bank Statement Import (backend)

> Source PRD: https://github.com/d1sc0nneckt1e/Horizon/issues/139

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes** (`server/src/routes/imports/`):
  - `POST /imports/preview` — multipart upload (multer `memoryStorage()`),
    parses + detects with **no writes**, returns
    `{ bank, mapping, columns, rows[], summary }`. Stateless: rows carry
    server-assigned ids.
  - `POST /imports` — JSON `{ accountId, bank, filename, sizeBytes, mapping,
rows[] }` → atomic commit of the chosen rows.
  - `GET /imports` and `GET /imports?accountId=` — history.
  - `GET /imports/:id/transactions` — preview rows of a past import.
  - `DELETE /imports/:id` — cascade delete.
  - Multipart is the **only** deviation from the otherwise all-JSON API
    surface (raw bytes must reach the server before any charset decision).
- **Schema**: forward-only migration `011_add_imports.sql` (next after
  `010_add_category_color.sql`; no down-migration — restore from backup is the
  rollback path):
  - `imports` table — one row per imported statement (bank, filename, date
    range, row count, imported-on date, size).
  - `import_presets` table — remembered per-bank column mappings.
  - nullable `import_id` column on `transactions` (FK to `imports`); NULL for
    hand-entered Variable Spending, set for imported rows.
- **Storage facade** (`server/src/storage/Storage.ts`): add `ImportsRepo` and
  `ImportPresetsRepo`.
  - `ImportsRepo`: `create(input)` (atomic: `imports` row + tagged
    transactions in one `better-sqlite3` transaction), `findAll()`,
    `findByAccount(accountId)`, `findTransactions(importId)`,
    `delete(importId)` (cascade — a repo use-case method, **not** SQL
    `ON DELETE CASCADE`, mirroring how `transfers` owns its atomicity and is
    parity-testable).
  - `ImportPresetsRepo`: `get(bank)`, `upsert(bank, preset)`.
  - `Transaction` gains an optional `importId`; `transactions.create`
    continues to insert `import_id` as NULL.
  - Both drivers satisfy the **Parity Spec** (`storage.parity.ts`); only the
    SQLite driver ships (Mongo permanently deferred, parity entries still
    authored).
- **Parse engine**: pure, tested module at `server/src/lib/csvImport/`
  (`detectEncoding`, `detectBank`, `parseStatement`, `parseAmount`,
  `parseDate`, `categorize`, `detectDuplicates`, `detectRecurring`).
  "Server-side" is a process boundary, not a network one: disk → Renderer
  memory → loopback socket → local Node → local `horizon.db`.
- **Key models / constants**: extended server-side `BankPreset` (adds
  `delimiter`, `headerSignature`, optional `encoding` to the shipped client
  shape); the client `bankPresets.ts` constant is retired in favour of server
  detection. Imported rows always land in **Variable Spending** with
  `import_id` set.

---

## Phase 1: Persistence slice (thinnest end-to-end)

**User stories**: 15, 16, 17, 19, 20, 21, 22, 23

### What to build

The complete persistence path with **no parsing yet**: the route accepts
already-parsed JSON rows and drives them through to the database and back.
Add migration `011` (the `imports` + `import_presets` tables and the
`transactions.import_id` column), implement `ImportsRepo` and
`ImportPresetsRepo` on the SQLite driver behind the `Storage` facade, author
their Parity Spec entries, and expose `POST /imports` (JSON rows),
`GET /imports` (+ `?accountId=`), `GET /imports/:id/transactions`, and
`DELETE /imports/:id`. A committed set of rows becomes `import_id`-tagged
Variable Spending transactions plus one `imports` history record in a single
atomic transaction; deleting the import cascades to its transactions while
leaving hand-entered spend untouched; the bank's adjusted mapping is
remembered via preset upsert and survives reads.

### Acceptance criteria

- [ ] Migration `011_add_imports.sql` applies forward-only and is covered by
      the migration test; schema version advances.
- [ ] `POST /imports` inserts the `imports` row and all included transactions
      in one `better-sqlite3` transaction; a mid-commit failure leaves nothing
      persisted (all-or-nothing).
- [ ] Imported transactions carry `import_id`; hand-entered Variable Spending
      keeps `import_id` NULL.
- [ ] A positive credit in the row set persists as a positive Variable
      Spending transaction (signs preserved exactly).
- [ ] `GET /imports` and `GET /imports?accountId=` return real history
      (bank, filename, date range, row count, imported-on date, size).
- [ ] `GET /imports/:id/transactions` returns the persisted rows of a past
      import.
- [ ] `DELETE /imports/:id` removes the import and all its transactions but
      leaves hand-entered Variable Spending intact.
- [ ] `ImportPresetsRepo.upsert`/`get` round-trips a per-bank mapping; the
      mapping persists in the DB table (survives restart/reinstall/restore).
- [ ] `ImportsRepo` and `ImportPresetsRepo` pass the shared Parity Spec
      (atomic create, `import_id` set/NULL, cascade delete, `findByAccount`,
      `findTransactions`, preset round-trip).

---

## Phase 2: Parse + detect engine

**User stories**: 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 18

### What to build

The pure `server/src/lib/csvImport/` module that turns raw CSV bytes into
detected, mapped, categorized, and flagged rows — no I/O, no HTTP. It sniffs
encoding (BOM → UTF-8, else Windows-1252 via `TextDecoder`), detects the bank
by matching the parsed header row against the extended `BankPreset` constants,
scans past any metadata preamble to the `headerSignature` and parses
quote-aware with `csv-parse` and the preset delimiter, converts decimal-comma
amounts to integer cents and `DD.MM.YYYY` dates to ISO, auto-categorizes each
row by case-insensitive keyword map onto the eight real categories (with
Miscellaneous fallback), and flags duplicates (against existing account
transactions and within the file) and recurring matches. Includes the
extended server-side `BankPreset` constant. Fully unit-tested against real
Sparkasse/DKB/ING fixtures.

### Acceptance criteria

- [ ] `detectEncoding(bytes)` returns `'utf-8'` for BOM files and
      `'windows-1252'` otherwise; umlauts (ä, ö, ü, ß) decode correctly from
      a Windows-1252 fixture.
- [ ] `detectBank(headerRow, presets)` returns the right bank for
      Sparkasse/DKB/ING header rows and `DEFAULT_BANK` for an unmatched header.
- [ ] `parseStatement` skips a metadata preamble and starts at the
      `headerSignature` row; parsing is quote-aware (RFC-4180) with the
      preset's delimiter (`;` for the German banks).
- [ ] `parseAmount('-12,50', ...)` returns exactly `-1250` cents — no
      floating-point error; `parseDate('02.11.2026', ...)` returns
      `'2026-11-02'`.
- [ ] `categorize` maps representative descriptions onto the eight real
      categories (e.g. REWE/EDEKA → Food, Miete → Housing, Gehalt → Income,
      Netflix → Subscriptions, Sparplan ETF → Investment) and falls back to
      Miscellaneous when no keyword matches.
- [ ] `detectDuplicates` flags rows matching an existing account transaction
      (same signed amount + same ISO date + normalized-description equality)
      and de-dupes repeats within the same file.
- [ ] `detectRecurring` flags rows matching an existing recurring transaction
      (same sign, `|amount|` within tolerance, description containment either
      direction).
- [ ] The extended `BankPreset` constant ships server-side with `delimiter`,
      `headerSignature`, and optional `encoding`.
- [ ] All of the above are covered by unit tests against real
      Sparkasse/DKB/ING CSV fixtures.

---

## Phase 3: Preview route + wire the UI

**User stories**: 1, 10, 14, 24, 25, 26, 27, 28, 29, 30, 31, 32

### What to build

Join the engine (Phase 2) to persistence (Phase 1) and to the existing Import
UI. Add `POST /imports/preview` — multipart upload through multer
`memoryStorage()` with hard caps enforced before buffering (`fileSize ~5MB`,
`files: 1` → 413) and row/column caps at parse time (reject, never truncate) —
which runs the parse engine and returns flagged rows without writing. Swap the
`features/import` seams to the real API: `presetMemory.get/remember` becomes
API-backed (read at preview, upsert at commit), `useImport` history and
`sampleParsedRows` become the real `GET /imports` and preview calls, the
client `bankPresets.ts` constant is retired, and the Re-download /
Re-categorize buttons are removed from `ImportHistory`. End-to-end: a real DKB
CSV imports, dupes/recurring arrive pre-unchecked but re-checkable, only
checked rows commit, and the mapping is remembered next time — entirely
offline.

### Acceptance criteria

- [ ] `POST /imports/preview` accepts a multipart CSV and returns
      `{ bank, mapping, columns, rows[], summary }` with **no database
      writes**.
- [ ] An oversized file (~5MB+) and a >1-file upload are rejected with 413
      before buffering; a too-many-rows/columns file is rejected (never
      silently truncated).
- [ ] A non-CSV / unparseable file returns a clear error; an unmatched bank
      falls back to a sensible default mapping the user can adjust in the
      wizard.
- [ ] Flagged duplicate/recurring rows render pre-unchecked but visible and
      re-checkable; the user can override any row's category; only rows left
      checked are committed.
- [ ] A real DKB (and Sparkasse/ING) CSV imports end-to-end into a chosen
      account as Variable Spending; signs are preserved.
- [ ] The adjusted column mapping is upserted on commit and reused on the next
      import from that bank (verified across a reload).
- [ ] Only `Girokonto`, `Tagesgeld`, and `CreditCard` accounts are offered as
      import targets; an account with no imports shows the clean empty state.
- [ ] The Re-download and Re-categorize buttons are removed; client
      `bankPresets.ts` is retired in favour of server detection.
- [ ] Every imported cell is treated as inert text (parameterized SQLite; no
      re-export) — no SQL or formula injection is possible.
- [ ] The entire flow works with no network (loopback only).

---

## Testing notes

- **Parse engine** — fully unit-tested as pure functions against real
  Sparkasse/DKB/ING CSV fixtures (Phase 2); highest-value tests, no I/O.
- **Repos** — exercised through the shared Parity Spec (`storage.parity.ts`)
  every driver must pass (Phase 1).
- **Routes** — integration-tested following the `transfers.test.ts` /
  `transactions.test.ts` prior art (multipart caps, unparseable input, preview
  without writes, atomic commit, preset upsert, cascade delete).
