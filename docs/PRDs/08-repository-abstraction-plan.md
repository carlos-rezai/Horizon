# Plan: Repository Abstraction

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/48

## Architectural decisions

Durable decisions that apply across all phases:

- **Storage facade interface**: `server/src/storage/Storage.ts` exposes namespaces `accounts`, `transactions`, `transfers`, `categories`, `milestones`, `recurringTransactions`, plus `close()`.
- **DTO source of truth**: `server/src/storage/types.ts` — plain TypeScript, string IDs, primitive fields. Both drivers map their native representation to these DTOs inside the repo. Routes never see Mongoose docs, never call `.toJSON()`, never see `_id`.
- **Driver folders**: `server/src/storage/mongo/` and `server/src/storage/sqlite/`, one file per entity in each. `MongoStorage.ts` / `SqliteStorage.ts` assemble namespaces and own the connection/db handle.
- **Driver selection**: `createStorage(driver)` factory at `server/src/storage/index.ts`. Reads `STORAGE_DRIVER` only at the entrypoint (`server.ts` for cloud, Electron main for desktop). `createApp(storage: Storage): Express` is driver-agnostic.
- **Storage on `app.locals`**: typed once via `declare module "express-serve-static-core"`. Routes read storage from `app.locals.storage`. URL paths unchanged from current routes.
- **ID handling**: every repo method that takes an ID accepts `string` and returns `null` for unparseable input — no throws, no input reflected into a query. Mongo driver checks `isValidObjectId` internally; SQLite is immune via parameterised queries.
- **Zod schemas**: `server/src/schemas/`, one file per entity. DTO input types are inferred (`AccountCreateInput = z.infer<typeof AccountCreateSchema>`) so schemas and storage shapes stay in lockstep.
- **Atomicity**: hidden inside use-case methods (`transfers.create`, `transfers.delete`). Mongo uses `session.withTransaction()`, SQLite uses `db.transaction(...)`. No generic `storage.transaction(tx => ...)` wrapper.
- **Transfers schema**: two `transactions` rows sharing an indexed `transferId` column (TEXT in SQLite). No separate `transfers` table.
- **SQLite specifics**: plaintext `better-sqlite3`. DB path hard-coded by Electron main to `app.getPath('userData')/horizon.db` — never read from env or IPC. Express child binds `127.0.0.1` only. UUIDs via `crypto.randomUUID()`. Driver written so `better-sqlite3-multiple-ciphers` can swap in later as a one-line change plus `PRAGMA key`.
- **SQLite migrations**: hand-rolled SQL in `server/src/storage/sqlite/migrations/`, versioned via `PRAGMA user_version`, applied in a single transaction. `001_initial.sql` covers all five tables, the indexes (`accounts(kind)`, `transactions(account_id)`, `transactions(transfer_id)`, `transactions(date)`, `recurring_transactions(account_id)`, `recurring_transactions(is_active)`), and the default-categories seed.
- **Cloud auth**: `requireOwner` global Express middleware mounted before all routes. Validates Google ID token via `OAuth2Client.verifyIdToken`, matches `sub` against `OWNER_GOOGLE_SUB` allowlist of one. Env-gated via `AUTH_DISABLED=1` on Desktop.
- **Cloud hardening (only when `!AUTH_DISABLED`)**: `helmet()` defaults, `express-rate-limit` scoped to the token-verification path, sanitizing final error handler that logs full errors server-side and returns `{ error: "Internal server error" }` for unhandled 5xx (4xx keep their specific error strings).
- **Pure math** (`server/src/lib/cashflow.ts`, `server/src/lib/projection.ts`) is **not** a repo concern. Repos return raw rows; lib functions consume them. Untouched by this work.

---

## Phase 1: Foundation + Accounts slice

**User stories**: 1, 3, 4, 5, 6, 7, 21, 22, 23, 32

### What to build

The seam itself plus the first entity end-to-end through it. Land the `Storage` interface, DTO types, `createApp(storage)` / `createStorage` factory, typed `app.locals.storage`, the Mongo `accounts` repo (including the composed reads `findAllWithBalance`, `findByIdWithBalance`, `getTotalLiquid`), the Zod `account` schema, and the accounts route refactored to call the facade. Cloud Build runs identically; the pattern is proven on the most complex repo so later phases can copy it.

### Acceptance criteria

- [ ] `Storage`, `AccountsRepo`, and DTO types (`Account`, `AccountWithBalance`, `AccountCreateInput`, `AccountUpdateInput`, `DeleteResult`) exist with no `any`.
- [ ] `createStorage("mongo")` returns a working `Storage`; calling `"sqlite"` throws `"not yet implemented"`.
- [ ] `createApp(storage)` exposes storage via typed `app.locals.storage`; `server.ts` calls `createStorage("mongo")` then `createApp(storage)`.
- [ ] Mongo `accounts` repo implements every method on `AccountsRepo`, mapping Mongoose docs → DTOs at every boundary.
- [ ] `accounts.findById`, `update`, `delete`, `findByIdWithBalance` return `null` for unparseable IDs (no throws, no query).
- [ ] `accounts.delete` returns a 409-style `DeleteResult` when the account has any transactions.
- [ ] `accounts.findAllWithBalance` and `getTotalLiquid` use a single Mongo aggregation — no per-account loop in JS.
- [ ] Zod `AccountCreateSchema` / `AccountUpdateSchema` exist; the accounts route validates `req.body` via `safeParse` and returns 400 with the issue list on failure.
- [ ] The accounts route imports nothing from `mongoose` or `models/Account`; all reads/writes go through `storage.accounts`.
- [ ] `mongoose.isValidObjectId` removed from the accounts route.
- [ ] Existing `accounts.test.ts` passes unchanged; `cashflow.test.ts` and `projection.test.ts` untouched and still green.

---

## Phase 2: Transactions + Transfers slice

**User stories**: 17, 18, 19, 20, 27

### What to build

The two repos that share the transfer atomicity contract, refactored together so `transfers.create` and `transactions.delete` are correctly coupled. Mongo `transactions` and `transfers` repos, Zod schemas for both, transactions and transfers routes refactored. `transfers.create` is two-leg-or-nothing via `session.withTransaction()`; `transactions.delete` returns the 409 signal when called on a transfer leg. `accounts.delete`'s 409-on-has-transactions guard now consults the new `transactions` repo.

### Acceptance criteria

- [ ] `TransactionsRepo` and `TransfersRepo` interfaces exist with all methods listed in the PRD (`findAll`, `findByAccount(opts.month?)`, `findByTransferId`, `create`, `update`, `delete`; `transfers.create`, `transfers.delete`).
- [ ] DTO types `Transaction`, `TransactionCreateInput`, `TransactionUpdateInput`, `TransferCreateInput` are added to `storage/types.ts` with no `any`.
- [ ] Mongo `transactions` and `transfers` repos map Mongoose docs → DTOs at every boundary; routes never see `_id`, never call `.toJSON()`.
- [ ] Every method that takes an ID returns `null` for unparseable input.
- [ ] `transfers.create` is atomic: mid-failure leaves zero rows, not one — verified by an injected-failure test.
- [ ] `transactions.delete` refuses (returns the 409-style result) when the transaction has a `transferId`.
- [ ] `accounts.delete`'s has-transactions guard reads from the new `transactions` repo, not directly from Mongoose.
- [ ] Transactions and transfers routes import nothing from `mongoose` or `models/Transaction`.
- [ ] Zod schemas for transaction-create, transaction-update, and transfer-create are wired at the route boundary.
- [ ] Existing `transactions.test.ts` and `transfers.test.ts` pass unchanged.

---

## Phase 3: Remaining entities slice

**User stories**: 1, 27

### What to build

Migrate the three remaining entities — categories, milestones, recurring transactions — through the same pattern. Mongo repos for each, Zod schemas, three routes refactored. After this phase the entire Express app talks to MongoDB exclusively through the `Storage` facade; no route imports a Mongoose model.

### Acceptance criteria

- [ ] `CategoriesRepo`, `MilestonesRepo`, `RecurringTransactionsRepo` interfaces and DTOs exist with no `any`.
- [ ] Mongo implementations of all three repos exist; each maps docs → DTOs at every boundary.
- [ ] `categories.delete` enforces both rules in-repo: refuses defaults, refuses when any transaction references the category by name.
- [ ] `milestones.create` returns `null` (or a not-found-style result) when `accountId` is unparseable or unknown — route returns 404 in both cases.
- [ ] `recurringTransactions.findAll` returns all rows; the projection route uses a filter or a separate method to retrieve only `isActive: true` rows (decision recorded in code, consistent with the design log's index `recurring_transactions(is_active)`).
- [ ] No file under `server/src/routes/` imports anything from `mongoose` or `server/src/models/`.
- [ ] Zod schemas wired at every route boundary across all three entities (create, update where applicable).
- [ ] Full route test suite (`accounts`, `transactions`, `transfers`, `categories`, `milestones`, `recurringTransactions`, `projection`) passes against the Mongo-backed facade.

---

## Phase 4: SQLite driver + parity spec

**User stories**: 2, 11, 12, 13, 14, 15, 16, 29

### What to build

The second driver and the shared spec that locks both drivers to the same behaviour. Add `better-sqlite3`, write `001_initial.sql` (five tables, the indexes listed in the architectural decisions, default-categories seed at the end), implement `migrate.ts` (reads/writes `PRAGMA user_version`, applies pending migrations in a single transaction). Implement every entity repo against SQLite, mirroring the Mongo behaviour exactly. Land `runStorageSpec(makeStorage)` covering every method on every repo and the edge cases (unparseable IDs return `null`; transfer atomicity; delete-blocked-by-transactions; balance correctness; isActive filtering). Two thin test files invoke the spec — one with `mongodb-memory-server`, one with `:memory:` SQLite. Existing route tests are rewired to use the `:memory:` driver for speed. Add a `migrate.ts` test for fresh-DB and idempotent runs.

### Acceptance criteria

- [ ] `better-sqlite3` is added as a dependency.
- [ ] `001_initial.sql` creates all five tables with correct columns, NOT NULL constraints, and the indexes listed in the architectural decisions.
- [ ] Default categories are seeded at the end of `001_initial.sql`.
- [ ] `migrate.ts` reads `PRAGMA user_version`, applies every higher-numbered migration file inside a single transaction, bumps the pragma. A second invocation is a no-op.
- [ ] `createStorage("sqlite")` returns a working `Storage`; the entrypoint passes a hard-coded path (or `:memory:` for tests).
- [ ] Every method on every repo interface is implemented in `storage/sqlite/`. Composed reads (`accounts.findAllWithBalance`, `getTotalLiquid`) use `LEFT JOIN ... GROUP BY`, not per-account loops in JS.
- [ ] `transfers.create` is atomic via `db.transaction(...)`; mid-failure leaves zero rows.
- [ ] UUIDs generated via `crypto.randomUUID()`; driver never reflects raw input into SQL string concatenation.
- [ ] `runStorageSpec(makeStorage)` exists in `server/src/__tests__/storage.parity.ts` and exercises every repo method plus all edge cases listed in the PRD's Testing Decisions.
- [ ] `storage.mongo.test.ts` invokes the spec with a `mongodb-memory-server` factory; `storage.sqlite.test.ts` invokes the spec with a `:memory:` factory. Both pass.
- [ ] `migrate.test.ts` covers the fresh-DB and idempotent-run cases.
- [ ] Route test suite is rewired to a `:memory:` SQLite driver and remains green; `mongodb-memory-server` is required only by `storage.mongo.test.ts`.
- [ ] Driver code is structured so that a future `better-sqlite3-multiple-ciphers` swap is one constructor change plus a `PRAGMA key` call — verified by inspection.

---

## Phase 5: Cloud auth + hardening

**User stories**: 8, 9, 10, 24, 25, 26, 28, 30, 31

### What to build

Lock the Cloud Build to the Owner. Add `requireOwner` middleware (Google ID token verification via `OAuth2Client.verifyIdToken`, allowlist of one against `OWNER_GOOGLE_SUB`). Mount it globally before all routes when `AUTH_DISABLED` is unset. Mount `helmet()` defaults, `express-rate-limit` on the token-verification path, and a final error handler that logs full errors server-side and returns `{ error: "Internal server error" }` for unhandled 5xx (4xx keep their specific strings). Update the SPA fetch layer to attach `Authorization: Bearer <token>` from an in-memory token store and refresh via Google silent refresh. Desktop Build leaves `AUTH_DISABLED=1` and binds Express to `127.0.0.1` only — none of the cloud-only middleware mounts.

### Acceptance criteria

- [ ] `auth/requireOwner.ts` validates the `Authorization: Bearer` token via `OAuth2Client.verifyIdToken` and rejects with 401 on missing header, malformed token, expired token, or non-matching `sub`.
- [ ] `requireOwner` is mounted globally in `createApp` before any route — only when `AUTH_DISABLED` is unset.
- [ ] Setting `AUTH_DISABLED=1` (Desktop posture) results in `requireOwner`, `helmet()`, the rate limiter, and the sanitizing 5xx handler all unmounted.
- [ ] `helmet()` defaults are mounted on the Cloud Build only.
- [ ] `express-rate-limit` is mounted on the token-verification path only and rejects with 429 above the configured limit.
- [ ] The final error handler logs full errors server-side, returns `{ error: "Internal server error" }` for unhandled 5xx, and leaves 4xx error strings unchanged.
- [ ] `requireOwner.test.ts` covers valid token / wrong sub / expired token / missing header by mocking `OAuth2Client.verifyIdToken`.
- [ ] SPA fetch layer attaches `Authorization: Bearer <token>` from an in-memory token store; silent refresh via Google works without a cookie session or a server-side store.
- [ ] `OWNER_GOOGLE_SUB` is read from env at startup; rotating it requires no code change.
- [ ] Documented in `server/.env.example` (or equivalent) that the Cloud Build requires `OWNER_GOOGLE_SUB`, the Google OAuth client ID, and `AUTH_DISABLED` unset.
