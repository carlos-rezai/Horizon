# Dev Journal

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
