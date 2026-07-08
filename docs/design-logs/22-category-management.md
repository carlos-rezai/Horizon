# 22 — Category Management

## Background

Horizon seeds eight fixed Categories at migration time (Income, Housing,
Food, Subscriptions, Entertainment, Investment, Transfer, Miscellaneous)
and offers only `create` + `delete` on custom ones. Key facts about the
existing model:

- **Transactions and recurring transactions reference their category by
  `name` (TEXT), not by id.** Migration `013_fix_category_id_references`
  already healed rows where an id leaked into that column — the name is
  the join key everywhere.
- **Color is derived from the name at read time** on both the server
  (`server/src/storage/categoryColors.ts`) and a frontend mirror
  (`src/utils/categoryColor/categoryColor.ts`). The `categories.color`
  column exists (migration 010) but is largely vestigial; the frontend
  `Category` type does not even carry `color`.
- **Some default names are load-bearing in code:** `settlement.ts` writes
  `category: "Transfer"` on the settlement leg; the CSV import
  auto-categorizer (`server/src/lib/csvImport/categorize.ts`) maps
  keywords onto default names and falls back to `"Miscellaneous"`.
- **Delete rules today:** `is_default` blocked (409), `in_use` blocked
  (409), custom-and-unused deletable.
- **Import review category is read-only** —
  `ImportPreview.tsx:55` renders `<StyledCategory>{t.category}</StyledCategory>`
  as plain text. `CategorySelect` (which supports inline-add) is used in
  the transaction and recurring-transaction modals but **not** in import.

Roadmap item: "a dedicated surface to add, rename, recolor, and remove the
transaction Categories … replacing the fixed seeded category set."

## Problem

Give the user real control over Categories — add, rename, recolor, hide,
delete — without breaking the load-bearing default names, and make custom
categories actually usable during CSV import (the stated motivation for
adding them). Do this without a risky wide-blast data migration.

## Questions and Answers

**Q1 — How do transactions reference a category: keep name-based, or
migrate to `category_id` FKs?**
Keep **name-based referencing** (Option A). Rename becomes a cascading
use-case method. Categories stay a _simple label_, not a first-class
entity — no id migration. (Would only flip to ids if categories were to
become entities other features hang off, e.g. budgets/rules/AI. They are
not.)

**Q2 — Can seeded default categories be edited/deleted, given load-bearing
names?**
No full CRUD on defaults. **Defaults are recolor + hide only** — never
renamed, never deleted (the cheaper, safe option). This sidesteps the
`settlement.ts` / `categorize.ts` literals entirely, so no code
decoupling is needed. Custom categories get full CRUD.

**Q3 — What does "hidden" suppress?**
**Picker-filter only, never a data filter.** A hidden default is removed
from `CategorySelect` options but its transactions still exist and still
appear in the Month Overview breakdown donut and year-comparison. Making
real spend vanish from totals is disallowed. Hidden applies to
**defaults only** (custom uses delete).

**Q4 — Is the import-review category picker part of this feature?**
Yes — **one feature, two slices** (Option B). Slice 1 = Settings CRUD;
slice 2 = replace the read-only category cell in the import review with
`CategorySelect`. The reuse is what `CategorySelect` was designed for.

**Q5 — Recolor: picker type + persistence?**
**Fixed palette** (❌ freeform hex — a11y + off-brand risk). **Stored
`color` becomes authoritative**; `colorForCategoryName` demotes to a
null-only fallback for untouched seeded defaults. Frontend `Category`
type gains `color`; category-colored surfaces read `category.color`
instead of re-hashing the name.

**Q5b — Palette size?**
**Expand `categoryColorPalette` to 20** on-theme Meridian/MD3 swatches
(categories outnumber accounts; 10 forces repeats). Aligns with the
20-swatch Account Color Palette. Both mirrored palette files must carry
identical values.

**Q6 — Deleting a custom category that has transactions?**
**Reassign-on-delete** (Option B). A `Modal` prompts "move its N
transactions to → [`CategorySelect`]" (default Miscellaneous), then
cascades the bulk reassignment (transactions + recurring) and deletes.
❌ hard block (tedious for the import-heavy flow); ❌ silent
auto-fallback (dishonest).

**Q7 — Name collisions and validation?**
**Reject on collision** (409, no silent merge — merge is expressed via
delete+reassign). **Case-insensitive uniqueness** (display preserves
original casing). **Trim + max length 40.**

**Q8 — Does the auto-categorizer learn custom categories?**
No — **manual only** (Option A). `categorize.ts` stays hardcoded to
defaults. Flexibility comes from the slice-2 per-row picker. Custom
keyword rules are a separate future "Import Categorization Rules" item.

**Q9 — Picker behavior with hidden + inline-add?**
Hidden defaults are filtered from `CategorySelect` options; the
management modal renders them **disabled/greyed** with a toggle to
un-hide. A transaction already in a now-hidden category **still shows its
current value** when edited. **Inline-add stays in every picker**
(transaction, recurring, import).

**Q10 — Surface + vocabulary?**
**`CategoriesCard`** in the Settings grid → **"Manage categories"**
button → **`CategoryManagerModal`** (full CRUD surface). Terms: Custom
Category, Default Category, Hidden Category, Category Reassignment.

## Design

### Data model

```sql
-- migration: add visibility flag to categories (defaults only ever set it)
ALTER TABLE categories ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;
```

`categories` columns after this feature:
`id`, `name` (UNIQUE), `is_default`, `color` (now authoritative), `hidden`.

### Types

```ts
// src/types/category.ts — gains color + hidden
export interface Category {
  id: string;
  name: string;
  isDefault: boolean;
  color: string; // ✅ now read from the row (was absent)
  hidden: boolean; // ✅ new; defaults only
}
```

### Storage — `CategoriesRepo` (server/src/storage/Storage.ts)

```ts
export interface CategoriesRepo {
  findAll(): Promise<Category[]>;
  create(input: CategoryCreateInput): Promise<Category>;
  rename(id: string, name: string): Promise<RenameResult | null>; // cascade
  recolor(id: string, color: string): Promise<Category | null>;
  setHidden(id: string, hidden: boolean): Promise<Category | null>; // defaults only
  delete(id: string, reassignTo?: string): Promise<DeleteResult | null>; // reassign cascade
}
```

- **rename** — one transaction: `UPDATE categories SET name` +
  `UPDATE transactions SET category` + `UPDATE recurring_transactions SET category`.
  Rejects: not-found (`null`), default (`is_default`), collision
  (case-insensitive), invalid name.
- **recolor** — `UPDATE categories SET color`. Allowed on defaults.
- **setHidden** — `UPDATE categories SET hidden`. Rejected for custom
  (custom uses delete).
- **delete(id, reassignTo)** — if in_use and `reassignTo` given, cascade
  the reassignment (bulk `UPDATE ... SET category = reassignToName`) then
  delete, all in one transaction. Default `is_default` still blocked.

### Routes (server/src/routes/categories/)

- `PATCH /categories/:id` — body `{ name? , color?, hidden? }`; 409 on
  collision / default-rename / setHidden-on-custom.
- `DELETE /categories/:id?reassignTo=<id>` — reassign target optional;
  409 `in_use` only when in_use _and_ no reassign target.

### Color

- `colorForCategoryName` stays as the **null-fallback** for untouched
  seeded defaults only.
- `categoryColorPalette` expands 10 → 20 in **both**
  `server/src/storage/categoryColors.ts` and
  `src/utils/categoryColor/categoryColor.ts` (identical values).
- All category-colored surfaces (breakdown donut, badges,
  year-comparison) read `category.color`.

### UI

- `src/features/settings/CategoriesCard/` — blurb + "Manage categories"
  button.
- `src/features/categories/CategoryManagerModal/` — list (defaults
  section + custom section), add row (inline), per-row rename / recolor
  swatch / hide toggle (defaults) / delete (custom). Delete-with-reassign
  uses the shared `Modal` + `CategorySelect`.
- `CategorySelect` — filter `hidden` from options; always include the
  currently-selected value even if hidden; keep inline-add.
- `ImportPreview` — swap read-only category cell for `CategorySelect`
  (slice 2).

## Implementation Plan

**Slice 1 — Settings CRUD**

1. Migration: `ALTER TABLE categories ADD COLUMN hidden`. Extend the
   `Category` DTO (server + frontend) with `color`, `hidden`; make
   `findAll` return the stored color (fallback only when null). Parity
   spec updated. _(thinnest end-to-end: hidden/color round-trips.)_
2. `recolor` + `PATCH color` + expand palette to 20 (both files) + flip
   frontend color reads to `category.color`.
3. `rename` cascade + `PATCH name` (collision, case-insensitive, trim,
   max 40).
4. `setHidden` + `PATCH hidden`; `CategorySelect` filters hidden options
   (keeps current value).
5. `delete(id, reassignTo)` cascade + `DELETE ?reassignTo=`.
6. `CategoriesCard` + `CategoryManagerModal` wiring it all together.

**Slice 2 — Import categorization**

7. Replace read-only category cell in `ImportPreview` with
   `CategorySelect` (inline-add retained); thread per-row category
   through the import wizard state to commit.

## Trade-offs

**Easier:** full user control over categories with zero data migration
risk; recolor/hide of defaults without touching load-bearing code; custom
categories usable mid-import via the reused `CategorySelect`; the stored
`color` column finally becomes meaningful.

**Harder:** rename is O(rows) (cascade across two tables) instead of O(1)
— acceptable for a single-user offline DB. The name stays the join key,
so import categorization, reports, and settlement keep keying on names.
The palette lives in two mirrored files that must never diverge.

**Out of scope (ruled out):** id-based FK migration (categories stay a
label); custom keyword rules for auto-categorization (future "Import
Categorization Rules"); renaming or deleting default categories; hiding
custom categories; silent merge on rename collision; hiding as a data
filter (must never remove real spend from reports).
