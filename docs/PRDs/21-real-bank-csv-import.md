## Problem Statement

I bank with three real banks — Sparkasse (Girokonto), Postbank (a Girokonto
and a credit card), and Renault Bank (Tagesgeld) — and I want to import their
CSV exports into Horizon. Today the importer ships three **guessed** German-bank
presets (Sparkasse / DKB / ING) that were invented from general knowledge of
German bank CSVs, never built from a real export. DKB and ING are banks I don't
use, and the "Sparkasse" shape is fiction. When I drop one of my actual files in,
the columns don't match, the dates come out wrong, and pending entries create
duplicates. I need the importer to understand the files my banks actually
produce.

## Solution

Replace the three guessed presets with four presets built from my real exports
(Sparkasse giro, Postbank giro, Postbank credit card, Renault Tagesgeld) and
harden the parse engine for the quirks those real files carry — 2-digit years,
single-digit day/month, quoted vs unquoted `;` files, a duplicate `Betrag`
column, pending rows, umlaut headers under two possible encodings, and
blank/footer rows. The name-based column model, the remembered-preset round-trip,
and the wizard all stay exactly as they are; every quirk becomes data on a preset
or a small, unit-tested hardening of the existing engine — never a positional
rewrite. Unknown banks keep falling through to the existing generic fallback.

## User Stories

1. As the account owner, I want to import my Sparkasse Girokonto CSV, so that its
   transactions land in Variable Spending with correct dates and amounts.
2. As the account owner, I want to import my Postbank Girokonto CSV, so that I
   don't have to re-key day-to-day spending.
3. As the account owner, I want to import my Postbank credit-card CSV, so that
   card purchases are captured against the CreditCard account.
4. As the account owner, I want to import my Renault Bank Tagesgeld CSV, so that
   interest and tax postings on my Sondertilgung reserve are recorded.
5. As the account owner, I want the importer to recognise each of my four export
   formats automatically on drop, so that I rarely have to touch the column
   mapping.
6. As the account owner, I want an unknown bank's file to still fall through to
   the generic fallback, so that a bank I add later isn't a dead end.
7. As the account owner, I want the guessed DKB and ING presets removed, so that
   my file is never misdetected as a bank I don't use.
8. As the account owner, I want the fictional guessed-Sparkasse mapping gone, so
   that my real Sparkasse file maps to the right columns.
9. As the account owner, I want my Sparkasse `DD.MM.YY` two-digit years expanded
   to `20YY`, so that a `26` date reads as 2026, not year 26.
10. As the account owner, I want Postbank's single-digit day/month dates
    (`D.M.YYYY`, e.g. `1.9.2026`) parsed correctly, so that `1.9` becomes
    `2026-09-01` and not a malformed date.
11. As the account owner, I want Renault's four-digit `DD.MM.YYYY` dates to keep
    working unchanged, so that the hardening doesn't regress the easy case.
12. As the account owner, I want my quoted `;`-delimited Sparkasse file and my
    unquoted `;`-delimited Postbank/Renault files both parsed correctly, so that
    quoting style is never something I have to think about.
13. As the account owner, I want the Postbank credit-card file's two columns both
    named `Betrag` disambiguated, so that the EUR amount (the second `Betrag`) is
    the one imported, not the foreign-currency one.
14. As the account owner, I want each preset to use the description column that
    actually carries a useful label for that account, so that my transactions
    read sensibly and categorize well:
    - Sparkasse → `Beguenstigter/Zahlungspflichtiger`
    - Postbank giro → `Begünstigter / Auftraggeber`
    - Postbank CC → `Verwendungszweck`
    - Renault → `Buchungstext`
15. As the account owner, I want Renault's `Buchungstext` used as the description
    (not the counterparty), so that interest/tax rows — where the counterparty is
    blank — still show `Kapitalertragsteuer` / `Abschluss` instead of nothing.
16. As the account owner, I want Sparkasse rows marked `Info = "Umsatz vorgemerkt"`
    flagged as pending and pre-unchecked in the wizard, so that I don't import
    provisional entries that re-book later and become duplicates.
17. As the account owner, I want to see how many pending rows were detected in the
    preview summary, so that I understand why some rows start unchecked.
18. As the account owner, I want to be able to re-check a pending row and import it
    anyway, so that the flag is a default, not a lock.
19. As the account owner, I want my umlaut headers (`Begünstigter`, real `ä ö ü`)
    decoded correctly whether the file is Windows-1252 or UTF-8 without a BOM, so
    that detection doesn't fail on the exact formats that carry umlauts.
20. As the account owner, I want a file with a UTF-8 BOM decoded as UTF-8
    authoritatively, so that BOM-tagged files are never second-guessed.
21. As the account owner, I want each of my four formats detected by a signature
    that can't collide with another (Sparkasse and Renault share many columns),
    so that detection order never matters and a file is never claimed by the
    wrong preset.
22. As the account owner, I want blank lines and the balance-footer row in my
    exports skipped, so that empty/non-transaction rows never appear as
    transactions.
23. As the account owner, I want a row that _has_ a date but fails to parse its
    date or amount surfaced as a rejected/error count in the preview — not
    silently dropped — so that I can trust the preview total reflects the file.
24. As the account owner, I want my signed `Betrag` used directly (card purchases
    are already negative), so that no sign inversion corrupts amounts.
25. As the account owner, I want Postbank's redundant `Soll`/`Haben` debit-credit
    columns ignored in favour of the single signed `Betrag`, so that there's one
    unambiguous amount source.
26. As the account owner, I want a correction I make in the wizard (column map,
    decimal, date format) remembered per bank, so that my next import of the same
    bank re-applies it — exactly as the importer does today.
27. As the account owner, I want the stale remembered presets from the guessed
    banks cleared on upgrade, so that an old fictional Sparkasse mapping can't
    silently override the new correct built-in default.
28. As the account owner, I want the row/column hard caps (`MAX_ROWS`,
    `MAX_COLUMNS`) preserved, so that a pathological file is still rejected
    outright rather than truncated.
29. As the account owner, I want the fixtures in the repo anonymized, so that no
    real account numbers or counterparties are committed while still exercising
    every real quirk.
30. As a developer, I want every parser hardening (date padding, `20YY`
    expansion, header de-duplication, encoding retry, empty-date skip,
    rejected-row count) covered by an isolated unit test, so that each quirk is
    provably handled and can't silently regress.
31. As a developer, I want each of the four presets asserted end-to-end against a
    real anonymized fixture row, so that detection plus the full date/amount/
    description mapping is proven per format.
32. As the account owner, importing a file whose bank can't be detected and whose
    generic keyword mapping can't find a date/description/amount column should
    fail with a clear message, so that I know to map it manually rather than get
    a silent empty import.

## Implementation Decisions

**Model preserved (no rewrite).** Columns stay addressed **by name**;
`ColumnMapping = { date, description, amount }` is unchanged; the
`import_presets` remembered-preset round-trip and the wizard dropdowns are
untouched. All four real formats are header-ful, so the name-based model holds
and no positional/header-less parsing is built (roadmap "header-less exports"
goal is dropped as a non-goal — no real bank produces one).

**Per-format field mapping** (the four real presets that replace the guessed
three; generic fallback retained for unknown banks):

| Format        | date          | description                         | amount       | pending                      |
| ------------- | ------------- | ----------------------------------- | ------------ | ---------------------------- |
| Sparkasse     | `Buchungstag` | `Beguenstigter/Zahlungspflichtiger` | `Betrag`     | `Info` = `Umsatz vorgemerkt` |
| Postbank giro | `Buchungstag` | `Begünstigter / Auftraggeber`       | `Betrag`     | —                            |
| Postbank CC   | `Belegdatum`  | `Verwendungszweck`                  | `Betrag (2)` | —                            |
| Renault       | `Buchungstag` | `Buchungstext`                      | `Betrag`     | —                            |

**Mutually-exclusive header signatures** (detection order irrelevant):

- Postbank CC → `Belegdatum`, `Eingangstag`, `Kurs`
- Postbank giro → `Umsatzart`, `Soll`, `Haben`
- Renault → `Bezeichnung Auftragskonto`, `Saldo nach Buchung`
- Sparkasse → `Auftragskonto`, `Sammlerreferenz`, `Kategorie`

**`BankPreset` gains four optional fields:** `quoted?` (Sparkasse `true`, others
unquoted), `encoding?` (already exists), `pendingColumn?` (e.g. `"Info"`), and
`pendingValues?` (e.g. `["Umsatz vorgemerkt"]`). Pending is data on the preset,
not a code branch.

**Header de-duplication (parse engine).** When building `columns` from the
located header, the _n_-th duplicate (n ≥ 2) of a name `X` is renamed `X (n)`.
Row records are keyed by the de-duplicated names, so `Betrag` and `Betrag (2)`
address distinct cells. A preset's `map` and `headerSignature` reference the
de-duplicated names. This is the whole fix for the Postbank-CC duplicate-`Betrag`
problem — no move to index-based mapping (that would have a large blast radius
across type, stored preset, wizard, commit, and migration).

**`parseDate` hardening.** Split the value and `dateFmt` on their shared
separator; zero-pad day and month to two digits; pass a `YYYY` year through
as-is; expand a 2-digit year to `20YY` (bank statements are always current — no
pivot window). Assemble `YYYY-MM-DD`. `parseAmount` is unchanged (already handles
decimal-comma, thousands-dot, leading minus, signed values).

**Signature-driven encoding with retry.** A UTF-8 BOM is authoritative → UTF-8.
With no BOM, decode under **both** Windows-1252 and UTF-8 and keep whichever
surfaces a known `headerSignature` match — the signature is the oracle for
"decoded correctly." If neither matches, fall to the generic fallback under
Windows-1252. No charset-detection dependency is added.

**Row filtering.** Skip a record whose mapped **date cell** is empty (blank lines
and balance-footer rows — every real transaction has a date). A record with a
non-empty date that fails date/amount parsing is counted as **rejected** and
reported in the preview summary — never silently dropped. `MAX_ROWS` /
`MAX_COLUMNS` caps stay.

**Pending flag threaded through the existing seam.** A per-row `pending` boolean
is computed when the preset defines `pendingColumn` and the row's cell value is
in `pendingValues`. It threads `MappedRow` → `PreviewRow` → `PreviewSummary` →
`buildPreview` on the server, and the client wizard pre-unchecks pending rows
exactly like duplicates and recurring (extend `buildReviewRows` /
`summarizeReview` and the parsed-row/summary shapes). Because the pending inputs
live on the preset, the detected-statement shape carried into row mapping must
also carry `pendingColumn` / `pendingValues`.

**Rejected-row count.** The preview summary gains a rejected/error count
alongside `total`, `duplicates`, and `recurring`, threaded to the client summary
shape so the wizard can display it.

**Migration — number correction.** The design log names
`013_reset_import_presets.sql`, but `013` is already taken
(`013_fix_category_id_references.sql`). This ships as **`014_reset_import_presets.sql`**
containing `DELETE FROM import_presets;` — remembered rows are only _corrections_,
so wiping them lets the new correct built-in defaults apply on next import.
Forward-only, no down-migration.

**Fixtures.** Replace `fixtures/sparkasse.csv` (and remove `dkb.csv` / `ing.csv`)
with four anonymized real fixtures — one per format — each carrying its hard
case: 2-digit year (Sparkasse), single-digit d/m (Postbank), quoted vs unquoted,
duplicate `Betrag` (Postbank CC), a pending row (Sparkasse), an empty-date footer,
and an umlaut header requiring the encoding retry (Postbank/Renault).

**Modules built / modified:**

- `bankPresets.ts` — rewrite `BANK_PRESETS` to the four real presets; extend the
  `BankPreset` interface with `quoted` / `pendingColumn` / `pendingValues`.
- `parse.ts` — `parseDate` padding + `20YY`; header de-duplication in
  `parseStatement`; quote-aware split already present (verify unquoted path);
  encoding retry helper.
- `preview.ts` / `detect` seam — signature-driven encoding retry in
  `detectStatement`; empty-date skip + rejected-row count in `mapStatementRows`;
  carry `pendingColumn` / `pendingValues` onto the detected statement; compute
  `pending`.
- `types.ts` (`MappedRow`) and `buildPreview.ts` (`PreviewRow` / `PreviewSummary`)
  — add `pending` and `rejected`.
- Client `reviewRows.ts` / `importTypes.ts` — add `pending` to the parsed-row and
  summary shapes; pre-uncheck pending; surface rejected count.
- New migration `014_reset_import_presets.sql`.
- Fixtures directory — four anonymized real files.

## Testing Decisions

**What makes a good test here:** assert external behaviour — given real (anonymized)
statement bytes, the engine yields the right detected bank, ISO dates, signed-cents
amounts, descriptions, and flags. Never assert internal helper shapes. Drive each
quirk with the smallest input that isolates it (a single row with a 2-digit year;
a single duplicate-`Betrag` header; one pending row; one empty-date footer), so a
failure names the quirk.

**Prior art:** `server/src/lib/csvImport/csvImport.test.ts` (parse-engine unit
tests) and `server/src/lib/csvImport/buildPreview.test.ts` (preview orchestration)
on the server; `src/features/import/reviewRows.test.ts` and
`useImportWizard.test.ts` on the client. New tests follow these patterns.

**Modules to be tested:**

- **`parse.ts`** — `parseDate` for `DD.MM.YY` → `20YY`, `D.M.YYYY` single-digit
  padding, `DD.MM.YYYY` unchanged; header de-duplication (`Betrag` → `Betrag (2)`);
  quoted and unquoted `;` splitting.
- **`detectStatement` / encoding** — each of the four signatures detected;
  signatures proven mutually exclusive (a Sparkasse file is not claimed by
  Renault and vice-versa); no-BOM Windows-1252 and no-BOM UTF-8 umlaut headers
  both matched via retry; BOM forces UTF-8.
- **`mapStatementRows`** — empty-date rows skipped; a has-date-but-unparseable
  row counted as rejected, not dropped; Postbank CC maps `Betrag (2)`; Renault
  maps `Buchungstext`.
- **Pending flag** — Sparkasse `Umsatz vorgemerkt` row flagged pending and
  reflected in the summary; non-pending presets never flag.
- **`buildPreview`** — pending threads through; summary counts (total, duplicates,
  recurring, rejected, pending) correct; remembered-preset round-trip still
  preferred over detected defaults.
- **Client `buildReviewRows` / `summarizeReview`** — pending rows pre-unchecked;
  summary surfaces pending and rejected.
- **Per-format end-to-end** — each of the four anonymized fixtures imports with
  correct date/amount/description and the expected flags.

## Out of Scope

- Positional / header-less parsing — all four real formats are header-ful; the
  roadmap "header-less exports" goal is explicitly dropped.
- Composite (counterparty + purpose) descriptions — single column per preset.
- Index-based column mapping — de-duplicated names solve the only format that
  needs it.
- Split debit/credit-column handling — the single signed `Betrag` is the amount
  source everywhere; Postbank's `Soll`/`Haben` are ignored.
- Any bank beyond the owner's four — the generic fallback covers unknown banks.
- A POSIX pivot window for 2-digit years — always `20YY`.
- A charset-detection dependency — only two known encodings, resolved by the
  signature retry.
- Changes to duplicate/recurring detection, the commit path, import history, or
  the wizard's overall flow — only the pending/rejected additions thread through.

## Further Notes

- This is the deferred hardening epic for **Log 19 — Bank Statement Import
  (backend)**, which shipped the parse/detect/commit engine behind the guessed
  presets. The engine, wizard, and remembered-preset persistence already exist;
  this PRD swaps fiction for ground truth and hardens the parser around it.
- The one deviation from the design log is the migration number: `013` is taken,
  so the reset migration is `014_reset_import_presets.sql`.
- Phasing (from the design log) keeps risk low: **Phase 1** is pure engine
  hardening (no preset/DB change, fully covered by `csvImport.test.ts`); **Phase
  2** rewrites presets + adds fixtures; **Phase 3** threads the pending flag and
  ships the migration. Each phase is independently testable.
- Anonymization discipline: fixtures must preserve structure (headers, quoting,
  delimiters, date/amount formats, the pending marker, the empty-date footer,
  umlauts) while scrubbing account numbers and real counterparty names.
