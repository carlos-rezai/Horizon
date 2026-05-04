# SQLite Driver

The SQLite Storage Driver — a concrete implementation of the `Storage`
facade backed by `better-sqlite3`. Used by the Desktop Build; the Cloud
Build uses the Mongo Driver against the same `Storage` interface.

The driver takes a path argument and never reads `process.env`. Path
resolution lives at the entrypoint (`server.ts`), which reads
`HORIZON_DB_PATH` and passes it through. This keeps Electron-vs-server
concerns at the entrypoint and the driver framework-agnostic.

## Connection Pragmas

Applied uniformly to every connection in `connection.ts`, in this order,
before `migrate()` runs:

| Pragma                 | Value   | Rationale                                                                                                                                                                                       |
| ---------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `journal_mode = WAL`   | WAL     | Write-Ahead Logging — readers do not block writers and writers do not block readers. Crash-safe with `synchronous = NORMAL`. Produces `.db-wal` / `.db-shm` sidecars.                           |
| `synchronous = NORMAL` | NORMAL  | The recommended companion to WAL. Trades the FULL-fsync-per-commit cost for a small risk of losing the last transaction on power loss — acceptable for this app.                                |
| `busy_timeout = 5000`  | 5000 ms | If a write contends for the lock, wait up to 5 s before throwing `SQLITE_BUSY`. Eliminates spurious busy errors during the WAL-checkpoint window.                                               |
| `foreign_keys = ON`    | ON      | SQLite ships with FK enforcement off by default — the driver opts in. Application-level guards (DeleteResult `has_transactions`, `is_transfer_leg`, …) fire first; FKs are the belt-and-braces. |
| `mmap_size = 67108864` | 64 MB   | Enables memory-mapped I/O for hot pages. 64 MB comfortably covers the working set of a personal-finance database for the foreseeable future.                                                    |

These are **Connection Pragmas**: they apply to a single open connection,
not to the file. Every open re-applies them. There are no conditional
pragmas and no env-driven overrides — the only optional knob in the
driver is `DEBUG_SQL` (see below).

## Migration Policy: Forward-Only, Append-Only

Migrations live in `migrations/` as numbered SQL files
(`001_initial.sql`, `002_foreign_keys.sql`, …). `migrate.ts` walks the
folder, sorts by the leading number, applies any file whose version
exceeds the database's current `PRAGMA user_version`, and bumps
`user_version` to the latest applied version inside a single
transaction.

The policy is strict:

- **Numbered files only.** The leading `\d+_` prefix is the version.
  Files that do not match are ignored.
- **Append-only.** New schema changes are new files with the next
  number — never edits to a previously shipped file.
- **Never edited after release.** Once a migration ships in a build that
  someone may have run, its bytes are frozen. Editing it would let two
  databases at the same `user_version` diverge.
- **No down-migrations.** There are no `down_*.sql` files and no
  rollback path baked into the driver. Restore-from-backup is the
  rollback path.
- **No-op when current.** Calling `migrate()` against a database whose
  `user_version` is already at the latest known version is a guaranteed
  no-op: no schema changes, version unchanged. Covered by the migration
  test suite (in-memory and across a tempfile open → close → reopen
  cycle).
- **Future versions are refused.** If the database's `user_version` is
  _higher_ than the latest known migration (it was written by a newer
  build), `migrate()` throws `StorageIntegrityError` rather than
  silently running.

Because there is no down-migration, schema mistakes are recovered via
**Restore from a previous Online Backup**, not via SQL. This is the deal:
forward-only is the policy, backups are the safety net.

## Backup and Restore

Both methods live on the `Storage` facade and are SQLite-only. The
Mongo Driver throws `not supported`.

### `Storage.backup(destPath)`

Calls `better-sqlite3`'s `db.backup(destPath)` — the **Online Backup**
API. Safe while the database is open and aware of WAL: the resulting
file at `destPath` is a single, self-contained, consistent snapshot of
the live database, no `.db-wal` / `.db-shm` sidecars required.

A plain file copy of `horizon.db` is **not** a valid backup — it misses
the WAL sidecars and risks a torn snapshot. Always go through
`Storage.backup`.

### `Storage.restore(srcPath)`

Three-step sequence:

1. **Validate the source.** Open `srcPath` read-only. Run
   `PRAGMA integrity_check` — abort with `StorageIntegrityError` if it
   does not return `ok`. Read the source's `user_version` and abort if
   it is _higher_ than the live schema version (the source was written
   by a newer build).
2. **Close the live connection** via `closeConnection()`, which runs
   `PRAGMA wal_checkpoint(TRUNCATE)` and switches `journal_mode` to
   `DELETE` so the on-disk `.db` is the canonical snapshot and the
   sidecars are gone.
3. **Copy the source over the live path** with `fs.copyFileSync`, then
   reopen the connection (which re-applies pragmas, runs `migrate()` —
   safely a no-op or a forward step — and runs `integrity_check`
   again). Repos are rebuilt against the new connection.

If validation throws, the live database is left untouched.

### `closeConnection()` and the WAL Checkpoint

`Storage.close()` runs:

1. `PRAGMA wal_checkpoint(TRUNCATE)` — folds the `.db-wal` back into
   the `.db` file.
2. `PRAGMA journal_mode = DELETE` — drops the `.db-wal` and `.db-shm`
   sidecars on the final close.
3. `db.close()`.

This guarantees the on-disk `.db` is one clean snapshot at shutdown,
which makes external file-level operations (and in particular
`Storage.backup`) straightforward to reason about.

## Parity Gotchas (Mongo ↔ SQLite)

The Parity Spec (`__tests__/storage.parity.ts`) runs the same suite
against both drivers, but a few SQLite-specific quirks are worth
calling out for anyone touching the driver:

- **Foreign-key enforcement is opt-in.** SQLite ships with
  `foreign_keys = OFF` by default. The driver turns it ON in
  `connection.ts`. Migration `002_foreign_keys.sql` adds `REFERENCES
accounts(id)` to `transactions`, `recurring_transactions`, and
  `milestones` via the standard "rename, recreate with FK, copy, drop"
  pattern (SQLite cannot `ALTER TABLE ADD CONSTRAINT FOREIGN KEY`).
  FKs default to `NO ACTION` — application-level guards fire first and
  produce 409 responses; no `CASCADE`.
- **Booleans are INTEGER 0/1.** SQLite has no native `BOOLEAN` type.
  Columns like `categories.is_default` and `recurring_transactions.is_active`
  are `INTEGER NOT NULL`, conventionally 0 / 1. Mappers in the repos
  coerce on the way in and out so the `Storage` interface speaks
  TypeScript `boolean`. Direct SQL queries against the tables must
  remember this — `WHERE is_active = 1`, not `WHERE is_active = true`.
- **TEXT comparison is binary by default.** SQLite's default collation
  is `BINARY` — case-sensitive, byte-for-byte. Mongo uses BSON string
  collation, which is also case-sensitive by default but exposes
  locale-aware collations. The driver does not introduce a custom
  collation: any case-insensitive comparison must be expressed with
  `LOWER(col) = LOWER(?)` or `COLLATE NOCASE` at the query level. The
  parity suite assumes case-sensitive matches everywhere.
- **Monetary values are integers (cents).** Both drivers store cents in
  `INTEGER` / Mongo `Number`. There are no `REAL` columns in the SQLite
  schema. Floats never enter the driver.
- **Dates are ISO-string TEXT.** Both drivers store dates as
  `YYYY-MM-DD` strings. SQLite has no native date type; lexicographic
  ordering of ISO strings matches chronological ordering, so range
  queries on `transactions.date` work without conversion.
- **IDs are application-generated UUID strings.** `crypto.randomUUID()`
  in `uuid.ts`. SQLite's `id TEXT PRIMARY KEY` matches Mongo's
  application-side `_id`-as-string convention. No `INTEGER PRIMARY KEY`
  rowid magic.
- **`:memory:` hides process-restart bugs.** The parity suite uses an
  in-memory database for speed, but a tempfile-based test in
  `migrate.test.ts` exercises open → migrate → close → reopen → migrate
  to catch regressions that only surface when state has to survive a
  restart.

## Optional: `DEBUG_SQL=1`

The only optional logging knob. When the entrypoint sees
`DEBUG_SQL=1` in the environment, `resolveSqliteOptions` returns a
`verbose` callback that pipes every executed statement to
`console.info`. Off by default; never on in packaged builds. The driver
emits no other logs.
