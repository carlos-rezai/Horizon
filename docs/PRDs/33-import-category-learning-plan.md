# Plan: Import Category Learning

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/257

## Architectural decisions

These decisions apply to every phase:

- **Routes**: there are no new routes.
  - `POST /imports/preview` loads Category Rules, categories and declined
    proposals from storage and injects them into the preview build as plain
    data, the same way it injects existing transactions and recurring rules.
    It still writes nothing.
  - `POST /imports` (Import Commit): each row gains an optional
    `counterparty` (default `""`) and `categorySource` (default
    `"unmatched"`). The payload gains an optional `declinedProposals: string[]`
    (default `[]`). These follow the optional-with-default pattern of
    `delimiter` / `decimal` / `dateFmt`, so an older payload still commits and
    teaches nothing. Learning runs after the import is created, as the preset
    upsert already does. A failed commit learns nothing.
  - `POST /categories` is the existing create endpoint. Approving a Category
    Proposal uses it, and nothing new is needed.
  - `DELETE /imports/:id` (Import Cascade Delete) never touches Category
    Rules.
- **Schema**: migration 018 adds two tables:
  - `category_rules (counterparty_key TEXT PRIMARY KEY, category TEXT NOT NULL, updated_at TEXT NOT NULL)`
  - `declined_category_proposals (name TEXT PRIMARY KEY COLLATE NOCASE)`

  Rules reference categories by **name**, like Transactions and
  RecurringTransactions. `import_presets` JSON and `ColumnMapping` are not
  changed. Phase 1 ships `category_rules`, and Phase 4 adds the declined
  table to the same migration file if 018 has not been released by then.
  Otherwise it ships as migration 019.

- **Key models**:
  - `CategorySource = "learned" | "suggested" | "proposed" | "unmatched" | "chosen"`
    is a shared server type with a mirror in the client import types.
  - **Counterparty**: the raw source cell as parsed, taken before any review
    edit. It is the preset's Counterparty Column cell when that cell is
    non-empty (Renault only), otherwise the description cell.
  - **Counterparty Key**: NFKC, lowercased, every run of non-letters turned
    into a space, tokens under 2 letters dropped, and the first
    `COUNTERPARTY_KEY_TOKENS` (3, tuned against the fixtures) joined by single
    spaces. An empty key means "no key": the row is never looked up, learned
    or propagated. The server always re-derives keys and never trusts a key
    sent by the client.
  - **Category Rule**: `{ counterpartyKey, category }`, global across accounts
    and banks, matched exactly (no prefix or fuzzy matching).
  - `PreviewRow` gains `category`, `counterparty`, `categorySource` and an
    optional `proposedCategory`. `MappedRow` loses `category` and gains
    `counterparty`. `PreviewSummary` stays the same.
  - **Teaching rows**: committed rows with a non-empty key whose source is
    `learned`, `suggested` or `chosen`. Per key, the majority category wins.
    A tie goes to the latest date, then to the later row in the statement.
    Learning skips any rule into a category that does not exist.
- **Precedence** (one pure categorizer):
  1. A Category Rule whose category still exists
  2. The first matching Keyword Group that resolves to a visible category
  3. A proposal of that group's canonical name
  4. `Miscellaneous` / `unmatched`
- **Storage**: `storage.categoryRules` is covered by the storage parity
  suite. The categories repo's rename, reassign-on-delete and plain delete
  keep `category_rules` consistent inside the same transaction.
- **Persistence boundary**: approving a proposal is the only decision
  persisted before commit, because it creates a real category. Everything
  else is persisted only by a successful Import Commit. Cancelling the
  wizard leaves nothing behind except a category the user created on
  purpose.
- **Naming**: always say **Category Rule**, never "rule" alone, in import code
  and docs.
- **UI**: every chip and strip colour comes from Meridian tokens. The Category
  Source chip is separate from the duplicate, recurring and pending flags and
  from the "needs a description" blocker.

---

## Phase 1: Learn and apply

**User stories**: 1–7, 10–13, 14 (rules part), 15, 16, 19–24, 29, 30, 32,
55–57, 63–66, 68, and 67 (Learned)

### What to build

This is the tracer bullet through every layer. Statement mapping stops
categorizing and records each row's Counterparty instead, taken from the
description cell for every preset and for generic CSVs. The preview derives
each row's Counterparty Key. A row whose key has a Category Rule arrives in
the rule's category with the source `learned`. Every other row stays
`Miscellaneous` / `unmatched`.

The review table shows a muted "Learned" chip beside the category picker,
and nothing for `chosen` or `unmatched` rows. Picking a category marks the
row `chosen`. The commit sends each row's counterparty and source. The server
re-derives the keys, derives the Category Rules from the teaching rows and
upserts them. Applying migration 018 to an existing database keeps imports,
categories and presets as they are.

The existing hardcoded keyword list is retired in this phase, and Phase 3
replaces it with Keyword Groups. Until then, cold-start rows land in
Miscellaneous. The User Manual Import topic explains the Learned chip.

### Acceptance criteria

- [ ] Migration 018 creates `category_rules`. Existing data survives the
      upgrade untouched.
- [ ] `counterpartyKey` normalises case, NFKC, digits, dates, branch numbers
      and punctuation. It drops tokens under 2 letters, caps the token count,
      is idempotent, preserves umlauts, and returns an empty key for
      digits-only input. It is checked against the anonymised fixture
      exports.
- [ ] `storage.categoryRules.findAll` / `learn` upsert and overwrite, stamping
      `updated_at`, and pass the storage parity suite.
- [ ] `deriveCategoryRules` uses teaching sources only and skips empty keys.
      The majority wins, ties go to the latest date and then the later row,
      and the key is re-derived from the raw counterparty.
- [ ] The preview applies a previously learned Category Rule as `learned`,
      including a rule into a Hidden Category. Unmatched rows are
      `Miscellaneous` / `unmatched`.
- [ ] The commit learns only from teaching rows and never into a category
      that does not exist. It ignores any key sent by the client. Excluded
      (unchecked) rows teach nothing.
- [ ] An older payload without the new fields commits successfully and
      teaches nothing. A commit that fails validation learns nothing.
- [ ] A row deliberately set to Miscellaneous is learned. A row left on the
      fallback is not.
- [ ] Deleting an import keeps its Category Rules. Backup, restore and reset
      include `category_rules`.
- [ ] Hand-entered Variable Spending and Month Overview edits never create
      Category Rules.
- [ ] The review table shows "Learned" beside the picker and no chip for
      `chosen` or `unmatched` rows. The Map-columns step is unchanged.
- [ ] The User Manual Import topic describes the Learned chip as it behaves.
- [ ] A second import of the same statement arrives mostly categorized,
      which is the demo.

---

## Phase 2: Rules follow categories

**User stories**: 59–62

### What to build

Category Management changes carry through to Category Rules:

- Renaming a category moves its Category Rules to the new name.
- Deleting a category and reassigning its transactions moves its rules to
  the target category.
- Deleting an unused category deletes its rules in the same transaction.

As a safety net, the preview ignores any Category Rule whose category no
longer exists, so a stale rule never assigns a missing category.

### Acceptance criteria

- [ ] Renaming a category rewrites its `category_rules` rows. The next
      preview shows the renamed category as `learned`.
- [ ] Reassign-on-delete moves the rules to the target category.
- [ ] A plain delete of an unused category removes its rules.
- [ ] All three cascades are covered in the storage parity suite.
- [ ] The preview skips a dangling Category Rule and falls through the
      normal precedence.

---

## Phase 3: Keyword Groups

**User stories**: 9, 17, 18, 25–28, 31, and 67 (Suggested)

### What to build

This phase replaces the retired keyword list with ordered Keyword Groups.
Each group has a canonical name, synonyms and keywords. The canonical names
are Groceries, Dining, Transport, Shopping, Health, Housing, Income,
Subscriptions, Entertainment, Investment, Transfer and Insurance.

When no Category Rule applies, the categorizer substring-matches the
lowercased counterparty plus the description against the groups in order.
A matching group resolves case-insensitively to the user's first **visible**
category with the canonical name or a synonym, and those rows arrive as
`suggested`. A suggestion that the user commits teaches a Category Rule.

The Renault preset gains a preset-only `counterpartyColumn`
(`Name Zahlungsbeteiligter`), so learning keys on the merchant. Renault
rows with a blank counterparty fall back to the booking text. The review
table shows a "Suggested" chip, and the Manual explains it.

In this phase, a group that matches but has no visible category falls
through to the next group, and then to Miscellaneous. Phase 4 turns that
case into a proposal.

### Acceptance criteria

- [ ] A keyword group resolves to a visible category by canonical name or by
      synonym, case-insensitively.
- [ ] A Hidden Category is never suggested.
- [ ] A Category Rule always beats a keyword match.
- [ ] A keyword is found in either the counterparty or the description.
- [ ] No match gives `Miscellaneous` / `unmatched`.
- [ ] A Renault counterparty comes from `Name Zahlungsbeteiligter`, falling
      back to `Buchungstext` on blank rows. Other presets and generic CSVs
      use the description. This is covered by the per-bank fixture tests.
- [ ] Stored `import_presets` and the Map-columns step are unchanged.
- [ ] A committed `suggested` row teaches a Category Rule.
- [ ] The review table shows the "Suggested" chip, and the Manual describes
      it.
- [ ] On an untouched install, a first import is partly categorized into the
      default categories, which is the demo.

---

## Phase 4: Category Proposals

**User stories**: 8, 14 (proposal part), 33–49, 58, and 67 (proposals)

### What to build

When a Keyword Group matches but the user has no visible category for it,
the categorizer proposes the group's canonical name. It skips the proposal
when that name was declined or belongs to a Hidden Category, and then tries
the next group. Proposed rows sit in Miscellaneous with the source
`proposed` and a "New: {name}" chip.

Above the review table, one strip per proposed category shows its name and
row count, with **Create category** and **Dismiss**:

- **Create category** creates the category immediately through the existing
  categories API, using the next unused palette colour (or a stable fallback
  colour once all swatches are taken). It refreshes the categories cache, so
  every picker shows the new category, and moves the still-proposed rows into
  it as `suggested`. Rows the user already changed stay as they are. If
  creation fails, the strip stays and shows the error.
- **Dismiss** returns the rows to `unmatched` and records the name for the
  commit, which persists it as declined. An undecided proposal teaches
  nothing and returns on the next statement. Proposals never block the
  commit.

The CategorySelect gains a controlled `value`, so the wizard drives each
row's picker. The inline-add hook reads categories through the cached
resource, so a long statement fetches categories once rather than once per
row. The modal consumers keep their current behaviour. The Manual explains
proposals.

### Acceptance criteria

- [ ] `declined_category_proposals` and the `findDeclined` / `decline` repo
      methods exist. Declining is idempotent and case-insensitive, and the
      table is part of backup, restore and reset.
- [ ] `categorizeRow` proposes for a missing category. A declined or hidden
      canonical name falls through to the next group. Proposals use shipped
      canonical names only, never a merchant's name.
- [ ] `nextFreeCategoryColor` returns the first unused swatch, and falls back
      to `colorForCategoryName` once all swatches are used.
- [ ] `useCategoryProposals` produces one proposal per category with its row
      count. Approve creates the category with the free colour, bumps the
      `CATEGORIES` cache and moves only still-proposed rows. Dismiss
      un-proposes the rows and records the name. A failed create keeps the
      proposal and surfaces the error.
- [ ] The commit persists `declinedProposals`. Cancelling the wizard leaves no
      declined name behind.
- [ ] A controlled `value` beats `initialCategory`.
- [ ] Many pickers share one cached categories read, and an inline-add shows
      up in the other pickers.
- [ ] `TransactionCreateModal` and `RecurringTransactionModal` are unchanged.
- [ ] The review UI shows the strips with name and count. Create and Dismiss
      update the rows, and the commit is never disabled by a proposal.
- [ ] The Manual describes Category Proposals as they behave.

---

## Phase 5: Same-Counterparty Propagation

**User stories**: 50–54

### What to build

When the user changes one row's category in review, every other row of the
statement with the same non-empty Counterparty Key that the user has not
touched follows it. The edited row and every row that followed become
`chosen`, so the whole group teaches the Category Rule on commit. Touched
rows, whether changed by hand or by an earlier propagation, are never
overwritten. Rows with an empty key never propagate.

A client mirror of `counterpartyKey` powers this, and a parity test keeps it
in step with the server. Setting a row to its current category is a no-op,
so the picker's mount-time `onChange` doesn't count as a change.

### Acceptance criteria

- [ ] The client `counterpartyKey` mirror returns the same key as the server
      for a shared input table, following the `paletteMirror.test.ts`
      pattern.
- [ ] `propagateCategory`:
  - same-key untouched rows follow
  - touched rows are never overwritten
  - empty keys never propagate
  - every affected row becomes `chosen`
- [ ] `setCategory` ignores the row's current category. Opening the review
      step marks no row `chosen`.
- [ ] Ten Amazon rows need one correction, and the commit teaches the rule,
      which is the demo.
