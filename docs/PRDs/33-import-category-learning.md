## Problem Statement

I import my bank statements into Horizon every month, and almost every
imported row lands in Miscellaneous. The categorizer knows a handful of
keywords, looks only at the description, and was written for the eight
categories Horizon shipped with, before I could make my own. So my REWE rows
arrive as Miscellaneous, I move them to Groceries in the review step, I commit,
and the next statement brings exactly the same REWE rows back as Miscellaneous.
Horizon forgets every correction I make.

The cold start is also blind to my own category set. If I have hidden Food and
made Groceries instead, a supermarket row cannot find its way there. If I have
no Health category, a pharmacy row falls straight into Miscellaneous, with no
hint that a category for it would make sense.

Inside one statement the work multiplies: ten Amazon rows mean ten identical
corrections, one row at a time.

## Solution

**Horizon remembers what I approved.** Committing an import is the approval.
For every row whose category I accepted or picked, Horizon stores a **Category
Rule** from that row's **Counterparty** to the category. On the next statement,
rows from the same counterparty arrive already in that category, marked
"Learned". If I change one, the commit overwrites the rule. Rules are global
across accounts and banks, because a merchant is the same category whichever
account pays it.

**Learning keys on who was paid, not on what I typed.** The Counterparty is the
raw source cell as the bank exported it: the bank's counterparty column where
the preset knows one (Renault), otherwise the description cell, taken before I
edit anything. It is normalised into a **Counterparty Key** that ignores case,
digits, dates, branch numbers and reference noise. Matching on that key is
exact, so a learned rule never surprises me.

**A better cold start that respects my category names.** When there is no rule,
built-in **Keyword Groups** match against the counterparty and the description
together. Each group has a canonical name and synonyms, and it resolves to the
first visible category of mine with one of those names. A supermarket suggests
my Food on an untouched install and my Groceries if I made one. These rows are
marked "Suggested".

**Horizon proposes a category, never invents one.** When a keyword group
matches but I have no visible category for it, the rows stay in Miscellaneous
and a **Category Proposal** strip appears above the review table: "New
category: Health · 3 rows — Create category / Dismiss". Creating it adds the
category right away, in the next unused palette colour, and moves those rows
into it. Dismissing it is remembered once I commit, and Horizon never proposes
it again. Proposals only ever use the shipped canonical names, never a
merchant's name. A proposal never blocks the commit.

**Fix one row, fix them all.** When I change a row's category in review, every
other row of the same statement with the same Counterparty Key that I have not
touched follows it.

**Nothing is learned from what I didn't decide.** Rows I left on the fallback
Miscellaneous, and rows whose proposal I neither approved nor dismissed, teach
nothing. A 300-row first import cannot lock every unknown merchant into
Miscellaneous. If I deliberately pick Miscellaneous, that is a choice and it is
learned.

**Rules follow my categories.** Renaming a category, or deleting one and
reassigning its transactions, moves its rules too. Deleting an unused category
deletes its rules. Deleting an import does not unlearn anything.

## User Stories

### Learning from the commit

1. As a user, I want committing an import to remember the category of every row I accepted or picked, so that I never correct the same merchant twice.
2. As a user, I want rows from a counterparty I have taught before to arrive in its learned category on the next statement, so that my second import of a bank is mostly right without work.
3. As a user, I want learned rows marked "Learned" in the review table, so that I can see which categories come from my own past decisions.
4. As a user, I want changing a learned row's category and committing to overwrite the rule, so that I can correct a rule without a rule editor.
5. As a user, I want rules to apply across all my accounts and banks, so that a merchant paid from my Girokonto and from my credit card lands in the same category.
6. As a user, I want rows I left on the fallback Miscellaneous to teach nothing, so that unknown merchants are not frozen into Miscellaneous by my first big import.
7. As a user, I want a row I deliberately set to Miscellaneous to be learned, so that a counterparty I really consider miscellaneous stays there.
8. As a user, I want a row with an undecided Category Proposal to teach nothing, so that a question I have not answered is not recorded as an answer.
9. As a user, I want a Keyword Group suggestion that I accept by committing to be learned, so that the suggestion becomes my rule and survives keyword changes.
10. As a user, I want rows excluded from the commit (unchecked duplicates, recurring or pending rows) to teach nothing, so that only rows I actually imported shape my rules.
11. As a user, when one statement commits the same counterparty into two categories, I want the category with the most rows to win, so that one odd row does not override the majority.
12. As a user, when such a split is a tie, I want the category of the most recent row to win, so that my latest intent counts.
13. As a user, I want a row whose counterparty normalises to nothing (only digits or punctuation) to be neither looked up nor learned, so that empty keys never match unrelated rows.
14. As a user, I want cancelling the wizard to leave no learned rule and no declined proposal behind, so that abandoning an import has no side effects beyond a category I explicitly created.
15. As a user, I want a commit that fails validation to learn nothing, so that rules only come from imports that actually landed.

### The Counterparty

16. As a user, I want learning keyed on the bank's original counterparty text rather than the description I may edit in review, so that fixing a description does not break the match next month.
17. As a Renault user, I want learning keyed on the counterparty name column, so that rules use the merchant rather than the booking text.
18. As a Renault user, I want interest and tax rows with a blank counterparty to fall back to the booking text, so that they can still be categorized and learned.
19. As a Sparkasse or Postbank giro user, I want the counterparty taken from the payee column the description already uses, so that nothing changes in how my statements are mapped.
20. As a Postbank credit-card user, I want the merchant line used as the counterparty, so that my card purchases are learned per merchant.
21. As a user of a generic CSV, I want the description used as the counterparty, so that learning works for banks without a preset.
22. As a user, I want the key to ignore case, digits, dates, branch numbers and reference noise, so that "REWE Markt GmbH 4711" and "rewe markt gmbh 0815" are the same counterparty.
23. As a user, I want the key to match exactly, never by prefix or fuzzily, so that a learned rule never catches a merchant I did not teach.
24. As a user, I want my existing Map-columns step and remembered column mappings to stay exactly as they are, so that this feature adds nothing for me to configure.

### Keyword Groups (cold start)

25. As a first-time importer, I want common merchants (supermarkets, restaurants, transport, shops, pharmacies, insurers, rent, salary, subscriptions, brokers) recognised out of the box, so that my first import is already partly categorized.
26. As a user, I want keyword matches looked for in the counterparty and the description together, so that a keyword in either field is found.
27. As a user, I want keyword suggestions marked "Suggested", so that I can tell a built-in guess from my own learned rule.
28. As a user who renamed my world, I want a keyword group to resolve to my own category by its canonical name or a synonym, so that a supermarket goes to my Groceries or to my Food, whichever I have.
29. As a user, I want a learned rule to take precedence over any keyword, so that my own decision always beats the built-in vocabulary.
30. As a user, I want the fallback to remain Miscellaneous when nothing matches, so that every row still has a valid category.
31. As a user with a hidden default category, I want keyword groups never to suggest it, so that my decision to hide it is respected.
32. As a user, I want a rule I learned into a category I later hid to keep working, so that hiding a category in the pickers never changes my data.

### Category Proposals

33. As a user without a category a keyword group matched, I want Horizon to propose creating it, so that I discover a useful category instead of the rows silently becoming Miscellaneous.
34. As a user, I want one proposal strip per proposed category per statement, showing its name and row count, so that six transport rows make one question rather than six.
35. As a user, I want proposed rows to show a "New: {name}" chip and sit in Miscellaneous until I decide, so that the review table is valid while the question is open.
36. As a user, I want "Create category" to create the category immediately with the next unused palette colour, so that it looks distinct from my existing categories.
37. As a user, once every palette colour is taken, I want a created category to still get a stable colour, so that creation never fails for lack of a swatch.
38. As a user, I want creating a proposed category to move its proposed rows into it, marked "Suggested", so that they appear as they will on the next import.
39. As a user, I want rows I already changed by hand not to be moved when I approve a proposal, so that my own choices are never overwritten.
40. As a user, I want a newly created category to appear in every row's category picker at once, so that I can assign other rows to it right away.
41. As a user, I want "Dismiss" to put the proposed rows back to plain Miscellaneous, so that the strip goes away and the rows are simply unmatched.
42. As a user, I want a dismissed proposal remembered once I commit, so that Horizon never asks me about that category again.
43. As a user, I want an undecided proposal to come back on the next statement, so that ignoring it is not the same as declining it.
44. As a user, I want the commit button never gated on proposals, so that I can import without answering them.
45. As a user, I want a proposal skipped when its canonical name belongs to a hidden category, so that Horizon does not try to create a name that already exists.
46. As a user, when a proposal is skipped because it was declined or hidden, I want the next keyword group to be tried, so that the row still gets the best available suggestion.
47. As a user who declined a proposal and later changed my mind, I want creating that category by hand in Category Management to make keyword groups suggest it, so that there is a way back without a special undo screen.
48. As a user, I want proposals only ever named after shipped canonical categories, never after a merchant, so that my category list never fills up with store names.
49. As a user, if creating a proposed category fails (for example a name collision), I want the proposal to stay and an error shown, so that I can try again or dismiss it.

### Same-Counterparty Propagation

50. As a user, when I change one row's category, I want every same-counterparty row I have not touched to follow, so that ten Amazon rows need one correction.
51. As a user, I want a row I already changed by hand, or one that already followed a propagation, never to be overwritten by a later propagation, so that the order I edit rows in does not destroy my work.
52. As a user, I want every row that followed a propagation to count as my choice when committed, so that the whole group teaches the rule.
53. As a user, I want opening the review step not to count as a change on any row, so that rows are not marked as chosen just because their picker rendered.
54. As a user, I want rows with an empty counterparty key never propagated to each other, so that unrelated blank-counterparty rows stay independent.

### Review step display

55. As a user, I want the source chip muted and beside the category picker, so that it informs without competing with flags or blockers.
56. As a user, I want rows I chose and rows on the fallback to show no chip, so that the table stays quiet where there is nothing to explain.
57. As a user, I want the category source kept separate from the duplicate/recurring/pending flags and from the "needs a description" blocker, so that "why this category" is never confused with "why this row is set aside" or "why it cannot commit".
58. As a user, I want the review table to load categories once rather than once per row, so that a long statement opens quickly.

### Categories and rules

59. As a user, I want renaming a category to move its rules to the new name, so that learning survives a rename.
60. As a user, I want deleting a category and reassigning its transactions to move its rules to the target, so that rows I taught keep a valid destination.
61. As a user, I want deleting an unused category to delete its rules, so that no rule ever points at a category that no longer exists.
62. As a user, I want a rule whose category somehow no longer exists to be ignored in the preview, so that a stale rule never puts a row in a missing category.
63. As a user, I want deleting an import from Import History to leave my rules in place, so that knowledge outlives the statement it came from.
64. As a user, I want my rules and declined proposals included in backup, restore and reset, so that they travel with my database like everything else.

### Compatibility and documentation

65. As a user upgrading Horizon, I want my existing imports, categories and presets untouched by the upgrade, so that learning starts from my next commit.
66. As a user, I want an older client (or a commit without the new fields) to still commit successfully and simply teach nothing, so that the change never breaks importing.
67. As a user, I want the User Manual Import topic to explain the Learned and Suggested chips and Category Proposals, so that the in-app guide describes Horizon as it behaves.
68. As a user, I want hand-entered Variable Spending and Month Overview edits never to create rules, so that only imports, which have a counterparty, shape learning.

## Implementation Decisions

Source of truth: design log 33 (Q1–Q24). All recommendations were approved in
advance by the user.

### Modules

**Server — pure (csvImport engine, storage-free, injected data):**

- **Counterparty Key** — `counterpartyKey(raw) → string` plus the named
  constant `COUNTERPARTY_KEY_TOKENS = 3`. NFKC, lowercase, every run of
  non-letters becomes a space, tokens under 2 letters dropped, first N tokens
  joined by single spaces. Empty string means "no key". Idempotent. The token
  count is tuned during build against the anonymised fixture exports. Deep
  module: a one-function interface over all normalisation rules.
- **Auto-Categorization (rewritten)** — replaces the flat keyword list with
  ordered `KEYWORD_GROUPS` (`{ category, synonyms, keywords }`) and exposes
  `categorizeRow(row, ctx) → { category, categorySource, proposedCategory? }`
  with `ctx = { rules: Map<key, category>, categories, declined: Set<lowercased name> }`.
  Precedence: Category Rule for the key (only if the category still exists) →
  first matching Keyword Group (resolving to the first visible category named
  canonical or synonym, case-insensitive; else proposing the canonical name
  unless declined or taken by a Hidden Category, in which case the next group
  is tried) → `Miscellaneous` / `unmatched`. Haystack is the lowercased raw
  counterparty plus description; matching is a substring test. Canonical
  names: Groceries, Dining, Transport, Shopping, Health (prototype names);
  Housing, Income, Subscriptions, Entertainment, Investment, Transfer (default
  names); plus Insurance. Exact keyword lists are a build detail. Deep module.
- **Rule derivation** — `deriveCategoryRules(rows) → CategoryRule[]`. A row
  teaches when its re-derived key is non-empty and its source is `learned`,
  `suggested` or `chosen`. Per key, the category with the most teaching rows
  wins; ties go to the latest date, then to the later row in the statement.
  Deep module.
- **Statement mapping** — `mapStatementRows` stops categorizing. `MappedRow`
  drops `category` and gains `counterparty`: the preset's Counterparty Column
  cell when non-empty, else the description cell, as parsed.
- **Preview orchestration** — `buildPreview` runs categorization next to
  duplicate and recurring flagging. `BuildPreviewInput` gains `categoryRules`,
  `categories` and `declinedProposals`, injected as plain data like
  `existingTxns` and `recurring`. `PreviewRow` gains `category`,
  `counterparty`, `categorySource` and optional `proposedCategory`.
  `PreviewSummary` is unchanged.
- **Bank presets** — optional preset-only `counterpartyColumn`, like
  `pendingColumn`; set on Renault only (`Name Zahlungsbeteiligter`). Not part
  of `ColumnMapping`; the Map-columns step and stored `import_presets` JSON are
  untouched.
- **Shared type** — `CategorySource = "learned" | "suggested" | "proposed" | "unmatched" | "chosen"`,
  mirrored in the client import types.

**Server — storage:**

- **Schema** — migration 018 adds `category_rules (counterparty_key TEXT PRIMARY KEY, category TEXT NOT NULL, updated_at TEXT NOT NULL)`
  and `declined_category_proposals (name TEXT PRIMARY KEY COLLATE NOCASE)`.
  Rules reference categories by name, like Transactions and
  RecurringTransactions.
- **CategoryRulesRepo** — exposed as `storage.categoryRules`:
  `findAll()`, `learn(rules)` (upsert in one transaction, stamping
  `updated_at`), `findDeclined()`, `decline(names)` (insert-or-ignore). Covered
  by the storage parity suite.
- **Category Reassignment** — the categories repo's rename cascade and
  reassign-on-delete also update `category_rules`; a plain delete of an unused
  category deletes its rules in the same transaction.

**Server — routes:**

- **Import Preview Request** — loads rules, categories and declined proposals
  from storage and passes them into `buildPreview`. Still writes nothing.
- **Import Commit** — `ImportRowSchema` gains optional `counterparty`
  (default `""`) and `categorySource` (default `"unmatched"`);
  `ImportCreateSchema` gains optional `declinedProposals: string[]` (default
  `[]`). Same optional-with-default pattern as `delimiter` / `decimal` /
  `dateFmt`, so older clients commit and teach nothing. After
  `imports.create`, the route re-derives every key server-side (never trusting
  a client key), runs `deriveCategoryRules`, filters to categories that exist,
  then calls `categoryRules.learn` and `categoryRules.decline` — the same
  post-create step as the preset upsert.

**Client:**

- **Review rows** — `ParsedImportRow` gains `counterparty`, `categorySource`
  and `proposedCategory`. New pure `propagateCategory(rows, id, name)`: the
  edited row becomes `chosen`; every other untouched row with the same
  non-empty key gets the same category and becomes `chosen`; touched rows are
  never overwritten. `setCategory` ignores a name equal to the row's current
  category, so the CategorySelect mount-time `onChange` is not a change.
- **Category proposals hook** — `useCategoryProposals`, in its own module
  folder under the import feature: derives one proposal per distinct
  `proposedCategory` with its row count; `approve(name)` creates the category
  via the existing categories API with the Next Free Colour, bumps the
  `CATEGORIES` cache key and moves still-proposed rows to it as `suggested`;
  `dismiss(name)` sets those rows to `unmatched` and adds the name to the
  wizard-local declined set; exposes `declinedProposals` for the commit.
  On create failure the proposal stays and the error is surfaced.
- **Review UI** — `ReviewTable` renders a muted Category Source chip beside
  the picker ("Learned", "Suggested", "New: {name}"; nothing for `chosen` and
  `unmatched`). `ImportWizard` renders the proposal strips above the table and
  passes each row's category as the picker's controlled value. All colours
  come from Meridian tokens.
- **CategorySelect** — gains an optional controlled `value` (a category name)
  that wins over `initialCategory`. `TransactionCreateModal` and
  `RecurringTransactionModal` keep `initialCategory` and current behaviour.
- **Inline-add hook** — `useCategoriesWithInlineAdd` reads through
  `useCachedResource(CATEGORIES, …)` and bumps `CATEGORIES` after inline-add,
  collapsing N per-row fetches into one cached read.
- **Utils** — `counterpartyKey` client mirror in its own util folder (used only
  for propagation), and `nextFreeCategoryColor(categories)` in the category
  colour util: the first palette swatch no category uses, else
  `colorForCategoryName`.
- **User Manual** — the Import topic explains the Learned / Suggested chips
  and Category Proposals.
- **Glossary** — already updated with design log 33 (Auto-Categorization,
  Default Category note, superseded log-22 relationship, new terms).

### Delivery slices (from design log 33)

1. Learn and apply — key, counterparty/source on preview and commit,
   `category_rules`, `findAll`/`learn`, `deriveCategoryRules`, categorization
   in `buildPreview` with rules first, "Learned" chip.
2. Rules follow categories — cascades, dangling-rule skip.
3. Keyword Groups — canonical names, synonyms, visible-category resolution,
   counterparty+description haystack, Renault `counterpartyColumn`,
   "Suggested" chip.
4. Category Proposals — declined table and repo methods, `proposed` source,
   controlled + cache-backed CategorySelect, `nextFreeCategoryColor`,
   `useCategoryProposals`, proposal strip, `declinedProposals` on commit.
5. Same-Counterparty Propagation — `propagateCategory`, client key mirror and
   parity test, mount-`onChange` guard.
6. Docs in the app — User Manual Import topic.

## Testing Decisions

- Good tests check external behaviour through each module's public interface:
  the returned key, category and source, the derived rules, what the repo
  returns after a write, an HTTP response and what was persisted, what the
  review table renders and what a click changes. They never assert internal
  loops or the order of keyword lists. Amounts are integer cents and dates ISO
  strings in every fixture.
- **`counterpartyKey`.** Case, NFKC, digits, dates, branch numbers and
  punctuation stripped; tokens under 2 letters dropped; token cap; idempotence;
  digits-only gives empty; umlauts preserved. Run against the anonymised
  fixture exports to tune the token count.
- **Client key parity.** The client mirror returns the same key as the server
  for a shared table of inputs. Prior art: `paletteMirror.test.ts`.
- **`categorizeRow`.** Rule beats keyword; dangling rule skipped; keyword
  resolves by canonical name and by synonym, case-insensitively; hidden
  category never suggested; missing category proposes; declined or hidden
  canonical name falls through to the next group; no match gives
  Miscellaneous/`unmatched`; rule into a Hidden Category honoured; empty key
  skips rule lookup; keyword found in counterparty or in description.
- **`deriveCategoryRules`.** Teaching sources only; empty keys skipped;
  majority wins; tie by latest date then later row; key re-derived from the
  raw counterparty.
- **Statement mapping and preview.** Counterparty from Renault's counterparty
  column, falling back to `Buchungstext` on blank rows; description used for
  the other presets and generic. `buildPreview` carries category, source and
  proposal per row with injected rules/categories/declined. Prior art: the
  existing `buildPreview`, `detectStatement` and per-bank fixture tests.
- **`CategoryRulesRepo` and cascades.** `learn` upserts and overwrites;
  `decline` is idempotent and case-insensitive; rename, reassign-on-delete and
  plain delete keep `category_rules` consistent. Covered in the storage parity
  suite. Prior art: the existing categories repo tests.
- **Import routes.** Preview applies a previously learned rule. Commit learns
  from teaching rows only, never into a non-existent category, persists
  declined proposals, ignores a client-sent key, and an older payload without
  the new fields commits and teaches nothing. A failed commit learns nothing.
  Prior art: the existing imports route tests.
- **`propagateCategory` and `setCategory`.** Same-key untouched rows follow;
  touched rows never overwritten; empty keys never propagate; a set to the
  current category is a no-op. Prior art: the `reviewRows` tests.
- **`nextFreeCategoryColor`.** First unused swatch; fallback once all 20 are
  used. Prior art: `categoryColor.test.ts`.
- **`useCategoryProposals`.** One proposal per category with counts; approve
  creates with the free colour, bumps the cache and moves only still-proposed
  rows; dismiss un-proposes and records the name; create failure keeps the
  proposal.
- **CategorySelect / inline-add hook.** Controlled `value` wins over
  `initialCategory`; one cached categories read for many pickers; inline-add
  makes the new category appear in other pickers. Existing modal consumers
  unchanged.
- **Review UI.** Chips render per source and not for `chosen`/`unmatched`;
  proposal strip shows name and count; Create and Dismiss update the rows;
  commit is never disabled by a proposal. Prior art: the existing
  `ReviewTable` / `ImportWizard` tests.

## Out of Scope

- A Category Rules list or editor (a later candidate if live use asks).
- Un-declining a proposal from a UI; creating the category by hand is the way
  back.
- Learning from hand-entered Variable Spending or Month Overview edits.
- Re-categorizing past imports or Import History rows.
- Unlearning rules on Import Cascade Delete.
- Prefix or fuzzy counterparty matching.
- Per-account or per-bank rules.
- A user-mappable counterparty column in the Map-columns step.
- Inventing categories from merchant names.
- Gating the commit on undecided proposals.
- Any AI classifier (permanently deferred).

## Further Notes

- Known trade-offs: a shared counterparty (PayPal, Amazon Payments) learns one
  category for every merchant behind it — the user corrects per row and the
  majority wins. Card merchant lines that put a city inside the first three
  tokens learn per city; Keyword Groups still catch the big chains.
- Approving a proposal is the only decision persisted before commit, because a
  created category is a real, visible object the pickers need immediately.
  Everything else this epic remembers is persisted only by a successful
  Import Commit.
- Always say **Category Rule**, never "rule" alone, in import code and docs —
  "recurring rule" means a RecurringTransaction elsewhere.
- Design log: `docs/design-logs/33-import-category-learning.md`.
