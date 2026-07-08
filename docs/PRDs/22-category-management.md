## Problem Statement

Horizon ships eight fixed, seeded Categories (Income, Housing, Food,
Subscriptions, Entertainment, Investment, Transfer, Miscellaneous) and
lets the user do almost nothing with them: only _create_ and _delete_ on
custom ones, no rename, no recolor, no way to tidy the list. As a user I
can't shape the Category set to match how I actually think about my
spending — I can't rename a category, I can't recolor one to fix a clash
in the breakdown donut, and I can't get rid of a default I never use.

Worse, custom categories — the whole point of adding them — aren't even
usable where I most want them: the CSV import review screen shows each
row's category as read-only text, so I can't drop imported rows into a
category I just made. The list is a fixed menu I'm stuck with.

## Solution

Give the user real control over the Category set through a dedicated
management surface, without breaking the default names that code depends
on and without a risky data migration.

- A **CategoriesCard** in Settings with a "Manage categories" button opens
  a **CategoryManagerModal** — the full CRUD surface.
- **Custom Categories** (the ones the user created) get full control:
  add, rename, recolor, delete.
- **Default Categories** (the eight seeded ones) get **recolor + hide**
  only — never renamed, never deleted, because some of their names are
  load-bearing in code (`settlement.ts` writes `"Transfer"`; the CSV
  auto-categorizer falls back to `"Miscellaneous"`).
- **Hiding** a default removes it from the category pickers but never
  touches data — its existing transactions still count in every report.
- **Renaming** a custom category cascades the change across all its
  transactions and recurring transactions in one atomic move.
- **Deleting** a custom category that has transactions prompts the user to
  move those transactions to another category first — data is never
  orphaned or silently dropped.
- Recolor uses a **fixed 20-swatch palette**; the stored color becomes the
  authoritative source for every category-colored surface.
- In the **CSV import review**, the read-only category cell becomes the
  same **CategorySelect** used elsewhere (with inline-add), so imported
  rows can go into any category, custom included.

## User Stories

1. As a user, I want a "Manage categories" entry point in Settings, so
   that I have one obvious place to control my Category set.
2. As a user, I want to see my Categories split into a Default section and
   a Custom section, so that I understand which ones I can fully edit and
   which are protected.
3. As a user, I want to add a new Custom Category with a name and a color,
   so that I can track a kind of spending the seeded set doesn't cover.
4. As a user, I want to rename a Custom Category, so that I can refine my
   labels as my thinking changes (e.g. "Vet" → "Pets").
5. As a user renaming a Custom Category, I want all its existing
   transactions and recurring transactions to move to the new name
   automatically, so that no spending is left stranded under the old label.
6. As a user, I want to recolor any Category — default or custom — from a
   curated palette, so that I can fix color clashes in the breakdown donut
   and year-comparison.
7. As a user, I want to delete a Custom Category I no longer use, so that
   my picker list stays short and relevant.
8. As a user deleting a Custom Category that still has transactions, I want
   to be asked where to move those transactions (defaulting to
   Miscellaneous), so that I never lose the underlying spend.
9. As a user, I want to hide a Default Category I never use (e.g.
   "Investment"), so that it stops cluttering my category pickers.
10. As a user, I want a hidden Default Category's existing transactions to
    still appear in the breakdown donut and year-comparison, so that hiding
    is a visual convenience, not a way to accidentally erase real spend
    from my reports.
11. As a user, I want to un-hide a Default Category later, so that hiding is
    always reversible.
12. As a user, I want default categories shown but visually distinguished
    (greyed/disabled) when hidden in the manager, so that I can see and
    restore them.
13. As a user, I want the "hide" affordance to appear only on Default
    Categories and the "delete" affordance only on Custom Categories, so
    that the two operations are never confused.
14. As a user, I want the Category pickers (add transaction, add recurring
    transaction, import review) to omit hidden categories, so that I only
    see the categories I actually use when tagging.
15. As a user editing a transaction that already sits in a now-hidden
    category, I want to still see its current category value, so that
    hiding never silently mutates existing data or confuses me.
16. As a user, I want inline "add category" to stay available in every
    picker, so that I can create a category in the flow without leaving to
    Settings.
17. As a user importing a bank CSV, I want each review row's category to be
    an editable picker instead of read-only text, so that I can correct the
    auto-categorizer's guess.
18. As a user importing a bank CSV, I want to assign a row to a Custom
    Category (including one I just created inline), so that imported
    spending lands where I actually track it.
19. As a user, I want the category I choose per import row to be what
    actually gets committed, so that my review edits aren't discarded.
20. As a user, I want a rename or add that collides with an existing name
    (case-insensitively) to be rejected with a clear message, so that I
    never end up with two "Food" categories or a silent merge I didn't ask
    for.
21. As a user, I want category names trimmed of surrounding whitespace and
    capped at a sane length, so that stray spaces or absurdly long names
    don't slip in.
22. As a user, I want a friendly error if I try to rename or delete a
    Default Category through any path, so that the protection is explained
    rather than failing mysteriously.
23. As a user, I expect that recoloring a category updates it everywhere it
    appears — the breakdown donut, category badges, and year-comparison —
    so that the color I picked is the color I see.
24. As a user with a fresh install, I want the seeded defaults to look
    exactly as they do today until I touch them, so that the feature adds
    control without changing my starting point.
25. As a user, I want the manager to reflect changes immediately after I
    make them, so that I can see the result of a rename/recolor/hide/delete
    without a manual refresh.
26. As a user, I want an empty "no custom categories yet" state in the
    manager, so that a fresh install communicates that adding is possible.
27. As a user, I want the reassignment target picker in the delete flow to
    exclude the category being deleted, so that I can't move transactions
    into the thing I'm removing.

## Implementation Decisions

**Referencing model — names, not ids (unchanged).** Transactions and
recurring transactions continue to reference their Category by `name`
(TEXT). Categories remain a _simple label_, not a first-class entity. No
`category_id` FK migration. This is the crux decision: it keeps import
categorization, settlement, and reports keying on names, and makes
_rename_ a cascade rather than a single-row update.

**Defaults are protected.** The eight seeded Categories (`is_default = 1`)
support **recolor + hide** only. They are never renamed and never deleted.
This sidesteps the load-bearing literals in `settlement.ts`
(`category: "Transfer"`) and the CSV auto-categorizer's `"Miscellaneous"`
fallback without any code decoupling. Custom categories (`is_default = 0`)
get full CRUD.

**Hidden is a picker filter, never a data filter.** A hidden Default
Category is dropped from the `CategorySelect` options everywhere, but its
transactions still exist and still appear in the Month Overview breakdown
donut and the year-comparison. Making real spend vanish from totals is
disallowed. `hidden` applies to defaults only (custom uses delete).

**Schema change (one migration).** Add a `hidden` column to `categories`:
`ALTER TABLE categories ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0`
(next migration in sequence, forward-only). Final `categories` columns:
`id`, `name` (UNIQUE), `is_default`, `color` (now authoritative),
`hidden`.

**Category type gains `color` and `hidden`.** The frontend `Category`
interface (currently `id`, `name`, `isDefault`) gains `color: string` and
`hidden: boolean`. `findAll` returns the stored color, falling back to the
name-derived color only when the stored color is NULL (untouched
defaults).

**Color becomes authoritative.** The stored `categories.color` column is
the source of truth. `colorForCategoryName` demotes to a NULL-only
fallback for untouched seeded defaults. Category-colored surfaces
(breakdown donut, badges, year-comparison) read `category.color` instead
of re-hashing the name.

**Palette expands to 20.** `categoryColorPalette` grows from 10 to 20
on-theme Meridian/MD3 swatches, aligning with the 20-swatch Account Color
Palette (categories outnumber accounts; 10 forces repeats). The palette
lives in two mirrored files —
`server/src/storage/categoryColors.ts` and
`src/utils/categoryColor/categoryColor.ts` — which must carry **identical**
values. Recolor uses this fixed palette; freeform hex is rejected (a11y +
off-brand risk).

**Storage — `CategoriesRepo` grows from 3 methods to 6.** The deep module
is the repo: it owns all the cascade/atomicity/validation logic behind a
small interface.

- `findAll()` — returns Categories with resolved color + hidden.
- `create(input)` — unchanged shape; rejects case-insensitive name
  collision.
- `rename(id, name)` — **cascade** in one transaction: update the
  `categories` row, then every `transactions` and `recurring_transactions`
  row holding the old name. Rejects: not-found, default (`is_default`),
  case-insensitive collision, invalid name (trim, non-empty, max 40).
- `recolor(id, color)` — update `categories.color`. Allowed on defaults.
- `setHidden(id, hidden)` — update `categories.hidden`. Rejected for
  custom categories (custom uses delete).
- `delete(id, reassignTo?)` — if in-use and `reassignTo` is given, run
  the reassignment cascade (bulk update transactions + recurring to the
  target name) then delete, all in one transaction. Default categories
  still blocked. In-use with no `reassignTo` still blocked.

**Category Reassignment is the shared cascade.** The atomic bulk move of a
Category's transactions _and_ recurring transactions from one name to
another is the single primitive behind both `rename` and
`reassign-on-delete`. It is one better-sqlite3 transaction — all-or-nothing,
the same guarantee as `transfers.create`.

**Routes.**

- `PATCH /categories/:id` — body `{ name?, color?, hidden? }`. Returns
  409 on collision, default-rename, or setHidden-on-custom.
- `DELETE /categories/:id?reassignTo=<id>` — reassign target optional;
  409 `in_use` only when in-use _and_ no reassign target is supplied.
- `GET /categories` and `POST /categories` unchanged in shape (payloads
  now carry `color` + `hidden`).

**Auto-categorizer stays hardcoded to defaults.** The CSV keyword→category
map (`categorize.ts`) is not taught custom categories. Flexibility comes
from the per-row `CategorySelect` in the import review, not from custom
keyword rules. (Custom keyword rules are a separate future item.)

**UI modules.**

- `src/features/settings/CategoriesCard/` — Settings-grid card: blurb +
  "Manage categories" button.
- `src/features/categories/CategoryManagerModal/` — the full CRUD surface:
  a Default section (recolor swatch + hide toggle per row) and a Custom
  section (rename, recolor swatch, delete per row), plus an inline add
  row. Delete-with-reassign uses the shared `Modal` + `CategorySelect`.
- `CategorySelect` — filter `hidden` from its options; always include the
  currently-selected value even if hidden; retain inline-add.
- `ImportPreview` — replace the read-only `StyledCategory` cell with
  `CategorySelect`; thread the per-row category choice through the import
  wizard state so it is what gets committed (slice 2).

**Two slices, one feature.**

- Slice 1 — Settings CRUD (migration → color/recolor → rename cascade →
  hide → delete-with-reassign → CategoriesCard/CategoryManagerModal).
- Slice 2 — Import categorization (swap the import review cell for
  `CategorySelect`, thread per-row category to commit).

## Testing Decisions

**What makes a good test here.** Test external behavior through the repo
and route interfaces, not the SQL. A good test states a scenario and
asserts an observable outcome — "renaming a custom category moves all its
transactions to the new name", "deleting an in-use custom category with a
reassign target leaves zero orphaned rows", "hiding a default drops it from
the picker but leaves its spend in the breakdown" — never "the UPDATE ran
with these bind params". Tests should survive a refactor of the internals.

**Storage — the primary test target (Parity Spec).** The `CategoriesRepo`
changes belong in the shared `storage.parity.ts` suite so both drivers are
held to identical behavior (prior art: the existing
`CategoriesRepo.findAll` / `create` / `delete` / `color` parity blocks).
Cover:

- `rename` cascades to transactions and recurring transactions; rejects
  default, case-insensitive collision, invalid name, not-found.
- `recolor` updates the stored color; allowed on defaults; `findAll`
  returns the stored color and falls back to the name-derived color only
  when NULL.
- `setHidden` toggles hidden; rejected for custom; `findAll` reflects it.
- `delete(id, reassignTo)` cascades the reassignment then deletes with no
  orphaned rows; `delete(id)` on an in-use custom still blocks; default
  delete still blocks.
- Category Reassignment atomicity — a mid-cascade failure leaves _nothing_
  changed.

**Routes.** `categories.test.ts` covers `PATCH` (name/color/hidden bodies
and their 409s) and `DELETE ?reassignTo=` (with and without target),
mirroring the existing route-test style.

**Color utility.** `colorForCategoryName` keeps its unit tests (every
`src/utils/` function must have a test); add cases proving it is only the
NULL fallback. A guard test asserts the two mirrored palette files hold
identical values so they can't silently diverge.

**Frontend.** `CategorySelect` — test that hidden options are filtered but
a currently-selected hidden value still renders, and inline-add still
works. `CategoryManagerModal` — test the affordance rules (hide only on
defaults, delete only on custom) and the delete-with-reassign flow at the
component boundary. `ImportPreview` — test that the per-row category
selection flows through to the committed rows (prior art:
`useImportWizard.test.ts`).

## Out of Scope

- **id-based FK migration.** Categories stay a name-referenced label; no
  `category_id` columns. (Would only revisit if categories became entities
  other features hang off — budgets, rules, AI. They are not.)
- **Renaming or deleting Default Categories.** Protected by design because
  their names are referenced in code.
- **Hiding Custom Categories.** Hidden applies to defaults only; custom
  uses delete.
- **Silent merge on rename collision.** A rename onto an existing name is
  rejected; merging is expressed as delete + reassign, not rename.
- **Hiding as a data filter.** Hidden never removes real spend from reports
  — picker visibility only.
- **Custom keyword rules for the auto-categorizer.** The CSV
  auto-categorizer stays hardcoded to defaults; per-row override is the
  flexibility mechanism. A future "Import Categorization Rules" item owns
  learned custom rules.
- **Freeform hex color entry.** Recolor is a fixed 20-swatch palette.

## Further Notes

- **Trade-off accepted:** rename is O(rows) (a cascade across two tables)
  rather than O(1). Acceptable for a single-user offline SQLite database,
  and the direct consequence of keeping name as the join key.
- **Mirrored-palette hazard:** the 20 swatches live in two files that must
  never diverge; a guard test enforces equality.
- **Vocabulary (from the design log / ubiquitous language):** Custom
  Category, Default Category, Hidden Category, Category Reassignment,
  CategoryManagerModal, CategoriesCard. "Hide" ≠ "delete" (different
  targets, different reversibility); "rename" is a reassignment cascade,
  never an in-place key edit; Category Color is authoritative once stored,
  with `colorForCategoryName` as a NULL-only fallback.
- Design log: `docs/design-logs/22-category-management.md`. Ubiquitous
  language updated with the Category Management section and flagged
  ambiguities ("hide/delete", "rename (Category)", "Category Color
  authoritative vs derived").
