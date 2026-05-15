## Problem Statement

The codebase has an inconsistency between UI layers and utility/support
layers in how files are organised within a directory. Every UI layer
(`components/`, `primitives/`, `layouts/`, `features/`, `pages/`) groups
each unit into a named subfolder. `src/utils/` does not — its six utility
modules are flat files in the directory root, making it unclear where to
put a new utility's test file and breaking the navigational pattern every
other directory follows.

Two further structural problems exist:

1. **`src/pages/` has a redundant intermediate `index.ts` in every page
   subfolder.** These re-export only the default export and exist alongside
   a root `pages/index.ts` that already imports directly from the component
   file. `App.tsx` imports from the page subfolder path (triggering the
   intermediate index), while the root barrel goes unused. The result is two
   competing import paths into the same file, and the intermediate index
   files are dead weight.

2. **`src/features/updates/` is missing its domain `index.ts`.** Every
   other feature domain (`accounts/`, `transactions/`, `projection/`,
   `categories/`, `settings/`, `mortgage/`) exposes a barrel. `updates/`
   does not, which breaks the consistent "import from domain root" pattern.

Minor gap: `format.ts` and `api.ts` in utils have no tests despite the
CLAUDE.md rule that every function in `src/utils/` must have a test.

## Solution

1. Move each utility module into a named subfolder matching the components
   pattern — no subfolder `index.ts`, root `utils/index.ts` imports
   directly from the file. Test files travel with their source file.

2. Write the missing `format.test.ts` and `api.test.ts`.

3. Consolidate the pages import pattern: update `App.tsx` to import from
   the root `pages` barrel (named imports), then delete each page
   subfolder's `index.ts`. The root `pages/index.ts` already exports
   everything correctly — no changes needed there.

4. Add `src/features/updates/index.ts` to restore domain barrel consistency.

5. Add `src/types/index.ts` as a single entry point for all shared types.

## Commits

Each commit keeps the full test suite green. Move one module at a time so
failures are immediately attributable.

**Commit 1 — Move `currency` util to subfolder**
Create `src/utils/currency/`, move `currency.ts` and `currency.test.ts`
into it. Update `utils/index.ts` to import from `./currency/currency`.
Run tests — green.

**Commit 2 — Move `accounts` util to subfolder**
Create `src/utils/accounts/`, move `accounts.ts` and `accounts.test.ts`
into it. Update `utils/index.ts`. Run tests — green.

**Commit 3 — Move `format` util to subfolder**
Create `src/utils/format/`, move `format.ts` into it. Update
`utils/index.ts`. Run tests — green.

**Commit 4 — Add `format.test.ts`**
Write `src/utils/format/format.test.ts`. Cover `formatBalance` (cents to
German-locale EUR string, negative values, zero) and `formatMonth` (valid
`YYYY-MM` string maps to abbreviated month + year, all twelve months, edge
case December). Run tests — green.

**Commit 5 — Move `apiFetch` util to subfolder**
Create `src/utils/apiFetch/`, move `apiFetch.ts` and `apiFetch.test.ts`
into it. Update `utils/index.ts`. Run tests — green.

**Commit 6 — Move `projection` util to subfolder**
Create `src/utils/projection/`, move `projection.ts` and
`projection.test.ts` into it. Update `utils/index.ts`. Run tests — green.

**Commit 7 — Move `api` util to subfolder**
Create `src/utils/api/`, move `api.ts` into it. Update `utils/index.ts`.
Run tests — green.

**Commit 8 — Add `api.test.ts`**
Write `src/utils/api/api.test.ts`. Mock `resolveApiBaseUrl` and assert
`API_BASE` equals its return value. Run tests — green.

**Commit 9 — Consolidate pages import path**
Update `App.tsx` to use named imports from the root `pages` barrel:
`import { DashboardPage, AccountDetailPage, PlanPage, SettingsStoragePage }
from "./pages"`. Delete `DashboardPage/index.ts`,
`AccountDetailPage/index.ts`, `PlanPage/index.ts`,
`SettingsStoragePage/index.ts`. Root `pages/index.ts` already re-exports
all four from the component file — no changes needed. Run tests — green.

**Commit 10 — Add `features/updates/index.ts`**
Add `src/features/updates/index.ts` exporting `useUpdateStatus` and
`UpdateBanner`. Run tests — green.

**Commit 11 — Add `types/index.ts`**
Add `src/types/index.ts` re-exporting all shared type definitions. Run
tests — green.

## Decision Document

- **Subfolder pattern for utils:** matches `components/` — named subfolder,
  no intermediate `index.ts`, root barrel imports from the file path directly.
  Rationale: test and source travel together, no extra indirection layer.

- **Pages consolidation:** `App.tsx` switches from default imports via
  subfolder paths to named imports via the root barrel. The root
  `pages/index.ts` already has the correct re-exports; only the call site
  and the dead subfolder indexes change.

- **`src/tokens/` is not touched.** Flat file layout with a root `index.ts`
  is correct for a pure-values directory. No test co-location needed.

- **`src/types/` is not restructured into subfolders.** Type definitions
  are not functions; they have no tests. A root `index.ts` barrel is the
  only change, giving consumers a single entry point.

- **`src/hooks/` is not touched.** The directory is empty by design — it is
  a placeholder for future cross-feature hooks documented in CLAUDE.md.

## Testing Decisions

Good tests here test external behaviour, not internal structure:

- **`format.test.ts`:** `formatBalance` and `formatMonth` are pure
  functions — pass inputs, assert output strings. No mocking needed.
  German locale formatting is the externally observable contract. Cover
  typical values plus boundary cases (zero, negative, December).

- **`api.test.ts`:** `API_BASE` is resolved from `resolveApiBaseUrl()`.
  Mock that module and assert `API_BASE` equals the mock return value.
  This is the minimal contract: the constant is wired to the resolver.

Prior art: `currency.test.ts` and `format.test.ts` are the reference
style — no test framework ceremony, just `describe` / `it` blocks calling
pure functions.

## Out of Scope

- Restructuring `src/types/` into per-type subfolders.
- Restructuring `src/tokens/` — flat layout is intentional.
- Emptying or removing `src/hooks/` — placeholder per CLAUDE.md.
- Adding a `.styles.ts` stub to `UpdateBanner/` — the component is pure
  composition (renders Snackbar); an empty styles file would be noise.
- Any changes to the features domain structure beyond adding the missing
  `updates/index.ts`.
