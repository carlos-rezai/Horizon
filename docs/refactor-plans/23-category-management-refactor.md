# 23 — Category Management refactor

> Feature PRD: `docs/PRDs/22-category-management.md`
> Design log: `docs/design-logs/22-category-management.md`
> Plan: `docs/PRDs/22-category-management-plan.md`
> Shipped across issues #157–#163 (umbrella #156), plus two follow-up fixes.

## Problem Statement

Category Management shipped correct and unusually well-tested (720 lines
added to the storage parity spec, 367 to the route test, 588 to the
manager-modal test), but the seven-phase build left four pockets of
duplication that now make the feature more expensive to change than its
behaviour warrants. From the developer's chair:

1. **The frontend re-implements the same request plumbing four-plus
   times.** Three hooks — the read-only category list, the inline-add
   picker hook, and the manager hook — each open with an identical
   "GET `/categories` on mount, guard `res.ok`, cast the JSON, swallow the
   error" effect. On top of that the manager hook's five mutations each
   hand-roll `fetch` + JSON error-body parsing + local-state fold:
   recolor and setHidden are byte-identical apart from the body key, and
   create and rename carry the same try/catch error-parse block. Adding a
   sixth operation, or changing how a server error surfaces, means editing
   the same shape in several places.

2. **The manager modal renders the 20-swatch palette twice.** The
   per-category row and the add-row each map the palette to buttons with
   the same case-insensitive "is this swatch selected" comparison and the
   same ARIA wiring. A palette or swatch-styling change is a two-place edit.

3. **Four SQLite repo methods repeat the same guard prelude.** recolor,
   rename, setHidden, and delete all open with the same
   `isValidUuid(id)` → load the row → `if (!row) return null` sequence
   before doing anything method-specific.

4. **The route repeats its result→HTTP mapping.** The PATCH handler's
   hidden / name / color branches each re-map `null → 404` and the
   `{ ok: false, reason }` envelopes → 409/400, and the
   `"A category named … already exists"` message is built independently in
   the create branch and the rename branch — two strings that must stay in
   step by hand.

None of this is a bug. It is friction: the feature is harder to extend and
easier to let drift than it should be.

## Solution

Four independent, structure-only cleanups, each covered by the existing
test suites and each leaving the codebase working. No behaviour changes, no
API-contract changes, no schema changes.

- **A — Feature-local category API module.** Extract the raw requests and
  the error-body parser into one small module in the categories feature:
  a list fetcher, a create call, a patch call, a delete call, and a shared
  "read `{ error }` off a failed response, else a generic message" helper.
  The three hooks call into it. Each hook keeps its own
  `useState`/`useEffect`/`cancelled`-flag wrapper — that GET-on-mount shape
  is a deliberate house idiom (identical in the accounts, month, and
  year-comparison hooks) and unifying it globally is out of scope — but the
  duplicated request/parse body moves into the shared module. The manager
  hook's five mutations collapse onto the shared patch/create/delete calls,
  folding recolor and setHidden onto one code path and create and rename
  onto one error-parse.

- **B — Domain-agnostic swatch-picker primitive.** Extract the palette grid
  into a reusable primitive that takes the palette, the selected value, and
  an onChange — knowing nothing about categories, mirroring the existing
  `Chip` precedent (callers supply the resolved value). The manager row and
  the add-row both consume it.

- **C — SQLite repo guard helper.** Collapse the repeated
  uuid-check + row-load + not-found guard into one private helper the four
  mutation methods share.

- **D — Route result→HTTP mapping helper.** One place that turns a repo
  result (`null`, `{ ok: false, reason }`, or the success payload) into the
  right status + message, and one source for the collision message string
  shared by create and rename.

- **E — Palette mirror left as-is (explicit non-goal).** The palette and
  `colorForCategoryName` are mirrored byte-for-byte in the server and
  frontend because they are separate build targets that cannot share code;
  the design log accepts this and a guard test already enforces parity.
  Untouched.

## Commits

Ordered cheapest / lowest-blast-radius first. Each commit leaves the
relevant suite green (server/parity/route suites require
`npm rebuild better-sqlite3` to run outside Electron — a Node-ABI quirk
documented in the dev journal, not a code issue).

**Commit 1 — SQLite repo: extract the guard prelude (C).**
Introduce one private helper in the categories repository that performs the
uuid validation, loads the row, and returns it or `null`. Re-point recolor,
rename, setHidden, and delete at it, deleting their copied preludes. Pure
internal move; the storage parity spec is unchanged and stays green.

**Commit 2 — Route: extract result→HTTP mapping + one collision message
(D).** Add a small mapping helper in the categories route that turns a repo
result into the correct status and body, and a single function that builds
the "already exists" message. Route the create, rename, recolor, setHidden,
and delete handlers through them. `categories.test.ts` is unchanged and
stays green (same statuses, same message text).

**Commit 3 — Frontend: add the category API module and adopt it in the two
read hooks (A, part 1).** Create the feature-local module with the list
fetcher and the shared error-body parser. Point the read-only list hook and
the inline-add picker hook's GET at the list fetcher, deleting their
duplicated `res.ok`/JSON/error bodies while keeping each hook's effect
wrapper. The hooks' existing tests (fetch mocked) stay green.

**Commit 4 — Frontend: route the manager hook's mutations through the
module (A, part 2).** Add the create/patch/delete calls to the module and
re-point the manager hook's five mutations at them, collapsing recolor and
setHidden onto the shared patch path and create and rename onto the shared
error-parse. Behaviour (optimistic local-state folds, returned result
shapes) is preserved. `CategoryManagerModal.test.tsx` and any hook test stay
green.

**Commit 5 — Frontend: extract the swatch-picker primitive (B).** Create
the primitive (palette + selected value + onChange + its own styles and a
small smoke test), and consume it in both the per-category row and the
add-row, deleting the two inline palette maps. The manager-modal test stays
green (per-swatch `aria-label` and `aria-pressed` selection preserved).

## Decision Document

- **Structure-only refactor.** No behaviour, API contract, schema, wire
  format, status code, or user-visible message changes. The safety net is
  the feature's existing test suites; a green suite is the success
  criterion for every commit.
- **Referencing model unchanged.** Categories remain a name-referenced
  label; rename stays a cascade. Nothing here revisits the id-vs-name
  decision.
- **New frontend module: a feature-local category API layer.** Holds the
  raw requests (list, create, patch, delete) and a shared failed-response
  error-body parser. Lives inside the categories feature alongside its
  hooks, not in `src/utils/` — it is feature plumbing, exercised through
  the hook tests (which mock `fetch`), consistent with how the feature is
  already tested. The three hooks depend on it; it depends on nothing but
  the shared API base.
- **The GET-on-mount effect shape stays per-hook.** The
  `useState` + `useEffect` + `cancelled`-flag wrapper is a house-wide idiom
  (accounts, month-transactions, year-comparison hooks all repeat it).
  Extracting a generic list-fetch hook across the whole app is a separate,
  larger refactor and is out of scope; this refactor only shares the
  request/parse body within the categories feature.
- **Manager mutations collapse but keep their signatures.** The manager
  hook's public surface (recolor, create, rename, setHidden, remove and
  their result types) is unchanged so the modal is untouched; only the
  bodies are deduplicated.
- **New primitive: a domain-agnostic swatch picker.** Takes the palette,
  the selected hex, and an onChange; owns no category knowledge, following
  the `Chip` precedent (caller supplies the resolved value). Placed in
  `primitives/` per the layer rules (atomic UI, no domain logic). Preserves
  the current ARIA contract: one button per swatch with the hex as
  `aria-label` and case-insensitive `aria-pressed` selection.
- **Server repo helper is private.** The guard prelude helper is internal
  to the categories repository — not part of the `CategoriesRepo`
  interface, so the parity spec and the interface are untouched.
- **Route mapping helper is route-local.** The result→HTTP mapping and the
  collision-message builder live with the categories route; no shared
  cross-route error framework is introduced.
- **Palette mirror is a deliberate non-goal.** The two mirrored palette
  files stay duplicated (separate build targets, guard-tested), per the
  design log.

## Testing Decisions

- **A good test here asserts external behaviour, not the new internal
  shape.** Because every commit is structure-only, the existing suites are
  precisely the right oracle: if renaming a custom category still cascades,
  if a collision still returns 409 with the same message, if recolor still
  folds into local state, if the manager still renders 20 selectable
  swatches with the right pressed state — the refactor is correct. No
  assertion should be added that pins the extracted helper's internals.
- **Modules under test (via their existing suites):**
  - Storage: the shared parity spec already covers findAll / create /
    rename / recolor / setHidden / delete, including cascade atomicity and
    the reject paths — the guard-helper extraction rides on it unchanged.
  - Route: `categories.test.ts` already covers the PATCH bodies, their
    409s, and `DELETE ?reassignTo=` — the mapping-helper extraction rides
    on it unchanged.
  - Frontend: the manager-modal test (affordance rules, delete-with-reassign
    flow), the category-select test (hidden filtering + currently-selected
    passthrough + inline-add), the inline-add hook test, and the import
    wizard test all exercise the hooks through mocked `fetch`.
- **One small addition:** the extracted swatch-picker primitive gets a
  focused smoke test (renders one selectable button per supplied swatch,
  reports the chosen value) — prior art: the existing primitive tests
  (e.g. `Chip`, `ChoiceChip`).
- **Local run note:** the storage parity and route suites only pass once
  `better-sqlite3` is rebuilt for the Node ABI (`npm rebuild
better-sqlite3`); it is otherwise built for Electron and every
  SQLite-backed test fails with a `NODE_MODULE_VERSION` mismatch. The
  frontend suites run without the rebuild.

## Out of Scope

- **Unifying the house-wide GET-on-mount effect idiom** across the accounts,
  month, and year-comparison features. A worthwhile future refactor, but a
  much larger blast radius than this feature-scoped cleanup.
- **De-duplicating the mirrored palette files.** Accepted duplication
  across build targets, already guarded by an equality test.
- **Any behaviour or contract change:** the PATCH "one field per call"
  precedence (hidden → name → color), status codes, message text, response
  shapes, and optimistic-update behaviour all stay exactly as shipped.
- **The id-vs-name referencing decision** and the auto-categorizer's
  hardcoded default map — both settled in the feature and untouched here.
- **New category operations** (e.g. bulk actions, custom keyword rules).

## Further Notes

- The two post-build fix commits (typecheck repair after the DTO gained
  `color`/`hidden`, and seeding the recurring-modal category from the edited
  row) are already on `main`; this refactor starts from that state.
- Commits 3 and 4 could be split further if any single diff feels large,
  but each is already a single-file, single-concern change that keeps the
  suite green.
