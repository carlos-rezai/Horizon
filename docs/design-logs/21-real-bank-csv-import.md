# 21 — Real Bank CSV Import

## Background

Log **19 — Bank Statement Import (backend)** shipped the real parse/detect/commit
engine in `server/src/lib/csvImport/` behind three **guessed** German-bank
presets (Sparkasse / DKB / ING) in `bankPresets.ts`. Those shapes were invented
from general knowledge of German bank CSVs, never built from real exports. The
roadmap item **Real Bank CSV Import** exists to replace them with presets built
from the account owner's actual bank files, and to harden the parser for the
quirks those files carry.

Relevant existing engine (all name-based):

- `parseStatement(text, preset)` scans past any metadata preamble to the header
  row identified by `preset.headerSignature`, then maps each subsequent record
  into `Record<columnName, value>`. Columns are addressed **by name**.
- `ColumnMapping = { date, description, amount }`, each value a **column name**.
- `StoredImportPreset` (table `import_presets`) remembers a bank's
  `{ mapping, delimiter, decimal, dateFmt }` across restart/backup.
- `detectEncoding(bytes)` = BOM → utf-8, else assume `windows-1252`.
- `parseDate(str, dateFmt)` splits on the separator and slots tokens into
  `YYYY/MM/DD` **verbatim** — no padding, no 2-digit-year handling.
- Generic fallback (`locateGeneric`) treats the first non-empty row as the header
  and keyword-matches column names.

## Problem

Replace the three guessed presets with presets built from the owner's four real
export formats, and harden `parseStatement` / `parseDate` / `detectEncoding` for
the quirks those real files actually contain — without a positional rewrite and
without breaking the remembered-preset round-trip.

The four real formats (three banks) — all confirmed **header-ful** with a real
data row each:

| Format               | Account    | Delimiter / Quotes | Decimal | Date                          |
| -------------------- | ---------- | ------------------ | ------- | ----------------------------- |
| **Sparkasse** (CAMT) | Girokonto  | `;` **quoted**     | `,`     | `DD.MM.YY` (2-digit year)     |
| **Postbank giro**    | Girokonto  | `;` unquoted       | `,`     | `D.M.YYYY` (single-digit d/m) |
| **Postbank CC**      | CreditCard | `;` unquoted       | `,`     | `D.M.YYYY`                    |
| **Renault**          | Tagesgeld  | `;` unquoted       | `,`     | `DD.MM.YYYY` (4-digit)        |

## Questions and Answers

1. **Which real banks, and do we keep the guessed presets?**
   → Three banks / **four formats** (Sparkasse giro, Postbank giro, Postbank
   credit card, Renault Tagesgeld). ✅ **Delete the guessed Sparkasse / DKB / ING
   presets** — DKB and ING are not used; the guessed Sparkasse shape is fiction.
   Build four real presets + keep the generic fallback for unknown banks.

2. **Do the real exports have a header row?**
   → ✅ **Yes, all four.** Initial suspicion of headerless/positional files came
   only from the owner pasting bare data lines. Every format ships a header, so
   the **name-based model is kept** — no positional rewrite.

3. **Postbank CC has two columns literally named `Betrag` (foreign + EUR). How
   do we address the EUR one?**
   → ✅ **De-duplicate duplicate header names at parse time** — the second
   `Betrag` becomes `Betrag (2)`; map `amount → "Betrag (2)"`. Keeps the
   name-based map, the `import_presets` round-trip, and the wizard dropdowns
   intact. ❌ Move `ColumnMapping` to column **indices** — large blast radius
   (type, stored preset, wizard, commit, migration) to fix the one format that
   has the problem.

4. **Description: single column or a counterparty + purpose composite?**
   → ✅ **Single column, chosen per preset.** Counterparty carries the
   human-readable merchant label and the categorization keywords. No
   `ColumnMapping` change. ❌ Composite (ordered column list) — changes the
   mapping model across wizard / commit / stored preset for marginal gain.

5. **Sparkasse `Info = "Umsatz vorgemerkt"` (pending) rows?**
   → ✅ **New `pending` preview flag, default-excluded**, driven per-preset by a
   `pendingColumn` + pending value(s). Reuses the existing duplicate/recurring
   flag pattern. Rationale: pending entries re-book later (often with a different
   date/amount/description), so importing them now creates duplicates the
   existing detector can't catch. ❌ Silently skip (invisible). ❌ Import as-is
   (duplicate churn).

6. **How to expand 2-digit years (Sparkasse `DD.MM.YY`)?**
   → ✅ **Always `20YY`** (`26` → `2026`). Bank statements are always current.
   ❌ POSIX pivot window — pointless complexity guarding against dates a
   statement cannot contain.

7. **Encoding for the umlaut headers (Postbank / Renault use real `ä ü`)?**
   → ✅ **Signature-driven encoding with retry.** BOM → utf-8 when present;
   otherwise try Windows-1252 **and** UTF-8 and keep whichever surfaces a known
   header; default Windows-1252 for the generic fallback. The header signature is
   the oracle for "decoded correctly." ❌ Keep the BOM-or-1252 guess — brittle
   exactly for the two umlaut formats. ❌ Add a charset-detection dependency —
   overkill for two known encodings.

8. **Header signatures that don't collide (Sparkasse and Renault overlap
   heavily)?**
   → ✅ Mutually-exclusive signatures, so detection order is irrelevant:
   - Postbank CC → `Belegdatum`, `Eingangstag`, `Kurs`
   - Postbank giro → `Umsatzart`, `Soll`, `Haben`
   - Renault → `Bezeichnung Auftragskonto`, `Saldo nach Buchung`
   - Sparkasse → `Auftragskonto`, `Sammlerreferenz`, `Kategorie`

9. **Amount source and sign?**
   → ✅ **Signed `Betrag`** everywhere. Postbank's separate `Soll`/`Haben`
   debit/credit pair is redundant and ignored. Postbank CC uses `Betrag (2)` (the
   EUR column). Real data confirms card purchases are **negative** — no
   inversion. `parseAmount` already handles decimal-comma, thousands-dot, leading
   minus.

10. **Renault description — counterparty is empty on interest/tax rows.**
    → ✅ **`Buchungstext`** for Renault (short, always-present type label:
    `Kapitalertragsteuer`, `Abschluss`). Its `Name Zahlungsbeteiligter`
    (counterparty) is blank on the system postings a Tagesgeld is full of. Still
    single-column — just the right column for this account. ❌ `Verwendungszweck`
    (verbose/noisy). This refines Q4 per-preset, no model change.

11. **Blank lines and footer rows in the known-bank path?**
    → ✅ **Skip a row when its mapped _date_ cell is empty** (blank lines,
    balance-footer rows — every real transaction has a date). A row that _has_ a
    date but fails to parse date/amount is **surfaced, not hidden** (rejected/
    error count in the preview), never silently dropped. Keep `MAX_ROWS` /
    `MAX_COLUMNS` caps.

12. **The roadmap's "header-less exports" hardening goal?**
    → ✅ **Dropped as a non-goal.** All four real formats are header-ful. Keep the
    existing generic fallback (first non-empty row as header) for unknown banks;
    build no positional-parsing support for a case no real bank produces.

13. **Stale remembered presets from the guessed banks?**
    → ✅ **Migration `013_*` resets `import_presets`** (clears the table). Rows
    are only remembered _corrections_; wiping lets the new correct built-in
    defaults apply on next import. ❌ Selectively rewrite old rows — DKB/ING are
    orphaned and the old Sparkasse mapping (Verwendungszweck description) would
    silently override the new counterparty default.

## Design

### Per-format field mapping

| Format        | date          | description                         | amount       | pending                      |
| ------------- | ------------- | ----------------------------------- | ------------ | ---------------------------- |
| Sparkasse     | `Buchungstag` | `Beguenstigter/Zahlungspflichtiger` | `Betrag`     | `Info` = `Umsatz vorgemerkt` |
| Postbank giro | `Buchungstag` | `Begünstigter / Auftraggeber`       | `Betrag`     | —                            |
| Postbank CC   | `Belegdatum`  | `Verwendungszweck`                  | `Betrag (2)` | —                            |
| Renault       | `Buchungstag` | `Buchungstext`                      | `Betrag`     | —                            |

### `BankPreset` additions (`server/src/lib/csvImport/bankPresets.ts`)

```ts
interface BankPreset {
  columns: string[];
  map: ColumnMapping; // values are (de-duplicated) column names
  decimal: string;
  dateFmt: string; // "DD.MM.YY" | "D.M.YYYY" | "DD.MM.YYYY"
  delimiter: string;
  headerSignature: string[]; // mutually exclusive across presets (Q8)
  encoding?: string;
  quoted?: boolean; // Sparkasse true; others unquoted
  pendingColumn?: string; // NEW — e.g. "Info"        (Sparkasse only)
  pendingValues?: string[]; // NEW — e.g. ["Umsatz vorgemerkt"]
}
```

### Header de-duplication (`parse.ts`)

When building `columns` from the located header, rename any repeat occurrence:
the _n_-th duplicate of a name `X` (n ≥ 2) becomes `X (n)`. Row records are then
keyed by the de-duplicated names, so `Betrag` and `Betrag (2)` address distinct
cells. A preset's `map`/`headerSignature` reference the de-duplicated names.

### `parseDate` hardening (`parse.ts`)

Normalize to ISO regardless of token width:

- Split value and `dateFmt` on the shared separator.
- Zero-pad day and month to 2 digits (`1` → `01`).
- Year: `YYYY` as-is; 2-digit year → **`20YY`** (Q6).
- Assemble `YYYY-MM-DD`.

### `detectEncoding` / detection (`parse.ts`, `preview.ts`)

BOM → utf-8 (authoritative). No BOM → decode under Windows-1252 **and** UTF-8;
whichever yields a known `headerSignature` match wins. If neither matches, fall
to the generic fallback under Windows-1252. (Q7)

### Row filtering (`preview.ts` / `mapStatementRows`)

Skip records whose mapped **date cell** is empty (Q11). A record with a non-empty
date whose date/amount fails to parse is counted as **rejected** and reported in
the preview summary, not silently dropped.

### Pending flag

`mapStatementRows` / `buildPreview` compute a per-row `pending` boolean when the
preset defines `pendingColumn` and the cell value is in `pendingValues`. Add
`pending` to `PreviewRow` and `PreviewSummary`; the wizard pre-unchecks pending
rows exactly like duplicates/recurring.

### Migration `013_reset_import_presets.sql`

```sql
DELETE FROM import_presets;
```

### Fixtures

Replace `fixtures/sparkasse.csv` with anonymized real fixtures for all four
formats, each carrying its hard case: 2-digit year, single-digit d/m, quoted vs
unquoted, duplicate `Betrag`, a pending row (Sparkasse), an empty-date footer,
and an umlaut header requiring the encoding retry (Postbank/Renault).

## Implementation Plan

**Phase 1 — parse-engine hardening (pure, no preset changes).**
`parseDate` padding + `20YY`; header de-duplication in `parseStatement`;
signature-driven encoding retry in `detectStatement`; empty-date row skip +
rejected-row count. Unit tests drive each quirk in isolation. Thinnest slice: no
new preset, no DB, engine-only, fully covered by `csvImport.test.ts`.

**Phase 2 — real presets + fixtures.**
Rewrite `BANK_PRESETS` to the four real formats (add `quoted`, `pendingColumn`,
`pendingValues`); delete DKB/ING/guessed-Sparkasse. Add the four anonymized
fixtures. Detection + full mapping asserted per format against real rows.

**Phase 3 — pending flag through the seam + migration.**
Thread `pending` through `MappedRow` → `PreviewRow` → `PreviewSummary` →
`buildPreview`, default-exclude in the wizard. Migration `013` resets
`import_presets`. Acceptance: each real export imports end-to-end with correct
date/amount/description, pending rows pre-unchecked, mapping remembered.

## Trade-offs

**Easier:** presets are now built from ground truth, not guessed; the name-based
model, remembered-preset round-trip, and wizard are all preserved; each quirk is
data on a preset, not a code branch; every hardening is a pure, unit-testable
change to the existing engine.

**Harder:** de-duplicated header names (`Betrag (2)`) leak a parse detail into
the wizard's column dropdowns; the encoding retry doubles the decode+scan work on
the no-BOM path (negligible at these sizes); real fixtures must be kept
anonymized in the repo.

**Out of scope (deliberate):** positional / header-less parsing (no real bank
needs it — Q12); composite descriptions (Q4); index-based column mapping (Q3);
split debit/credit-column handling (single signed `Betrag` only, carried over
from log 19); any new bank beyond the owner's four (generic fallback covers
them).
