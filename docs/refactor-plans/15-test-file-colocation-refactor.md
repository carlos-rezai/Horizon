## Problem Statement

Three structural inconsistencies have accumulated in the project's test layout:

1. `src/test-setup.ts` — Vitest's global setup file (ResizeObserver polyfill,
   jest-dom import) lives inside `src/` but has nothing to do with frontend
   source code. It is project-level infrastructure.

2. `src/__tests__/releaseConfig.test.ts` — A test that exercises the Electron
   release pipeline (`electron-builder.config.js`, `package.json`,
   `.github/workflows/release.yml`). None of the files under test live in
   `src/`; the test ended up there because `src/**/*.test.{ts,tsx}` was the
   path of least resistance.

3. `server/src/__tests__/` — The server keeps a flat `__tests__/` bucket for
   nearly all its tests, while `src/` co-locates tests alongside their source
   files. Finding a server test requires navigating to a separate folder
   instead of looking next to the module.

## Solution

Move each test artifact to the location that reflects what it tests:

- `src/test-setup.ts` → `vitest.setup.ts` (project root, alongside
  `vitest.config.ts`)
- `src/__tests__/releaseConfig.test.ts` → `electron/releaseConfig.test.ts`
  (already covered by the `electron/**/*.test.ts` vitest include pattern)
- All `server/src/__tests__/` files → co-located next to their source files,
  matching the `src/` convention
- Update `vitest.config.ts`: new `setupFiles` path and new server include
  pattern (`server/src/**/*.test.ts`)

## Commits

1. **Move `src/test-setup.ts` → `vitest.setup.ts`** — update `vitest.config.ts`
   `setupFiles` from `./src/test-setup.ts` to `./vitest.setup.ts`. Run the
   full test suite to confirm nothing breaks.

2. **Move `src/__tests__/releaseConfig.test.ts` → `electron/releaseConfig.test.ts`**
   — update the `__dirname`-relative ROOT path inside the test (currently
   `"../.."` to reach project root; becomes `".."` at the `electron/` level).
   Delete the now-empty `src/__tests__/` directory. Run tests to confirm.

3. **Co-locate all server tests** — move every file from
   `server/src/__tests__/` and `server/src/storage/__tests__/` to sit next to
   its source file. Example mappings:
   - `accounts.test.ts` → `server/src/routes/accounts.test.ts`
   - `cashflow.test.ts` → `server/src/lib/cashflow.test.ts`
   - `projection.test.ts` → `server/src/lib/projection.test.ts`
   - `migrate.test.ts` → `server/src/storage/sqlite/migrate.test.ts`
   - `connection.test.ts` → `server/src/storage/sqlite/connection.test.ts`
   - `storage.sqlite.test.ts` → `server/src/storage/sqlite/SqliteStorage.test.ts`
   - `storage.route.test.ts` → `server/src/routes/storage.test.ts`
   - `storage.parity.ts` → `server/src/storage/storage.parity.ts`
   - `resolveSqliteOptions.test.ts` → `server/src/storage/resolveSqliteOptions.test.ts`
   - `resolveSqlitePath.test.ts` → `server/src/storage/resolveSqlitePath.test.ts`
   - `parentPort.test.ts` → `server/src/parentPort.test.ts`
   - etc. — exact destination for each file to be confirmed against what the
     test actually covers during the refactor

4. **Update `vitest.config.ts` server include** — change
   `"server/src/**/__tests__/**/*.test.ts"` to `"server/src/**/*.test.ts"`.
   Run the full test suite to confirm all tests are still discovered and pass.

## Decision Document

- `vitest.setup.ts` at project root is the canonical home for global test
  infrastructure — consistent with how `vitest.config.ts` already lives there
- `electron/` is the right home for release-pipeline tests — the
  `electron/**/*.test.ts` include already covers it with no config change
  needed
- Server tests co-locate with source files for the same reason the frontend
  does: the test for a module is the first thing you look for next to it
- The vitest include pattern change from `**/__tests__/**/*.test.ts` to
  `**/*.test.ts` is additive — it also discovers any future co-located server
  test without ceremony
- `server/src/__tests__/helpers/sqliteApp.ts` is a test helper, not a test
  file; its destination should be determined during the refactor based on what
  imports it

## Testing Decisions

- No new tests are introduced — this is a pure move
- After each commit the full `vitest` suite must pass without changes to any
  test logic; a failing test after a move means an import path was not updated
- The parity spec (`storage.parity.ts`) is not a test file itself — update
  all import paths that reference it

## Out of Scope

- Any changes to test logic or coverage
- Renaming test files beyond the move (e.g. `storage.sqlite.test.ts` →
  `SqliteStorage.test.ts` is acceptable cosmetic alignment but not required)
- Server `src/` layer restructuring — this refactor is test layout only

## Further Notes

The `milestones.test.ts` file in `server/src/__tests__/` may cover a
now-deprecated entity (milestones were removed in the UI redesign). Confirm
whether it still runs and is meaningful before moving; delete if it is dead
code.
