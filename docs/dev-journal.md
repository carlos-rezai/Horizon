# Dev Journal

## 2026-06-15 — #138 Phase 3: Month Overview recomposed to the prototype

The Month Overview screen was rebuilt from the old per-account ledger into the
canonical prototype layout: PageHeader + month stepper, a 4-card stat strip
(`MonthStatStrip`), the `SpendingList` (All-accounts + per-account tabs with
counts, day-number rows, category badges, account dots), the `MonthBreakdown`
donut, and an honest `YearComparison` "Planned" placeholder (no fabricated
bars, per design-log decision #6). New pure utils: `deriveMonthStats`,
`deriveBreakdown`, and a frontend `colorForCategoryName`.

**Category colour — pure util, not a /categories fetch.** Every category colour
in the system is `colorForCategoryName(name)`: SQL-seeded defaults fall back to
it at read time and user-created categories persist exactly that value on
insert (the server never stores a custom colour — there is no colour picker).
Resolving colour from the transaction's category name on the frontend is
therefore provably identical to reading the `color` column, with no network
round-trip for a purely visual concern. The palette mirrors the server's.

**Variable Spending excludes transfers + auto-settlement.** The spending list
and all stat/breakdown figures filter out one-off transfer legs (`transferId`)
and credit-card auto-settlement (`isAutoSettlement`) — they are bookkeeping
movements, not spending. Consequence: a one-off transfer created from the Month
Overview no longer appears in its list (the prototype's "Add expense" is
expense-only; the create modal still exposes the transfer picker, unchanged).

**Deliberate deviation — Avg / day denominator.** The prototype hard-codes
`totalSpend / 28`; `deriveMonthStats` divides by the actual calendar days in
the month (`daysInMonth`). On the prototype-calibrated seed this is the one
figure that differs from the reference screenshot (June: -25,87 € vs the
prototype's -27,72 €). The seed reproduces every other number to the cent. This
is the functionally-correct choice; flagged for the developer to veto.

**Minor known difference.** The shared `Donut` centre renders cents
("776,16 €") where the prototype shows a rounded "776 €". The per-slice legend
matches the prototype exactly (cents shown). Left as-is rather than changing the
phase-0 `Donut` API.

## 2026-05-04 — SQLite Driver refactor close-out (issue #65)

Eight leaks plus the missing-other-half restore feature from the SQLite
Driver shipping (issues #62–#64) are now closed before the Electron shell
slice begins.

**Wire prefix.** Storage routes drop the `/api/` segment that #62/#63
introduced as a local anomaly. Every other domain mounts at `/<domain>/*`;
storage now does too. SPA helpers and the consolidated route file follow.

**One router per domain.** `routes/storageStatus.ts` and
`routes/storageBackup.ts` are now a single `routes/storage.ts` mounted
once at `/storage`. The two `__tests__/storage*.route.test.ts` files
collapsed into one `storage.route.test.ts` along with the route.

**Unsupported-driver action returns 400, not 501.** The Mongo path of
`POST /storage/backup` previously returned 501 with `{"error":"not
supported"}` — but `sanitize5xx` blanket-rewrote that to
`{"error":"Internal server error"}` in the Cloud Build, so the legitimate
"this driver doesn't support backup" case looked like a server crash. The
route now uses an `isUnsupportedDriverError` predicate that maps the
literal `"not supported"` message to a 4xx body
(`Storage driver does not support {backup,restore}`); other throws
propagate to Express's error middleware unchanged.

**Required `path` for SQLite.** `createStorage("sqlite")` no longer
silently defaults `path` to `:memory:`. A missing `path` throws
`SQLite storage driver requires a 'path' option` at boot. The Electron
entrypoint (when it lands) must read `HORIZON_DB_PATH` and pass the
resolved file path explicitly. Tests pass `":memory:"` themselves.

**Restore endpoint + UI.** `POST /storage/restore` accepts a multipart
`file` upload (multer), writes it to a unique temp path under
`os.tmpdir()`, calls `storage.restore(tempPath)`, and unlinks the temp
file in a `finally`. `StorageIntegrityError` maps to 400 with one of two
stable messages (`Backup file failed integrity check` /
`Backup was written by a newer version of Horizon`). The Settings →
Storage UI gains a "Restore from backup" button (SQLite only) that opens
a hidden file input, shows a confirm dialog naming the file, and surfaces
the server error on failure.

**Integrity helpers.** `connection.ts`, `migrate.ts`, and
`SqliteStorage.ts:validateRestoreSource` previously each ran their own
`PRAGMA integrity_check` / `user_version` comparison with subtly
different error message shapes. They now share
`storage/sqlite/integrity.ts` (`assertIntegrity`, `assertSchemaNotAhead`).

**Settings UI realignment.** The status display + action buttons live in
`features/settings/StorageStatus/` (`.tsx`/`.styles.ts`/`.test.tsx`).
`SettingsStoragePage` is composition-only: heading + `<StorageStatus />`.
Tests split into one-file-per-unit-of-behaviour: `useStorageStatus.test.ts`,
`downloadBackup.test.ts`, `uploadRestore.test.ts`, `StorageStatus.test.tsx`,
plus a smoke test on the page. Meridian theme tokens cover all storage UI;
no raw HTML semantic elements unstyled.

**What's next.** The Electron shell (design log 10) builds on top of
this: a daemonised Express child process, `app.getPath('userData')`
wired into `HORIZON_DB_PATH`, and a Settings-page integration of the
open-path's `StorageIntegrityError` envelope (today the Express child
would crash at boot — the shell will need to handle it).

## 2026-05-01 — Repository Abstraction refactor close-out (issue #54)

Six leaks left over from the Repository Abstraction shipping (issues #51–#53)
are now closed before the Desktop Build slice begins.

**Wire format.** Routes now `res.json` Storage DTOs directly. The `_id` shim
is gone from every route and the SPA reads `id` end-to-end. There is no
backwards-compatibility window — Horizon has one client and the rename was
mechanical. `lib/projection.ts` accepts the same DTO shape (`id`, not `_id`).

**SQLite foreign keys.** Migration `002_foreign_keys.sql` rebuilds
`transactions`, `recurring_transactions`, and `milestones` with `REFERENCES
accounts(id)` (no cascade — application-level guards fire first and produce
409s). `migrate.ts` enables `PRAGMA foreign_keys = ON` for every connection
before pending migrations run, since the pragma is per-connection in SQLite.

**Account delete.** Both drivers' `accounts.delete` now reject deletion when
recurring transactions (active _or_ inactive, on `accountId` _or_
`linkedAccountId`) or milestones still reference the account. The route
maps `{ ok: false, reason: "in_use" }` to a 409 with reason-specific copy.

**Recurring create.** Both drivers' `recurringTransactions.create` validate
`accountId` and (when provided) `linkedAccountId`, returning `null` for
unparseable or unknown ids — same contract as `milestones.create`. The
repo's return type is now `Promise<RecurringTransaction | null>`. The route
surfaces `null` as 404.

**What changed for callers.** Tests that previously POSTed against a fake
account id now have to create a real one first. `FAKE_ACCOUNT_ID` is gone
from `recurringTransactions.test.ts` and the storage-only Mongo recurring
test. Wire format flipped from `_id` to `id` — anything reading the SPA's
network responses externally would need to update.

## 2026-04-19 — `monthOfYear` schema migration (recurring transactions)

Added optional `monthOfYear` (integer 1–12) to the `RecurringTransaction` Mongoose
model as part of the financial projection dashboard refactor (issue #36).

**Why:** Annual recurring transactions previously had no way to specify which month
of the year they fire. `deriveSTMonths` fired them at the projection-start month
offset (`i % 12 === 0` from `fromMonth`), which was always wrong for ST payments
intended for October.

**Migration strategy:** Forward-compatible additive field. No migration script.
Existing records without `monthOfYear` continue to fire at the projection-start month
as before. Users with existing annual recurring transactions will see correct ST month
placement only after they open and re-save the transaction — at which point
`monthOfYear` is persisted. `deriveSTMonths` explicitly falls back to the old
behaviour when the field is absent.

**What to watch:** If a user has an October ST stored as an annual RT created before
this change, it will still fire at the projection-start month until re-saved.
Consider surfacing a one-time prompt to re-confirm ST month after this ships.

---

## 2026-06-15 — #138 Outlook accordion: projected vs actual Restschuld

While restructuring the Projection Accordion (issue #138) the collapsed/expanded
Restschuld column was switched to read the **projected** balance only, not
`actual ?? projected`. A Mortgage's `actual` is just its un-replayed opening
balance (ST is a recurring transfer, never an actual transaction), so when the
mortgage's `openingDate` is in the past, the replay-derived projected start
(e.g. 72.000) differs from the opening balance (90.000). Mixing them fabricated
a phantom Restschuld step-down at the current-month boundary.

**Out-of-scope observation:** the Dashboard KPI "Restschuld" tile and the
MortgageCountdown still use `actual ?? projected`, so they show the opening
balance (90.000) while the accordion/trajectory show the projected start
(72.000). Both are defensible (account balance vs modelled trajectory) but
inconsistent across screens. A future consistency pass should pick one
convention for "current Restschuld" project-wide.
