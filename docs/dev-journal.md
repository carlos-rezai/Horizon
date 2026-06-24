# Dev Journal

## 2026-06-25 — #147 Month Year-Comparison refactor (close-out)

Worked the `21-month-year-comparison-refactor` plan end to end across ten
commits, cheapest → riskiest, each leaving the full suite green. Five
independent cleanups behind the shipped year-over-year card:

**Dead route mapping.** The reports route hand-rebuilt `YcAccountEntry` /
`YcTxEntry` objects from the storage DTOs before calling the library. The
storage `Account` / `Transaction` types are already structural supersets of
those input interfaces, so the `.map(...)` blocks were a no-op copy — deleted,
DTO arrays now pass straight through.

**`parseYearMonth` helper.** Extracted the open-coded `value.split("-")`
month parser into `lib/date/date.ts` with its own test (handles both `YYYY-MM`
and `YYYY-MM-DD`). `computeYearComparison` adopts it. `lib/projection` and
`lib/settlement` still carry their own copies — deliberately out of scope to
keep the blast radius small; they're noted future adopters.

**Named server Variable-Spending rule.** `computeYearComparison` inlined the
"drop transfer legs and auto-settlement" predicate and owned a private
`NON_SPENDING_KINDS` set. Both now live in `lib/variableSpending/` as
`isVariableSpending` (transaction predicate) and `selectSpendingAccounts`
(account-kind selector). `src/` and `server/src/` are separate build targets
and can't share code, so the client's `selectVariableSpending` in
`src/utils/monthStats` and this server copy are knowingly duplicated — a parity
comment on the module pins them together. Future `/reports` cards reuse the
server helper instead of re-inlining.

**Hook failure path.** `useYearComparison` did `fetch().then(r => r.json())`
with no `res.ok` guard and no `.catch` — a 500 or dropped connection left the
card spinning forever. It now mirrors `useMonthTransactions`: an `error` field,
an `ok` guard, a `.catch`. The card threads `error` through `MonthOverview` and
renders an honest one-line message, a branch distinct from its empty state.

**Narrowed query (`findByDateRange`).** The route loaded the entire
transactions table via `findAll()` then let the library discard everything
outside a two-year window. Added `findByDateRange(fromInclusive, toExclusive)`
to the `TransactionsRepo` contract — a half-open `date >= ? AND date < ?
ORDER BY date` query mirroring the per-account month finder — covered it in the
shared storage parity spec, and pointed the route at a two-year span computed
from `?month`. The library is unchanged and still re-filters, so this is a pure
data-load optimization that cannot alter the rows.

**No contract change.** Endpoint URL, `?month` parameter, response shape,
ranking, and cap are all untouched. The only frontend-visible change is the new
`error` field on the hook.

## 2026-06-22 — #143 Bank Statement Import refactor (close-out)

Worked the `20-bank-statement-import-refactor` plan end to end across twelve
commits, low-risk → high-risk. Cleanup clusters first: deleted the dead
`detectBank` path (`locateKnownBank` is the only detection source); extracted a
shared `formatFileSizeKB` util and reused the `Money` primitive in the wizard's
raw preview; lifted the preview orchestration into a pure, fixture-tested
`buildPreview()` and thinned the route to transport; extracted `useImportWizard`
so `ImportWizard.tsx` is composition over presentation; and aligned naming —
`Import` → `ImportRecord` in the data layer, `desc`/`cat` → `description`/
`category` in the UI (deleting the `toParsedRow` / `toImportedTxn` translation
layers).

**Consistency pass — a latent defect, not just a tidy-up.** The generic
fallback labelled every unrecognized statement `DEFAULT_BANK = "DKB"`. Because a
commit remembers its preset keyed by bank label, a single generic import
silently overwrote the _real_ DKB account's remembered column mapping. Renaming
the fallback to `"Generic"` (commit 10) closes that — a distinct label can never
collide with a real bank's preset memory.

**Preset round-trip fixed.** Migration 011 had collapsed `import_presets` to
`(bank, mapping)`, dropping the `delimiter`/`decimal`/`date_fmt` the engine needs
to re-interpret a statement; a "remembered" preset restored only column _names_
and re-derived format quirks from the freshly detected bank. Migration 012
widens the table (forward-only, German-default backfill) and the full preset now
round-trips: the preview echoes the effective format, the wizard sends it back
on commit, and `buildPreview` re-applies a remembered preset's decimal/date
format when mapping rows. The delimiter is persisted for completeness but not
re-applied — detection still owns splitting, so a remembered delimiter has no
consumer yet.

## 2026-06-16 — #138 Phase 6 + 7: Modals + acceptance sweep (refactor close-out)

Finished the visual-fidelity refactor. The Transaction Edit modal was the only
modal needing a real rebuild; the rest were already faithful or needed small
polish.

**Transaction Edit modal → `08` (full fidelity).** New reusable
`primitives/ChoiceChip` (label + active + optional colour dot + disabled) drives
both the Direction toggle and the Category picker. The modal now uses the
`Modal` title/footer slots (Delete · Cancel · Save changes), an "On ● account"
context line, Description, an Amount + Date two-column grid, an editable
**Direction** (Outflow/Inflow → amount sign), and editable **Category** chips.
Transfer legs stay read-only (Save hidden, fields disabled, two-leg note).
`transactions.category` stores a category **name** (the server's in-use check
matches `transactions.category = category.name`), so chips key off names and
colour via `colorForCategoryName`. The modal gained an `accounts` prop (wired
from `MonthOverview`) to resolve the source account's name + colour.

**Import Wizard (`07`) — already faithful.** Verified all three steps (Account
→ Map columns → Review) render 1:1 against the screenshot; it shipped complete
with the Import UI. No change.

**Mortgage / Account-Create — toggle polish only.** Origination fields + the
live `% paid off` preview (MortgageModal) and the showInTrajectory field
already existed. Polished the "Display in Trajectory Horizon" control from a raw
checkbox to the prototype's bordered card: `TrendingUp` icon box (gold when on)

- title + description + the `Toggle` primitive on the right (hidden for
  Mortgage).

**Import history defaults expanded.** The year accordion now opens the most
recent year by default (was all-collapsed), matching `05`.

**Acceptance sweep — typography drift.** `FormField` labels were sentence-case
14px; the prototype uses the small uppercase label scale for every field. Moved
`FormField`'s label onto `typography.scale.label` (11px, uppercase,
letter-spacing) — purely visual (`text-transform`, so the DOM text and all
`getByLabelText` tests are unaffected), bringing every modal's field labels to
the prototype.

**Known minor deviation (deferred):** the Edit/Create amount inputs don't render
the prototype's inline `€` prefix — the `Input` primitive has no prefix slot and
adding one is out of this refactor's scope.

## 2026-06-16 — #138 Phase 5: Settings recomposed to the prototype

Brought the Settings screen's Preferences and About cards to the canonical
layout, reusing existing primitives and adding two small reusable pieces.

**New shared components.** `SettingRow` (components/) — the prototype's
icon-box + title/desc + right-slot row, used for every preference line — and
`BrandMark` (components/) — the sun-arc logo SVG extracted out of `AppLayout`'s
sidebar so it can be reused in the About card. `BrandMark` takes a `label` prop:
labelled it is an accessible `img`, unlabelled it is decorative (`aria-hidden`),
so the sidebar mark stays the named graphic and the About mark doesn't duplicate
the accessible name on the page.

**Preferences card** (`features/settings/PreferencesCard`): three `SettingRow`s
— Automatic updates (wired `AutoUpdateToggle`, now reduced to just the
primitive Toggle), Appearance (`Dark` badge), Privacy (`Local` pos badge).

**About card** (`features/settings/AboutCard`): `BrandMark` + product
description + tech line, and a VERSION label / mono version / "Check for
updates" button. `AppVersion` (the old "Horizon x.y.z / Electron …" stack) was
removed — the prototype shows the app version alone, no Electron line.

**"Check for updates" wiring.** There is no dedicated check-for-updates IPC and
adding one is out of scope, so the button surfaces the _current_ update state
via the existing `useUpdateStatus` + snackbar: a Download action when an update
is known available, a Restart action when one is downloaded, otherwise an
honest "You're on the latest version (vX)" info toast. Because `AboutCard` now
uses `useSnackbar`, the page test wraps the page in `SnackbarProvider` (as
production already does via `AppLayout`).

**Out of scope, confirmed by the plan.** The prototype's "Snackbar states"
preview card stays dropped (decision doc); the Storage card keeps showing the
_real_ DB path/size, not the prototype's mock `2,4 MB`.

## 2026-06-16 — #138 Phase 4: Account Detail recomposed to the prototype

Rebuilt the Account Detail screen to the canonical hero layout: `AccountHero`
(Avatar in the account colour, name + account-colour status dot, kind Badge,
subtitle, ghost Edit + danger Delete, and a CURRENT BALANCE / RESTSCHULD
StatBlock with a balance Sparkline), `AccountStatStrip` (Opening Balance,
Opening Date, Recurring, Recurring net / mo — sibling of `MonthStatStrip`), a
`SectionHead` + "Add recurring", and a reskinned `RecurringTransactionList`
(NAME | AMOUNT | DAY | FREQUENCY, the transfer target as a "→ ● account"
sub-line, frequency as a Badge).

**Two prototype elements had no real-data field; resolved by deriving from what
exists (developer-approved this session):**

- **Hero subtitle.** The prototype's `a.sub` ("Savings · 1.2% APY · ST reserve")
  is hand-authored and the account model has no such column (no new schema in
  scope). `accountSubtitle` derives a per-kind line instead — "Checking/Savings/
  Investment account", "Mortgage · Restschuld", and "Credit card · settles
  monthly → <funding>" for a linked card.
- **Balance sparkline.** The prototype hardcodes the series; `accountBalanceSeries`
  reads the account's month-by-month balance from the projection snapshots
  (actual over projected). Honest forward trend — the line is the account's real
  trajectory, so a Tagesgeld with an annual Sondertilgung shows its real dips.

**Inline editing dropped.** The old header's inline rename / opening-balance
fields are gone; the hero's Edit opens the existing AccountCreateModal (edit
mode), which already covers name + opening balance + every other field. The
delete guard (blocked while the account has one-off transactions) and a confirm
step are preserved — the prototype's delete-with-Undo toast is a separate epic.

## 2026-06-16 — #138 Phase 3: Month Overview acceptance pass (1:1 with prototype)

Drove the real app (seeded with the prototype's Nov-2026 accounts + variable
spending) and diffed the render against `screens/03-month-overview.png`. Three
fidelity gaps closed; the screen now matches the prototype:

- **Spending list order.** Rows were grouped by account then descending (a side
  effect of `useAllMonthTransactions` concatenating per-account API results).
  The prototype lists a month oldest-first, interleaving accounts — so
  `SpendingList` now sorts the visible rows by ISO date ascending (presentation
  only; the shared hook is unchanged).
- **Category colours pinned to the prototype.** Colour was purely name-hashed
  (#134), so the donut + badges rendered arbitrary hues. Added a fixed
  name→colour map for the seven canonical breakdown categories
  (Groceries=sage, Dining=clay, Transport=steel, Shopping=lilac, Health=teal,
  Cat=ochre, Misc=slate), hash fallback for any other name. Applied identically
  to the frontend util and its server mirror; every fixed value is still a
  member of `categoryColorPalette`.
- **Donut centre rounded.** Added an opt-in `whole` option to `Money` and a
  `wholeCenter` prop on `Donut`; the breakdown centre now reads `776 €` like
  the prototype while the legend keeps cents.

**Developer decisions (this session).** Avg/day stays `daysInMonth` (the
functionally-correct -25,87 €, not the prototype's hard-coded /28 = -27,72 €).
Category colours moved from pure-hash to fixed-map for the known categories
(reversing the #134 "purely from name" stance for these seven, by request).

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
