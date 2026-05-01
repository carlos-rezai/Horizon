## Problem Statement

The SQLite driver's domain layer ships today: `SqliteStorage`, per-entity repos, migrations 001 + 002, and a parity spec running against `:memory:` for both the Mongo Driver and the SQLite Driver. What does **not** ship is the operational layer that the Desktop Build depends on. Only `foreign_keys = ON` is set today, and it lives in `migrate.ts` (a schema concern) rather than per-connection. There is no WAL, no `busy_timeout`, no `mmap_size`, no startup integrity check, no checkpoint on close, no online backup, no restore, no policy on future migrations, and no documented seam between the Electron shell and the SQLite file path.

Personal-finance data demands clear answers to: what happens if the process dies mid-write, how Carlos backs up and restores his single-file database, how schema changes apply to an already-installed copy, and how silent corruption is detected at startup. None of those questions are answered today.

## Solution

Layer five operational concerns onto the existing SQLite driver without touching the Mongo driver's behaviour or the existing parity spec:

1. **Per-connection pragmas** — `journal_mode = WAL`, `synchronous = NORMAL`, `busy_timeout = 5000`, `foreign_keys = ON`, `mmap_size = 67108864` applied at the top of `createSqliteStorage`. Connection-state pragmas leave `migrate.ts`; it stays a schema-only module.
2. **Startup integrity check** — `PRAGMA integrity_check` after `migrate()`. Non-`ok` throws a typed `StorageIntegrityError`. The Electron shell (later) surfaces a "restore from backup" dialog. No silent recovery, ever.
3. **`close()` checkpoint** — `PRAGMA wal_checkpoint(TRUNCATE)` then `db.close()`. Idempotent. Leaves a clean canonical `.db` file with no `-wal`/`-shm` sidecar after a clean exit.
4. **Online Backup and Restore on the Storage facade** — `Storage.backup(destPath)` uses better-sqlite3's `db.backup()`; `Storage.restore(srcPath)` validates the source via `PRAGMA integrity_check` and `user_version`, swaps the file in, and reopens. The Mongo driver throws `Error("not supported")` for both — honest signal, no abstraction leak.
5. **Path resolution at the entrypoint** — `createSqliteStorage(path)` stays a pure function of its argument. `server.ts` reads `HORIZON_DB_PATH ?? './horizon.db'` and passes it through. The Electron main process (design log 10) sets the env var to `app.getPath('userData') + '/horizon.db'` when spawning the Express child. The driver never imports anything from Electron.

Plus migration policy (forward-only, append-only, never edited after shipping; restore-from-backup is the only rollback path) and a short SQLite-specific README documenting parity gotchas: SQLite enforces FKs, booleans are `INTEGER 0|1`, default collation is binary.

Reference: `docs/design-logs/09-sqlite-driver-offline-storage.md` is the source of truth for every Q&A behind this PRD.

## User Stories

1. As Carlos running the Desktop Build, I want the SQLite driver to use WAL mode so that a process crash during a write replays the partial transaction cleanly on the next open, instead of leaving the database in a wedged state.
2. As Carlos running the Desktop Build, I want `synchronous = NORMAL` under WAL so that writes are crash-safe across process death (only a hard power loss can lose the in-flight transaction), without doubling `fsync` overhead for negligible gain on personal data.
3. As Carlos running the Desktop Build, I want `busy_timeout = 5000` set so that any future second connection waits up to 5 seconds for a lock instead of failing instantly with `SQLITE_BUSY`.
4. As Carlos running the Desktop Build, I want `mmap_size = 64 MB` set so that read queries against the database benefit from memory-mapped I/O for free.
5. As a developer, I want connection pragmas applied in `SqliteStorage.ts` and not in `migrate.ts`, so that the boundary between connection state and schema state stays clean.
6. As Carlos opening the Desktop Build, I want a `PRAGMA integrity_check` to run on every startup after migrations apply, so that a corrupted database file is caught immediately at launch instead of when a query later fails.
7. As Carlos, I want a corrupted database to throw a typed `StorageIntegrityError` so that the Electron shell can surface a "Database appears corrupted — restore from backup?" dialog instead of crashing with a generic SQLite error.
8. As Carlos, I never want the SQLite driver to silently attempt repairs on a corrupted file, so that I always see corruption events and choose what to do.
9. As Carlos closing the Desktop Build, I want `Storage.close()` to run `PRAGMA wal_checkpoint(TRUNCATE)` before closing the connection, so that the on-disk `.db` is the canonical snapshot at shutdown and no orphan `-wal`/`-shm` files survive a clean exit.
10. As a developer, I want `Storage.close()` to be idempotent, so that a second close call after shutdown is a safe no-op rather than throwing.
11. As Carlos, I want `Storage.backup(destPath)` exposed on the SQLite driver so that I can save a complete, self-contained copy of my database while the app is running.
12. As Carlos, I want backup to use better-sqlite3's online backup API so that the snapshot is consistent and aware of WAL — never a torn copy that misses recent writes.
13. As Carlos, I want `Storage.restore(srcPath)` exposed on the SQLite driver so that I can restore from a previous backup if the current database is corrupted or I want to roll back a bad change.
14. As Carlos, I want restore to validate the source file's `PRAGMA integrity_check` and `PRAGMA user_version` before overwriting my current database, so that I cannot accidentally restore a corrupt or schema-newer file.
15. As a developer, I want the Mongo driver's `backup` and `restore` methods to throw `Error("not supported")` so that the Storage facade is honest about which driver implements them and a misuse fails loudly.
16. As a developer, I want every schema change to be a new numbered SQL file in `migrations/` so that the migration history is append-only and reviewable.
17. As a developer, I never want a shipped migration file to be edited after release so that two installs on the same `user_version` are guaranteed to have the same schema.
18. As a developer, I never want a down-migration in the migration directory so that the policy "schema mistakes are recovered via backup, not via SQL" stays explicit.
19. As a developer, I want a test asserting `migrate()` is a no-op when `user_version` is already at the latest version, so that startup-time migration calls are guaranteed safe.
20. As a developer, I want a tempfile-based migration test covering open → close → reopen, so that the `:memory:` parity suite cannot hide a bug that only manifests when state has to survive a process restart.
21. As a developer, I want `createSqliteStorage(path)` to remain a pure function of its `path` argument, so that the driver is not coupled to Electron and headless tests / CLI use stay possible.
22. As a developer, I want `server.ts` to resolve the SQLite path from `HORIZON_DB_PATH ?? './horizon.db'` and pass it into `createStorage`, so that the entrypoint owns path resolution and the driver does not.
23. As Carlos running the Desktop Build, I want Electron main to set `HORIZON_DB_PATH` to `app.getPath('userData') + '/horizon.db'` when spawning the Express child, so that the database file lives in the OS user-data directory and backups are a single-folder affair. (Electron wiring is design log 10's scope; this PRD only confirms the env-var seam.)
24. As a developer, I never want the SQLite driver to read `process.env` directly, so that test code can pass any path without setting environment variables.
25. As Carlos, I want default categories to be the only seeded data on a fresh install, so that an empty Accounts list reflects my real state instead of being polluted by sample data.
26. As Carlos, I never want a setup wizard or "init DB" command on the Desktop Build, so that opening the app is the only action required to start using it.
27. As a developer, I want default categories to use stable v4 UUIDs hard-coded in `001_initial.sql`, so that seeded category IDs are identical across installs and tests can reference them by ID.
28. As a developer, I want the SQLite driver to log nothing by default so that a packaged Desktop Build does not write disk noise on the user's machine.
29. As a developer, I want a `DEBUG_SQL=1` env switch that enables query tracing for development, so that tracing exists when needed without leaking into shipped builds.
30. As a developer, I want a short `server/src/storage/sqlite/README.md` documenting the connection pragmas with rationale, the migration / backup / restore policy, and Mongo↔SQLite parity gotchas (FKs enforced, INTEGER booleans, binary collation), so that the next contributor reads one file and understands the operational shape.
31. As a developer, I want the parity spec to keep using `:memory:` so that the suite stays fast and dependency-free.
32. As Carlos, I want the `SQLite driver (offline storage)` checkbox in `CLAUDE.md` to flip only after every operational concern in this PRD ships and the parity spec is still green, so that the build status reflects "ready for Electron to wrap" and not "domain code exists".

## Implementation Decisions

**Module sketch.** Major modules to build or modify:

- **`storage/sqlite/connection.ts`** _(new, deep module)_ — `openConnection(path: string): Database` opens better-sqlite3, applies the fixed `PRAGMAS` array, runs `migrate(db)`, runs `PRAGMA integrity_check`, throws `StorageIntegrityError` on non-`ok`, returns the handle. `closeConnection(db: Database): void` runs `PRAGMA wal_checkpoint(TRUNCATE)` then `db.close()`, idempotent. This is the deepest possible module: a simple `(path) → Database` interface that hides every operational detail (pragmas, migrate, integrity check, WAL semantics on close).
- **`storage/sqlite/SqliteStorage.ts`** — refactored to call `openConnection(path)` for setup and `closeConnection(db)` from inside `Storage.close()`. Adds `backup(destPath)` and `restore(srcPath)` to the returned object.
- **`storage/sqlite/migrate.ts`** — `db.pragma("foreign_keys = ON")` removed (now owned by `connection.ts`). Schema-only.
- **`storage/sqlite/errors.ts`** _(new)_ — exports `StorageIntegrityError extends Error`, with the integrity-check detail in the message.
- **`storage/Storage.ts`** — interface gains `backup(destPath: string): Promise<void>` and `restore(srcPath: string): Promise<void>`.
- **`storage/mongo/MongoStorage.ts`** — `backup` and `restore` implemented as `throw new Error("not supported")` to satisfy the interface honestly.
- **`storage/sqlite/README.md`** _(new)_ — documents the pragma list with rationale, the forward-only migration policy, the backup/restore mechanics, and Mongo↔SQLite parity gotchas (FK enforcement, INTEGER booleans, binary collation).
- **`server.ts`** — when `STORAGE_DRIVER === "sqlite"`, read `HORIZON_DB_PATH ?? './horizon.db'` and pass through to `createStorage("sqlite", { path })`.
- **`__tests__/migrate.test.ts`** — extended with the tempfile open → close → reopen idempotency case and a deliberately-corrupted-tempfile case asserting `StorageIntegrityError`.
- **`__tests__/storage.parity.ts`** — extended with a `backup-and-restore` block: SQLite produces a usable backup file that re-opens with identical data; Mongo throws on both methods.
- **`CLAUDE.md`** — `HORIZON_DB_PATH` and `DEBUG_SQL` documented under Environment Variables; the `SQLite driver (offline storage)` checkbox flipped at the end.

**Connection setup module is deep.** The single most important architectural choice in this PRD is extracting `openConnection` / `closeConnection` into `connection.ts`. The interface is two trivial functions; the encapsulated behaviour is the entire operational personality of the SQLite driver. This is the deepest module the work admits and gives the parity tests, the integrity-check tests, and any future driver code one place to call.

**Pragma list is fixed and applied uniformly.** `PRAGMAS` is a const string array in `connection.ts`. Every connection gets every pragma in the same order, every time. No conditional pragmas, no env-driven overrides — the only env switch is `DEBUG_SQL` and that lives outside the pragma path.

**Backup/restore lives on the facade, not on a side module.** Adding `backup` and `restore` to `Storage` keeps callers driver-agnostic. The Mongo driver throwing `not supported` is the honest signal; the alternative (a SQLite-only side module that callers must reach for) forces every caller to know which driver they're holding, which is exactly what the facade exists to hide.

**`HORIZON_DB_PATH` is read at the entrypoint, never inside the driver.** The driver continues to take `path` as its only parameter. The seam between Electron and the Express child is the env var — set by Electron main, read by `server.ts`, passed through.

**Forward-only migrations are policy, not a tool.** No migration framework is introduced. The existing `migrate.ts` (read `user_version`, run higher-numbered files in one transaction, bump `user_version`) is the entire mechanism. Policy lives in the README and is enforced by code review.

**`DEBUG_SQL=1` is the only optional logging switch.** Enables query tracing in dev. Never on in packaged builds. The driver logs nothing else.

**Default categories keep their existing stable UUIDs.** `001_initial.sql`'s seed block already uses deterministic v4 UUIDs (`00000000-0000-4000-8000-00000000000N`); no change needed.

**Build-status semantics.** The `SQLite driver (offline storage)` checkbox flips only after every item in this PRD ships and the parity suite is green. The Electron shell remains a separate, later checkbox.

## Testing Decisions

**What makes a good test here.** Test external behaviour, not pragma values. A test that introspects `PRAGMA journal_mode` on the open connection couples to implementation; a test that writes data, kills the process before close, reopens, and asserts the data survives is a real durability test. Where direct external behaviour is hard to observe (mmap, busy_timeout), assert at the `openConnection` boundary that the function returns a usable handle and skip implementation-detail introspection.

**Modules to test:**

- **`connection.ts` (the deep module).** Open against a tempfile path returns a handle that can read and write. Open against a tempfile that already has a future `user_version` higher than the latest known migration throws. Open against a deliberately-corrupted tempfile (write garbage bytes after a valid header) throws `StorageIntegrityError`. `closeConnection(db)` followed by a second `closeConnection(db)` is a safe no-op. `closeConnection(db)` against a tempfile leaves the `.db` file on disk and removes any `-wal` sidecar.
- **Migration idempotency.** Open a tempfile, `migrate()`, close, reopen, `migrate()` is a no-op (no schema changes, `user_version` unchanged). Already covered structurally; tighten it explicitly.
- **Backup/restore via the parity spec.** SQLite: write known data, `storage.backup(tempPath)`, open the backup file with a fresh `createStorage("sqlite", { path: tempPath })`, assert the data round-trips. SQLite: write known data, `storage.backup(tempPath)`, mutate the live DB, `storage.restore(tempPath)`, assert the live DB matches the backup. SQLite: `storage.restore(corruptTempfile)` rejects via `StorageIntegrityError`. Mongo: both `backup` and `restore` throw `Error("not supported")`.
- **Path resolution at the entrypoint.** A small `server.ts`-level test (or an isolated helper test) asserting that `HORIZON_DB_PATH=./tmp/foo.db` results in `createStorage("sqlite", { path: "./tmp/foo.db" })` being called, and that `HORIZON_DB_PATH` unset falls back to `./horizon.db`.

**Prior art.**

- `server/src/__tests__/migrate.test.ts` — already exercises the migration runner; the new idempotency and corruption cases extend it directly.
- `server/src/__tests__/storage.parity.ts` — the existing pattern for cross-driver behavioural tests; adding the backup-and-restore block follows it 1:1.
- `server/src/__tests__/storage.sqlite.test.ts` and `storage.mongo.test.ts` — the thin entrypoints that invoke the parity spec; no change to their shape, just gain new cases through the spec.
- `server/src/storage/__tests__/mongoAccountsRepo.test.ts` and siblings — the per-driver test pattern. Not used here; this PRD's tests are operational, not entity-specific.

## Out of Scope

- **Electron main path resolution and shell wiring.** Design log 10. This PRD specifies the env-var seam (`HORIZON_DB_PATH`) and stops there. Spawning the Express child, setting the env var from `app.getPath('userData')`, and surfacing the integrity-error dialog all belong to the Electron shell PRD.
- **Daily auto-backup snapshots and a retention policy.** Belongs to the Electron shell — needs scheduling, a UI, and disk-space considerations.
- **At-rest encryption (SQLCipher).** Design log 08 already deferred this; nothing changes here. The driver remains written so that swapping in `better-sqlite3-multiple-ciphers` is a one-line change later.
- **Down-migrations and schema rollback.** Explicitly rejected. Restore-from-backup is the rollback path.
- **Connection pooling / multi-process access.** better-sqlite3 is synchronous and the Desktop Build is single-process. `busy_timeout = 5000` is the hedge; no further design.
- **Always-on query logging or telemetry.** Explicitly rejected. `DEBUG_SQL=1` is dev-only.
- **VACUUM / database compaction.** No automatic VACUUM. A manual "Optimize database" menu item is a future Electron item only if file size ever matters.
- **Any change to the Mongo driver's behaviour.** The Cloud Build is unaffected by this work other than the two new `backup` / `restore` no-op throws on the facade.
- **`STORAGE_DRIVER` plumbing.** Already shipped in design log 08; this PRD only adds the SQLite-side path resolution downstream of that switch.

## Further Notes

The full Q&A trail (Q1–Q14, including rejected alternatives with rationale) lives in `docs/design-logs/09-sqlite-driver-offline-storage.md`. New ubiquitous-language terms (Connection Pragma, WAL Mode, WAL Checkpoint, Integrity Check, StorageIntegrityError, Forward-only Migration, Online Backup, Restore, `HORIZON_DB_PATH`) are in `docs/ubiquitous-language.md`.

The Storage facade gaining `backup` and `restore` is the only deliberate asymmetry this PRD introduces. The honest "not supported" throw on the Mongo driver is the chosen tradeoff against pushing those methods out of the interface and forcing callers to drive-detect — which would be a worse leak than the throw. The parity spec covers both branches.

After this PRD ships, the Desktop Build is one design log away (`10 — Electron shell`) from being a usable offline app: spawn the Express child, set `HORIZON_DB_PATH`, load the renderer, surface the integrity-error dialog. The operational groundwork in this PRD is what makes that shell trivial to wire.
