## Problem Statement

Horizon currently ships as a single web app talking to MongoDB Atlas. The desktop / offline build needs the same backend behaviour against local SQLite via `better-sqlite3`, with one switch (`STORAGE_DRIVER=sqlite|mongo`) deciding which store is used.

Today, every route handler in `server/src/routes/` imports Mongoose models directly and runs Mongoose-specific code inline: `mongoose.isValidObjectId`, `Transaction.aggregate(...)`, `account._id`, `account.toJSON()`, `Account.findByIdAndUpdate`. None of that survives a SQLite driver. There is no seam at which a second backend could plug in.

That same direct-Mongoose pattern is also a security problem. Malformed IDs and operator objects (`{ "$ne": null }`) can reach query construction because the routes pass `req.params.id` and `req.body` straight through. The cloud build needs an Owner-only auth gate that fails closed by default; the desktop build needs to bind locally only and run with no auth at all. Both postures are easier to reason about with a clean storage seam in place.

Three problems must be solved together — the abstraction pattern, the security posture for both build targets, and a maintainable shape that does not collapse into a thirty-method `Storage` class or five separately injected repositories wired through every route.

## Solution

Introduce a single `Storage` facade interface with namespaced per-entity repositories (`storage.accounts`, `storage.transactions`, `storage.transfers`, `storage.categories`, `storage.milestones`, `storage.recurringTransactions`). Two concrete Storage Drivers implement it: a Mongo Driver for the Cloud Build and a SQLite Driver for the Desktop Build. Both drivers are validated against a single shared Parity Spec — drift between them becomes impossible to merge.

Routes call `storage.*` directly via `app.locals.storage`. Composed reads (account-with-balance, total-liquid) and atomic writes (transfer create/delete) live inside the repos so each driver can pick its native primitive — Mongo aggregation pipelines and `session.withTransaction()`, SQLite `LEFT JOIN ... GROUP BY` and `db.transaction(...)`. Pure math (`cashflow`, `projection`) stays in `server/src/lib/` and consumes raw rows from the repos.

ID handling is hardened at the repo boundary: methods accept opaque `string` IDs and return `null` for any unparseable input — no throws, no input reflected into a query. Request validation moves to Zod schemas at the route boundary; repo methods accept typed validated DTOs.

The Cloud Build mounts a global `requireOwner` middleware that verifies the Google ID token from `Authorization: Bearer` and matches the `sub` claim against an allowlist of one (`OWNER_GOOGLE_SUB`). Helmet, a token-path rate limiter, and a sanitizing 5xx error handler ship alongside it. The Desktop Build sets `AUTH_DISABLED=1`, mounts none of those, and binds Express to `127.0.0.1` only.

## User Stories

1. As Carlos running the Cloud Build, I want every route to keep working unchanged after the storage seam is introduced, so that the live deployment is unaffected by the refactor.
2. As Carlos running the Desktop Build, I want the same Express app to serve every route against a local SQLite database, so that I can use Horizon offline with no network or cloud dependency.
3. As a developer, I want one Storage interface defining every persistence operation, so that adding a third driver later (e.g. Postgres) is a matter of implementing the same per-entity files in a new folder.
4. As a developer, I want the Cloud Build entrypoint to call `createStorage("mongo")` and the Desktop Build entrypoint to call `createStorage("sqlite")`, so that the Express app itself is identical across build targets.
5. As a developer, I want routes to read storage from `app.locals.storage`, so that test setups can inject a fresh in-memory storage per test without monkey-patching imports.
6. As a developer, I want every repo method that takes an ID to return `null` for unparseable input rather than throw, so that NoSQL injection and operator-object attacks fail by construction in the Mongo driver.
7. As a developer, I want all request bodies validated with a Zod schema at the route boundary, so that ad-hoc `if (!field || !field2)` checks disappear and the typed DTO that reaches the repo matches the schema exactly.
8. As Carlos, I want only my Google account to be able to read or write Cloud Build data, so that no other Google user can sign in and see my finances.
9. As Carlos, I want the Cloud Build to fail closed if `requireOwner` is not mounted, so that a forgotten route cannot leak data — the middleware is global, not per-route.
10. As Carlos, I want the Desktop Build to listen on `127.0.0.1` only, so that the Electron app cannot accidentally expose a port to other devices on my LAN.
11. As Carlos, I want the SQLite database to live in `app.getPath('userData')/horizon.db`, so that backups are a single-file copy and the path can never be overridden by env or IPC.
12. As a developer, I want a single `storage.parity.ts` spec that both drivers run against, so that any behavioural difference between Mongo and SQLite surfaces as a failing test.
13. As a developer, I want the parity spec to use `mongodb-memory-server` for the Mongo driver and `:memory:` for the SQLite driver, so that the suite has zero external dependencies.
14. As a developer, I want hand-rolled SQL migrations versioned via `PRAGMA user_version` in `server/src/storage/sqlite/migrations/`, so that schema upgrades are explicit and reviewable, not generated by an ORM.
15. As a developer, I want `migrate.ts` to apply every higher-numbered migration inside a single SQLite transaction, so that a partial migration cannot leave the database in a wedged state.
16. As Carlos, I want the SQLite driver written so that swapping in `better-sqlite3-multiple-ciphers` later is a one-line change plus a `PRAGMA key`, so that adding at-rest encryption does not require touching every repo file.
17. As a developer, I want transfers represented as two linked rows in `transactions` sharing a `transferId` indexed column in both drivers, so that there is no separate `transfers` table to keep referentially consistent.
18. As Carlos, I want `transfers.create` to be two-leg-or-nothing in both drivers, so that a crash mid-create cannot leave a single orphaned leg.
19. As Carlos, I want `transactions.delete` to refuse with a 409 signal when the transaction is part of a transfer, so that I am forced through `transfers.delete` and cannot accidentally orphan one leg.
20. As Carlos, I want `accounts.delete` to refuse with a 409 signal when the account has any transactions, so that I cannot delete an account whose history would be left dangling.
21. As a developer, I want repo methods to return DTOs with string IDs and primitive fields (`Account`, `AccountWithBalance`, `Transaction`, etc.), so that routes never see Mongoose documents, never call `.toJSON()`, and never see `_id`.
22. As a developer, I want `accounts.findAllWithBalance`, `accounts.findByIdWithBalance`, and `accounts.getTotalLiquid` to live on the Accounts repo, so that each driver implements them with its native primitive instead of routes pulling rows and summing in JavaScript.
23. As a developer, I want pure math in `lib/` (cashflow, projection) untouched by this work, so that it continues to consume raw repo rows and stays driver-agnostic.
24. As Carlos using the Cloud Build, I want my Google ID token attached as `Authorization: Bearer <token>` from an in-memory token store with silent refresh, so that there is no cookie session, no CSRF surface, and no server-side session store.
25. As Carlos, I want the token-verification path rate-limited on the Cloud Build, so that brute-force token guessing is throttled.
26. As a developer, I want a final error handler that logs full errors server-side and responds with `{ error: "Internal server error" }` for unhandled 5xx, so that stack traces never leak to the client. 4xx errors keep their specific error strings.
27. As a developer running the test suite, I want every existing route-level test to keep passing after the refactor, so that the seam introduction is a true no-behaviour-change for the Cloud Build.
28. As a developer, I want a unit test for `requireOwner` covering valid token / wrong sub / expired token / missing header, so that the only auth gate cannot silently break.
29. As a developer, I want a test confirming a fresh SQLite DB applies every migration and a pre-migrated DB is a no-op, so that `migrate.ts` is safe to run on every Desktop Build startup.
30. As a developer, I want `helmet()` only mounted on the Cloud Build, so that its CSP defaults do not interfere with a `file://`-loaded SPA in Electron.
31. As Carlos changing my Google account in the future, I want the allowlist driven by `OWNER_GOOGLE_SUB` env, so that I rotate access without code changes.
32. As a developer, I want the `STORAGE_DRIVER` env read only at the entrypoint (`server.ts` / Electron main), so that `app.ts` and the routes never know which driver is wired.

## Implementation Decisions

**Pattern: Repository Facade.** A single `Storage` interface (the facade) exposes namespaced per-entity repos. Each driver implementation is split into per-entity files inside a driver folder (`storage/mongo/accounts.ts`, `storage/sqlite/accounts.ts`, etc.). This combines the Repository pattern with the Facade pattern — equivalent in shape to EF Core's `DbContext` + `DbSet<T>` and Prisma's client.

**Module sketch.** Major modules to build or modify:

- **`storage/Storage.ts`** — the public facade interface. Exposes `accounts`, `transactions`, `transfers`, `categories`, `milestones`, `recurringTransactions`, and `close()`. Each namespace is its own per-entity repo interface (`AccountsRepo`, `TransactionsRepo`, etc.).
- **`storage/types.ts`** — DTO source of truth: `Account`, `AccountWithBalance`, `Transaction`, `Category`, `Milestone`, `RecurringTransaction`, plus input/result types (`AccountCreateInput`, `DeleteResult`, `TransferCreateInput`, …). Plain TypeScript, string IDs, primitive fields.
- **`storage/index.ts`** — `createStorage(driver: "mongo" | "sqlite"): Promise<Storage>` factory. Reads `STORAGE_DRIVER` at the entrypoint; routes never see the choice.
- **`storage/mongo/`** — `MongoStorage.ts` assembles namespaces and owns the Mongoose connection; per-entity files (`accounts.ts`, `transactions.ts`, `transfers.ts`, `categories.ts`, `milestones.ts`, `recurringTransactions.ts`) map Mongoose docs to DTOs at every boundary.
- **`storage/sqlite/`** — `SqliteStorage.ts` assembles namespaces and owns the `better-sqlite3` handle; `migrate.ts` runs migrations versioned via `PRAGMA user_version`; `migrations/001_initial.sql` covers all five tables with indexes (`accounts(kind)`, `transactions(account_id)`, `transactions(transfer_id)`, `transactions(date)`, `recurring_transactions(account_id)`, `recurring_transactions(is_active)`) and seeds default categories at the end.
- **`auth/requireOwner.ts`** — Google ID token validation via `google-auth-library`'s `OAuth2Client.verifyIdToken`, allowlist of one against `OWNER_GOOGLE_SUB`. Mounted globally on the Cloud Build only.
- **`schemas/`** — one Zod file per entity (`account.ts`, `transaction.ts`, `transfer.ts`, `recurringTransaction.ts`, `milestone.ts`). DTO types are inferred from the schemas: `AccountCreateInput = z.infer<typeof AccountCreateSchema>`.
- **`app.ts`** — refactored to `createApp(storage: Storage): Express`. Exposes storage via typed `app.locals.storage` (typed once with a `declare module "express-serve-static-core"`). Mounts `helmet()`, `requireOwner` (when `!AUTH_DISABLED`), the rate limiter on the auth path, and a sanitizing 5xx error handler last.
- **`server.ts`** — Cloud Build entrypoint. Reads `STORAGE_DRIVER`, calls `createStorage("mongo")`, then `createApp(storage)`, then listens.
- **`routes/`** — refactored to call `storage.*` from `app.locals` instead of importing Mongoose models. `mongoose.isValidObjectId` checks removed; the repos handle unparseable IDs by returning `null`. Ad-hoc `if (!field)` checks replaced with `Schema.safeParse(req.body)`.

**Boundary location.** Routes call `storage.*` directly. Composition (`accounts.findAllWithBalance`, `accounts.getTotalLiquid`, `transfers.create`) lives inside the repo because each driver implements it with its own primitive — there is no service layer between routes and storage.

**Tenancy.** Single-tenant. No `userId` field on any model. Auth is an Express middleware doorman on the Cloud Build only.

**ID handling.** Repo methods accept opaque `string` IDs and return `null` for any unparseable input. No throws, no input reflected into a query. Mongo driver checks `isValidObjectId` internally; SQLite driver does not need to (parameterised queries are immune).

**Input validation.** Zod schemas at the route boundary. Repo accepts validated DTOs typed from the schemas. Schemas live in `server/src/schemas/`, one file per entity, aligned 1:1 with the DTO types in `storage/types.ts`.

**Atomicity.** Hidden inside use-case methods. `transfers.create` and `transfers.delete` each pick their own primitive: Mongo `session.withTransaction()`, SQLite `db.transaction(...)`. No generic `storage.transaction(tx => ...)` wrapper.

**Composed reads.** `accounts.findAllWithBalance`, `accounts.findByIdWithBalance`, and `accounts.getTotalLiquid` belong on the Accounts repo and return `AccountWithBalance` DTOs. Mongo driver uses an aggregation pipeline; SQLite driver uses `LEFT JOIN ... GROUP BY`. Pure math stays in `lib/`.

**Transfers schema.** `transferId` stays as an indexed column on `transactions` in both drivers (TEXT in SQLite). No separate `transfers` table.

**SQLite specifics.** Plaintext SQLite via `better-sqlite3`. DB path is hard-coded by the Electron main process to `app.getPath('userData')/horizon.db` — never read from env or IPC. Express child binds `127.0.0.1` only. UUID generation via `crypto.randomUUID()`. Driver written so SQLCipher can swap in later as a one-line change plus a `PRAGMA key`.

**SQLite migrations.** Hand-rolled SQL files in `server/src/storage/sqlite/migrations/`, versioned via `PRAGMA user_version`. `migrate.ts` reads the pragma, runs every higher-numbered file inside a single transaction, bumps the pragma. No ORM, no migration library.

**Cloud auth.** Global `requireOwner` middleware before all routes. Validates Google ID token from `Authorization: Bearer`, checks `sub` claim against `OWNER_GOOGLE_SUB` allowlist of one. Env-gated via `AUTH_DISABLED=1` on the Desktop Build. ID token in header only — no cookie sessions, no CSRF surface, no session store. SPA holds token in memory and refreshes via Google silent refresh.

**Cloud hardening.** Mounted only when `AUTH_DISABLED` is unset: `helmet()` defaults, `express-rate-limit` scoped to the `requireOwner` token-verification path, and a final error handler that logs full errors server-side and responds with `{ error: "Internal server error" }` for unhandled 5xx. 4xx keep their specific error strings.

**Sketched public interface.**

```ts
// storage/Storage.ts
export interface Storage {
  accounts: AccountsRepo;
  transactions: TransactionsRepo;
  transfers: TransfersRepo;
  categories: CategoriesRepo;
  milestones: MilestonesRepo;
  recurringTransactions: RecurringTransactionsRepo;
  close(): Promise<void>;
}

export interface AccountsRepo {
  findAll(): Promise<Account[]>;
  findById(id: string): Promise<Account | null>;
  findAllWithBalance(): Promise<AccountWithBalance[]>;
  findByIdWithBalance(id: string): Promise<AccountWithBalance | null>;
  getTotalLiquid(): Promise<number>;
  create(input: AccountCreateInput): Promise<Account>;
  update(id: string, input: AccountUpdateInput): Promise<Account | null>;
  delete(id: string): Promise<DeleteResult>;
}

export interface TransactionsRepo {
  findAll(): Promise<Transaction[]>;
  findByAccount(
    accountId: string,
    opts?: { month?: string }
  ): Promise<Transaction[]>;
  findByTransferId(transferId: string): Promise<Transaction[]>;
  create(
    accountId: string,
    input: TransactionCreateInput
  ): Promise<Transaction | null>;
  update(
    id: string,
    input: TransactionUpdateInput
  ): Promise<Transaction | null>;
  delete(id: string): Promise<DeleteResult>;
}

export interface TransfersRepo {
  create(input: TransferCreateInput): Promise<{ transferId: string } | null>;
  delete(transferId: string): Promise<boolean>;
}
```

**Phased delivery.** Phases ship incrementally without breaking the running Cloud Build:

1. Storage interface + Mongo driver parity (Cloud Build runs identically with the seam in place).
2. Zod validation at the route boundary.
3. SQLite driver + migration runner.
4. Parity tests.
5. Cloud auth + hardening.

Phases 1–4 unblock the Electron desktop work that follows in the next design log. Phase 5 can ship in parallel with that work since it only touches the Cloud Build.

## Testing Decisions

A good test for this work asserts on observable behaviour at the storage and HTTP boundaries — not on internal implementation. It should not care whether the driver underneath is Mongo or SQLite. It uses realistic cent-denominated amounts. It exercises happy paths and explicit edge cases (unparseable IDs, transfer atomicity, delete-blocked-by-transactions, balance-derivation correctness).

**Modules under test**

- **Parity Spec (`__tests__/storage.parity.ts`)** — exports `runStorageSpec(makeStorage: () => Promise<Storage>)`. Covers every method on every repo: `accounts` (findAll, findById, findAllWithBalance, findByIdWithBalance, getTotalLiquid, create, update, delete), `transactions` (findAll, findByAccount with and without `month`, findByTransferId, create, update, delete), `transfers` (create two-leg-or-nothing, delete both legs, idempotency, atomicity-on-failure), `categories` (findAll, create, delete with default-protection and in-use-protection), `milestones` (findAll, create, delete), `recurringTransactions` (findAll, create, update, delete, isActive filtering). Edge cases: unparseable IDs return `null` from every method that takes an ID; deleting an account with transactions returns the 409-style result; deleting one leg of a transfer is refused.
- **`storage.mongo.test.ts`** — thin file. Factory uses `mongodb-memory-server`. Calls `runStorageSpec(factory)`.
- **`storage.sqlite.test.ts`** — thin file. Factory uses `better-sqlite3` with `':memory:'`. Calls `runStorageSpec(factory)`.
- **Existing route tests** — `accounts.test.ts`, `transactions.test.ts`, `transfers.test.ts`, `categories.test.ts`, `milestones.test.ts`, `recurringTransactions.test.ts`, `projection.test.ts` continue to assert HTTP-level behaviour. After the refactor they run against whichever driver `createApp` is wired with — the SQLite `:memory:` driver for speed and zero external dependencies in CI.
- **`requireOwner` middleware** — small unit test. Cases: valid token with matching `sub` passes; valid token with non-matching `sub` returns 401; expired token returns 401; missing `Authorization` header returns 401. Mocks `OAuth2Client.verifyIdToken`.
- **`migrate.ts`** — applying migrations to a fresh `:memory:` DB results in the latest `PRAGMA user_version`; running again is a no-op (no errors, no schema churn).

**Out of scope for tests in this PRD**

- `lib/cashflow` and `lib/projection` are already covered by their existing tests. They consume raw repo rows and are unaffected by the storage seam.
- No browser-level / E2E tests for the auth flow in this PRD — the SPA fetch-layer change is small and the unit test on `requireOwner` is sufficient.

**Prior art**

- Existing tests in `server/src/__tests__/` show the established pattern for HTTP-level assertions via supertest. Those tests are the template for the post-refactor route tests.
- The existing `projection.test.ts` shows the pure-function pattern: minimal inputs → call → assert specific output values. The Parity Spec follows the same shape but at the repo boundary instead of the math boundary.

## Out of Scope

- **Multi-tenancy.** No `userId` field on any model, no per-record ownership. Single-tenant per Q3 of the design log.
- **Generic transaction wrapper.** No `storage.transaction(tx => ...)` helper. Atomicity is hidden inside use-case methods (`transfers.create`, `transfers.delete`).
- **SQLCipher / at-rest encryption on the Desktop Build.** Plaintext SQLite per Q7. Driver written so SQLCipher swap is a one-line change plus a `PRAGMA key` later.
- **Cookie sessions, CSRF, passport.** ID token in `Authorization: Bearer` only.
- **ORM-managed migrations.** Hand-rolled SQL per Q9. No Drizzle, Prisma, Kysely, umzug, node-pg-migrate.
- **Separate `transfers` table.** Transfers remain an indexed `transferId` column on `transactions`.
- **Fine-grained rate limiting on data routes.** Single-tenant + auth gate makes this YAGNI. Only the auth path itself is rate-limited.
- **Electron shell, packaging, and `app.getPath('userData')` wiring.** Tracked separately in the next design log; this PRD only ensures the SQLite driver is callable and the SQLite path is not read from env or IPC.
- **AI features.** Digest, anomaly detection, Sondertilgung advisor — none touch the storage seam in this PRD; they will consume the same `storage.*` interface when built.
- **Frontend changes outside auth.** Only the SPA fetch layer changes (attach `Authorization: Bearer`, silent refresh). No component, page, or layout changes.

## Further Notes

The design log (`docs/design-logs/08-repository-abstraction.md`) records the full Q&A behind every decision in this PRD, including the alternatives that were rejected and why. The ubiquitous-language additions for **Storage**, **Storage Driver**, **Mongo Driver**, **SQLite Driver**, **AccountWithBalance**, **Parity Spec**, **Use-case Method**, **Migration**, **Build Target**, **Cloud Build**, **Desktop Build**, **Owner**, and **Auth Gate** are already in `docs/ubiquitous-language.md`.

The phasing matters. Phase 1 must land cleanly before Phase 3 — the Mongo driver is the first implementation of the facade, and any shape mistakes there will replicate into the SQLite driver. Phase 4 (parity tests) should run continuously from the moment a SQLite method exists; do not write all SQLite methods first and then add the parity spec at the end.

DTO drift is the long-term maintenance risk. TypeScript types in `storage/types.ts`, SQL `CREATE TABLE` columns in `001_initial.sql`, and Zod schemas in `schemas/` must stay aligned by hand. The parity spec catches behavioural drift; type drift surfaces at compile time when DTOs change. Future migrations are numbered (`002_*.sql`, `003_*.sql`) and reviewed alongside the corresponding TypeScript and Zod updates.
