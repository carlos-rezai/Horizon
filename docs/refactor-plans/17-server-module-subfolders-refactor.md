## Problem Statement

After the test file co-location refactor (issue #115), `server/src/routes/`
and `electron/` contain flat pairs of files — `accounts.ts` beside
`accounts.test.ts`, `serverHandle.ts` beside `serverHandle.test.ts` — with no
grouping boundary between modules. As both layers grow, routes, lib modules,
services, schemas, and Electron utilities pile up at the same directory level.
The frontend achieves scalability through per-feature subfolders; the server
and Electron layers should follow the same convention so that every logical
module owns its own directory.

## Solution

Move each logical module in `server/src/` and `electron/` into a named
subfolder containing all files that belong to it: source, test, and (for
routes) the Zod validation schema. `app.ts` and `main.ts` update their imports
to the new paths. A single `server/src/index.ts` provides the public surface
of the server package.

The `storage/` and `storage/sqlite/` directories are already well-organised
and are left unchanged.

## Commits

### server/src/

1. **Move `parentPort` into its own subfolder** — move
   `server/src/parentPort.ts` and `server/src/parentPort.test.ts` into
   `server/src/parentPort/parentPort.ts` and
   `server/src/parentPort/parentPort.test.ts`. Update the import in
   `server.ts`. Run the full test suite.

2. **Move `lib/cashflow` into its own subfolder** — move `lib/cashflow.ts`
   and `lib/cashflow.test.ts` into `lib/cashflow/cashflow.ts` and
   `lib/cashflow/cashflow.test.ts`. Update the import in `routes/accounts.ts`
   (the only consumer). Run tests.

3. **Move `lib/projection` into its own subfolder** — move `lib/projection.ts`
   and `lib/projection.test.ts` into `lib/projection/projection.ts` and
   `lib/projection/projection.test.ts`. Update the import in
   `routes/projection.ts`, `routes/settlements.ts`, and
   `lib/settlement.test.ts`. Run tests.

4. **Move `lib/settlement` into its own subfolder** — move `lib/settlement.ts`
   and `lib/settlement.test.ts` into `lib/settlement/settlement.ts` and
   `lib/settlement/settlement.test.ts`. Update the import in
   `routes/settlements.ts` and `services/settlementService.ts`. Run tests.

5. **Move `services/settlementService` into its own subfolder** — move
   `services/settlementService.ts` into
   `services/settlementService/settlementService.ts`. Update the import in
   `app.ts` and `routes/settlements.ts`. Run tests.

6. **Move all route files into their own subfolders** — for each route module
   (`accounts`, `categories`, `projection`, `recurringTransactions`,
   `settlements`, `storage`, `transactions`, `transfers`), create a matching
   subfolder and move the source file and test file into it. Update all
   imports in `app.ts`. Update schema imports inside each route file
   (depth increases by one level: `../schemas/X` becomes `../../schemas/X`).
   Run the full test suite.

7. **Co-locate Zod schemas with their owning route** — move each schema file
   from `schemas/` into the route subfolder that exclusively owns it:
   - `schemas/account.ts` → `routes/accounts/account.ts`
   - `schemas/category.ts` → `routes/categories/category.ts`
   - `schemas/recurringTransaction.ts` → `routes/recurringTransactions/recurringTransaction.ts`
   - `schemas/transaction.ts` → `routes/transactions/transaction.ts`
   - `schemas/transfer.ts` → `routes/transfers/transfer.ts`

   Update the import inside each route file to point to the co-located schema
   (`./account.js`, etc.). Delete the now-empty `schemas/` directory. Run
   tests.

8. **Add `server/src/index.ts` barrel** — create a minimal
   `server/src/index.ts` that re-exports `createApp` from `./app.js` and any
   types that external consumers (e.g. Electron main, test helpers) import
   directly from `server/src/`. Update those consumers to import from the
   barrel where appropriate. Run tests.

### electron/

9. **Move all paired Electron modules into their own subfolders** — for each
   module that has a source and test file (`awaitExitOrKill`,
   `parseApiBaseUrlArg`, `resolveRendererConfig`, `resolveServerEntry`,
   `serverHandle`), create a matching subfolder and move both files into it.
   Update the affected external imports:
   - `main.ts`: `./serverHandle.js`, `./resolveRendererConfig.js`
   - `preload.ts`: `./parseApiBaseUrlArg.js`
   - `serverHandle/serverHandle.ts`: `./awaitExitOrKill.js`,
     `./resolveServerEntry.js`

   Internal test imports (e.g. `"./awaitExitOrKill"` inside
   `awaitExitOrKill.test.ts`) resolve correctly once both files share a folder
   and do not need to change. Run the full test suite.

10. **Move `paths.ts` into its own subfolder** — move `electron/paths.ts` into
    `electron/paths/paths.ts`. Update the imports in `main.ts` and
    `serverHandle/serverHandle.ts`. Run tests.

## Decision Document

- Named subfolders match the source file name (e.g. `routes/accounts/accounts.ts`,
  `electron/serverHandle/serverHandle.ts`), not `index.ts`, to keep editor
  tabs readable.
- Schemas live with the route that owns them — every schema has a 1:1
  relationship with its route; there are no shared schemas. Co-location removes
  the artificial `schemas/` indirection.
- `storage/` and `storage/sqlite/` are already well-organised and out of
  scope.
- `testing/sqliteApp.ts` is a single file; no subfolder needed.
- `services/settlementService` is a single file today; it gets a subfolder
  anyway to stay consistent.
- A single `server/src/index.ts` barrel — not per-subfolder index files —
  provides one stable public surface for the server package.
- `electron/main.ts`, `electron/preload.ts`, and `electron/releaseConfig.test.ts`
  stay at the `electron/` root: `main.ts` and `preload.ts` are Electron entry
  points with special build-tool semantics; `releaseConfig.test.ts` has no
  source counterpart (it tests root-level config files).
- `electron/paths.ts` has no test today; it still gets a subfolder so the
  location is established for future tests.
- Electron module moves are split into two commits (paired modules first, then
  `paths`) so that `serverHandle` and its consumer `main.ts` are updated
  atomically before `paths` is moved.

## Testing Decisions

- This is a pure structural move. No new tests are introduced and no test
  logic is changed.
- After every commit the full `vitest` suite must pass at the pre-refactor
  baseline (16 server-side failures from the `better-sqlite3` Node version
  mismatch are pre-existing and expected).
- The server TypeScript build (`tsc -p server/tsconfig.json`) and the Electron
  TypeScript build (`tsc -p electron/tsconfig.json`) must both be clean after
  every commit.

## Out of Scope

- `storage/` and `storage/sqlite/` directory restructuring.
- `testing/sqliteApp.ts` (single file, stays put).
- Any changes to route logic, test assertions, or API contracts.
- Renaming files beyond the move.

## Further Notes

`routes/projection.ts` has no test file — this is a pre-existing gap, not
introduced by this refactor. It still moves into `routes/projection/projection.ts`.
