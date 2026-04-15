## Problem Statement

The account-transaction-ui feature was built to spec and all phases are
complete, but one UI pattern was copy-pasted verbatim into three separate
modals rather than extracted into a shared component.

The inline category add pattern — the `ADD_CATEGORY_VALUE` sentinel, the
`showInlineAdd` and `newCategoryName` local state, the `handleCategoryChange`
and `handleAddCategory` handlers, and the `showInlineAdd ? <inline input> :
<select dropdown>` JSX block — appears identically in:

- `TransactionCreateModal`
- `TransferCreateModal`
- `RecurringTransactionModal`

A secondary inconsistency: `TransactionEditModal` inlines the
euros-to-cents conversion (`Math.round(parseFloat(amount) * 100)`) instead
of using the canonical `eurosToCents` utility. Every other form uses the
utility.

A structural issue also emerged from build order: `useCategoriesWithInlineAdd`
landed in `src/features/transactions/` as a side-effect of the phase it was
built in, even though categories are their own domain concept (separate API
endpoint, separate type, consumed by three different feature modals). The
design log originally planned a `src/features/categories/` feature slice for
this hook.

## Solution

Extract a `CategorySelect` component that owns the complete category
selection UI: the `useCategoriesWithInlineAdd` hook call, the `showInlineAdd`
and `newCategoryName` state, all handlers, and the conditional JSX. The
component exposes a simple controlled interface (`value` / `onChange`) to its
consumers.

Move `useCategoriesWithInlineAdd` — and the new `CategorySelect` — into
`src/features/categories/`, the feature slice the design intended.

Replace all three duplicated inline patterns with `<CategorySelect>`.

Fix `TransactionEditModal` to use `eurosToCents`.

## Commits

### Commit 1 — Move `useCategoriesWithInlineAdd` to `src/features/categories/`

Create the `src/features/categories/` directory. Move
`useCategoriesWithInlineAdd.ts` and its test file from
`src/features/transactions/` into `src/features/categories/`. Update the
import paths in the three modals that currently consume the hook. No
behaviour changes — tests should stay green throughout.

### Commit 2 — Extract `CategorySelect` component

Create `CategorySelect.tsx`, `CategorySelect.styles.ts` (stub), and
`CategorySelect.test.tsx` inside `src/features/categories/`. The component:

- Calls `useCategoriesWithInlineAdd` internally
- Owns `showInlineAdd` and `newCategoryName` state
- Owns `handleCategoryChange` and `handleAddCategory`
- Renders the `showInlineAdd ? <inline input> : <select dropdown>` JSX
- Accepts `value: string` and `onChange: (id: string) => void` as props
- Calls `onChange` whenever the effective selected category ID changes,
  including on initial load when the first fetched category is auto-selected

Delete `TransactionCreateModal.inlineadd.test.tsx` in this same commit — the
behaviour it covered is now tested directly in `CategorySelect.test.tsx`.

### Commit 3 — Replace inline pattern in `TransactionCreateModal`

Remove the `ADD_CATEGORY_VALUE` constant, `showInlineAdd`, `newCategoryName`,
`handleCategoryChange`, `handleAddCategory`, and the conditional JSX block.
Replace with `<CategorySelect value={categoryId} onChange={setCategoryId} />`,
where `categoryId` is a new local state variable replacing `selectedCategoryId`
from the hook (which the modal no longer calls directly).

Update `TransactionCreateModal.test.tsx`: the fetch mock still needs to handle
`GET /categories` (because `CategorySelect` renders inside the modal and makes
that call), but all inline-add assertions are removed — those now live in
`CategorySelect.test.tsx`.

### Commit 4 — Replace inline pattern in `TransferCreateModal`

Same substitution as Commit 3. Remove the duplicated state, handlers, and
conditional JSX from `TransferCreateModal`. Replace with `<CategorySelect>`.
Update `TransferCreateModal.test.tsx` accordingly.

### Commit 5 — Replace inline pattern in `RecurringTransactionModal`

Same substitution as Commits 3 and 4. Remove the duplicated state, handlers,
and conditional JSX from `RecurringTransactionModal`. Replace with
`<CategorySelect>`. Update `RecurringTransactionModal.test.tsx` accordingly.

### Commit 6 — Use `eurosToCents` in `TransactionEditModal`

Replace the inline `Math.round(parseFloat(amount) * 100)` in the `handleSave`
function with `eurosToCents(amount)`. Import `eurosToCents` from
`../../../utils/currency`. No behaviour change.

## Decision Document

**Modules created:**

- `src/features/categories/` — new feature slice
- `src/features/categories/CategorySelect` — component, styles stub, tests
- `src/features/categories/useCategoriesWithInlineAdd` — moved from transactions

**Modules modified:**

- `src/features/transactions/TransactionCreateModal` — removes inline pattern,
  adds `CategorySelect`
- `src/features/transactions/TransferCreateModal` — same
- `src/features/transactions/RecurringTransactionModal` — same
- `src/features/transactions/TransactionEditModal` — `eurosToCents` fix

**`CategorySelect` interface:**

- Controlled: `value: string` (the currently selected category ID),
  `onChange: (id: string) => void`
- Calls `onChange` on initial load with the first auto-selected category ID
  so parent state stays in sync without a manual initialisation step
- Internally calls `useCategoriesWithInlineAdd`; the parent modal no longer
  calls the hook at all

**`useCategoriesWithInlineAdd` location:**

- Moves from `src/features/transactions/` to `src/features/categories/`
- No interface changes

**Sentinel constant:**

- `ADD_CATEGORY_VALUE = "__add__"` moves inside `CategorySelect` and is no
  longer exported or visible to consumers

**`TransactionCreateModal.inlineadd.test.tsx`:**

- Deleted. Replaced by `CategorySelect.test.tsx` which tests the same
  behaviours at the correct level of abstraction

## Testing Decisions

**What makes a good test here:** test external behaviour, not implementation
details. For `CategorySelect`, that means: does the dropdown populate from the
API? Does selecting "+ Add category" reveal the inline input? Does submitting a
new name call `POST /categories`, append the result, and select it? Does
failure restore the dropdown and show an error? None of these tests should
assert on internal state variable names.

**`CategorySelect.test.tsx` covers:**

- Dropdown populates from `GET /categories`
- "+ Add category" option is present
- Selecting it reveals the inline text input
- Submitting a new name calls `POST /categories`, appends the category, and
  auto-selects it (verifiable via `onChange` spy)
- Controls are disabled while creation is in-flight
- API failure shows the error message and restores the category dropdown

**Prior art:** `TransactionCreateModal.inlineadd.test.tsx` — the new tests are
a direct port of these five cases, retargeted at `CategorySelect` and updated
to assert on `onChange` calls rather than modal-internal select state.

**Modal tests after refactoring (`TransactionCreateModal.test.tsx`,
`TransferCreateModal.test.tsx`, `RecurringTransactionModal.test.tsx`):**

- Each modal's fetch mock continues to handle `GET /categories` (because
  `CategorySelect` renders inside the modal during tests)
- Inline-add assertions are removed from modal tests — that contract belongs
  to `CategorySelect.test.tsx`
- Submit-path tests pass a valid `categoryId` via the `onChange` callback
  fired on initial load, so the category value still flows correctly through
  to the API call assertion

**`useCategoriesWithInlineAdd.test.ts`:** no changes needed — the hook's
behaviour is unchanged; only its location changes.

## Out of Scope

- Any visual or styling changes to the category select UI
- Changing the `useCategoriesWithInlineAdd` hook's interface or behaviour
- Transfer editing (already out of scope per the design log)
- Category management screen
- Any changes to the server-side categories API
- Promoting `CategorySelect` to `src/components/` — it makes API calls and
  owns domain logic, so it belongs in features

## Further Notes

The three modal replacements (Commits 3–5) are independent once `CategorySelect`
exists and can be done in any order. Commit 1 (moving the hook) must come before
Commit 2 (creating the component that imports it). Commit 6 is fully independent
and can be applied at any point after Commit 1.
