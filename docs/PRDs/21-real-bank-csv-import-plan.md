# Plan: Real Bank CSV Import

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/148
> PRD file: `docs/PRDs/21-real-bank-csv-import.md`

This is a **hardening epic on an already-shipped end-to-end feature** (Log 19 —
Bank Statement Import). The parse/detect/commit engine, the 3-step wizard, the
two-call `/imports/preview` + `/imports` API, and the remembered-preset
round-trip already exist and work. Nothing here builds a new path through the
stack — it swaps three **guessed** German-bank presets (Sparkasse / DKB / ING)
for four presets built from the owner's real exports (Sparkasse giro, Postbank
giro, Postbank credit card, Renault Tagesgeld) and hardens the parser for the
quirks those files carry.

Because the whole vertical path already exists, the phases are **per-format
vertical slices**: each phase is one user story — "import my real _X_ file,
end-to-end" — carrying exactly the engine hardening that format forces. Phase 1
is the fattest: it replaces the entire guessed preset map and lays the
cross-cutting **pending** and **rejected** rails that later formats reuse.

## Architectural decisions

Durable decisions that apply across all phases:

- **No positional / header-less rewrite.** Columns stay addressed **by name**;
  `ColumnMapping = { date, description, amount }` is unchanged; the wizard
  dropdowns and the `import_presets` remembered-preset round-trip are untouched.
  All four real formats are header-ful (the roadmap "header-less exports" goal
  is dropped as a non-goal).
- **Header de-duplication solves the only clashing format.** When building
  `columns` from the located header, the _n_-th duplicate (n ≥ 2) of a name `X`
  is renamed `X (n)`; rows are keyed by the de-duplicated names so `Betrag` and
  `Betrag (2)` address distinct cells. No move to index-based mapping.
- **Four mutually-exclusive header signatures** (detection order irrelevant):
  - Postbank CC → `Belegdatum`, `Eingangstag`, `Kurs`
  - Postbank giro → `Umsatzart`, `Soll`, `Haben`
  - Renault → `Bezeichnung Auftragskonto`, `Saldo nach Buchung`
  - Sparkasse → `Auftragskonto`, `Sammlerreferenz`, `Kategorie`
- **Per-format field mapping** (generic fallback retained for unknown banks):

  | Format        | date          | description                         | amount       | pending                      |
  | ------------- | ------------- | ----------------------------------- | ------------ | ---------------------------- |
  | Sparkasse     | `Buchungstag` | `Beguenstigter/Zahlungspflichtiger` | `Betrag`     | `Info` = `Umsatz vorgemerkt` |
  | Postbank giro | `Buchungstag` | `Begünstigter / Auftraggeber`       | `Betrag`     | —                            |
  | Postbank CC   | `Belegdatum`  | `Verwendungszweck`                  | `Betrag (2)` | —                            |
  | Renault       | `Buchungstag` | `Buchungstext`                      | `Betrag`     | —                            |

- **`BankPreset` gains three optional fields** (`encoding?` already exists):
  `quoted?` (Sparkasse `true`, others unquoted), `pendingColumn?` (e.g.
  `"Info"`), `pendingValues?` (e.g. `["Umsatz vorgemerkt"]`). Pending is data on
  the preset, not a code branch.
- **New row/summary fields**: a per-row `pending` boolean and a summary
  `rejected` count, threaded `MappedRow` → `PreviewRow`/`PreviewSummary` →
  `buildPreview` on the server, and `ParsedImportRow`/`ReviewSummary` on the
  client. Because pending inputs live on the preset, the detected-statement shape
  carried into row mapping also carries `pendingColumn` / `pendingValues`.
- **`parseDate` hardening**: split value and `dateFmt` on their shared
  separator; zero-pad day/month to two digits; pass a `YYYY` year through;
  expand a 2-digit year to `20YY` (no pivot window). `parseAmount` is unchanged.
- **Signature-driven encoding with retry**: a UTF-8 BOM is authoritative → UTF-8;
  with no BOM, decode under both Windows-1252 and UTF-8 and keep whichever
  surfaces a known `headerSignature` match; else generic fallback under
  Windows-1252. No charset-detection dependency.
- **Row filtering**: skip a record whose mapped **date cell** is empty (blank
  lines, balance-footer rows). A record with a non-empty date that fails
  date/amount parsing is counted **rejected** and surfaced — never silently
  dropped. `MAX_ROWS` / `MAX_COLUMNS` caps preserved.
- **Schema**: one forward-only migration `014_reset_import_presets.sql`
  containing `DELETE FROM import_presets;` (`013` is taken). No down-migration.
- **Signed amount used directly** everywhere (card purchases already negative);
  Postbank's redundant `Soll`/`Haben` ignored in favour of the single `Betrag`.
- **Fixtures** anonymized: preserve structure (headers, quoting, delimiters,
  date/amount formats, pending marker, empty-date footer, umlauts) while
  scrubbing real account numbers and counterparty names.

---

## Phase 1: Sparkasse import, end-to-end (+ pending & rejected rails)

**User stories**: 1, 8, 9, 12 (quoted half), 16, 17, 18, 22, 23, 24, 28.

### What to build

The first real tracer bullet: drop an anonymized Sparkasse Girokonto CSV and
have it import correctly, end-to-end, while laying the two cross-cutting seams
every later format reuses. Replace the **entire** guessed preset map (Sparkasse,
DKB, ING all removed) with the single real Sparkasse preset and its
mutually-exclusive signature; unknown files fall through to the existing generic
fallback until later phases add their presets. Harden `parseDate` to expand
`DD.MM.YY` two-digit years to `20YY`, and confirm the quote-aware `;` split
handles Sparkasse's quoted file. Thread a per-row **pending** flag
(`Info = "Umsatz vorgemerkt"`) from the preset through `MappedRow` → preview →
client so provisional rows arrive pre-unchecked but re-checkable, and thread an
**empty-date skip + rejected count** so footer/blank rows vanish and
has-a-date-but-unparseable rows are surfaced, not dropped. Ship an anonymized
Sparkasse fixture carrying a 2-digit year, a pending row, and an empty-date
footer.

### Acceptance criteria

- [ ] `BANK_PRESETS` contains only the real Sparkasse preset (DKB, ING, and the
      fictional Sparkasse mapping removed); `BankPreset` gains `quoted`,
      `pendingColumn`, `pendingValues`.
- [ ] A real anonymized Sparkasse file is detected as Sparkasse by its signature
      (`Auftragskonto`, `Sammlerreferenz`, `Kategorie`) and maps date
      `Buchungstag`, description `Beguenstigter/Zahlungspflichtiger`, amount
      signed `Betrag`.
- [ ] `parseDate` expands `DD.MM.YY` to `20YY` (a `26` date → `2026`) and leaves
      `DD.MM.YYYY` unchanged; covered by isolated unit tests.
- [ ] The quoted `;`-delimited Sparkasse file parses correctly.
- [ ] Rows with `Info = "Umsatz vorgemerkt"` are flagged `pending`, pre-unchecked
      in the wizard, still visible and re-checkable; the summary reports a pending
      count.
- [ ] Blank lines and the balance-footer (empty mapped date) are skipped; a row
      with a non-empty date that fails date/amount parsing is counted `rejected`
      and surfaced in the preview summary, not dropped.
- [ ] `pending` and `rejected` thread through `MappedRow` → `PreviewRow` /
      `PreviewSummary` → `buildPreview` and through the client
      `ParsedImportRow` / `buildReviewRows` / `summarizeReview`.
- [ ] `MAX_ROWS` / `MAX_COLUMNS` caps still reject a pathological file outright.
- [ ] An anonymized Sparkasse fixture (2-digit year, pending row, empty-date
      footer) imports end-to-end with correct date/amount/description and the
      expected flags.

---

## Phase 2: Postbank giro import (single-digit dates + encoding retry)

**User stories**: 2, 10, 12 (unquoted half), 19, 20, 25.

### What to build

Add the Postbank Girokonto format. Harden `parseDate` to zero-pad single-digit
day/month (`D.M.YYYY`, e.g. `1.9.2026` → `2026-09-01`). Add the signature-driven
encoding retry so the umlaut header (`Begünstigter / Auftraggeber`) decodes
correctly whether the file is Windows-1252 or UTF-8-without-BOM, with a UTF-8 BOM
treated as authoritative. The single signed `Betrag` is the amount source;
`Soll`/`Haben` are ignored. Ship an anonymized unquoted umlaut fixture with
single-digit dates.

### Acceptance criteria

- [ ] Postbank-giro preset added with signature `Umsatzart`, `Soll`, `Haben`;
      maps date `Buchungstag`, description `Begünstigter / Auftraggeber`, amount
      signed `Betrag`.
- [ ] `parseDate` pads single-digit day/month; `1.9.2026` → `2026-09-01`; covered
      by isolated unit tests.
- [ ] A no-BOM Windows-1252 umlaut header and a no-BOM UTF-8 umlaut header are
      both matched via the encoding retry; a UTF-8 BOM forces UTF-8; the signature
      is the oracle for "decoded correctly."
- [ ] The unquoted `;`-delimited file parses correctly.
- [ ] `Soll`/`Haben` are ignored; the signed `Betrag` is the sole amount source.
- [ ] An anonymized Postbank-giro fixture imports end-to-end with correct
      date/amount/description.

---

## Phase 3: Postbank credit-card import (header de-duplication → `Betrag (2)`)

**User stories**: 3, 13.

### What to build

Add the Postbank credit-card format, which carries two columns both named
`Betrag` — the foreign-currency amount and the EUR amount. Add header
de-duplication to the parse engine so the _n_-th duplicate of a name becomes
`X (n)` and rows are keyed by the de-duplicated names; the CC preset then maps
the EUR amount via `Betrag (2)`. Import lands against a CreditCard account. Ship
an anonymized fixture with the duplicate-`Betrag` header.

### Acceptance criteria

- [ ] Header de-duplication renames the _n_-th duplicate (n ≥ 2) of a column to
      `X (n)`; rows address `Betrag` and `Betrag (2)` as distinct cells; covered
      by isolated unit tests.
- [ ] Postbank-CC preset added with signature `Belegdatum`, `Eingangstag`,
      `Kurs`; maps date `Belegdatum`, description `Verwendungszweck`, amount
      `Betrag (2)` (the EUR column, not the foreign-currency one).
- [ ] An anonymized Postbank-CC fixture imports end-to-end against a CreditCard
      account with the EUR amount, correct date, and `Verwendungszweck`
      description; card purchases keep their negative sign.

---

## Phase 4: Renault Tagesgeld import (easy 4-digit case + `Buchungstext`)

**User stories**: 4, 11, 15.

### What to build

Add the Renault Bank Tagesgeld format — the easy 4-digit-year case that must not
regress under the Phase 1/2 date hardening. Use `Buchungstext` as the description
(not the counterparty) so interest/tax rows, where the counterparty is blank,
still read `Kapitalertragsteuer` / `Abschluss`. Ship an anonymized fixture
including such blank-counterparty rows.

### Acceptance criteria

- [ ] Renault preset added with signature `Bezeichnung Auftragskonto`,
      `Saldo nach Buchung`; maps date `Buchungstag` (`DD.MM.YYYY`), description
      `Buchungstext`, amount signed `Betrag`.
- [ ] `DD.MM.YYYY` four-digit dates still parse unchanged (regression guard).
- [ ] Interest/tax rows with a blank counterparty still show their `Buchungstext`
      label, not an empty description.
- [ ] An anonymized Renault fixture imports end-to-end with correct
      date/amount/description.

---

## Phase 5: Detection integrity, reset migration & fallback

**User stories**: 5, 6, 7, 21, 26, 27, 30, 32 (stories 29 and 31 span all
phases — anonymized fixtures and per-format end-to-end assertions are delivered
within each format's phase).

### What to build

Close the epic: prove the four real signatures never collide (a Sparkasse file
is never claimed by Renault and vice-versa; detection order is irrelevant), and
that an unknown bank still falls through to the generic fallback while an
unmatched-and-unmappable file fails with a clear message rather than a silent
empty import. Ship the forward-only migration `014_reset_import_presets.sql`
(`DELETE FROM import_presets;`) so any stale remembered preset from the guessed
banks is wiped and the new correct built-in defaults apply on next import.
Confirm the remembered-preset round-trip (a wizard correction re-applied next
time) still works, and that the row/column caps stay.

### Acceptance criteria

- [ ] All four formats are auto-detected on drop; the four signatures are proven
      mutually exclusive by tests (no cross-claim in either direction, order
      independent).
- [ ] An unknown bank's file falls through to the generic fallback and is still
      importable via the wizard.
- [ ] An unmatched file whose generic keyword mapping can't find a
      date/description/amount column fails with a clear message (no silent empty
      import).
- [ ] Migration `014_reset_import_presets.sql` runs forward-only, deleting all
      `import_presets` rows so stale guessed-bank corrections can't override the
      new defaults.
- [ ] A correction made in the wizard (column map, decimal, date format) is
      remembered per bank and re-applied on the next import of that bank.
- [ ] `MAX_ROWS` / `MAX_COLUMNS` caps still reject a pathological file outright.
- [ ] No guessed presets or their fixtures remain in the repo.
