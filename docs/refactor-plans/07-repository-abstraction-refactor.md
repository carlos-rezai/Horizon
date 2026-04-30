# 07 — Repository Abstraction Refactor

## Problem Statement

The Repository Abstraction shipped across issues #51–#53 and put the
`Storage` facade + per-entity repos in front of every route. The seam
works — but six concrete leaks and gaps remain that I want closed before
the Electron / Desktop Build lands on top:

1. **`_id` wire-format shim still in every route.** Each route maps the
   Storage DTO's `id` back to `_id` on the way out so the SPA can keep
   reading the Mongo-shaped key. The whole point of the abstraction was
   that the route layer never sees `_id`. The shim is spread across six
   files and silently invites the next contributor to assume `_id` is
   the wire contract.
2. **`lib/projection.ts` still consumes Mongo-shaped account entries.**
   `routes/projection.ts` deliberately maps DTOs to `{ _id, ... }`
   objects to feed the pure projection function, because the projection
   function was never refactored away from the legacy shape.
3. **`createApp(mongoUri: string)` overload is transitional dead
   weight.** `server.ts` already injects Storage; nothing else uses the
   string form. It re-creates Storage inside the app and defeats the DI
   design captured in Q10 of design-log 08.
4. **SQLite has no foreign-key enforcement.** Migration 001 declares no
   `FOREIGN KEY` clauses and `migrate.ts` never sets
   `PRAGMA foreign_keys = ON` (off by default in SQLite). The Desktop
   Build sits directly on top of this — every orphan we don't catch in
   the data layer is one a UI bug can create.
5. **`accounts.delete` only blocks on transactions.** Recurring
   transactions and milestones referencing the account are silently
   orphaned in both drivers. Parity spec passes because the omission is
   symmetric — i.e. parity-in-omission, not real safety.
6. **`recurringTransactions.create` does not validate accountId or
   linkedAccountId.** Milestones already do. The asymmetry means orphan
   recurring rows can be POSTed and then feed straight into the
   Projection Engine. Plus a tiny correctness smell: a stale dynamic
   `await import("../../models/Account.js")` inside the Mongo
   transactions repo's `create`, with no cycle to justify it.

## Solution

A single bundled refactor covering items 1–6, plus a small
"centralise default category names" sweep so the seam stops carrying
three copies of the same list. Each commit leaves the codebase in a
working state and is small enough to review on its own.

The end state:

- Routes return DTOs with `id`, never `_id`.
- `lib/projection.ts` accepts DTO shapes (`AccountProjectionInput` with
  `id`).
- `createApp` accepts only a `Storage` argument — the string overload is
  gone.
- SQLite enforces referential integrity via FK constraints and the
  `foreign_keys` pragma.
- Both drivers' `accounts.delete` reject deletion when recurring
  transactions or milestones still reference the account.
- Both drivers' `recurringTransactions.create` validate accountId and
  linkedAccountId existence the way milestones already do, and return
  `null` when either is missing.
- The Mongo transactions repo uses a static import for the Account
  model.
- `DEFAULT_CATEGORY_NAMES` is declared once and consumed by the Mongo
  seeder and the parity spec; the SQLite migration SQL remains the
  canonical seed insert but is verified against the shared list in a
  test.

The Desktop Build slice (Electron shell, packaging) is explicitly out
of scope — this is the prerequisite cleanup, not the next feature.

## Commits

Each step is a single small commit. They land in order; every step
keeps the test suite green.

### Wire-format cleanup

1. **`test: repository-abstraction wire-format cleanup failing tests`**
   — Update existing route-level tests in
   `server/src/__tests__/*.test.ts` (and any frontend tests that assert
   on the SPA fetch layer) to expect `id` rather than `_id` on the wire,
   and to expect `accountId` to remain a string. These tests currently
   pass against the `_id` shim — flip them so they fail. RED stop point.

2. **`feat: repository-abstraction wire-format cleanup id field`** —
   Delete every `toWire` shim across `routes/accounts.ts`,
   `routes/transactions.ts`, `routes/categories.ts`,
   `routes/milestones.ts`, `routes/recurringTransactions.ts`. Routes
   `res.json(...)` the DTO directly (or trivially destructure to filter
   undefined optional fields if needed). Tests from step 1 go green.

3. **`feat: repository-abstraction SPA consumes id`** — Update the
   frontend fetch layer / hook code in `src/features/**` to read `id`
   instead of `_id`. Run the SPA against the dev server, click through
   accounts, transactions, projection, milestones, recurring. Verify in
   browser. (No backend changes in this commit.)

### Projection Engine: take DTOs

4. **`test: repository-abstraction projection accepts dto failing tests`**
   — Add a unit test in `server/src/__tests__/projection.test.ts` that
   feeds `projectBalances` accounts shaped as `{ id, kind, openingBalance, openingDate }`
   (the DTO shape) and asserts a non-zero, correct projection. Currently
   fails because `projectBalances` reads `_id`. RED stop point.

5. **`feat: repository-abstraction projection accepts dto`** — Rename
   the projection function's account input field from `_id` to `id`
   (and any other Mongo-isms) inside `lib/projection.ts`. Update
   `routes/projection.ts` to stop renaming `id → _id` when building
   `accountEntries`. Test from step 4 goes green; route-level
   projection tests stay green.

### Drop transitional overload

6. **`feat: repository-abstraction drop createApp string overload`** —
   Delete the `createApp(mongoUri: string)` overload signature in
   `app.ts`. `createApp` becomes a single signature taking `Storage`.
   Verify `server.ts` still compiles (it already passes Storage). All
   tests still green.

### Mongo transactions: static import

7. **`refactor: repository-abstraction mongo transactions static import`**
   — Replace the dynamic `await import("../../models/Account.js")` in
   `storage/mongo/transactions.ts` with a top-of-file static import.
   No behavioural change; tests stay green.

### Centralise default category names

8. **`refactor: repository-abstraction centralise default category names`**
   — Move `DEFAULT_CATEGORY_NAMES` to a single shared file (e.g.
   `server/src/storage/defaultCategories.ts`). `models/Category.ts`'s
   `seedCategories()` imports from it. The parity spec
   (`__tests__/storage.parity.ts`) imports from it. Add a small
   migration test that asserts the SQLite migration's seed insert
   covers exactly the same names — keeps the SQL canonical for the
   actual insert but catches drift.

### SQLite foreign keys

9. **`test: repository-abstraction sqlite foreign keys failing tests`**
   — Extend the parity spec with cases that assert: (a) creating a
   transaction with an unknown well-formed accountId fails (Mongo
   already returns `null` via the existence check, SQLite would today
   silently insert an orphan), (b) creating a recurring transaction
   with an unknown linkedAccountId fails. The SQLite test file fails
   on these cases; Mongo passes (or both fail until step 11 lands —
   that's expected). RED stop point.

10. **`feat: repository-abstraction sqlite foreign keys migration`** —
    Add `server/src/storage/sqlite/migrations/002_foreign_keys.sql`.
    Because SQLite cannot add FOREIGN KEY clauses to existing tables,
    the migration follows the standard "rename, recreate with FKs,
    copy, drop" pattern for `transactions`, `recurring_transactions`,
    and `milestones`. New columns: `account_id` and
    `linked_account_id` get `REFERENCES accounts(id)` (no cascade —
    we want the application-level guard to fire and produce a 409).
    Update `migrate.ts` to set `PRAGMA foreign_keys = ON` on every
    connection (right before running pending migrations). Tests from
    step 9 go green for SQLite; Mongo behaviour unchanged.

### Block account delete on referencing rows

11. **`test: repository-abstraction account delete blocked by recurring or milestone failing tests`**
    — Add parity spec cases: (a) `accounts.delete` returns
    `{ ok: false, reason: "in_use" }` when an active or inactive
    recurring transaction references the account; (b) same when a
    milestone references the account; (c) `linked_account_id` on a
    recurring transaction also blocks deletion. RED stop point.

12. **`feat: repository-abstraction account delete blocks on recurring and milestones`**
    — In both drivers' `accounts/*.ts`, extend `delete` to check for
    referencing recurring transactions (either `accountId` or
    `linkedAccountId`) and milestones, returning
    `{ ok: false, reason: "in_use" }` if any exist. The
    `has_transactions` branch stays as-is. Update
    `routes/accounts.ts:delete` to map `in_use` to a 409 with a clear
    error message. Parity tests go green.

### Recurring transaction create: validate references

13. **`test: repository-abstraction recurring create validates references failing tests`**
    — Add parity spec cases: (a) `recurringTransactions.create` with
    an unknown well-formed `accountId` returns `null`; (b) same with
    an unknown well-formed `linkedAccountId`; (c) unparseable id
    forms also return `null`. Update the route signature: today
    `RecurringTransactionsRepo.create` returns
    `Promise<RecurringTransaction>`; we need
    `Promise<RecurringTransaction | null>`. The test for the route
    asserts a 404 for unknown account references. RED stop point.

14. **`feat: repository-abstraction recurring create validates references`**
    — In both drivers' `recurringTransactions/*.ts`, validate
    `accountId` (and `linkedAccountId` if provided) using the same
    pattern milestones already use; return `null` when missing.
    Update `Storage.ts` `RecurringTransactionsRepo.create` return type
    to `Promise<RecurringTransaction | null>`. Update
    `routes/recurringTransactions.ts:POST` to return 404 when the
    repo returns `null`. Parity + route tests green.

### Wrap-up

15. **`docs: repository-abstraction refactor close-out`** — Update
    `docs/dev-journal.md` with one entry summarising the wire-format
    rename and the FK migration (so the next desktop work knows that
    SQLite enforces FKs and `accountId`-referencing deletes now
    produce 409s). Update `docs/ubiquitous-language.md` only if
    needed (e.g. add an entry for `in_use` reason if it isn't already
    discoverable from the Storage Architecture section).

## Decision Document

- The wire-format cleanup is intentionally a coordinated change across
  backend routes and the SPA. There is no need for a transitional
  period; this app has one client and the change is mechanical.
- `lib/projection.ts` continues to be a pure function over plain
  account/transaction shapes — it does not depend on the Storage type
  itself. The DTO shape is the boundary contract.
- `createApp` becomes a single signature taking `Storage`.
  Driver/connection responsibility belongs to the entrypoint
  (`server.ts` for cloud, Electron main for desktop).
- SQLite migration uses the table-rebuild pattern for FK addition
  because SQLite does not support `ALTER TABLE ADD CONSTRAINT
FOREIGN KEY`. FKs use the default `NO ACTION` (i.e. application-level
  guard fires first), not `CASCADE` — we want explicit 409s for
  user-initiated deletes, not silent fanout.
- The `foreign_keys` pragma must be set per-connection (it is not
  persistent), so it lives in `migrate.ts` (or wherever the connection
  is opened, before any query runs).
- `accounts.delete`'s `in_use` reason from the existing `DeleteResult`
  union is reused — no new reason variants are added. The route
  surfaces all `ok: false` results as 409 with reason-specific copy.
- `RecurringTransactionsRepo.create` becomes nullable. Callers (just
  the route) handle the null path with a 404. Matches milestones'
  contract exactly.
- `DEFAULT_CATEGORY_NAMES` is centralised in TypeScript; the SQLite
  migration's seed INSERT remains canonical for the actual rows
  written, but a small test asserts the migration covers the same
  names. This intentionally does not move category names _out of_ SQL
  — migration SQL stays self-contained and runnable.
- Test consolidation between `server/src/__tests__/` and
  `server/src/storage/__tests__/` is explicitly out of scope and
  deferred.

## Testing Decisions

- A good test asserts external behaviour through the public Storage
  facade or the HTTP boundary, never the internals of a specific
  driver. The parity spec is the canonical place for behaviour that
  must hold in both drivers.
- New parity-spec cases (steps 9, 11, 13) describe behaviour, not
  shape: they assert a method returns `null` / a specific
  `DeleteResult`, and that the database state afterwards matches.
- Route-level tests (`__tests__/*.test.ts`) cover the wire-format
  rename and the new 409/404 response codes.
- Prior art:
  - DTO shape parity tests already exist for accounts, transactions,
    transfers, recurring transactions, milestones, categories — extend
    those `describe` blocks rather than create new files.
  - `accounts.delete` already has `has_transactions` parity coverage —
    add new `it(...)` cases to the same `describe`.
  - Milestones' `accountId` validation cases are the prior art for
    recurring transaction reference validation.
  - The cloud-hardening tests in `__tests__/cloudHardening.test.ts` are
    untouched.

## Out of Scope

- Anything from the Desktop Build slice: Electron shell, packaging,
  data-directory wiring, OS auto-update.
- Storage-only Mongo repo tests in `server/src/storage/__tests__/`
  (mongoAccountsRepo.test.ts and friends). They are largely redundant
  with the parity spec but pruning them adds churn with no behaviour
  change. Defer.
- Categories referenced by name string rather than id. Real footgun,
  but a separate API/data-model refactor with its own design log.
- Cross-field schema validation (e.g. annual recurring transactions
  must have `monthOfYear`). Belongs to a separate Zod-tightening pass.
- Test helper getter-proxy duplication between
  `__tests__/helpers/sqliteApp.ts` and `__tests__/storage.sqlite.test.ts`.
  Extract only when a third caller appears.
- Any change to the Mongo schema or indexes.
- SQLCipher / encrypted SQLite. Per design-log 08 Q7, this is a
  later one-line swap.

## Further Notes

- The wire-format rename is the only commit pair that touches the SPA.
  All other commits are server-side. If time pressure escalates, the
  SQLite FK migration (step 10) and the accounts-delete guard
  (step 12) are the most defensive items — they prevent data integrity
  bugs in the Desktop Build that no test would otherwise catch.
- Consider whether to land a one-time data-cleanup pass against
  production Mongo for any pre-existing orphan recurring rows or
  milestones before deploying the new `accounts.delete` guard. None are
  expected, but a quick `db.recurringtransactions.aggregate([{ $lookup: ... }])`
  check is cheap insurance.
