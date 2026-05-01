# Dev Journal

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
