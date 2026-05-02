# Plan: SQLite Driver — Offline Storage (operational hardening)

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/55

## Architectural decisions

Durable decisions that apply across all phases:

- **Connection deep module**: a single SQLite connection module exposes `openConnection(path) → Database` and `closeConnection(db) → void`. It owns the entire operational personality — pragmas, `migrate()`, startup integrity check, and `wal_checkpoint(TRUNCATE)` on close. `SqliteStorage.ts` becomes a thin assembler over it.
- **Pragma list (fixed, applied uniformly)**: `journal_mode = WAL`, `synchronous = NORMAL`, `busy_timeout = 5000`, `foreign_keys = ON`, `mmap_size = 67108864`. No env-driven overrides. The FK pragma leaves `migrate.ts`.
- **Typed integrity error**: `StorageIntegrityError extends Error` lives in a dedicated SQLite-side errors module. Thrown by `openConnection` when `PRAGMA integrity_check` returns non-`ok`. No silent recovery — ever.
- **`Storage` facade gains backup + restore**: `backup(destPath: string): Promise<void>` and `restore(srcPath: string): Promise<void>` are added to the interface. SQLite implements via `db.backup()` and a validated file swap (integrity check + `user_version` ≤ current schema). Mongo throws `Error("not supported")` — honest signal, no abstraction leak.
- **Entrypoint env seam**: `server.ts` reads `HORIZON_DB_PATH ?? './horizon.db'` when `STORAGE_DRIVER === "sqlite"` and passes the resolved path into `createStorage`. The driver never reads `process.env`.
- **`DEBUG_SQL=1` is the only optional logging switch**, wired at the entrypoint and applied to the connection. Off by default; never on in packaged builds.
- **Forward-only migrations are policy, not a tool**: numbered files in `migrations/`, append-only, never edited after release, no down-migrations. Restore-from-backup is the rollback path. Existing `migrate.ts` mechanism unchanged.
- **Operational HTTP surface**: cloud and desktop both expose `GET /api/storage/status` (returns `{ driver, schemaVersion, integrity, path?, sizeBytes? }`) and `POST /api/storage/backup` (SQLite streams the `.db` file as a download; Mongo returns 501). Restore from the browser is deferred to the Electron shell, where a native file dialog is ergonomic.
- **Frontend Storage surface**: a Settings → Storage panel reads `/api/storage/status` and exposes a "Download backup" button. Driver-agnostic; the page handles 501 from Mongo by hiding the backup action.
- **Parity spec stays on `:memory:`**. Tempfile-based tests for durability, corruption, and idempotency live alongside `migrate.test.ts` and inside the parity spec's new backup-and-restore block.

---

## Phase 1: Connection deep module + DEBUG_SQL

**User stories**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 28, 29

### What to build

Extract the operational personality of the SQLite driver behind two trivial functions: `openConnection(path)` returns a fully prepared handle (pragmas applied, migrations run, integrity check passed); `closeConnection(db)` checkpoints WAL into the main `.db` file and closes idempotently. Refactor `SqliteStorage.ts` to call them. Strip the FK pragma out of `migrate.ts` so it stays schema-only. Add the typed `StorageIntegrityError`. Wire `DEBUG_SQL=1` at the entrypoint as the only optional logging switch (passed through to the connection module). Tempfile-based tests prove real durability — write a row, simulate an unclean exit, reopen, the row is still there — and a deliberately-corrupted tempfile throws `StorageIntegrityError`.

### Acceptance criteria

- [ ] A new connection module exports `openConnection(path)` and `closeConnection(db)` with no `any`.
- [ ] `openConnection` applies the fixed pragma list (WAL, synchronous=NORMAL, busy_timeout=5000, foreign_keys=ON, mmap_size=64MB) before `migrate()` and `PRAGMA integrity_check`.
- [ ] `migrate.ts` no longer sets `foreign_keys`. It is schema-only.
- [ ] `StorageIntegrityError` is exported from a SQLite-side errors module and thrown by `openConnection` when `PRAGMA integrity_check` returns non-`ok`. The error message includes the integrity-check detail.
- [ ] `SqliteStorage.ts` calls `openConnection(path)` for setup; its `close()` calls `closeConnection(db)`.
- [ ] `closeConnection(db)` runs `PRAGMA wal_checkpoint(TRUNCATE)` before closing and is a safe no-op on a second call.
- [ ] After a clean `close()` against a tempfile path, no `-wal` / `-shm` sidecar files remain on disk.
- [ ] Tempfile durability test: write a row → close → reopen the same path → row is readable.
- [ ] Tempfile corruption test: write garbage after a valid SQLite header → opening that path throws `StorageIntegrityError`.
- [ ] Future-`user_version` test: opening a tempfile whose `user_version` exceeds the latest known migration throws.
- [ ] `DEBUG_SQL=1` enables better-sqlite3 query tracing in development; with the env unset, the driver emits no logs.
- [ ] The existing `:memory:` parity suite (`storage.parity.ts`, `storage.sqlite.test.ts`, `storage.mongo.test.ts`) is unchanged in shape and remains green.

---

## Phase 2: Backup / restore on the Storage facade

**User stories**: 11, 12, 13, 14, 15

### What to build

Add `backup(destPath)` and `restore(srcPath)` to the `Storage` interface. SQLite implements `backup` via better-sqlite3's online backup API (consistent across WAL — never a torn copy) and `restore` by opening the source as a fresh connection, asserting `PRAGMA integrity_check === "ok"` and `user_version <= current`, then swapping the file in and reopening through `openConnection`. Mongo implements both as `throw new Error("not supported")` so the facade is honest about which driver supports them. Extend the parity spec with a backup-and-restore block that exercises both branches.

### Acceptance criteria

- [ ] `Storage` interface gains `backup(destPath: string): Promise<void>` and `restore(srcPath: string): Promise<void>`.
- [ ] SQLite `backup` produces a self-contained `.db` file at `destPath` while the live driver keeps serving requests; opening the backup file with a fresh `createStorage("sqlite", { path: destPath })` round-trips identical data.
- [ ] SQLite `restore` succeeds against a valid backup: live data after `restore` matches the backup contents, and the live `Storage` handle continues to serve queries via a freshly reopened connection.
- [ ] SQLite `restore` against a corrupted source rejects with `StorageIntegrityError` and leaves the live database untouched.
- [ ] SQLite `restore` against a source whose `user_version` exceeds the live schema rejects with a typed error and leaves the live database untouched.
- [ ] Mongo `backup` and `restore` both throw `Error("not supported")`.
- [ ] `storage.parity.ts` gains a backup-and-restore block: SQLite round-trip, SQLite restore-from-corrupt rejection, Mongo throws on both methods.
- [ ] Phase 1 acceptance criteria still pass.

---

## Phase 3: Entrypoint path resolution (`HORIZON_DB_PATH`)

**User stories**: 21, 22, 23, 24

### What to build

Move SQLite path resolution out of any default and into the entrypoint. `server.ts` reads `HORIZON_DB_PATH ?? './horizon.db'` when `STORAGE_DRIVER === "sqlite"` and passes the resolved path into `createStorage`. The driver continues to take `path` as its only parameter and never reads `process.env`. The seam between Electron main (which will set `HORIZON_DB_PATH` to `app.getPath('userData') + '/horizon.db'`) and the Express child is now in place.

### Acceptance criteria

- [ ] `server.ts` resolves the SQLite path from `HORIZON_DB_PATH ?? './horizon.db'` only when the SQLite driver is selected.
- [ ] No file under `server/src/storage/sqlite/` reads `process.env`.
- [ ] An entrypoint-level test asserts: `HORIZON_DB_PATH=./tmp/foo.db` causes `createStorage("sqlite", { path: "./tmp/foo.db" })` to be called; with the env unset, the path falls back to `./horizon.db`.
- [ ] Setting `HORIZON_DB_PATH` to a tempfile and starting the server creates and uses that file end-to-end (smoke-verifiable; not necessarily a CI test).
- [ ] Phase 1 and Phase 2 acceptance criteria still pass.

---

## Phase 4: Operational surface (frontend) + migration policy + docs + checkbox flip

**User stories**: 16, 17, 18, 19, 20, 25, 26, 27, 30, 31, 32

### What to build

Make Phase 1–3 demoable through the running app. Add `GET /api/storage/status` returning `{ driver, schemaVersion, integrity, path?, sizeBytes? }` and `POST /api/storage/backup` which (for SQLite) streams the `.db` file as a download response and (for Mongo) returns 501. In the frontend, add a Settings → Storage panel that calls `/api/storage/status` on load and renders a "Download backup" button that hits `/api/storage/backup`; the panel hides the button when the driver returns 501. Tighten migration tests with the explicit no-op-when-current case and a tempfile open → close → reopen idempotency case. Write the SQLite-specific README documenting the pragma list with rationale, the forward-only migration policy, the backup/restore mechanics, and Mongo↔SQLite parity gotchas (FKs enforced, INTEGER booleans, binary collation). Update `CLAUDE.md` to document `HORIZON_DB_PATH` and `DEBUG_SQL` under Environment Variables and flip the `SQLite driver (offline storage)` checkbox.

### Acceptance criteria

- [ ] `GET /api/storage/status` returns `{ driver, schemaVersion, integrity }` for both drivers and additionally `{ path, sizeBytes }` when `driver === "sqlite"`.
- [ ] `POST /api/storage/backup` streams the SQLite `.db` file as a downloadable response under SQLite, and returns 501 with a stable error body under Mongo.
- [ ] A new Settings → Storage page in the frontend renders the status payload and a "Download backup" button. Under Mongo, the page renders the status without the backup action.
- [ ] The Storage page is reachable from the existing settings/navigation surface without breaking other routes.
- [ ] Migration tests assert: `migrate()` is a no-op when `user_version` is already at the latest version (no schema changes, version unchanged). A tempfile open → migrate → close → reopen → migrate path is also a no-op.
- [ ] A new `server/src/storage/sqlite/README.md` documents: every pragma with its rationale, the forward-only / append-only / never-edited migration policy, the backup/restore mechanics, and the parity gotchas (FK enforcement, INTEGER booleans, binary collation).
- [ ] `CLAUDE.md`'s Environment Variables section documents `HORIZON_DB_PATH` and `DEBUG_SQL`.
- [ ] `CLAUDE.md`'s Build Status flips `SQLite driver (offline storage)` to checked.
- [ ] The full parity suite, route test suite, and new migration tests are green.
- [ ] The Storage page is verifiable in a browser against both drivers (Mongo: status only; SQLite via `STORAGE_DRIVER=sqlite`: status + working download).
