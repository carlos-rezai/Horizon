# Plan: Category Management

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/156
> PRD file: `docs/PRDs/22-category-management.md`
> Design log: `docs/design-logs/22-category-management.md`

Give the user real control over the Category set — add, rename, recolor,
hide, delete — through a dedicated Settings surface, **without** breaking
the load-bearing default names (`settlement.ts` writes `"Transfer"`; the
CSV auto-categorizer falls back to `"Miscellaneous"`) and **without** a
risky FK migration. Categories stay a name-referenced label, so _rename_
is a cascade across two tables, not a single-row key edit.

The phases are vertical slices ordered so the UI surface appears once
(Phase 2's modal shell) and every later phase adds **one capability** to a
surface that already renders. Phase 1 is the deliberately UI-less
data-model foundation, verified through the parity spec and route GETs.

## Architectural decisions

Durable decisions that apply across all phases:

- **Referencing stays name-based.** Transactions and recurring
  transactions keep referencing their Category by `name` (TEXT). No
  `category_id` FK, no id migration. This is the crux: import
  categorization, settlement, and reports keep keying on names, and
  _rename_ becomes a cascade rather than an O(1) update.
- **Defaults are protected.** The eight seeded Categories (`is_default = 1`)
  support **recolor + hide only** — never renamed, never deleted. Custom
  Categories (`is_default = 0`) get full CRUD. This sidesteps the
  load-bearing literals with zero code decoupling.
- **Hidden is a picker filter, never a data filter.** A hidden Default
  Category drops out of every `CategorySelect` but its transactions still
  exist and still count in the Month Overview breakdown donut and the
  year-comparison. `hidden` applies to defaults only; custom uses delete.
- **Schema — one forward-only migration.**
  `015_add_category_hidden.sql`:
  `ALTER TABLE categories ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0`.
  Final `categories` columns: `id`, `name` (UNIQUE), `is_default`,
  `color` (now authoritative), `hidden`.
- **`Category` type gains `color` + `hidden`** on both the server DTO and
  the frontend `src/types/category.ts`. `findAll` returns the stored
  color, falling back to the name-derived color **only** when the stored
  color is NULL (untouched defaults).
- **Color becomes authoritative.** Stored `categories.color` is the source
  of truth; `colorForCategoryName` demotes to a NULL-only fallback.
  Category-colored surfaces (breakdown donut, badges, year-comparison)
  read `category.color` instead of re-hashing the name.
- **Palette expands 10 → 20** on-theme swatches, mirrored **identically**
  across `server/src/storage/categoryColors.ts` and
  `src/utils/categoryColor/categoryColor.ts`, guarded by an equality test.
  Recolor is a fixed palette; freeform hex is rejected.
- **`CategoriesRepo` grows 3 methods → 6**: `findAll`, `create`, `rename`
  (cascade), `recolor`, `setHidden`, `delete(id, reassignTo?)` (reassign
  cascade). The repo owns all cascade/atomicity/validation behind a small
  interface; each cascade is one `better-sqlite3` transaction
  (all-or-nothing, same guarantee as `transfers.create`).
- **Category Reassignment** — the atomic bulk move of a Category's
  transactions _and_ recurring transactions from one name to another — is
  the single primitive behind both `rename` and reassign-on-delete.
- **Routes.**
  - `PATCH /categories/:id` — body `{ name?, color?, hidden? }`; `409` on
    collision, default-rename, or setHidden-on-custom.
  - `DELETE /categories/:id?reassignTo=<id>` — reassign target optional;
    `409 in_use` only when in-use _and_ no reassign target supplied.
  - `GET /categories` and `POST /categories` unchanged in shape (payloads
    now carry `color` + `hidden`).
- **Validation** — names trimmed, non-empty, max length 40,
  case-insensitive uniqueness (display preserves original casing).
- **UI modules.** `src/features/settings/CategoriesCard/` (Settings-grid
  card) → `src/features/categories/CategoryManagerModal/` (full CRUD
  surface: Default section + Custom section + inline add-row).
  Delete-with-reassign reuses the shared `Modal` + `CategorySelect`.
- **Storage tests live in the shared parity spec** (`storage.parity.ts`)
  so both drivers are held to identical behavior — prior art: the existing
  `CategoriesRepo` parity blocks.

---

## Phase 1: Data-model foundation (color authoritative, hidden round-trip)

**User stories**: 24 (fresh install unchanged); groundwork for 6, 10, 23.

### What to build

The UI-less tracer bullet through the storage layer. Add the `hidden`
column (migration `015`), extend the `Category` DTO on both server and
frontend with `color` + `hidden`, and make `findAll` return the stored
color — falling back to the name-derived color only when the column is
NULL, so an untouched fresh install looks exactly as it does today. Expand
`categoryColorPalette` 10 → 20 in both mirrored files and add the guard
test that fails if they ever diverge. Flip every category-colored surface
(breakdown donut, category badges, year-comparison) to read
`category.color` instead of re-hashing the name; `colorForCategoryName`
becomes the NULL-only fallback and keeps its own unit tests. No new write
routes and no UI yet — the round-trip is proven through the parity spec
and the `GET /categories` payload.

### Acceptance criteria

- [ ] Migration `015_add_category_hidden.sql` adds `hidden INTEGER NOT NULL
    DEFAULT 0`, runs forward-only, and leaves existing rows `hidden = 0`.
- [ ] The `Category` DTO (server) and `src/types/category.ts` (frontend)
      both carry `color: string` and `hidden: boolean`.
- [ ] `findAll` returns the stored `color`; when the stored color is NULL
      it falls back to `colorForCategoryName`, proven in the parity spec.
- [ ] `GET /categories` payloads include `color` and `hidden`.
- [ ] `categoryColorPalette` holds 20 identical swatches in both mirrored
      files; a guard test asserts the two files are equal.
- [ ] Breakdown donut, category badges, and year-comparison read
      `category.color`; a fresh install (all colors NULL) renders exactly
      as before via the derived fallback.
- [ ] `colorForCategoryName` retains its unit tests, with cases proving it
      is only the NULL fallback.

---

## Phase 2: Recolor + the manager surface

**User stories**: 1, 2, 6, 23, 25, 26.

### What to build

The first visible slice: the Settings entry point and the modal that every
later phase extends. Add a `CategoriesCard` to the Settings grid with a
"Manage categories" button that opens the `CategoryManagerModal`, which
lists Categories in a **Default section** and a **Custom section** (with a
"no custom categories yet" empty state). Wire the write path for recolor
end-to-end: `recolor(id, color)` repo method (allowed on defaults) +
`PATCH /categories/:id {color}`, driven by a per-row swatch picker bound to
the 20-swatch palette. Because surfaces already read `category.color`
(Phase 1), a recolor is immediately visible in the donut, badges, and
year-comparison. The manager reflects the change without a manual refresh.

### Acceptance criteria

- [ ] A `CategoriesCard` appears in the Settings grid; its button opens the
      `CategoryManagerModal`.
- [ ] The modal renders a Default section and a Custom section; the Custom
      section shows an empty state when there are no custom categories.
- [ ] Each row exposes a recolor swatch limited to the 20-swatch palette;
      freeform hex is not offered.
- [ ] `recolor(id, color)` updates `categories.color` (allowed on
      defaults) — covered in the parity spec.
- [ ] `PATCH /categories/:id {color}` persists the color and returns the
      updated Category — covered in `categories.test.ts`.
- [ ] Recoloring a category updates the breakdown donut, badges, and
      year-comparison to the chosen color; the manager reflects it
      immediately.

---

## Phase 3: Add a Custom Category

**User stories**: 3, 16 (manager inline-add), 20 (add collision), 21.

### What to build

Add an inline add-row to the Custom section of the manager: a name field, a
palette swatch, and a confirm. It calls the existing `create` path, now
carrying an explicit color, with validation enforced: name trimmed,
non-empty, capped at 40 chars, and rejected (with a clear message) on a
case-insensitive collision with any existing category so the user can never
end up with two "Food"s. A newly added Custom Category appears in the manager
and in every `CategorySelect` immediately, and its color is authoritative
from creation.

### Acceptance criteria

- [ ] The Custom section has an inline add-row (name + palette swatch +
      confirm) that creates a Custom Category.
- [ ] `create` stores the chosen color; a new custom category is returned
      with `isDefault: false`, `hidden: false`, and its color.
- [ ] Names are trimmed and capped at 40 characters; empty/whitespace-only
      names are rejected.
- [ ] A case-insensitive name collision is rejected with a clear message
      (no silent merge) — covered in the parity spec and route test.
- [ ] The new category appears in the manager and in transaction /
      recurring `CategorySelect` pickers without a manual refresh.

---

## Phase 4: Rename a Custom Category (cascade)

**User stories**: 4, 5, 16, 20 (rename collision), 21, 22 (rename-default
guard), 25.

### What to build

Add a rename affordance to Custom rows only (never Default rows). `rename(id,
name)` runs as one transaction: update the `categories` row, then every
`transactions` and `recurring_transactions` row holding the old name — the
Category Reassignment primitive — so no spending is stranded under the old
label. It rejects not-found, default (`is_default`), case-insensitive
collision, and invalid name (trim / non-empty / max 40), each surfaced as a
friendly message rather than a mysterious failure. `PATCH /categories/:id
{name}` returns `409` on collision or default-rename.

### Acceptance criteria

- [ ] Custom rows expose a rename control; Default rows do not.
- [ ] `rename` cascades the new name to all the category's transactions
      **and** recurring transactions in one transaction; a mid-cascade
      failure leaves nothing changed — covered in the parity spec.
- [ ] `rename` rejects not-found (`null`), default (`is_default`),
      case-insensitive collision, and invalid name.
- [ ] `PATCH /categories/:id {name}` returns `409` on collision or
      default-rename with a clear message.
- [ ] Renaming a Custom Category updates its badge/label everywhere its
      transactions appear; the manager reflects it immediately.

---

## Phase 5: Delete a Custom Category with reassignment

**User stories**: 7, 8, 13 (delete affordance / default-block), 22
(delete-default guard), 27.

### What to build

Add a delete affordance to Custom rows only. Deleting an unused Custom
Category removes it outright. Deleting one that still has transactions opens
a reassign prompt (the shared `Modal` + `CategorySelect`) — "move its N
transactions to →", defaulting to Miscellaneous, with the category being
deleted excluded from the target list. Confirming runs `delete(id,
reassignTo)`: the reassignment cascade (bulk-move transactions + recurring
to the target name) then the delete, all in one transaction, leaving zero
orphaned rows. `DELETE /categories/:id?reassignTo=<id>` returns `409 in_use`
only when in-use **and** no reassign target is supplied; default deletes stay
blocked.

### Acceptance criteria

- [ ] Custom rows expose a delete control; Default rows do not, and a
      default delete stays blocked with a clear message.
- [ ] Deleting an unused Custom Category removes it.
- [ ] Deleting an in-use Custom Category opens a reassign prompt defaulting
      to Miscellaneous, with the deleted category excluded from the target
      picker.
- [ ] `delete(id, reassignTo)` cascades the reassignment then deletes in one
      transaction with zero orphaned rows; `delete(id)` on an in-use custom
      with no target still blocks — covered in the parity spec.
- [ ] `DELETE /categories/:id?reassignTo=<id>` reassigns then deletes;
      `DELETE` with no target on an in-use custom returns `409 in_use`.

---

## Phase 6: Hide / un-hide Default Categories

**User stories**: 9, 10, 11, 12, 13 (hide affordance), 14, 15, 22 (hide
guard).

### What to build

Add a hide toggle to Default rows only. `setHidden(id, hidden)` updates
`categories.hidden` and is rejected for custom categories (custom uses
delete). Hidden defaults render greyed/disabled in the manager with an
un-hide toggle, so hiding is always reversible. Every `CategorySelect`
(transaction, recurring, import) filters out hidden options — but always
includes the currently-selected value, so editing a transaction that already
sits in a now-hidden category still shows its value. Crucially, hiding never
touches data: a hidden default's transactions still appear in the breakdown
donut and year-comparison. `PATCH /categories/:id {hidden}` returns `409` on
setHidden-of-a-custom.

### Acceptance criteria

- [ ] Default rows expose a hide/un-hide toggle; Custom rows do not.
- [ ] `setHidden` updates `hidden` on defaults and is rejected for custom —
      covered in the parity spec; `PATCH {hidden}` returns `409` for custom.
- [ ] Hidden defaults render greyed/disabled in the manager and can be
      un-hidden (reversible).
- [ ] `CategorySelect` omits hidden options but always includes the
      currently-selected value, even if hidden.
- [ ] A hidden Default Category's transactions still appear in the breakdown
      donut and year-comparison (hidden is picker-only, never a data
      filter).

---

## Phase 7: Import review category picker (Slice 2)

**User stories**: 16 (import inline-add), 17, 18, 19.

### What to build

Close the feature by making custom categories usable where they were the
whole motivation. Replace `ImportPreview`'s read-only category cell with the
same `CategorySelect` used elsewhere (inline-add retained), and thread the
per-row category choice through the import wizard state so the value the user
picks in review is exactly what gets committed — not the auto-categorizer's
original guess. The auto-categorizer itself stays hardcoded to defaults;
flexibility comes entirely from this per-row picker.

### Acceptance criteria

- [ ] Each import review row's category is an editable `CategorySelect`
      (hidden options filtered, inline-add available), not read-only text.
- [ ] A row can be assigned to a Custom Category, including one created
      inline during review.
- [ ] The per-row category selection threads through the wizard state and is
      what actually commits — covered by a `useImportWizard`-style test.
- [ ] The CSV auto-categorizer is unchanged (still hardcoded to defaults).
