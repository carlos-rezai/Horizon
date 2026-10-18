# Dev Journal

## 2026-07-12 — #172 Historical Month Navigation refactor (close-out)

Worked the `24-history-navigation-refactor` plan end to end across 21 commits,
cheapest → highest-blast-radius, each leaving the frontend suite green. The
feature shipped `HistoryChart` as a deliberate **sibling** of the Dashboard's
`TrajectoryHorizon` (design log 23 deferred the shared-chrome extraction to a
future refactor plan). This was that plan: the two charts shared, essentially
byte-for-byte, a month-label helper, the series interface + builder, the whole
visibility block, the toggle-chip legend, the series-toggle indicator, and ~13
styled components. All of it is now extracted into the correct layers and
consumed by both charts, which keep only their divergent `<ComposedChart>`
bodies.

**New shared layers.** `hooks/useSeriesVisibility` (the `hooks/` directory's
first resident — the "used across 2+ features" rule) bundles the
`useState`(defaults + persisted-merge) + `useEffect`(save) + toggle/isolate/
showAll handlers, composing the pure math already in `utils/trajectory`.
`utils/trajectory` gained `buildSeriesDescriptors` (+ the `SeriesDescriptor` /
`SeriesColors` / `SeriesAccount` types) and a loosened `computeVisibleYDomain`
row type (`ChartRow`) that deleted HistoryChart's `as unknown as
TrajectoryDataPoint[]` cast. Four dumb, chart-agnostic `components/` were added
and barrel-registered: `SeriesLegend`, `SeriesToggleIndicator`, `ChartFrame`
(card + header with a `controls` slot + loading state), and `ChartTooltip`
(the box + label shell; each chart still renders its own rows as children).

**Month-name dedup.** Both charts and `MonthYearPicker` each carried a private
copy of the month-name array despite `utils/format` already exporting an
identical `formatMonth`/`MONTHS`. Exported `MONTHS` and routed all three through
it — one source of truth.

**ChartFrame boundary — a deliberate narrowing of the plan.** The plan listed
the chart _wrapper_ as part of `ChartFrame`, but the wrapper carries
feature-specific test affordances (`data-testid`, History's `data-months`) and
wraps feature-specific chart content, so pulling it into a domain-agnostic shell
would leak feature test concerns. `ChartFrame` therefore owns card + header +
loading-or-children; each feature keeps its own trivial `StyledChartWrapper`,
and the feature's empty-state stays in the feature (passed as children). The
card's top margin is a `topSpacing` prop (defaults to the Dashboard value) so
History's slightly smaller gap is preserved rather than silently changed.

**Legend testIds preserved.** `SeriesLegend` takes a `testId` prop so both
charts keep their existing `history-legend` / `trajectory-legend` hooks — the
existing `HistoryChart` / `TrajectoryHorizon` behavioural suites stayed green and
untouched across every adopt commit, which is the proof the extraction preserved
behaviour. Also swept out the already-dead `StyledTooltipRowAccent` (unused
before this refactor).

**Test note (unchanged from prior close-outs).** The full `vitest run` still
shows the 33 `server/*` failures from the `better-sqlite3` NODE_MODULE_VERSION
mismatch (the native module is built for Electron, not Node — `npm rebuild
better-sqlite3` to run the server suite). This refactor is entirely frontend;
every `src/` test passes, plus 24 new tests across the six extracted modules.

## 2026-07-07 — #155 Real Bank CSV Import refactor (close-out)

Worked the `22-real-bank-csv-import-refactor` plan end to end across eight
commits, low-risk → high-risk, each leaving `npx vitest run` green. Two latent
drift risks removed from the parse engine, plus a parsing-consistency fix, two
mechanical module renames, and two isolated Import-wizard UI fixes.

**Dead `detectEncoding` (drift risk, not just a tidy-up).** `parse.ts` still
exported the old BOM-or-Windows-1252 guesser, the barrel re-exported it, and
unit tests pinned it — but production encoding had moved to `detectStatement`'s
`hasUtf8Bom` + signature-driven retry, and the UTF-8 BOM byte constant lived in
two files. Deleted the function, its constant, its re-export, and its tests;
the statement-detection retry is now the single encoding authority (same
subtraction the #20 refactor did for `detectBank`).

**Hand-synced `preset.columns` (drift risk).** Production parsing derives
columns from the file's actual (de-duplicated) header and never read
`preset.columns`; the field survived only because two tests asserted the parsed
columns _equalled_ it, and the Postbank-CC `Betrag (2)` name had to be
hand-written to mirror the runtime de-dupe. Dropped the field from the
interface and all four presets, and re-pointed the two tests to assert against
the real fixture header literal (ground truth).

**Parsing consistency.** Extracted the copy-pasted record-builder
(`buildRecord`) shared by the known-bank parser and the generic fallback, and
brought the known-bank header **de-duplication** to the generic path — an
unknown bank shipping two identically-named columns now addresses distinct
cells instead of collapsing them (RED test first). Generic **encoding** stays
Windows-1252: no header signature exists to act as the "decoded correctly"
oracle, so a generic encoding retry would be a guess (design log 21, Q7).

**Module renames.** `detect.ts` → `flagRows.ts` (row-level flagging against
account history) and `preview.ts` → `detectStatement.ts` (statement/bank
detection); the preview _orchestrator_ keeps its already-correct name
`buildPreview.ts`. Exported symbol names unchanged, so the barrel and the
imports route were untouched — only intra-library imports and test imports moved.

**UI fixes.** The Account-step filename now truncates with an ellipsis + hover
`title` (a missing-truncation bug — any width could be overrun), and the
review body's fixed 320px cap became `min(56vh, 620px)` so a normal screen
shows ~12 rows before the internal scroll takes over.

**Out-of-scope observation.** On a clean `main` (before this refactor),
`RecurringTransactionModal.test.tsx > pre-selects the existing category by name
and saves it unchanged when editing` fails deterministically — `onSaved` is
called with `category: ""` instead of the pre-selected `"Housing"`. Unrelated
to CSV import; left untouched. Worth a separate look: it is a real assertion
failure, not a flake. (Also note: the server test suite only runs once
`better-sqlite3` is rebuilt for the Node ABI — `npm rebuild better-sqlite3`;
it is otherwise built for Electron and every SQLite-backed test fails with a
`NODE_MODULE_VERSION` mismatch.)

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

---

## 2026-07-14 — In-app dialogs for menu actions (supersedes design-log 24 update-messaging)

Refactor plan 25 (issue #180) moved the native Windows message boxes that the
application menu used for **result notifications** and **destructive
confirmations** into in-app Horizon UI: success/info become transient
snackbars, errors become a blocking `AlertModal`, and the Start-Fresh /
Restore-overwrite prompts become a danger-tone `ConfirmModal`. Manual
"Check for Updates" outcomes (checking / up-to-date / error / dev-unavailable)
now flow through the existing `useUpdateStatus` / `UpdateBanner` machine
instead of native boxes. File pickers, the fatal startup dialog, and About
stay native by necessity/choice.

**Supersedes a recorded decision:** design-log `24-native-application-menu.md`
deliberately chose native message boxes for the update up-to-date / error /
dev-unpackaged outcomes. Design-logs are immutable snapshots, so that log is
left untouched; **this entry is the record of the reversal.** The split it
created — an available update surfaced as an on-brand snackbar while
"you're up to date" popped a grey Windows dialog — is what this refactor
removes.

**Plan deviation (commit 8):** the plan's commit 8 introduced the `main.ts`
IPC helpers (`notifyRenderer`, `confirmViaRenderer`) as a dormant, unused
commit. The electron tsconfig enables `noUnusedLocals`, which rejects unused
module-level functions, so a truly-dormant helper commit cannot build. The
helpers were instead introduced in the commit that first uses each one —
`notifyRenderer` with createBackup (commit 9), the confirm infrastructure with
restoreFromBackup (commit 10) — which keeps every commit building and leaves no
dead code. Net result is identical to the plan.

**No leftover native code to delete:** because each action's wiring commit
(9–12) rewrote its handler to delegate to the extracted orchestrator, it
removed its own `showMessageBoxSync` calls inline. By the cleanup commit the
only native boxes remaining are the intended ones — the fatal startup dialog
and About.

**Out-of-scope observations:**

- `src/features/import/ImportWizard/ImportWizard.test.tsx` >
  "commits the category created inline during review…" is flaky under full-suite
  load (passes in isolation and on re-run). Pre-existing, unrelated to this
  refactor. Worth stabilising separately.
- Every renderer test that needs `window.horizon` builds its own inline mock of
  the full bridge. Extending the bridge in this refactor forced edits across
  seven test files. A shared `makeHorizonMock(overrides)` factory would make
  future bridge changes a one-line update; deferred to keep this refactor within
  the plan's scope.

---

## 2026-07-15 — #185 Savings Streak goal editor: Milestone mode + convert-on-edit (feature close-out)

Closed out the Savings Streak feature (PRD #181, slices #182–#185) with the
Milestone half of the goal editor. Milestone mode takes one total amount + one
target month and shows the derived per-account split **live and read-only** in
the same row list Manual mode uses. No new math: the split is
`computeSavingsGoal`'s trailing-12-month positive average-gain weighting, ported
whole in slice 1 — the modal just re-runs it as the user types and reads back
`.monthly`. That let this slice land with zero changes to the engine and its
already-green tests.

**Weighted by savings pace, not balance.** The handoff prototype split the
milestone by _current account balance_; its own `DELTA.md` flagged this as wrong
(balance and monthly movement are unrelated — a balance-weighted split produced
targets no account could consistently hit, a permanently-red streak). Both copy
strings the DELTA called out — the card's milestone summary caption and the
modal helper text — now read "by each account's recent savings pace". The tests
assert both the presence of that phrasing and the _absence_ of "by balance", so
the old copy can't quietly return.

**Convert-on-edit.** Editing any row while in Milestone silently switches the
goal to Manual, pre-filled with the current derived split, so overriding one
account never discards the others. Implemented with two composed functional
`setEuros` updates: `switchToManual` replaces the map with the derived split,
then the row handler overrides the edited id on top of it — order-independent of
React batching, no `useEffect`.

**Points plumbing.** The Milestone split needs the reconstructed history, so
`useSavingsGoal` now also returns `points`, `DashboardPage` threads them into
`SavingsStreakCard`, and the card forwards them to the modal. The prop is
optional end-to-end (`points = []`), so Manual-only render paths and the existing
card tests that never open Milestone are untouched.

Full suite green (1896 tests), `tsc -b` clean. README and the CLAUDE.md roadmap
now mark Savings Streak complete.

---

## 2026-07-15 — #186 Savings Streak refactor: split the engine, align to conventions

Structure-only pass over the Savings Streak compute layer (refactor plan
`docs/refactor-plans/26-savings-streak-refactor.md`). No behaviour, schema,
route, or data-contract change — the `016` migration, `SavingsGoalRepo`, the
`GET`/`PUT /savings-goal` routes, the balance-delta "met" signal, and every
rendered string are exactly as shipped. Six commits, each independently green
(`npx vitest run` + `tsc -b`).

**Module moved to where its siblings live.** `computeSavingsGoal` was the lone
pure financial-compute function sitting under `src/features/` while every other
one (`projection`, `trajectory`, `outlook`, `mortgage`, `monthBreakdown`,
`recurring`, …) lives in `src/utils/<name>/`. It moved to
`src/utils/savingsGoal/savingsGoal.ts` via `git mv` — same exported name, same
`(config, points, trackableIds) => SavingsGoal` signature — with the exhaustive
24-case test moving alongside it, unedited, as the safety net. The move
introduces the codebase's first `import type` from `features/` into `utils/`
(`HistoryPoint` and the savings config/derived shapes); accepted as **type-only**
(erased at compile time, no runtime coupling), since the clean alternative —
relocating those types into `src/types/` — would ripple through the whole
history feature and is explicitly out of scope.

**One 140-line procedure became a thin orchestrator over private helpers.** The
five jobs the body did in one scope — resolve monthly targets, derive
per-account cumulative progress, scan monthly-met, count current/best streak,
build the Jan→Dec strip — are now single-purpose private functions
(`milestoneSplit`, `manualTargets`, `derivePerAccount`, `scanMonthlyMet`,
`currentStreak`, `bestStreak`, `buildYearTicks`) plus small `parseMonth` /
`monthsBetween` / `lastMonth` / `balanceOf` primitives. Tested only through the
public function — the Fowler ideal, matching how `outlook` and `monthBreakdown`
keep internals private and assert on external behaviour.

**One shared export, not a re-run of the whole engine.** The Milestone
trailing-12-month weighting is the single helper with a genuine second consumer
— the goal editor's live preview, which previously built a throwaway `milestone`
config, ran the entire `computeSavingsGoal`, and kept only `.monthly`. That
weighting is now the exported `milestoneSplit(targetTotal, targetDate, points,
ids)`, called directly by both the engine's Milestone branch and the modal's
`useMemo`. The split is a single source of truth and gets its own direct test
(exported utils owe one).

**Formatting folded back onto `utils/format`.** The card was hand-rolling a
12-entry long-month array (dup of `MONTHS_LONG`), a `formatTargetMonth` (dup of
`formatMonthLong`), a `.slice(0, 3)` short-name derivation (dup of the exported
short `MONTHS`), and a whole-euro currency formatter. Added `formatEuroWhole`
beside `formatBalance`, exported `MONTHS_LONG`, and the card now uses `MONTHS`,
`MONTHS_LONG` / `formatMonthLong`, and `formatEuroWhole` — no local copies. The
short `MONTHS` entries are identical to `long.slice(0, 3)` for all twelve
months, so the tile labels render the same strings.

**Out-of-scope observations:**

- `src/features/import/ImportWizard/ImportWizard.test.tsx` >
  "commits the category created inline during review…" remains flaky under
  full-suite load (passes in isolation and on re-run). Still pre-existing and
  unrelated — same flake noted in the #180 native-dialogs entry. Worth
  stabilising on its own.
- `SavingsGoal extends SavingsGoalConfig` mixes the persisted and derived shapes
  in one interface. Left untouched; a possible future tidy, not this refactor.
- The unrelated local `MONTHS` arrays in `Clock` and `ImportHistory` are the
  same smell in different features — left for their own refactors.

## 2026-07-18 — #197 Import Review Repair refactor: consolidate the review surface

Post-build tidy-up of the Import Review Repair feature (issues #190–#195),
following refactor plan `docs/refactor-plans/28-import-review-repair-refactor.md`.
Behaviour-preserving throughout: no rendered text, commit payload, error
contract, API, or schema change. Six commits, each leaving the full suite green
(`npm run test`) and `tsc -b` clean; the existing suites (`reviewRows.test.ts`,
`importErrors.test.ts`, `useImportWizard.test.ts`, `ImportWizard.test.tsx`) are
the regression net and pass untouched, extended only with a `pluralize` case set
and one `summarizeReview`-from-`flags` case.

**`flags` is now the sole source for the summary counts.** `summarizeReview`
counted the raw `r.duplicate` / `r.recurring` / `r.pending` booleans, bypassing
the `flags` array the whole feature is built on — the exact drift the array was
introduced to kill (the original `pending` bug). It now counts
`r.flags.includes(...)`, so a future change to `flagsFor` moves the summary with
it. A pinning test asserts the summary tracks `flags`, not the booleans.

**One tested `pluralize` helper replaced five copy-pasted ternaries.**
`${n} noun${n !== 1 ? "s" : ""}` appeared four times in `ImportWizard.tsx` and
once each in `ImportView.tsx` and `ImportHistory.tsx`. `pluralize(count,
singular, plural?)` now lives in `src/utils/format` beside `formatBytes` and the
month formatters, returning the joined `"<count> <word>"` pair, with its own
singular / plural / explicit-plural tests. The blocked-rows pill keeps its
inverse verb agreement (`need` / `needs`) as an explicit local expression — only
the noun goes through the helper, since verb agreement is a special case that
belongs at its one call site, not in a general noun helper.

**Tone and icon per flag are declared once.** The three review-summary badges
re-declared the icon and tone that `FLAG_BADGES` already held for the per-row
badges. They are now one `RowFlag`-keyed `FLAG_SPECS` table carrying
`{ label, tone, Icon, summaryLabel(count) }`, iterated in `FLAG_ORDER` over the
non-zero counts. The per-row and summary badges read the same source; the two
can no longer drift.

**The review table is a co-located presentational component.** The head + body
(~70 lines of the ~540-line wizard) lifted into
`ImportWizard/ReviewTable/ReviewTable.tsx` with its own `ReviewTable.styles.ts`
(the review-table styled components moved out of `ImportWizard.styles.ts`).
`ReviewTable` takes `rows`, the `toggle` / `setCategory` / `setDescription`
handlers, a `registerDescRef` registrar, and the `flagSpecs` table as props; it
owns the `FlagSpec` contract it renders. All orchestration state — inclusion,
`everBlocked`, `attentionOnly`, `blockedRows`, the jump cursor — stays in
`ImportWizard`, because the footer pill and Import button depend on it. The
extraction is presentational only, not a state split. The shared `StyledFlagBadge`
stays in `ImportWizard.styles.ts` (the summary uses it too) and `ReviewTable`
imports it from the parent.

**Verification.** `ImportWizard.test.tsx` drives the whole wizard through the
real `ImportWizard → ReviewTable` composition with a fetch mock, and its #190 /
#193 blocks already exercise the plan's end-to-end scenario: a blank-description
row renders an editable input, is marked invalid with a fix-me placeholder, is
counted by the blocked-rows pill, clears its error the moment a description is
typed, and commits the typed value. Full suite (1983 tests) green, `tsc -b`
clean.

**Out-of-scope observations:**

- ESLint flags three pre-existing `react-hooks` errors in the import feature
  (two `set-state-in-effect` in `ImportWizard.tsx`'s `everBlocked` /
  `attentionOnly` effects, one `refs` in `useImportWizard.ts`'s
  `mapRef.current = map` during render). They predate this session and are
  unrelated to the consolidation; husky runs prettier only, so they never gated
  a commit. Left for their own pass — behaviour-affecting fixes that need their
  own tests, not this behaviour-preserving refactor.
- The knowingly-duplicated validity rule (`blockersFor` vs `ImportRowSchema`)
  and the server tier's own `describeImportIssues` pluralization are untouched,
  per the plan — the tier boundary can't share the frontend `pluralize`.

## 2026-07-18 — #196 History Page composition: compose the orphaned chart + archive

Completed the History page composition the history-navigation design log (23,
issues #168–#172) already specified but never wired, following refactor plan
`docs/refactor-plans/27-history-page-composition-refactor.md`. Phases 3 and 4
shipped `HistoryChart` and `YearArchive` fully built and fully tested, but
`HistoryPage` never advanced past its phase-2 skeleton: it rendered only the
header and, when there were no imports, an `EmptyState` — and rendered nothing
in the empty state's place once imports existed. Both components were imported
by nobody. No change to `HistoryChart`, `YearArchive`, or `useHistory`'s public
shapes; only `HistoryPage` (and its test) change. Three RED→GREEN test/feat
pairs, each collapsed into one green commit (the plan permits pairwise collapse;
a knowingly-failing RED commit would break the every-commit-green rule — RED was
demonstrated by running each new test before implementing).

**The page now composes two hooks, the `DashboardPage` pattern.** `HistoryChart`
needs the account list for its per-account series, so the page calls
`useAccounts()` alongside `useHistory()` and passes `accounts` down — exactly how
`DashboardPage` feeds `TrajectoryHorizon`. `useHistory` was deliberately not
extended to fetch accounts; that would duplicate `useAccounts` and give the hook
a second responsibility. The chart receives `isLoading={false}` because the page
gates on a top-level spinner before it mounts.

**Four explicit page states, gated in order.** loading (shared `Spinner`, early
return like `DashboardPage`) · error (a distinct `EmptyState`) · empty (the
existing "No history yet" `EmptyState`, no-imports only) · content (chart +
Year Archive). The gate order is what closes the bug the plan targets: on a
failed fetch `useHistory` degrades `years` to `[]`, so the old `isEmpty` check
rendered "No history yet" — a fetch error masquerading as an empty state. The
error branch is now checked before empty, so a failed load reads as
"Couldn't load your history," never as "no imports."

**Layout is pure composition.** Header → chart → Year Archive, matching the
canonical prototype (`docs/handoff/history-navigation/prototype/src/screens/History.jsx`).
Both children self-chrome (the chart via `ChartFrame`'s card, the archive via its
own `StyledArchive` section), so the page adds no `Card` wrapper — the same way
`DashboardPage` renders `TrajectoryHorizon` directly. Range chips, legend, and
series visibility stay internal to `HistoryChart` (per refactor 24's
`ChartFrame` adoption); the page holds no chart state.

**Verification.** `HistoryPage.test.tsx` was extended, not replaced — the header
/ empty-state / CTA tests stay green and unmodified. Its `mockFetch` now stubs
`/accounts` (the page's new call) and the suite asserts what the user sees across
all four states: the chart (`history-chart` testid) and the Year Archive with a
year row render on load, a pending fetch shows the spinner (`role="status"`), a
failed fetch shows the error state and specifically **not** "No history yet," and
a no-imports response keeps the empty state. `HistoryChart.test.tsx` and
`YearArchive.test.tsx` remain the regression nets for the composed pieces (the
latter covers each month row's `/months/:month` deep-link). Full suite (1987
tests) green, `tsc -b` and `eslint` clean.

**Further note.** This was the third "built-but-not-composed" gap in the history
feature's wake; the end-to-end verification step is the guard that would have
caught it originally — a passing unit suite did not, because the old "loaded
state" test asserted only the _absence_ of the empty state, never the _presence_
of content. The extended suite now asserts presence.

## 2026-07-21 — #199 Performance + UX Polish: baseline profiling & trace protocol

Phase 1 of the Performance + UX Polish epic (#198). No production code changed
— this entry is the evidence that de-risks the Phase 8 stutter fix (#206), plus
the protocol for re-capturing the same measurements afterwards. Raw traces are
committed under `docs/perf/baseline-2026-07-21/`, indexed by a README that
records the capture environment and the headline numbers.

### The trace protocol

**The dataset is pinned, or nothing is comparable.** Every capture starts with
`npm run db:reset`, which copies `fixtures/horizon-seed.db` over the dev
database. The seed's shape matters to what the traces show: four accounts
(three liquid, one Mortgage), seven Variable Spending rows in June 2026, and
**none** in July 2026. That empty-to-populated boundary is what makes the
July→June switch the sharpest available probe of a cold chart mount.

**Capture against the production build, not the dev server.** Run
`npx vite build` and serve it with `vite preview` on `:4173`. Dev-mode React
and styled-components carry enough overhead to swamp the signal, and the
question here is what ships. One wrinkle worth remembering: `index.html` sets
`connect-src 'self' http://127.0.0.1:*`, so a build that bakes in the default
`http://localhost:3001` API base is blocked by CSP and the app renders
"Error: Failed to fetch". Build with `VITE_API_BASE_URL=http://127.0.0.1:3001`
(a gitignored `.env.local` is the tidy way; delete it afterwards).

**Drive a real Chromium over CDP.** The chrome-devtools MCP attaches to
`http://127.0.0.1:9222`, so launch **Brave** with
`--remote-debugging-port=9222 --user-data-dir=<throwaway>`. Anything else
already holding 9222 will be attached to instead — a non-browser Electron app
squatting on that port is a silent and very confusing failure mode. These five
baseline traces predate that choice and were captured in Edge 150.0.4078.83;
Brave is 150.1.92.141, the same Chromium 150 major. If Phase 8 wants a strictly
apples-to-apples before/after it should either re-capture the baseline in Brave
or stay on Edge for this epic — mixing the two across a comparison is the one
thing to avoid.

**The throwaway profile is a safety requirement, not a tidiness one.** CDP is
unauthenticated: anything that can reach the debug port gets full control of the
browser — read cookies and session tokens, dump `localStorage`, execute
JavaScript in any open tab. There is no handshake to defeat. Loopback is not a
boundary against _local_ code either, so any process running as the same user
can connect. `--user-data-dir=<throwaway>` is what makes that harmless here: the
profile is empty, so there are no sessions, saved passwords, or extensions to
take. Two rules follow, and neither is optional. **Never point
`--remote-debugging-port` at your normal browser profile** — that publishes
every account you are logged into to any local process. **Never bind it off
loopback** (`--remote-debugging-address=0.0.0.0`, or forwarding the port), which
puts an unauthenticated remote-control API on the network; exposed 9222 is a
routine internet-wide scan target. Close the browser when the capture is done.

The port itself is not a secret — 9222 is the published Chromium default and
`127.0.0.1` is unroutable from off-machine — so it is documented here freely.
The profile it is pointed at is the part that matters.

**Sanitize before committing, and never capture against a real database.**
A trace is not just timings. It embeds a screenshot filmstrip — 166 frames in
the Dashboard capture alone — so whatever was on screen gets committed as
images, where no text search will ever find it again. Resetting to the seed
first is therefore a privacy control, not just a reproducibility one: every
figure in these five traces comes from the already-committed
`fixtures/horizon-seed.db`, so the artifacts disclose nothing the repo did not
already contain. The `metadata` block is the other half of the problem — it
carries the browser command line (including the local user profile path),
motherboard model, GPU driver version, CPU stepping, and antivirus state, which
together fingerprint the capturing machine. `scripts/sanitize-trace.mjs` strips
those and leaves a placeholder; `--check` re-verifies and exits non-zero, so
Phase 8 can gate on it rather than remembering. Core count, RAM, GPU model, and
OS version are deliberately kept — the numbers are not reviewable without them.

**The five captures, in order.** Three cold loads — `#/`, `#/plan`,
`#/months/2026-07` — each recorded with `performance_start_trace`
(`reload: true`, `autoStop: true`) after navigating to the route first. Then
the two cold-first-click interactions, which need manual start/stop because
the interesting work happens after load: (04) load Dashboard, wait for it to
settle, start the trace with `reload: false`, click **Month** in the sidebar,
wait for "Variable Spending", stop; and (05) load `#/months/2026-07` fresh,
wait for "Spending in July", start the trace, click **Previous month**, wait
for "Spending in June", stop. Waiting on settled content before starting is
what makes these _first_-click traces rather than load traces with a click
tacked on.

**Attribute the minified frames.** A production trace names
`(anonymous) @ index-<hash>.js:2608:190`, which tells you nothing. Rebuild with
`npx vite build --sourcemap` — the sourcemap is external, so the bundle hash
and every trace position stay identical — then resolve positions with Node's
built-in `SourceMap` (`require('node:module').SourceMap`, `findEntry(line, col)`,
0-indexed, so try a −1 offset against the 1-indexed display in DevTools). The
exact recipe is in the artifacts README.

**Component-level attribution needs a companion pass.** React's profiling hooks
are stripped from the production build, so render _counts_ per component are
not in these traces. When Phase 8 needs them, repeat capture 05 against
`npm run dev` with the React DevTools Profiler and read the attribution there,
treating the timings as inflated and only the render counts as meaningful.

### Baseline

Cold loads are healthy and are not where the problem is: Dashboard LCP 232 ms,
Plan 185 ms, Month 180 ms, and **CLS 0.00 on all three** — the layout does not
shift, which is worth knowing before Phase 4 starts adding skeletons that could
introduce shift where there is none today. The longest critical path is 563 ms
on the Dashboard, and it is fonts: four `.woff2` files discovered late, after
the 1.68 MB single-chunk bundle evaluates.

The interactions tell a different story. Both cold-first-clicks have a trivial
INP — 6 ms (Dashboard→Month) and 10 ms (Month switch) — so the click handler is
not the stutter. What both traces carry is a **forced synchronous layout**:
45 ms and 64 ms respectively, which at 60 fps is three to four dropped frames
landing squarely in the React commit phase.

### The three candidate mechanisms, and what the baseline already says

The PRD registered three hypotheses to be tested in the stutter fix. Naming
them here with the early verdict from the baseline, so Phase 8 starts from
evidence rather than from the list:

**1. Uncached fetch waterfall — confirmed, and worse-shaped than assumed.**
Not a flat fan-out. The Month Overview runs a genuine two-level dependent
chain: `/accounts` must resolve before the per-account
`/accounts/:id/transactions?month=` calls can be issued at all, because they
need the ids. That is N+1 in account count — three extra round trips today, one
more per account added. Separately, the Dashboard cold load fetches `/accounts`
**twice** in one paint (two distinct requests in the dependency tree of the
trace), which is exactly the duplicate the Phase 2 cache-context dedup exists
to collapse.

**2. styled-components runtime style injection — no supporting evidence.**
It does not appear in the forced-reflow attribution for either interaction
trace, and no style-injection frame shows up near the top of the commit-phase
work. Not ruled out as a contributor to bundle evaluation cost, but it is not
the stutter. Deprioritise it.

**3. Recharts cold first-mount — real but small.** Capture 05 deliberately
mounts the breakdown donut from nothing, the worst case available. The
`useReportScale` hook of Recharts accounts for **2 ms of the 64 ms**. The
cold-mount cost is genuine and measurable, and it is roughly 3% of the hitch.
`React.memo` chart wrappers would be tidy, but on this evidence they would not
be felt.

### A fourth mechanism, which dominates

**62 of the 64 ms resolve to `src/primitives/Tabs/Tabs.tsx:35`** — our own
code, not a library, and not on the candidate list.

`Tabs` keeps chevron affordances in state and recomputes them in
`updateAffordances`, which reads `scrollLeft`, `scrollWidth`, and `clientWidth`
off the tab strip — three layout-forcing reads. That runs in a `useEffect`
whose dependency array includes `tabs` (`Tabs.tsx:49`). Its caller,
`SpendingList.tsx:72–80`, builds `tabs` as a fresh array literal on every
render, unmemoized. So the identity changes every render, the effect re-runs
every render, and each run forces a synchronous layout inside the commit.
`updateAffordances` then calls `setCanScrollLeft` / `setCanScrollRight`, which
can schedule another render — the classic layout-thrash shape.
`ImportHistory.tsx:121` passes `tabs` the same way, so the Import surface
almost certainly carries the same cost.

This is deliberately **not** fixed here — #199 is evidence-gathering and changes
no production code. It goes to Phase 8 (#206) as the leading hypothesis, with
the honest caveat that the fix is now expected to be a memoized `tabs` identity
plus a cheaper affordance measurement, rather than any of the three mechanisms
the PRD anticipated. That inversion is the whole argument for profiling before
fixing: the two candidates that felt most plausible on inspection account for
roughly 3% and 0% of the measured hitch.

### Caveats worth carrying forward

These are Chromium-over-HTTP traces, not Electron-renderer-over-`file://`
traces, and they were captured unthrottled on the dev machine. The React work
is identical; the loader and font behaviour is not. Absolute milliseconds
flatter a low-end machine — the durable finding is the _ratio_ between
mechanisms, which is what Phase 8 should be judged against. Phase 8 re-captures
all five under this same protocol for the before/after write-up.

## 2026-07-22 — #206 Performance + UX Polish: stutter root-cause, fix & before/after

Phase 8, the close of the epic (#198). The short version: the stutter #199
diagnosed was real but much smaller than it looked, the fix for it is worth
having and does not move the headline number, and the pass had quietly
introduced a far bigger regression that the after-traces caught. Raw traces are
in `docs/perf/after-2026-07-22/`, beside the baseline.

### First, a measurement bug that invalidated a round of conclusions

Page-load numbers are **not comparable across Edge process restarts**. The same
build measured 325 ms LCP in a long-running browser and 615 ms in a freshly
launched one — the difference is V8's code cache for the 1.7 MB bundle, not the
code. I reported a set of before/after numbers from separate instances before
noticing, and they were meaningless. Everything below was re-measured inside a
single browser instance, each origin warmed with three reloads first, and the
protocol note is now in the artifacts README so the next capture starts there.

The cost of finding this late was a wasted round of analysis. The cost of not
finding it would have been a journal entry full of confident, wrong numbers.

### The stutter: right location, wrong mechanism

#199 put 62 of the 64 ms Month-switch forced reflow in `Tabs.tsx`, and inferred
layout thrash: the affordance effect keyed on the `tabs` array, `SpendingList`
built that array fresh every render, so the effect "re-runs every render".

The location was right. The mechanism was not, and counting settled it. Rather
than infer from the trace, I wrapped the `scrollWidth` getter in the live page
and counted the reads across one July→June switch:

| build                          | measurements |
| ------------------------------ | ------------ |
| pre-pass (`dd05bdb`)           | 5            |
| post-pass, before the Tabs fix | 3            |
| post-pass, after the Tabs fix  | 2            |

Five, not fifty. There was no thrash loop — the effect ran a handful of times,
and each run forced one layout of a large, freshly-committed DOM. The expense
was the layout, not the number of reads. Phases 2–7 had already cut it from
five to three by cutting renders; the fix takes one more.

So the fix is correct and worth keeping — it is now impossible for a re-render
with an equivalent tab set to measure anything, which is what the primitive's
test pins — but on this dataset (four accounts, seven rows) it moved the
Month-switch reflow from 80 ms to 55 ms, not to zero. `Tabs` still owns the
frame in the after-trace, and that is the honest answer: it is the first code
to read layout after React commits the new month, so it pays for a layout the
browser must do regardless. Fixing it further means shrinking the DOM, not
moving the read.

The other two candidates the PRD registered stayed where #199 left them:
styled-components injection never appeared, and Recharts' `useReportScale` is
3 ms of the 55.

### The regression the after-traces caught

Against the pre-pass build, in one browser instance:

| build                                          | Dashboard LCP | CLS  |
| ---------------------------------------------- | ------------- | ---- |
| pre-pass (`dd05bdb`)                           | 220 ms        | 0.00 |
| post-pass, runtime fonts, fade on              | 719 ms        | 0.05 |
| post-pass, static fonts, fade on               | 615 ms        | 0.05 |
| post-pass, static fonts, **skeleton fade off** | 169 ms        | 0.01 |

The pass had made the Dashboard start roughly three times slower, and every bit
of it was the skeleton→content fade in `SectionState`. Not the 180 ms duration:
with sections revealing independently, the largest contentful element is
whichever section lands last, so fading each one in from zero opacity makes LCP
measure the entire reveal sequence instead of first paint. DevTools blamed the
web-font swap for the CLS, which was a symptom of the same thing — the fade held
content back past the font load, so the swap landed on visible text.

Finding this took three build-level A/Bs, because the first fix missed. I
suppressed the fade on `FadeSwap`'s _first mount_, reasoning that a first paint
has nothing to cross-fade from. True, and inert: the costly transition is
`loading → content`, which is a genuine key change, not a first mount. The
measurement said 772 ms, unchanged, and the hypothesis had to be thrown out
rather than argued with.

**The skeleton→content fade is gone**; `SectionState` hands over in the element
it already occupies. This contradicts an acceptance criterion of #205
("Skeletons fade smoothly into real content"), knowingly and with the price on
the table: that criterion cost ~450 ms of LCP and 0.04 of CLS. What #205 was
actually for — cross-fading month and account **data swaps** — is untouched and
still goes through `FadeSwap`. The first-mount suppression stayed too: it is
free, and it is right for the Month and Plan swaps' own initial paint.

Also moved the eight `@font-face` rules out of a `createGlobalStyle` into a
static stylesheet the entry imports, worth ~100 ms of LCP. My stated reason for
doing it was wrong — I expected it to fix the CLS, and it does not, because
`@font-face` starts no download until text using the family is laid out, which
still waits for React. Both the stylesheet and its test now say so.

### Where it landed

| capture           | before                   | after                             |
| ----------------- | ------------------------ | --------------------------------- |
| Dashboard load    | LCP 232 ms · CLS 0       | LCP 167–181 ms · CLS 0.05         |
| Plan load         | LCP 185 ms · CLS 0       | LCP 164 ms · CLS 0                |
| Month load        | LCP 180 ms · CLS 0       | LCP 176 ms · CLS 0.01 · no reflow |
| Dashboard → Month | INP 6 ms · 45 ms reflow  | INP 7 ms · **no reflow**          |
| Month switch      | INP 10 ms · 64 ms reflow | INP 5 ms · 55 ms reflow           |

The bundle grew 1,684.57 kB → 1,694.39 kB (+0.6%) across the whole epic, and
the Dashboard→Month click no longer forces a synchronous layout at all.

### Unfinished: the Dashboard's 0.05 CLS

One number got worse and stayed worse. With the fade removed, the Dashboard's
remaining shift is a single 0.0472 jolt at 272 ms with no font involvement —
the skeletons do not match the height of the content that replaces them, so the
reveal now hard-cuts to a different layout. Still inside the "good" band
(< 0.1), and Plan sits at 0.00 and Month at 0.01, so it is specific to the
Dashboard's sections rather than systemic.

This is exactly the risk #199 flagged before Phase 4 started — "skeletons could
introduce shift where there is none today" — and it wants per-section
layout-matching, which is Phase 4's work and a real piece rather than a
one-liner. Filed rather than rushed at the end of a long session.

The durable lesson is the same one #199 drew, one level deeper. #199 profiled
before fixing and inverted the PRD's guesses. Phase 8 then had to profile
before trusting #199's own follow-on reasoning, and again before trusting its
first fix. Attribution tells you where the cost is charged; only counting and
A/B builds tell you what would remove it.

## 2026-07-23 — #208 Performance + UX Polish: the Dashboard's 0.05 CLS, closed

The last open item on the epic's "no heavier, no slower" gate. #206 filed it
rather than rushing it: the Dashboard's remaining 0.05 CLS was a single ~0.047
jolt, and its own traces pointed the finger at "skeletons do not match the
height of the content that replaces them." This closes it. Raw after-fix traces
are in `docs/perf/after-2026-07-23/`.

### The culprit was one slot, not a per-section pass

#206 guessed this wanted per-section layout-matching across the whole Dashboard.
It did not. The entire jolt was the KPI strip's value slot: `StyledValue` renders
30px numerals in a 45px line-box (30px at the app's 1.5 line-height), but
`KpiStripSkeleton` reserved a 34px placeholder for the same slot. When the
numbers landed the strip grew ~11px and shoved every section below it down — one
shift, 0.047, no other section involved. The fix is to reserve the real line-box
height on `StyledValue` and let the skeleton reuse the same rule, so the slot is
45px in both states from the first frame.

### The shift was intermittent, which is the whole measurement story

The jolt only fires when a slightly slower frame lets the skeleton paint before
the projection fetch resolves. On a fast warmed reload the numbers land on the
first frame and CLS is ~0.009 with no jolt at all — so a single load "proving"
0.00 would have been luck, not a fix. The defect is a spike in the distribution,
and the only honest measurement is repeated same-instance A/B reloads:

| Build            | Dashboard CLS across warmed reloads | Value-slot jolt                    |
| ---------------- | ----------------------------------- | ---------------------------------- |
| Before (pre-fix) | 0.0088, 0.05, 0.0491, 0.0496        | 0.0466–0.0471 when it paints       |
| After (this fix) | 0.0076 × every sample               | never — impossible by construction |

The pre-fix spike reproduces #206's 0.0472 almost exactly. After the fix the
residual is a flat 0.0076 in every sample — a 0.0051 font swap plus a 0.0025
unattributed shift — and it is near-zero in the shipping Electron `file://`
target where fonts load off disk. Plan stayed 0.00, Month stayed 0.01, and LCP
did not regress (pre- and post-fix Dashboard LCP both scatter across ~120–320 ms
in this instance; a `height: 45px` declaration cannot move paint time).

### jsdom can't see this, so the test locks the contract instead

jsdom does no layout, so a unit test cannot measure CLS. The test asserts the
thing that removes the shift instead: the skeleton and the loaded content
reserve the _same_ value-slot height, and that height is the real 45px line-box
rather than a shorter placeholder — read off `getComputedStyle` on the declared
rule. The trace A/B above is the confirmation that the contract does what it
claims.

The lesson rhymes with #206's. #206 said "attribution tells you where the cost
is; only A/B builds tell you what removes it." #208 adds: when the defect is
intermittent, one A/B pair tells you nothing either — you need the distribution.
The fix looked confirmed at 0.01 on the very first after-trace; it was the pre-fix
build _also_ reading 0.01 on a fast reload that showed why a single number lies.

## 2026-08-04 — #219 Quick Start Guide refactor: the shared dialog keyboard, and a filing rule

Two halves, semantic first so the file-move noise could not hide a behaviour
change. The semantic half is the one worth writing down.

### The manual paid for the keyboard; the rest of the app inherited it

`Modal` had declared `role="dialog"` and `aria-modal="true"` for eleven
surfaces while implementing none of what those attributes promise. Issue #218
had built the real thing — focus trap, capture and restore, ESC — inside
`ManualDrawer`, the one surface that is not shared. Lifting it to
`src/hooks/useDialogKeyboard.ts` and calling it from `Modal` was a one-line
change at the consumer and fixed all eleven at once.

The evidence the lift was faithful is that **the drawer's focus tests were not
touched in the commit that rewired it**. They assert observable keyboard
behaviour, so if the extraction had changed anything they would have gone red.
They stayed green without an edit — which is worth more than any test written
afterwards against the new shape.

### Focus lands on the surface, not on its first control

The plan flagged the risk that a trap is only correct if the dialog's first
focusable element is the right place to land, and named the case that would
hurt: a dialog whose first control is destructive. Landing focus on the dialog
container itself (`tabindex="-1"`, as the drawer already did) removes the
question entirely — nothing is pre-selected, and Shift+Tab from the container
walks to the last control. No consumer needed a per-dialog entry point.

### The one consumer that broke, and how it was found

The full suite went green after wiring `Modal`, which was not the same thing as
being correct. Grepping for nested `"Escape"` handlers turned up
`CategoryManagerModal`: its inline rename and add-category inputs each handled
ESC to abandon the edit, and neither stopped propagation. With a document-level
ESC listener on the dialog, one press would cancel the rename _and_ close the
whole manager — a real regression no test covered, because no test had ever
pressed ESC on those inputs. Fixed by consuming the key in the nearer intent.

Two lessons: a green suite after an accessibility change proves the tests did
not assert the old behaviour, not that the new behaviour is right. And the way
to find keyboard conflicts is to grep for the key, not to re-read the diff.

### The trap yields to the topmost dialog

A menu-driven confirm can land over an open feature form. Two live traps is a
keyboard deadlock rather than a cosmetic bug, so the hook keeps a module-level
stack and every listener checks it _per key_ rather than at bind time — a
surface that was topmost when it opened stops being so the moment another opens
over it.

### The structural half, and why it is a rule rather than a cleanup

`src/utils/` and `server/src/services/` have nested every module in a folder
named after itself since refactors #15 and #17. `src/features/` never did, so
the codebase answered "where does a new hook go?" two ways depending on the
layer. Thirty-seven modules across thirteen features moved, one commit each.

The moves were scripted rather than hand-edited, and the script _resolved_ each
relative specifier and re-relativised it instead of pattern-matching text. The
first version rewrote specifiers that had not moved — it stripped `./App.tsx`
to `./App` and mangled two `import.meta.glob` patterns. The rule that fixed it
is the one that should have been there first: **touch nothing unless it pointed
at something that moved.**

`tsc -b` then caught the one case resolution could not see: a `.d.ts` import
(`../../types/horizon`), which no `.ts`/`.tsx` candidate matches. Worth
remembering that `npm run typecheck` would not have caught it either — the root
`tsconfig` has an empty `files` array, so it verifies nothing. Use `tsc -b`.

### Two things found along the way, neither in scope

- `server/src/routes/projection/projection.test.ts` hardcoded `"2026-07"` as
  "the current month" while reading the real clock, so it had failed since
  2026-08-01 and would have failed every month after. Not a regression from
  this refactor — it was already red at the baseline. **Fixed immediately
  after**: the file now freezes the clock with
  `vi.useFakeTimers({ toFake: ["Date"] })` and `vi.setSystemTime`, faking
  `Date` alone because supertest runs a real HTTP server and faking its timers
  too would hang every request in the file. The fix proves itself — the test
  asserts `2026-07` on a machine whose real date is 2026-08, which can only
  pass if the freeze bites. Suite is now 2355/2355 green.
- `ImportWizard.test.tsx`'s inline-category commit test failed once under
  full-suite parallelism and passed in isolation. **Diagnosed and fixed
  afterwards** — see the entry below.

## 2026-08-04 — The flake was the clock, not the code

One `ImportWizard` test failed once during the #219 refactor and never again.
Chasing it turned up the wrong answer four times before the right one, and the
wrong answers are the useful part.

### What it was not

Every plausible story was testable, and every one was wrong:

| Theory                                                 | How it was tested                           | Verdict                        |
| ------------------------------------------------------ | ------------------------------------------- | ------------------------------ |
| Slow under CPU load                                    | the file alone under 24 burners on 16 cores | passed                         |
| Thin `waitFor` margins                                 | `asyncUtilTimeout` cut 1000 → 10ms          | **passed at 10ms**             |
| The 300ms re-preview debounce rebuilding rows mid-test | traced `updateMap` callers                  | never called by that test      |
| Lost update between the two rows' `onChange` effects   | read `setCategory`                          | already a functional `setRows` |

The 10ms result should have been the clue and was initially read as
exonerating. `asyncUtilTimeout` (how long one `waitFor` polls) and
`testTimeout` (the deadline for the whole test body) are different knobs.
Every individual await settling instantly is entirely compatible with the test
body as a whole blowing a wall-clock deadline — which is exactly what was
happening.

### Reproducing it

Isolated runs (25), full-suite runs (28), cold-transform-cache runs, and the
file under heavy load all stayed green. It took **cold cache plus CPU
saturation plus the full suite** together before it appeared — in
`migrate.test.ts`, a completely different file, with the message that ended the
hunt:

```
Error: Test timed out in 5000ms.
```

Not a logic race at all. Vitest's default `testTimeout` is 5s, and the suite's
slowest tests measure **3.0–3.4s on an idle machine**: the
`is importable from <layer>/index.ts` tests each `await import()` a whole
barrel and pay to transform its entire module graph. An 18% margin at rest is
no margin under parallel-fork contention, and the victim is whichever file
happens to get starved — which is why it looked random and never reproduced in
the same place twice.

### The A/B that closed it

Same 8-burner load, same cold cache, only the timeout changed:

| `testTimeout`        | Run 1       | Run 2       |
| -------------------- | ----------- | ----------- |
| 5000ms (old default) | 1 failed    | 7 failed    |
| 20000ms (now)        | 2358 passed | 2358 passed |

All seven failures were barrel-import tests, including the two (`Chip`,
`Sparkline`) that had flaked earlier in the session unprompted. `testTimeout`
and `hookTimeout` are now 20s in `vitest.config.ts` — a backstop against
scheduling noise, not permission for slow tests.

One caveat worth recording: at _20_ burners the machine could not fork workers
at all (`Failed to start forks worker … Timeout waiting for worker to respond`,
41 files never ran). That is an artefact of over-stressing the box, not the
defect, and a run that collects 1701 of 2358 tests is not evidence of anything.
Stress hard enough to starve the scheduler, not hard enough to break the pool.

### The bug found on the way

`CategorySelect` hardcoded `id="category-select"` and `id="new-category-input"`,
and the Import review table renders one per row — so an N-row statement put N
elements in the document sharing one id. Measured: every `<label>.control`
resolved to the _first_ picker, so clicking row two's label focused row one's.
Fixed with `useId()`. It was **not** the flake — `getAllByLabelText` still
returns document order, so the test's indexing was always correct — which is
worth stating, because it was a tempting story and believing it would have
ended the investigation three hours early with the real cause still in place.

## 2026-10-16 — #228 Live-Use Repair — Round 1 refactor: one rule per fact

Refactor plan 31, worked commit by commit. Round 1 had fixed five defects as
five patches; this pass makes each fact have a single home.

- **Projection derivations.** `totalRestschuld`, `findDebtFreeMonth` and
  `stMonthsFor` are now the only way any surface sums Restschuld, finds the
  plan-level payoff or gets ST Months. The dead projection-utils
  `deriveOutlookSummary` and `deriveYearSummaries` are gone; Plan Summary
  runs on the shared `aggregateYearSummaries` in the renamed `yearSummaries`
  module.
- **The one behaviour change users could see:** with two or more mortgages,
  the Projection payoff flag and the Trajectory Horizon Payoff Marker used to
  sit on the _first_ mortgage's payoff while the Outlook tile and the ST
  cutoff used the combined total. All of them now read the **Debt-free
  Month**. With one mortgage nothing changed — pinned by an equivalence test.
- **Recurring transfers.** `transferSideFor` answers "source, destination or
  neither" once; the form's seed/payload rules live in
  `features/transactions/transferForm`. A refused save now keeps the dialog
  open with the server's `{ issues }` message instead of closing silently
  (`apiErrorMessage`, shared with Mortgage Setup).
- **Mortgage Setup.** `fundingAccountId` → `paidFromAccountId` (Funding
  Account means only the CreditCard link again); form rules in
  `features/mortgage/mortgageSetupForm`; the account and recurring INSERTs
  exist once, as synchronous writers the repos and the mortgage transaction
  share; the colour is chosen on the client from the account palette.

### Where the plan met code that had moved on

- **C8/C9 had nothing to turn red.** The plan assumed `POST /mortgages` did
  not check the paid-from account. It did: #227 shipped the rule with tests
  for a missing account, a Mortgage, a CreditCard and an Investment, and
  Girokonto/Tagesgeld acceptance. C9 shrank to moving the kinds constant
  beside the setup schema.
- **Two signature changes forced test edits the plan called "unedited".**
  The outlook util now takes `(snapshots, mortgageIds, stMonths)` so it can
  call `findDebtFreeMonth` (its tests changed builder and call shape only,
  assertions untouched), and `buildTrajectoryData` derives its post-payoff
  nulling from the payoff month it receives, so its one nulling test now
  passes that month instead of `null`.

### Left alone

`KpiStrip`'s private `restschuldOf` still sums by hand. It reads
`actual ?? projected` — the current Restschuld for the KPI tile — which is a
different question from the projection-only `totalRestschuld`, and the
KPI strip is outside this plan. A candidate for the next refactor, not drift
to paper over here.

## 2026-10-16 — #237 Balance Anchor refactor: one rule per fact

Refactor plan 32, worked commit by commit. The epic's seven phases each
solved their own corner; this pass gives each date and Known Since rule one
home per tier.

- **Dates.** The server date lib now owns `todayIso` (local time),
  `daysInMonth` and `endOfMonth`; the engine's occurrence clamp, its
  end-of-month lookup (the `"-31"` string trick is gone) and settlement's
  closing balance read them. The client's two `todayIso` copies are one, in
  the month-math util beside `currentMonth`.
- **The midnight defect.** Found by reading the code for the plan, not in
  live use. The account route's "today" was `toISOString()` — the UTC date —
  while the account form capped its DatePicker at the local date. From
  midnight to 01:00/02:00 in Germany the form offered today and the server
  rejected it as "later than today". Both tiers now use the local calendar
  date, pinned by a frozen-clock test at 00:30.
- **One Anchor Date schema.** `AnchorDate` (an ISO date no later than today)
  is exported from the account schema and used by both account routes and
  `POST /mortgages`, which until now accepted a future `anchorDate`.
  Mortgage Setup's "As of" DatePicker is capped at today like the account
  form's.
- **Import.** `detectRecurring` takes the Anchor Date itself, so the rule
  lives in the module Recurring Detection belongs to; `buildPreview` lost its
  post-pass.
- **Smaller moves.** `toProjectionAccountEntry` replaces three copies of the
  engine's account-entry literal; the history feature's `knownSince` module
  owns `firstKnownMonths` and `isUnknownMonth`; the year aggregator is generic
  over its balance type so YearArchive uses it again; FormField has a `hint`;
  the Current Balance parity cases run in `runStorageSpec`.

### Where the plan met the code

- **`IsoDate` moved with `AnchorDate`.** The plan had Mortgage Setup keep its
  private `IsoDate`. Building `AnchorDate` on it in the account schema would
  have copied the regex, so `IsoDate` moved beside `AnchorDate` and Mortgage
  Setup imports both — one regex.
- **FormField's hint drops StatBlock's `margin-top`.** FormField already
  spaces its children with a flex gap; the margin would have pushed the
  account form's "As of" help text further down than it sat before.

### Follow-ups

- **The other UTC "today" call sites** — `linkedSince` in the accounts repo
  and the settlement service's `asOf` — have the same midnight skew. Moving
  them to the shared `todayIso` shifts a link date or a settlement by a day
  around midnight, a behaviour change for features this epic did not own.
  First candidates for the next pass.
- **A latent midnight flake in the accounts route tests.** The #231 cases'
  `isoDaysFromToday` helper still builds "tomorrow" from the UTC date. Run
  between local midnight and 02:00 CEST, its "tomorrow" is the local today,
  which the server now accepts, so the "answers 400 for a later date" cases
  would fail. The plan forbade editing those tests here; the fix is the same
  local-date helper.
- Still open from the plan's Out of Scope: requiring
  `ProjectionAccountEntry.anchorDate`, reshaping `applyRecurringToBalances`,
  and KpiStrip's private `restschuldOf`.

## 2026-10-16 — #246 Financial History refactor: one home per rule, again

Refactor plan 33, worked commit by commit. The epic's seven phases brought
back the same drift refactor 32 had just removed from Balance Anchor; this
pass gives each rule one home per tier again, and closes the epic.

- **Dates.** The server date lib now owns `currentMonth` and
  `monthsBetween`. The projection and settlements routes lost their private
  `currentMonth`, and the route, the engine and the history lib their three
  copies of `monthsBetween`. On the client, `buildPastLeadIn` and the
  Trajectory Horizon read the month-math util's `currentMonth`.
- **Kinds and origination.** A new `accountKinds` lib owns
  `selectLiquidAccounts` and `selectTrackableAccounts`, read by
  `deriveHistory`, the engine's Total Liquid and the cashflow lib.
  `mortgageStartMonth` in the history span lib answers "is this Mortgage
  originated?" for both the span and the Paydown Bridge.
- **Engine entries.** `toProjectionTxEntry` and `toProjectionRecurringEntry`
  join `toProjectionAccountEntry`; all three routes map with them.
  `deriveHistory` is handed the stored transactions, so the dead
  `transferId` / `isAutoSettlement` spreads in `GET /projection` are gone.
- **One history resource.** `useHistoryPoints` owns the `HISTORY` key and
  its fetcher, the way `useProjection` owns `PROJECTION`. `useHistory`,
  `useSavingsGoal` and the Dashboard read it; every history read goes
  through `fetchJson`; `useHistory` no longer returns the unread `years`.
- **History rules out of components.** `paydownBridgeSpan` (new
  `paydownBridge` module), `firstKnownMonthOf` and `knownYears` (in
  `knownSince`), and `pointsInRange` with the range options (new
  `historyRange` module). The trajectory util exports the series keys, and
  its Y domain counts the bridge whenever the Restschuld is visible.
- **Types.** `HistoryPoint` lives in `src/types/history.ts`; `historyTypes`
  is gone, and `src/utils/` no longer reads `HistoryPoint` from a feature.

### Two defects, found in review

Both were found by reading the code for the plan, not in live use.

- **Midnight on the 1st.** `buildPastLeadIn` and the TODAY Marker took the
  current month from `toISOString()` (UTC), while the server projects from
  the local month. From midnight to 01:00/02:00 in Germany on the 1st, the
  Past Lead-in left out last month and the TODAY Marker found no row and
  disappeared. Pinned by frozen-clock tests at 00:30 on the 1st.
- **Stale Dashboard history.** The Mortgage Countdown's `onUpdated`
  refreshed accounts, the projection and recurring, but not history — the
  Dashboard had no `refresh` for it, because it borrowed the Savings
  Streak's points. After a mortgage setup or origination edit, the Past
  Lead-in, the Paydown Bridge and the Savings Streak stayed stale until the
  page was revisited.
- A third behaviour change came with them: the History tooltip's Net
  Cashflow now follows `isUnknownMonth`, so hiding the only known account in
  a month no longer drops that month's Net Cashflow.

### Where the plan met the code

- **`isUnknown` rides the chart row's index signature.** E8 asked each
  HistoryChart row to carry `isUnknown`. Declaring it as an optional
  property clashes with the row's index signature, which must stay
  assignable to the trajectory util's `ChartRow`; declaring it required
  would have forced edits to the direct tooltip tests. It is documented on
  the index signature instead, and a row without it reads as known.
- **The bridge's Original Principal is re-read for its type.**
  `mortgageStartMonth` returns the month, not a narrowed account, so
  `paydownBridge` still reads `originalPrincipal` itself — a type narrowing,
  not a second predicate.
- **D3 deleted one whole case.** The "derives distinct years" test asserted
  nothing but `years`, so it went with its assertion; one case title and a
  fixture comment that named the years were reworded.

### Follow-ups

- **Monthly Spending counts positive rows.** It sums the magnitude of every
  Variable-Spending row (refunds, imported income left checked), exactly as
  the Year Comparison does, and #244's parity test pins the two together.
  Counting only outflows changes both features at once; the glossary now
  says what the rule does rather than what it intends.
- **`src/utils/savingsGoal` still imports `savingsTypes` from the savings
  feature** — the same util-reads-a-feature shape F3 fixed for
  `HistoryPoint`, outside this plan.
- Still open from the plan's Out of Scope: requiring the client
  `HistoryPoint`'s `restschuldBridge`, `monthlySavings` and
  `monthlySpending`; making HistoryChart's `range` controlled-only; the
  shared chart chrome and one look for the two chip groups (`ui-meridian`);
  `useImport` reading `IMPORT_HISTORY`; the per-month transaction scan in
  `deriveHistory`.
- Still open from refactor 32: the other UTC "today" call sites
  (`linkedSince`, the settlement service's `asOf`), the `isoDaysFromToday`
  midnight flake in the accounts route tests, requiring
  `ProjectionAccountEntry.anchorDate`, reshaping `applyRecurringToBalances`,
  and KpiStrip's private `restschuldOf`.

## 2026-10-17 — #256 Month Cash Flow refactor: one leg rule

Refactor plan 34, worked commit by commit. Month Cash Flow promised that the
Fixed section, the Month-End Balance, the Current Balance, Outlook and
History can never disagree; built phase by phase, it still left three copies
of the leg rule on the server, and one of them already disagreed. This pass
gives the leg rule one home, picks up the convention drift, and closes the
epic.

- **One leg rule.** `recurringOccurrence` now owns `TransferSide`,
  `sourceAnchorMonth` (the one fallback for a source without an Anchor
  Date), `occurrenceLegs` and `legBalanceDelta`. The engine's
  `applyRecurringToBalances`, `recurringHistory` and the month-cash-flow
  lib's In Balance Anchor rows all read them; their own sign, gate and cap
  branches are gone. `addMonths` joins the server date lib, replacing the
  engine's and `recurringHistory`'s private copies.
- **Storage names.** The accounts repo's `findAllWithBalance` /
  `findByIdWithBalance` are now `…WithRecordedBalance`, with the SQLite row
  type, mapper and statements to match; the `balanceService` exports keep
  `WithBalance`, because they return the Current Balance. `balanceService`
  reads `findActive()` like every other engine reader.
- **Settlement.** `computeMissingSettlements` walks `YYYY-MM` months with
  `addMonths` and dates with `occurrenceDate`; its five private date helpers
  are gone, and it exports the `Auto-settlement` / `Transfer` copy the
  month-cash-flow lib now imports.
- **Reports route.** Year comparison validates with `MonthQuerySchema` and
  answers `400 { issues }`, rejecting month 13.
- **Client.** `TransferSide` lives in `src/types/recurring.ts`; the
  `FixedFlow` mirror is the server's `RecurringFixedFlow |
SettlementFixedFlow` union. A new `fixedFlows` module takes the card's
  "Net fixed", row-link and before-anchor rules; `monthEndBalance` moved into
  the months feature and reads the history feature's `firstKnownMonths`; the
  page reads one `useMonthEndBalances` resource; and a `DayBlock` component
  replaces the day block SpendingList and MonthCashFlow each rendered.

### Three behaviour changes

- **Outlook disagreed about a transfer into an older account.** Found while
  reading the code for the plan, not in live use; it predates the epic. The
  Replay Loop skipped a rule outright in any month before its _source_
  account's Anchor month, although each leg already passes its own
  account's Anchor Gate. With Tagesgeld anchored 15 Jan, Girokonto 15 Jun and
  a monthly €100 transfer Girokonto → Tagesgeld on the 1st, the Dashboard and
  History put Tagesgeld at €900 in October and Outlook at €500: February to
  May were replayed only by the `/projection` run, so only it dropped them.
  The skip is removed, and a parity test pins the run from the current
  month, the run from the History Span's start and `recurringHistory` to one
  answer, for that transfer and for a Repayment Transfer into a Mortgage
  anchored before its paying account.
- **The settlement service reads the local today**, the last server "today"
  taken from `toISOString()`.
- **Year comparison's validation contract** matches every other route.

### Where the plan met the code

- **`legBalanceDelta` is new.** The plan listed `sourceAnchorMonth` and
  `occurrenceLegs`; but the engine's running balances, its Recurring History
  accumulator and `recurringHistory` each turned a Mortgage destination
  leg's positive inflow back into a paydown. That sign flip is part of the
  leg rule, so it moved too.
- **Blocked legs and the cap.** While a Mortgage's gate is open, both legs
  carry the capped magnitude, the source leg too when its own gate blocks
  it. The month-cash-flow lib keeps no Restschuld and passes an unbounded
  cap, so its In Balance Anchor rows read the full magnitude as before.
- **The A1 Mortgage case pays on the 1st.** With today on the 17th, a rate
  on the 20th has not yet fired today, so `recurringHistory` through today
  rightly counts one fewer than the October snapshot's month end.
- **B4 asserts today's own month, not the month that just closed.** At 00:30
  on 1 November the UTC date is still 31 October, and the settlement loop
  already covers October either way; what UTC loses is November. The test
  books a charge on 1 November and expects its December settlement. Its
  first version also leaned on `findAll`'s order and was sorted in B5.
- **B6 had no `{ error }` assertion to edit.** The existing year-comparison
  cases checked only the status; B6 added the month-13 and `{ issues }`
  cases.
- **C2's one fixture edit.** MonthCashFlow's `flow()` test helper took
  `Partial<FixedFlow>`, which could describe a settlement carrying a
  `recurringId`; it now builds a `RecurringFixedFlow`. The settlement
  literals already matched the union. The card's row key now narrows on
  `kind` before reading `recurringId`.
- **C5 deleted the utils-barrel case.** `monthEndBalance`'s test asserted
  the utils barrel exported it; the move removes that export by design.
- **C9 dropped two more copies.** SpendingList's private `MONTHS_SHORT`
  equalled the format util's `MONTHS`, which `DayBlock` reads, and
  `SpendingListSkeleton.styles.ts`, which held only the skeleton day block,
  is gone.

### Follow-ups

- Still open from the plan's Out of Scope: the reports route's run-start
  choice; `findActive` returning every rule and the engine's vestigial
  `isActive` filter; requiring `ProjectionAccountEntry.anchorDate`; an
  opacity token (`ui-meridian`); the client's month arithmetic
  (`shiftMonth`, the projection util's private `addMonths`); cross-feature
  deep imports; the accounts routes' `withBalance ?? updated` fallback; and
  everything log 32 deferred.
- Still open from refactors 32 and 33: `linkedSince`'s UTC "today", the
  `isoDaysFromToday` midnight flake in the accounts route tests, reshaping
  `applyRecurringToBalances` beyond reading `occurrenceLegs`, and KpiStrip's
  private `restschuldOf`.
- Year comparison still works out its upper bound by hand; `addMonths`
  would serve it.
- The glossary's older **AccountWithBalance** row still names the repo
  methods as they were before the Current Balance; it sits in the storage
  section's historical snapshot beside the Mongo Driver and was left alone.

## 2026-10-18 — #265 Import Category Learning refactor: one create path

Refactor plan 35, worked commit by commit, with the epic's last slice (#264:
manual, release notes, Build Status) folded in so the epic closes from one
issue. Built slice by slice, Import Category Learning left one defect,
several copies of the same fact and domain rules in components. This pass
gives each its one home.

- **Server: one Category Rule shape.** The csvImport lib reads the storage
  layer's `CategoryRuleInput`; `DerivedCategoryRule` and
  `PreviewCategoryRule` are gone. `PreviewRow` extends `CategorizedRow`, and
  `buildPreview` spreads `categorizeRow`'s result instead of rebuilding it.
  `categorizeRow` alone skips a Category Rule whose category no longer
  exists. Import code says "Category Rule", never "rule" alone, down to the
  context field (`categoryRules`).
- **Client: one create path.** `useCreateCategory` POSTs, reads the error
  through `readErrorMessage`, publishes the new category to every
  `CATEGORIES` reader and only then bumps. Inline-add and proposal approval
  both read it; `approve` never rejects, its failure is the error on the
  proposal. ImportView reads `useCategories`.
- **Client: `reviewRows` is the review model.** `ParsedImportRow` and
  `CategorySource` moved to `importTypes`, which now imports nothing from
  the review model. `FALLBACK_CATEGORY`, `withoutProposal`, `proposalsFor`,
  `approveProposal`, `dismissProposal` and `categorySourceChip` live in
  `reviewRows`; `useCategoryProposals` keeps only the I/O and wizard state,
  and ReviewTable computes the chip once per row. The proposal strip is its
  own `CategoryProposalStrip` sub-component beside ReviewTable.
- **Docs.** The User Manual's Import review row describes Same-Counterparty
  Propagation and the majority rule; the release notes, glossary and Build
  Status are brought up to date.

### One behaviour change

- **Approving a Category Proposal could teach the wrong category.** Found
  while reading the code for the plan, not in live use, and never released.
  Approval bumped `CATEGORIES` without publishing the new category, so until
  the refetch landed each moved row's controlled `CategorySelect` held a
  value its list did not contain; the picker fell back to its first category
  and reported it through `onChange`, and propagation marked the row
  `chosen`. A probe with the GET after the POST held in flight committed the
  proposed Dining row as `{ category: "Food", categorySource: "chosen" }`
  instead of `{ category: "Dining", categorySource: "suggested" }` — a Food
  Category Rule for the merchant, dragging every untouched same-key row with
  it. B1 pinned that window as a RED test; it went green with B4, once
  approval created through `useCreateCategory`. The existing tests missed it
  because their fetch doubles answered the refetch at once.

### Where the plan met the code

- **A2 moved a doc comment.** `PreviewRow`'s `categorySource` comment was
  the only one of the three that `CategorizedRow` lacked; it moved onto
  `CategorizedRow` rather than being dropped.
- **A4's re-wrap lives in `detectStatement.ts`.** `mapStatementRows` is
  declared there, not in its own module, so the rename commit touched it
  for the comment alone.
- **C6 moved the four `StyledProposal…` components at once.** The plan
  listed the move under C6 but the consumer change under C7; to keep one
  definition, ImportWizard imported them from the strip's stylesheet for
  one commit, and C7 dropped that import with the inline JSX.
- **C7 fires approval with `void`.** With `approve` no longer rejecting,
  the strip's `onCreate` reads `() => void approveProposal(name)`, the idiom
  CategoryManagerModal already uses.

### Follow-ups

- Still open from the plan's Out of Scope: `CategorySelect`'s selection
  effect reporting the first category when its value is missing (it closes
  the class of defect, not just this instance); the Category Manager on the
  `CATEGORIES` cache; CategoryManagerModal's `MISCELLANEOUS` literal; the
  zod `categorySource` enum; atomicity of the Import Commit's writes; tuning
  `KEYWORD_GROUPS` and `COUNTERPARTY_KEY_TOKENS` in live use; cross-feature
  deep imports; and everything log 33 deferred.
- Still open from refactors 32–34: `linkedSince`'s UTC "today", the
  `isoDaysFromToday` midnight flake, the reports route's run-start choice,
  the client's month arithmetic and the rest of refactor 34's follow-ups.
- The glossary's Categories section still says a rename runs Category
  Reassignment across `categories` + `transactions` +
  `recurring_transactions`; the Import Category Learning relationships and
  the updated definition carry the Category Rules, and the historical
  section was left alone.

## 2026-10-18 — #278 UI Consistency Audit refactor: one Focus Ring

Refactor plan 36, worked commit by commit, with the epic's close-out folded
in so PRD #266 closes from one issue. The epic's rule was one owner per
visual fact; built slice by slice, it broke that rule in a few small places
and let its tests drift from how this codebase writes tests. No commit
changes a rendered value: every move either swaps a literal for a token of
the same value or touches tests and docs only.

- **One Focus Ring.** #275 added the `focusRing` fragment, described as "the
  Button's gold 2px outline", and moved 21 controls onto it. The Button
  itself, a Tabs tab, the Stepper's step buttons and the MonthYearPicker's
  trigger and month cells still wrote the ring by hand. The finding-32 guard
  allowed it because it accepted either the literal ring or `${focusRing}`,
  so two owners were allowed by the test. A1 pinned the ring on all five by
  rendering them, A2–A3 moved them onto the fragment, and C5 made Primitive
  Conformance accept the fragment only, across `primitives/` as well. A
  mutation check (dropping the Stepper's `${focusRing}`) fails the guard on
  `StepButton`.
- **Deep imports are the convention.** Before the epic, every import of a
  primitive or component from a feature, page, layout or component was a
  deep import (158 of primitives, 194 of components, 0 barrel imports).
  Finding 35 switched three imports of `Toggle` and `SwatchPicker` to the
  barrel and added a guard forbidding the deep form for those two only. C3
  put the three back, kept both index exports and deleted the guard.
- **Tests that test behaviour.** `remainingFindings.test.ts` and
  `alignmentOwner.test.ts` were named after issues and held three kinds of
  assertion:
  - The register status lines were dropped: they tested a frozen document.
  - Source-text checks became rendered tests beside their unit: History range
    chips, legend chips, Import account chips, account colour swatches, and
    the calendar's today, keyboard-selected and navigation buttons.
  - The `Empty`-named centring guard and the two-file `text-align` ban were
    dropped with their reasons (EmptyState's suite, the `columnOf` cases).

  `controlHeight.test.tsx` went too: each control primitive already pins
  `sizing.control` for every size. `fieldParity` became the Field Chrome
  fragment's own test. `rawControls` moved to `src/testing/` as the one
  source scanner (`findStyledElements`, `findFocusRingViolations`), and the
  four local `computedColor`/`cascaded` copies now import `src/testing/cascaded`.

- **Literals.** The MonthYearPicker trigger reads Control Height sm and
  `radius.sm`. The Stepper box composes Field Chrome with `width: auto` and
  its own padding. In the epic-touched style modules, a spacing literal on
  the scale (multiples of 4) and a radius literal on the prototype scale
  (6/8/10/14/999) became its token: ChoiceChip's padding and dot radius, the
  Tabs underline inset, the Modal footer and 36 declarations across 13
  feature modules.

### Where the plan met the code

- **Finding 35's index rule had no other home.** The plan said each
  primitive's own suite proves it is importable from the index, so the
  `remainingFindings` case "exports every primitive folder" could go. Only 9
  of the 20 primitives have that case, so this was the only check covering
  the other 11. It is a rule over every module, which is the kind the plan
  keeps, so C6 moved it into `src/primitives/index.test.ts` instead of
  dropping it. It now compares the index's exports with each folder's
  component, not the index's source text. The glossary's ambiguity entry
  names the index test as the proof.
- **jsdom's `:focus-visible` needs a connected previous focus.** Five
  separate Button cases failed after the first: when the last focused node
  had been unmounted by `cleanup`, the selector engine stopped matching
  `:focus-visible`. The Button case renders every variant in one tree, as
  ChoiceChip's ring case already did.
- **The keyboard-selected day needs a key on the day.** react-datepicker 9
  moves its preselection from a focused day cell, not from the input.
- **D3–D5 were read by meaning, not by value alone.** A 20px swatch, a 44px
  toggle or a 44px scroll button is a size, not spacing, so those stayed even
  where a spacing or Control Height token has the same number. A 12px toggle
  radius stayed too, because only the `card` alias holds 12. DataRow's
  padding (13px and 14px) is off the scale, so the plan's example had nothing
  to change.
- **Two regexes lost their `\b` on the way in.** B2's first draft went
  through a shell heredoc, which stripped the `\b` from `STYLED_ELEMENT`
  and `EXPORT_START`. The stale-allowlist guard caught it, and the regexes
  were then written with the editor.

### Follow-ups

- From the plan's Out of Scope:
  - Appearance changes: off-scale literals, the hand-sized icon tiles, and
    `HistoryChart`'s 7px chip radius.
  - `HistoryPage`'s hand-styled call-to-action `Link`, which belongs in
    `docs/live-use-defects.md` Round 2.
  - Finding 29's three modal patterns, still rejected.
  - The Snackbar close's lowercase `aria-label`.
  - The duplicated `type Variant` in `Button.tsx` and `Button.styles.ts`.
  - The month picker's 10px right-edge gap and live-use defect #6, both
    already in Round 2.
- 11 primitives have no `is importable from src/primitives/index.ts` case of
  their own. The index test covers them, so adding the cases is optional.
- Still open from refactors 32–35: `linkedSince`'s UTC "today", the
  `isoDaysFromToday` midnight flake, the reports route's run-start choice,
  the client's month arithmetic, `CategorySelect`'s selection effect and the
  Category Manager on the cache.
