# Ubiquitous Language

## Accounts

| Term                | Definition                                                                                                                                         | Aliases to avoid                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Account**         | A named financial account instance tracked in Horizon                                                                                              | —                                   |
| **AccountKind**     | The classification of an account that determines its behaviour and fields                                                                          | AccountType, account category       |
| **Girokonto**       | A current/checking account kind — used for income and day-to-day spending                                                                          | Checking account, current account   |
| **Tagesgeld**       | An overnight savings account kind — used as a Sondertilgung reserve                                                                                | Savings account, high-yield account |
| **Mortgage**        | A loan account kind that tracks outstanding Restschuld                                                                                             | Home loan, Darlehen account         |
| **CreditCard**      | A credit card account kind — tracks debt owed, paid in full monthly                                                                                | Card account                        |
| **Investment**      | An investment account kind — tracks ETF cost basis only, not market value                                                                          | Brokerage, portfolio                |
| **Opening Balance** | The user-entered balance at the moment an account is created in Horizon — corresponds to its Opening Date — no backtracking (updated)              | Starting balance, initial balance   |
| **Opening Date**    | The calendar date the user set up the account in Horizon — the engine replays recurring history from this date to derive the current balance (new) | Account start date, creation date   |
| **Current Balance** | The derived balance of an account: Opening Balance + replayed Recurring History + Variable Spending actuals (updated)                              | Live balance                        |

## Transactions

| Term                                            | Definition                                                                                                                                            | Aliases to avoid                                |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Transaction**                                 | A single financial movement recorded against an account                                                                                               | Entry, record, payment                          |
| **Transfer**                                    | A movement of money between two Horizon accounts, modelled as two linked Transactions                                                                 | Internal transaction, move                      |
| **TransferId**                                  | The shared identifier that links the two legs of a Transfer                                                                                           | —                                               |
| **RecurringTransaction**                        | A standing order that fires on a defined schedule and drives the Projection Engine                                                                    | Standing order, Dauerauftrag, scheduled payment |
| ~~**Active RecurringTransaction**~~ (removed)   | ~~A RecurringTransaction with `isActive: true`.~~ `isActive` removed in UI redesign — all RecurringTransactions are always active; delete to stop one | —                                               |
| ~~**Inactive RecurringTransaction**~~ (removed) | ~~A RecurringTransaction with `isActive: false`.~~ Concept removed — use delete instead of pause                                                      | —                                               |
| **Recurring Transfer** (new)                    | A RecurringTransaction with a `linkedAccountId` — models a scheduled movement between two accounts in the Projection Engine                           | Scheduled transfer                              |
| **One-off Transfer** (new)                      | A single, non-recurring Transfer between two accounts recorded directly as two linked Transactions                                                    | Ad-hoc transfer, manual transfer                |
| **Category**                                    | A user-managed label applied to a Transaction for reporting and AI analysis                                                                           | Tag, type, label                                |

## Mortgage

| Term                        | Definition                                                                                                         | Aliases to avoid                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| **Restschuld**              | The outstanding mortgage principal remaining — the balance of the Mortgage account                                 | Remaining balance, outstanding debt |
| **Sondertilgung (ST)**      | An annual extra mortgage repayment that directly reduces the Restschuld                                            | Extra payment, overpayment          |
| **Darlehen**                | The regular monthly mortgage payment (covers Zinsen + Tilgung) — modelled as a RecurringTransaction                | Mortgage payment, monthly payment   |
| **Zinsen**                  | The interest portion of the Darlehen payment — not tracked separately in Horizon                                   | Interest                            |
| **Tilgung**                 | The principal repayment portion of the Darlehen payment — not tracked separately in Horizon                        | Principal repayment                 |
| **ST-only Model**           | The projection approach where Restschuld decreases only from Sondertilgung payments, not from the monthly Darlehen | Amortization model                  |
| **Sondertilgung Allowance** | The maximum annual ST amount permitted by the lender — stored on the Mortgage account                              | ST cap, ST limit                    |

## Projections

| Term                                | Definition                                                                                                                                                                                    | Aliases to avoid                     |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Projection Engine**               | The system that calculates forward balances from RecurringTransactions and current account balances — default horizon is 20 years (240 months)                                                | Forecast engine, planner             |
| **Recurring-Only Projection Model** | The design constraint that recurring transactions own all regular financial flows; actual transactions exist only for variable one-off spending (new)                                         | —                                    |
| **Recurring History**               | The set of recurring transactions that have already fired between an account's Opening Date and today — replayed by the engine to derive the correct starting balance (new)                   | Past recurring, historical recurring |
| **Replay Loop**                     | The engine phase that simulates Recurring History from each account's Opening Date up to (but not including) the current month, using the same firing logic as the Forward Projection (new)   | Historical replay, backfill          |
| **Forward Projection**              | The engine phase that applies recurring transactions from the current month into the future — runs after the Replay Loop has established the correct starting balance (new)                   | Projection loop, forecast            |
| **monthOfYear**                     | The calendar month number (1–12) stored on a RecurringTransaction that anchors when annual or quarterly transactions fire — e.g. `monthOfYear: 10` fires in October every year (new)          | Month anchor, firing month           |
| **Variable Spending**               | Irregular, one-off actual transactions that record real expenditure (food, dental, shopping, cat food) — the only category of actual transaction in the Recurring-Only Projection Model (new) | One-off spending, irregular expenses |
| **MonthlySnapshot**                 | The projected state of all account balances for a given future month                                                                                                                          | Projection row, forecast entry       |
| **TrajectoryDataPoint** (new)       | A chart-ready data shape derived from a MonthlySnapshot — includes totalLiquid, restschuld, netCashflow, isSTMonth, isPayoffMonth                                                             | Chart point, data point              |
| **Plan**                            | The full set of MonthlySnapshots produced by the Projection Engine — there is no separate plan data store                                                                                     | Financial plan, budget plan          |
| **Actual**                          | The real account balance derived from recorded Transactions                                                                                                                                   | Real balance                         |
| **Variance**                        | The difference between a projected balance and the actual balance for a given account and month                                                                                               | Delta, difference                    |
| **Payoff Month**                    | The first projected month in which a Mortgage account's balance reaches zero                                                                                                                  | Payoff date, payoff year             |
| **Payoff Year** (new)               | The calendar year that contains the Payoff Month                                                                                                                                              | Payoff year, final year              |
| **ST Month** (new)                  | A projected month in which an annual Sondertilgung Recurring Transfer fires — detected from RecurringTransaction shape, not hardcoded                                                         | ST date, October payment             |
| **Estimated Completion Month**      | The first projected month in which a Milestone's target balance is reached                                                                                                                    | Target date, goal date               |

## Dashboard

| Term                           | Definition                                                                                                                                                    | Aliases to avoid                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| ~~**Milestone**~~ (removed)    | ~~A user-defined named target: a specific account must reach a specific balance.~~ Removed in UI redesign — was designed for permanently-deferred AI features | ~~Goal, target, checkpoint~~     |
| **Mortgage Countdown**         | The dashboard display showing current Restschuld and Payoff Month for each Mortgage account                                                                   | Payoff tracker, countdown        |
| **Plan Summary** (new)         | The compact dashboard widget showing one clickable Year Summary Row per projected year-end, linking to the Plan Page                                          | Plan widget, plan preview        |
| **Year Summary Row** (new)     | A single row in the Plan Summary showing end-of-year Total Liquid, Restschuld, and ST amount for one projected year                                           | Annual row, year row             |
| **Plan Page** (updated)        | The dedicated `/plan` route that displays the full Projection Accordion — labeled **Outlook** in the sidebar nav                                              | Plan view, projection page       |
| **Outlook** (new)              | The sidebar nav label for the Plan Page — chosen over "Plan" to convey forward-looking intent and pair cleanly with "Dashboard"                               | Plan, Forecast, Projection       |
| **Projection Accordion** (new) | The year-grouped, expandable UI on the Plan Page — collapsed shows Year Summary Row data, expanded shows 12 monthly rows                                      | Plan table, projection table     |
| **Trajectory Horizon** (new)   | The 20-year chart widget on the Dashboard showing Total Liquid, Restschuld, and Net Cashflow as three lines over 240 months                                   | Projection chart, plan chart     |
| **Payoff Marker** (new)        | The vertical dashed reference line on the Trajectory Horizon chart that marks the Payoff Month                                                                | Payoff line, payoff indicator    |
| **Freedom Phase** (new)        | The post-payoff period in the Trajectory Horizon chart where Restschuld is zero and Total Liquid accelerates — the second act of the 20-year arc              | Post-payoff phase, savings phase |

## Derived Metrics

| Term              | Definition                                                                                          | Aliases to avoid                         |
| ----------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Net Cashflow**  | Sum of all non-Transfer Transactions for a month across all accounts                                | Monthly income, monthly result           |
| **Free Cashflow** | Net amount remaining in the primary Girokonto after all outflows for a month                        | Breathing room, surplus                  |
| **Total Liquid**  | Sum of all Girokonto and Tagesgeld account balances — excludes Investment, Mortgage, and CreditCard | Net worth, liquid assets, available cash |
| **Cost Basis**    | The total amount invested in an Investment account — never market value                             | Market value, portfolio value            |

## Relationships

- An **Account** has exactly one **AccountKind**
- An **Account** may have one **Account Icon** and one **Account Color** — both optional; the UI pre-fills a random **Account Color** from the **Account Color Palette** as a default
- An **Account** has exactly one **Opening Date** — the date its **Opening Balance** was captured in Horizon
- A **Current Balance** is always derived, never stored: **Opening Balance** + **Recurring History** replayed from **Opening Date** + **Variable Spending** actuals — never stored directly (updated)
- A **Transfer** is always composed of exactly two **Transactions** sharing a **TransferId**
- A **RecurringTransaction** may produce a **Transaction** on each occurrence date
- All **RecurringTransactions** are applied by the **Projection Engine** — there is no inactive/paused state; delete to stop one
- A **Recurring Transfer** is a **RecurringTransaction** with a `linkedAccountId` — the Projection Engine credits the linked account and (if it is a Mortgage) reduces **Restschuld**
- A **One-off Transfer** is always composed of exactly two **Transactions** sharing a **TransferId** — it has no schedule
- A **Sondertilgung** is a **Transfer** from a **Tagesgeld** account to a **Mortgage** account — it reduces the **Restschuld**
- The **Projection Engine** runs in two phases: the **Replay Loop** (Opening Date → today) followed by the **Forward Projection** (today → 20 years out)
- The **Replay Loop** uses the same `monthOfYear` firing logic as the **Forward Projection** — they are never out of sync
- A **RecurringTransaction** with `monthOfYear` set fires only when the current calendar month matches the anchor — annual fires once per year, quarterly fires every three months from that anchor
- **Variable Spending** is the only category of actual transaction — salary, transfers, and regular expenses are never entered as actual transactions in the **Recurring-Only Projection Model**
- The **Plan** is always the output of the **Projection Engine** — it is never entered or stored manually
- **Total Liquid** includes only **Girokonto** and **Tagesgeld** accounts — determined by **AccountKind**
- ~~A **Milestone** targets exactly one **Account** and has exactly one **target balance**~~ (removed)
- ~~The **Estimated Completion Month** of a **Milestone** is derived from the **Plan** — never stored~~ (removed)
- The **Payoff Month** of a **Mortgage** account is derived from the **Plan** — never stored
- The **Payoff Year** is the calendar year that contains the **Payoff Month** — used to visually distinguish the payoff year in the **Projection Accordion**
- The **Mortgage Countdown** displays one entry per **Mortgage** account
- The **Plan Summary** displays one **Year Summary Row** per projected year-end, derived from the December **MonthlySnapshot** of each year
- The **Projection Accordion** on the **Plan Page** contains one expandable section per projected year — each section's expanded state shows 12 **MonthlySnapshot** rows
- An **ST Month** is identified by the presence of an annual **Recurring Transfer** whose `linkedAccountId` points to a **Mortgage** account — never hardcoded to a calendar month
- The **Trajectory Horizon** chart derives its data from the same **MonthlySnapshot** array as the **Projection Accordion** — no separate data source
- A **TrajectoryDataPoint** is a 1:1 mapping from a **MonthlySnapshot** — one per projected month across the full 240-month horizon
- The **Payoff Marker** on the **Trajectory Horizon** chart is always positioned at the **Payoff Month**
- The **Freedom Phase** begins at the **Payoff Month** and extends to the end of the 20-year horizon

## Example dialogue

> **Dev:** "When the user records a Sondertilgung, is that a Transaction
> or a Transfer?"
>
> **Domain expert:** "It's a Transfer — money leaves the Tagesgeld account
> and reduces the Restschuld on the Mortgage account. Two linked
> Transactions sharing a TransferId."
>
> **Dev:** "Does the monthly Darlehen payment also reduce the Restschuld?"
>
> **Domain expert:** "No — Horizon uses the ST-only model. The Darlehen is
> just a regular RecurringTransaction outflow from the Girokonto. Only a
> Sondertilgung touches the Restschuld."
>
> **Dev:** "So the Projection Engine never does any amortization math?"
>
> **Domain expert:** "Correct. The Projection Engine applies RecurringTransactions
> forward in time. When it hits an annual ST RecurringTransaction in October,
> it reduces the Mortgage balance by that amount. That's the full extent of
> mortgage math."
>
> **Dev:** "And Total Liquid — does it include the Investment account?"
>
> **Domain expert:** "Never. Total Liquid is Girokonto plus Tagesgeld only.
> The Investment account tracks Cost Basis — it's illiquid and excluded
> by AccountKind."
>
> **Dev:** "On the dashboard, what's the difference between the Mortgage
> Countdown and a Milestone targeting the Mortgage account?"
>
> **Domain expert:** "The Mortgage Countdown is always there — it's the
> Payoff Month derived from the Plan, shown automatically for every Mortgage
> account. A Milestone is something the user creates explicitly — they name
> it, pick any account, and set a target balance. The Estimated Completion
> Month comes from the same Plan, but the user decides what to track."

> **Dev:** "If the user wants to pause their monthly savings transfer temporarily,
> do they delete the RecurringTransaction?"
>
> **Domain expert:** "No — they set it to Inactive. The RecurringTransaction is
> retained so they can reactivate it later. The Projection Engine skips Inactive
> RecurringTransactions, so the Plan updates immediately."
>
> **Dev:** "What about a one-off lump-sum transfer — say, moving a bonus into
> Tagesgeld?"
>
> **Domain expert:** "That's a One-off Transfer — two linked Transactions sharing
> a TransferId. It has no schedule and no linkedAccountId. It affects the Current
> Balance immediately but doesn't change any RecurringTransaction."
>
> **Dev:** "And the annual Sondertilgung — is that a Recurring Transfer?"
>
> **Domain expert:** "Yes. It's a RecurringTransaction on the Tagesgeld account
> with a linkedAccountId pointing to the Mortgage. When the Projection Engine
> hits it in October, it debits Tagesgeld and reduces the Restschuld. That's
> what makes the Payoff Month move earlier."

## Design System (updated)

| Term                            | Definition                                                                                                                                                                 | Aliases to avoid                |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Meridian**                    | The custom design system for Horizon — defines visual tokens, primitives, and components                                                                                   | "the design system", "theme"    |
| **Stitch** (new)                | The Google design reference (`src/assets/DESIGN.md`) used as the visual target for the UI redesign — defines the MD3 color token set, dual-font system, and shape language | Reference design, Google design |
| **MD3 Tokens** (new)            | The Material Design 3 color token set adopted wholesale from the Stitch reference — replaces the original Meridian color names                                             | Material tokens, design tokens  |
| **Tonal Layering** (new)        | The elevation model that uses progressively lighter surface tints (not shadows) to convey depth — Level 0 base, Level 1 cards, Level 2 modals                              | Shadow elevation, drop shadows  |
| **Sidebar** (new)               | The fixed 220px left-side navigation shell that replaced the top bar in the UI redesign — contains the wordmark, Dashboard, Outlook, and Settings links                    | Nav bar, side nav, top bar      |
| **Per-kind Color Map** (new)    | A `Record<AccountKind, string>` defined in tokens that maps each account kind to a deterministic chart line color — ensures the same kind always renders the same color    | Color palette, chart colors     |
| **Account Icon** (new)          | A lucide-react icon name string chosen by the user at account creation from the curated icon set — stored as `TEXT` in the database, nullable                              | Account image, account avatar   |
| **Account Color** (new)         | A hex color string chosen by the user at account creation from the curated palette — stored as `TEXT` in the database, nullable; random default pre-filled in the modal    | Account tint, account theme     |
| **Account Color Palette** (new) | The curated set of 10 MD3-derived hex values available for **Account Color** selection — chosen to be visually distinct on dark surfaces                                   | Color picker, color wheel       |
| **Account Icon Set** (new)      | The curated set of 8 lucide-react icon names available for **Account Icon** selection (Wallet, Home, PiggyBank, TrendingUp, CreditCard, Landmark, Building2, Banknote)     | Icon library, icon picker       |

## Example dialogue (Financial Projection Dashboard)

> **Dev:** "On the Plan Page, how does the app know which months to highlight as ST months?"
>
> **Domain expert:** "It's derived — not hardcoded. The app looks for any annual Recurring Transfer whose `linkedAccountId` points to a Mortgage account. Whatever month that fires in is the ST Month. It could be October, it could be March."
>
> **Dev:** "What if the user hasn't set up a Sondertilgung Recurring Transfer yet?"
>
> **Domain expert:** "Then there are no ST Months in the Plan and nothing is highlighted. Correct behaviour."
>
> **Dev:** "The Plan Summary on the dashboard — does it show per-account balances or just totals?"
>
> **Domain expert:** "Just totals. Each Year Summary Row shows Total Liquid, Restschuld, and ST amount fired. The per-account breakdown lives in the Projection Accordion on the Plan Page."
>
> **Dev:** "When does a year get the Payoff Year treatment in the accordion?"
>
> **Domain expert:** "When it contains the Payoff Month — the first month the Mortgage Restschuld reaches zero. The year header gets a badge, and that specific month row is highlighted."

## Example dialogue (Trajectory Horizon)

> **Dev:** "The Trajectory Horizon chart shows 240 months — where does that data come from?"
>
> **Domain expert:** "Same place as the Projection Accordion — the Projection Engine output. Each MonthlySnapshot maps 1:1 to a TrajectoryDataPoint. No new backend logic, just a different visual."
>
> **Dev:** "What makes the Payoff Marker appear on the chart?"
>
> **Domain expert:** "It's placed at the Payoff Month — the first TrajectoryDataPoint where restschuld reaches zero. After that point, the chart enters the Freedom Phase: Restschuld flatlines at zero and Total Liquid accelerates upward."
>
> **Dev:** "Is Freedom Phase a stored value somewhere?"
>
> **Domain expert:** "No — it's a visual concept. It starts at the Payoff Month and runs to the end of the 240-month horizon. The Payoff Marker is the only annotation needed; the chart shape tells the rest of the story."

## Example dialogue (Projection Engine Audit)

> **Dev:** "When the Projection Engine starts, where does it get the Girokonto's
> balance from?"
>
> **Domain expert:** "It replays Recurring History from the Opening Date. If the
> account was set up six months ago, the engine runs six months of recurring
> transactions — salary in, transfers out, expenses out — to arrive at today's
> correct starting balance. That's the Replay Loop."
>
> **Dev:** "Does it also include food and shopping from those past months?"
>
> **Domain expert:** "Yes — Variable Spending actuals are added on top of the
> replayed Recurring History. Together they give the true Current Balance at the
> start of the Forward Projection."
>
> **Dev:** "Why doesn't the user just update the Opening Balance every month?"
>
> **Domain expert:** "Because that's error-prone and breaks the audit trail.
> The Opening Balance is a one-time snapshot. The engine does the math from
> there. The user should never have to touch it again."
>
> **Dev:** "And the Sondertilgung — how does the engine know to fire it in
> October and not in the first month of the projection?"
>
> **Domain expert:** "The monthOfYear field. If it's set to 10, the engine only
> fires that recurring transaction when the current calendar month is October —
> in both the Replay Loop and the Forward Projection. Without monthOfYear the
> engine falls back to index-based firing, which is only correct if the projection
> happens to start in the right month."

## Storage Architecture (new)

| Term                   | Definition                                                                                                                                                                                                             | Aliases to avoid                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Storage**            | The single facade interface that the Express app talks to for all persistence — exposes per-entity repositories as namespaces (`storage.accounts`, `storage.transactions`, …)                                          | Database, persistence layer, data layer |
| **Repository Facade**  | The architectural pattern Storage implements — Repository pattern (per-entity repos) + Facade pattern (one root object), equivalent in shape to EF Core's DbContext                                                    | DAO, data context                       |
| **Storage Driver**     | A concrete implementation of Storage targeting a specific backend — Horizon ships two: the **Mongo Driver** and the **SQLite Driver**                                                                                  | Backend, adapter, provider              |
| **Mongo Driver**       | The Storage Driver backed by MongoDB via Mongoose — used by the Cloud Build                                                                                                                                            | Mongo backend, mongo storage            |
| **SQLite Driver**      | The Storage Driver backed by local SQLite via `better-sqlite3` — used by the Desktop Build                                                                                                                             | Local DB, sqlite backend                |
| **AccountWithBalance** | A DTO returned by `accounts.findAllWithBalance` and `accounts.findByIdWithBalance` — an Account plus its derived `balance` (Opening Balance + sum of Transactions)                                                     | Account-with-totals, enriched account   |
| **Parity Spec**        | The shared test suite (`storage.parity.ts`) that every Storage Driver must satisfy — guarantees behavioural equivalence between the Mongo and SQLite drivers                                                           | Conformance suite, contract test        |
| **Use-case Method**    | A repo method that hides multi-step or atomic logic behind a single call (e.g. `transfers.create`) — each Storage Driver implements atomicity with its own primitive                                                   | Service method, domain method           |
| **Migration**          | A numbered SQL file in `storage/sqlite/migrations/` applied in order against the SQLite database — versioned via `PRAGMA user_version`                                                                                 | Schema change, DB upgrade               |
| **DeleteResult**       | The discriminated-union return shape of every repo's `delete` method — either `{ ok: true }` or `{ ok: false, reason }` where `reason` is one of `has_transactions`, `is_transfer_leg`, `is_default`, or `in_use`      | Delete outcome, delete error            |
| **`in_use`** reason    | The DeleteResult reason returned by `accounts.delete` when a recurring transaction (active or inactive, on `accountId` or `linkedAccountId`) or a milestone still references the account — surfaced by routes as a 409 | Referenced, has-references              |

## SQLite Driver Operations (new)

| Term                       | Definition                                                                                                                                                                                                                | Aliases to avoid                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| **Connection Pragma**      | A SQLite `PRAGMA` setting that applies to a single open connection (not the database file) — Horizon applies `journal_mode = WAL`, `synchronous = NORMAL`, `busy_timeout = 5000`, `foreign_keys = ON`, `mmap_size = 64MB` | DB setting, config flag             |
| **WAL Mode**               | The Write-Ahead Logging `journal_mode` used by the **SQLite Driver** — enables crash-safe writes via `.db-wal` / `.db-shm` sidecar files                                                                                  | Journal mode, write-ahead log       |
| **WAL Checkpoint**         | The `PRAGMA wal_checkpoint(TRUNCATE)` operation run by `Storage.close()` to fold the WAL back into the main `.db` file, leaving a clean canonical snapshot                                                                | Checkpoint, WAL flush               |
| **Integrity Check**        | The `PRAGMA integrity_check` run on startup after `migrate()` — non-`ok` result throws **StorageIntegrityError** for the Electron shell to surface                                                                        | DB check, validation                |
| **StorageIntegrityError**  | The typed error thrown by the **SQLite Driver** when **Integrity Check** fails — never auto-recovered, always surfaced to the user                                                                                        | Corruption error, DB error          |
| **Forward-only Migration** | The migration policy: each schema change is a new numbered SQL file, never edited after shipping; no down-migrations exist — restore-from-backup is the only rollback path                                                | Append-only migration, irreversible |
| **Online Backup**          | The `db.backup(destPath)` operation exposed via `Storage.backup()` (SQLite driver only) — uses better-sqlite3's online backup API, safe while the DB is open and aware of WAL                                             | Snapshot, backup copy               |
| **Restore**                | The `Storage.restore(srcPath)` operation that closes storage, validates the source via **Integrity Check** and `user_version`, copies it into place, and reopens                                                          | Recover, import                     |
| **`HORIZON_DB_PATH`**      | The env var the entrypoint reads to resolve the SQLite file path before calling `createSqliteStorage(path)` — Electron main sets it to `app.getPath('userData')/horizon.db`; local dev defaults to `./horizon.db`         | DB path env, sqlite path            |

## Desktop Shell (new)

| Term                       | Definition                                                                                                                                                                                           | Aliases to avoid                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Electron Main**          | The privileged Node process that owns app lifecycle, BrowserWindow, and the **Server Handle** — the only place that knows about `app.getPath('userData')`                                            | Main process, host                 |
| **Renderer**               | The sandboxed Chromium process that runs the React app — talks to the **Server Handle**'s child only over HTTP loopback                                                                              | Window process, web view, frontend |
| **Server Handle**          | The `electron/serverHandle.ts` wrapper around `utilityProcess.fork()` — owns start, stop, the **Ready Handshake**, and the **Shutdown Handshake** for the Express child                              | Server wrapper, server process     |
| **utilityProcess**         | Electron's first-class API for non-renderer Node children — used by the **Server Handle** to spawn the Express server in a separate Node process that inherits Electron's bundled Node               | Worker, child process, fork        |
| **Ready Handshake**        | The `{ type: 'ready', port }` message the **Server Handle**'s child posts to **Electron Main** once the Express server has bound an ephemeral port — gated by a 10-second timeout                    | Startup signal, port handshake     |
| **Shutdown Handshake**     | The `{ type: 'shutdown' }` message **Electron Main** sends on `before-quit`; the child runs `await storage.close()` (triggering the **WAL Checkpoint**) before exiting; 5-second grace then `kill()` | Quit handshake, drain              |
| **Fatal Message**          | A `{ type: 'fatal', kind, message }` message the **Server Handle**'s child posts on `StorageIntegrityError` or other startup failure — surfaces in **Electron Main** as a modal dialog               | Crash signal, error message        |
| **Preload Bridge**         | The `electron/preload.ts` script that runs in the **Renderer** under `contextIsolation: true` and exposes exactly `window.horizon = { apiBaseUrl, platform }` via `contextBridge`                    | Preload script, IPC bridge         |
| **window.horizon**         | The single global the **Preload Bridge** exposes to the **Renderer** — frontend code reads `window.horizon?.apiBaseUrl ?? import.meta.env.VITE_API_BASE_URL` to find the loopback API                | window globals, electron API       |
| **API Base URL Injection** | The mechanism that delivers the resolved port from **Electron Main** to the **Renderer**: main passes `--api-base-url=http://127.0.0.1:N` via `additionalArguments`; the **Preload Bridge** reads it | Port injection, API discovery      |
| **Single-Instance Lock**   | Electron's `app.requestSingleInstanceLock()` guarantee that only one **Desktop Build** instance runs per user — second-launch focuses the existing window via `second-instance`                      | Singleton, instance guard          |
| **Loopback Bind**          | The `app.listen(PORT, '127.0.0.1', …)` rule: the **Desktop Build** server is reachable only from the local machine — never `0.0.0.0`, never a LAN address                                            | Localhost-only, 127-bind           |

## Build Targets (new)

| Term              | Definition                                                                                                                                                                      | Aliases to avoid                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Build Target**  | One of the two shipping shapes of Horizon — the **Cloud Build** or the **Desktop Build** — both run the same Express app against a different Storage Driver                     | Deployment, environment, version      |
| **Cloud Build**   | The Vercel + Render + MongoDB Atlas deployment, gated by Google Auth — the portfolio-facing version of Horizon                                                                  | Production, web build, hosted version |
| **Desktop Build** | The Electron app bundling the same Express server against a local SQLite database — single-user, offline, no auth, binds `127.0.0.1` only                                       | Offline build, local app, native app  |
| **Owner**         | The single Google account authorized to access the Cloud Build — identified by the stable `sub` claim configured in `OWNER_GOOGLE_SUB`                                          | Admin, user, account holder           |
| **Auth Gate**     | The global `requireOwner` Express middleware that verifies the Google ID token and matches the `sub` claim against the Owner allowlist of one — mounted only on the Cloud Build | Auth check, login guard               |

## Relationships (additions)

- The **Desktop Build** is the **Electron Main** process plus a **Renderer** plus a **Server Handle**'s `utilityProcess` child running the same Express app the **Cloud Build** runs
- The **Server Handle** owns the lifecycle of the Express child — **Electron Main** never spawns Node directly
- The **Renderer** never imports Electron, never imports `better-sqlite3`, and never reads files — it talks to the Express child via the **API Base URL Injection** + HTTP only
- The **Preload Bridge** is the **only** code path that crosses from **Electron Main** into the **Renderer** — it exposes `apiBaseUrl` and `platform` and nothing else
- The **Ready Handshake** must complete before any **BrowserWindow** is created — startup that fails the 10s timeout surfaces a fatal dialog and quits
- The **Shutdown Handshake** must complete before **Electron Main** exits — without it, the **WAL Checkpoint** never runs and the on-disk `.db` is not the canonical snapshot
- A **Fatal Message** with `kind: 'integrity'` corresponds 1:1 to a **StorageIntegrityError** thrown by the **SQLite Driver** at startup
- The **Desktop Build** server always uses **Loopback Bind** — off-box traffic can never reach it
- Exactly one **Desktop Build** instance runs per user via the **Single-Instance Lock**
- The **SQLite Driver** never imports Electron — **Electron Main** is the only producer of `HORIZON_DB_PATH` in the **Desktop Build**

- **Storage** is implemented by exactly one **Storage Driver** at runtime — selected by the entrypoint via `STORAGE_DRIVER`
- The **Cloud Build** uses the **Mongo Driver**; the **Desktop Build** uses the **SQLite Driver**
- The **Auth Gate** runs only on the **Cloud Build** — the **Desktop Build** has no authentication
- A single **Owner** is authorized for the **Cloud Build** — the model is single-tenant with auth-as-doorman, never multi-user
- Every **Storage Driver** must pass the **Parity Spec** — drift between drivers is impossible to merge
- An **AccountWithBalance** is derived inside the Storage layer — each driver computes it with its native primitive (Mongo aggregation pipeline, SQLite `LEFT JOIN ... GROUP BY`)
- A **Use-case Method** owns its own atomicity — `transfers.create` is two-leg-or-nothing in both drivers
- The **SQLite Driver** applies a fixed set of **Connection Pragmas** at construction — including **WAL Mode** for crash-safe writes
- Every startup runs an **Integrity Check** after `migrate()` — failure throws **StorageIntegrityError** rather than attempting silent recovery
- `Storage.close()` runs a **WAL Checkpoint** before closing the connection — guaranteeing the on-disk `.db` is the canonical snapshot at shutdown
- The **SQLite Driver** exposes **Online Backup** and **Restore** on the **Storage** facade — the **Mongo Driver** throws `not supported`
- Schema changes use **Forward-only Migration** — there is no down-migration; **Restore** from backup is the rollback path
- The **SQLite Driver** never reads `process.env` — the file path enters via the `path` argument, sourced by the entrypoint from **`HORIZON_DB_PATH`**

## Example dialogue (Repository Abstraction)

> **Dev:** "When a route handler asks for an account, what does it actually call?"
>
> **Domain expert:** "It calls `storage.accounts.findById(id)`. The route never sees Mongo, never sees SQLite — it sees the Storage facade. Whichever Storage Driver was wired up at startup answers the call."
>
> **Dev:** "And how is the driver decided?"
>
> **Domain expert:** "By the Build Target. The Cloud Build's entrypoint calls `createStorage('mongo')`; the Desktop Build's Electron main process calls `createStorage('sqlite')`. The Express app is identical in both cases."
>
> **Dev:** "What stops a malformed ID — like `{$ne: null}` — from reaching the Mongo driver?"
>
> **Domain expert:** "The repo handles it. Every method that takes an ID returns `null` for unparseable input rather than throwing or running a query. The Mongo driver checks `isValidObjectId` internally; the SQLite driver doesn't need to because parameterised queries are immune. From the route's perspective, the answer is just 'not found'."
>
> **Dev:** "And on the Cloud Build, who's allowed in?"
>
> **Domain expert:** "Just the Owner — one Google account, identified by `sub`, configured in `OWNER_GOOGLE_SUB`. The Auth Gate is global middleware, so a forgotten route can't accidentally leak. The Desktop Build skips the Auth Gate entirely because it's single-user and only listens on `127.0.0.1`."
>
> **Dev:** "How do we know the two drivers actually behave the same?"
>
> **Domain expert:** "The Parity Spec. One shared test suite, run twice — once against an in-memory Mongo, once against an in-memory SQLite. If a method behaves differently in either driver, a test fails."

## Example dialogue (SQLite Driver Operations)

> **Dev:** "When the SQLite Driver opens the database, what's the first thing it does?"
>
> **Domain expert:** "It applies the Connection Pragmas — WAL Mode, synchronous = NORMAL, busy_timeout, foreign_keys, mmap_size. Then it runs migrate to bring the schema up to user_version. Then it runs an Integrity Check. If integrity_check returns anything other than 'ok', it throws a StorageIntegrityError and the Electron shell prompts the user to restore from backup."
>
> **Dev:** "Why throw instead of trying to repair?"
>
> **Domain expert:** "It's finance data. We never silently 'fix' anything. The user always sees the corruption and chooses what to do."
>
> **Dev:** "And on shutdown?"
>
> **Domain expert:** "Storage.close runs a WAL Checkpoint with TRUNCATE before closing the connection. That folds the .db-wal back into the .db file so the on-disk state is one clean snapshot — which makes Online Backup straightforward."
>
> **Dev:** "How does Online Backup actually work?"
>
> **Domain expert:** "Storage.backup(destPath) calls better-sqlite3's db.backup. It's safe while the DB is open, it handles WAL correctly, and it produces a single self-contained file. The Mongo Driver doesn't implement it — it throws 'not supported'."
>
> **Dev:** "What if I need to roll back a bad schema change?"
>
> **Domain expert:** "There's no down-migration. Migrations are Forward-only — once shipped, never edited. The rollback path is Restore from a previous Online Backup. That's the deal we made: schema mistakes are recoverable via backup, not via SQL."
>
> **Dev:** "And the file path — how does the driver know where to put horizon.db?"
>
> **Domain expert:** "It doesn't. The driver takes a path argument, full stop. The entrypoint reads HORIZON_DB_PATH from the environment and passes it in. On the Desktop Build, Electron main sets that env var to app.getPath('userData') + '/horizon.db' before spawning the Express child. The driver never imports anything from Electron."

## Example dialogue (Electron Desktop Shell)

> **Dev:** "When the **Desktop Build** starts, what's the first thing **Electron Main** does after `app.whenReady()`?"
>
> **Domain expert:** "It takes the **Single-Instance Lock**. Then it asks the **Server Handle** to start. The Server Handle uses `utilityProcess.fork()` to spawn the Express server with `PORT=0`, `STORAGE_DRIVER=sqlite`, `HORIZON_DB_PATH=app.getPath('userData')/horizon.db`, and `AUTH_DISABLED=1`. It waits for the **Ready Handshake** — the `{ type: 'ready', port }` message — with a ten-second timeout."
>
> **Dev:** "Why an ephemeral port?"
>
> **Domain expert:** "Two reasons. One — it can't collide with `npm run server:dev` or anything else the user has bound to 3001. Two — the server is the authority on its own port; main just gets told. That number then flows to the **Renderer** via **API Base URL Injection** — main passes `--api-base-url=http://127.0.0.1:N` via `additionalArguments`, and the **Preload Bridge** reads it and exposes `window.horizon.apiBaseUrl`."
>
> **Dev:** "Does the **Renderer** ever talk directly to SQLite or to Electron?"
>
> **Domain expert:** "Never. The Renderer is sandboxed, `contextIsolation` is on, and the Preload Bridge exposes exactly two strings — `apiBaseUrl` and `platform`. The Renderer talks to the server over HTTP, just like the **Cloud Build** SPA does. There is no second code path."
>
> **Dev:** "What happens on quit?"
>
> **Domain expert:** "**Electron Main** intercepts `before-quit`, sends the **Shutdown Handshake** message to the Server Handle's child, and waits up to five seconds. The child runs `await storage.close()` — which triggers the **WAL Checkpoint** — and exits. Without that handshake the `.db-wal` file would still be present on disk and the **Online Backup** story would be broken."
>
> **Dev:** "And if the database is corrupted at startup?"
>
> **Domain expert:** "The **SQLite Driver** throws a **StorageIntegrityError**. The Server Handle's child catches it and posts a **Fatal Message** with `kind: 'integrity'`. **Electron Main** shows a modal: **Quit** or **Show data folder**. Never silent recovery — finance data, log 09 was firm on that."
>
> **Dev:** "Could someone on the same network reach the Desktop Build server?"
>
> **Domain expert:** "No. The server uses **Loopback Bind** — it's `127.0.0.1` only, never `0.0.0.0`. Off-box traffic can't hit it. Combined with `AUTH_DISABLED=1` being safe only because of the loopback rule — drop the loopback rule and the security model collapses."

## Desktop Packaging (new)

| Term                    | Definition                                                                                                                                                                 | Aliases to avoid                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **electron-builder**    | The packaging tool that compiles the Desktop Build into a distributable Windows installer — handles ASAR, native module unpacking, and NSIS target configuration           | electron-packager, electron-forge          |
| **NSIS Installer**      | The Windows installer format produced by electron-builder — installs the Desktop Build as a native Windows application with Start Menu entry and Add/Remove Programs entry | Setup.exe, installer, distribution package |
| **oneClick Install**    | The per-user, no-elevation NSIS install mode — installs to `%AppData%\Local\Horizon` with no UAC prompt, no admin rights required                                          | Per-machine install, system install        |
| **SmartScreen Warning** | The Windows security dialog shown when running an unsigned installer — dismissed with "More info → Run anyway"; the accepted tradeoff of the zero-cost constraint          | Security warning, Windows warning          |
| **ASAR**                | Electron's archive format that bundles app files (JS, assets) into a single file for distribution — native `.node` binaries cannot be loaded from inside it                | App bundle, archive                        |
| **asarUnpack**          | The electron-builder config that extracts native `.node` files outside the ASAR so Electron can load them at runtime                                                       | Unpack config, native exclusion            |
| **Server Bundle**       | The esbuild-compiled single-file output of the Express server (`server/dist/server.bundle.js`) — included inside the ASAR; `better-sqlite3` is marked external             | Server dist, server build output           |
| **appId**               | The reverse-domain identifier written to the Windows registry to uniquely identify the Desktop Build (`io.github.carlosrezai.horizon`)                                     | App name, bundle ID                        |
| **Versioned Release**   | A GitHub Release pairing a versioned NSIS Installer with changelog notes — the distribution unit for each meaningful Desktop Build update                                  | Release, version, update                   |
| **release/**            | The output directory for built installer artifacts — gitignored to prevent multi-GB files from being committed; installer filenames carry the semver version               | dist/, output/, build/                     |

## Relationships (Desktop Packaging additions)

- **electron-builder** produces the **NSIS Installer** from the compiled **Desktop Build**
- The **ASAR** contains the **Server Bundle** and all JS/asset files; native `.node` files are extracted alongside it via **asarUnpack**
- A **Versioned Release** is created manually: bump `package.json` version → run `npm run release` → attach the **NSIS Installer** from `release/` to a GitHub Release
- The **Server Bundle** marks `better-sqlite3` as external so the native `.node` file is loaded from the **asarUnpack** location at runtime
- **oneClick Install** is a property of the **NSIS Installer** — the **Desktop Build** always installs per-user, never per-machine
- The **SmartScreen Warning** appears because the **NSIS Installer** is unsigned — a deliberate consequence of the zero-cost constraint, documented in the README
- The **Loopback Bind** invariant applies in the packaged **Desktop Build** exactly as in development — the **Server Bundle** always binds to `127.0.0.1`

## In-App Auto-Update (new)

| Term                                | Definition                                                                                                                                                                            | Aliases to avoid                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **electron-updater**                | The npm package (part of electron-builder) that checks GitHub Releases for new versions, downloads the NSIS Installer, and triggers installation                                      | auto-updater, update library             |
| **Update Check**                    | The startup operation that queries the GitHub Releases API for a newer version — runs once per launch, fails silently on network error                                                | Version check, update poll               |
| **Update State**                    | The current phase of the update lifecycle — one of `idle`, `available`, or `ready`                                                                                                    | Update status, update phase              |
| **Auto-Download**                   | The user-configurable preference (default: ON) that controls whether a detected update is downloaded silently in the background — stored in **HorizonPreferences** via electron-store | Auto-update toggle, download preference  |
| **HorizonPreferences**              | The electron-store schema that persists user preferences across sessions — currently holds `autoDownload: boolean`                                                                    | Settings store, preferences file         |
| **Snackbar**                        | The reusable `components/Snackbar/` notification component — four variants (`info`, `success`, `warning`, `error`), optional action button, close button, fixed bottom-right corner   | Toast, banner, alert                     |
| **Update Banner**                   | The `features/updates/UpdateBanner` component that renders a **Snackbar** when **Update State** is `available` or `ready` — owned by `AppLayout`                                      | Update notification, update toast        |
| **Self-Signed Cert**                | A zero-cost code-signing certificate generated with PowerShell and imported into the developer's Windows Trusted Root store — bypasses SmartScreen on that machine permanently        | Code-signing cert, developer certificate |
| **GitHub Actions Release Workflow** | The `.github/workflows/release.yml` CI pipeline that builds the NSIS Installer on a Windows runner and publishes it to GitHub Releases — triggered by a **Version Tag**               | Release pipeline, CI release             |
| **Version Tag**                     | A `v*` git tag (e.g. `v0.2.0`) created by `npm version` that triggers the **GitHub Actions Release Workflow** — the atomic unit of a release                                          | Release tag, semver tag                  |

## Relationships (In-App Auto-Update additions)

- The **Update Check** runs once at startup via **electron-updater** — it reads **Auto-Download** from **HorizonPreferences** before starting
- When **Auto-Download** is ON: detected update → silent background download → **Update State** transitions to `ready` → **Update Banner** appears
- When **Auto-Download** is OFF: detected update → **Update State** transitions to `available` → **Update Banner** appears with a "Download" button
- The **Update Banner** is rendered by `AppLayout` via `useUpdateStatus` hook — visible across all pages
- The **Snackbar** is a reusable `components/` primitive — the **Update Banner** is one consumer; other features may use it for warnings and errors
- A **Version Tag** is always created by `npm version patch/minor/major` — never by hand-editing `package.json`
- The **GitHub Actions Release Workflow** uploads the **NSIS Installer** and a `latest.yml` manifest — **electron-updater** reads the manifest to detect new versions
- The **Self-Signed Cert** is a developer machine setup only — other machines still see the **SmartScreen Warning**
- **HorizonPreferences** is read by **Electron Main** before **electron-updater** starts — it is never read directly by the **Renderer**
- The **Preload Bridge** now exposes `window.horizon.updates` — listener registration for update events plus `quitAndInstall` and `downloadUpdate` invokes

## Example dialogue (In-App Auto-Update)

> **Dev:** "When does the Update Check happen — is it on a timer?"
>
> **Domain expert:** "No. Once, at startup, via electron-updater. The developer always knows when a release is out because they published it. A timer would be noise."
>
> **Dev:** "What if Auto-Download is off and an update is detected?"
>
> **Domain expert:** "The Update State goes to `available` and the Update Banner shows a 'Download' button. The user triggers the download explicitly. With Auto-Download on, the download happens silently and the banner only appears when the update is ready to install."
>
> **Dev:** "What does 'ready' mean exactly?"
>
> **Domain expert:** "electron-updater has finished downloading the new NSIS Installer. The Update Banner now shows 'Restart to update'. Clicking it calls quitAndInstall — the app quits, the installer runs silently, the new version launches."
>
> **Dev:** "Why is the Snackbar in `components/` but the Update Banner in `features/`?"
>
> **Domain expert:** "The Snackbar is a dumb UI atom — it knows nothing about updates, errors, or Electron. The Update Banner knows about Update State and the Preload Bridge. That business logic belongs in `features/updates/`. The Snackbar is just the visual shell."

## Flagged ambiguities

- **"balance"** is overloaded — always qualify: **Opening Balance**,
  **Current Balance**, or **Restschuld**. Never use "balance" alone in code or docs.
- **"plan"** was used informally during design to mean both the user's
  financial intentions and the Projection Engine output. In Horizon,
  **Plan** always means the set of MonthlySnapshots produced by the
  Projection Engine. There is no separate plan data store.
- **"outlook" vs "plan"** (new) — **Outlook** is the nav label visible to the user (sidebar, page title). **Plan** and **Plan Page** remain the internal code terms (`/plan` route, `PlanPage.tsx`, `PlanSummary`). Never rename the route or component to "Outlook" — the distinction between user-facing label and code identifier is intentional.
- **"payment"** is ambiguous — it could mean the monthly Darlehen, a
  Sondertilgung, or a CreditCard settlement. Always use the specific term.
- **"savings"** — avoid. Use **Tagesgeld** (the account kind) or
  **Sondertilgung reserve** (its purpose) instead.
- **"AccountType"** — rejected in favour of **AccountKind** (DDD convention
  to avoid collision with framework-level type concepts).
- **"Transfer"** is now two distinct concepts — always qualify: **One-off Transfer**
  (two Transactions sharing a TransferId, recorded directly) vs **Recurring Transfer**
  (a RecurringTransaction with a linkedAccountId, applied by the Projection Engine).
  Never use "Transfer" alone when the distinction matters.
- **"actual transaction"** is ambiguous — in general usage it means any recorded transaction.
  In the **Recurring-Only Projection Model** it means specifically **Variable Spending**:
  the irregular one-off entries for food, dental, shopping. Never use "actual transaction"
  to describe salary or transfers — those are **RecurringTransactions** only.
- **"current balance"** — never compute as Opening Balance + Transactions alone. In the
  Recurring-Only Projection Model the correct derivation is Opening Balance + Recurring
  History + Variable Spending. Using Transactions alone silently omits all recurring flows.
- **"driver"** (new) — overloaded in software (DB driver, framework driver, hardware driver).
  Always qualify as **Storage Driver** when referring to a Mongo or SQLite implementation
  of the Storage facade.
- **"build"** (new) — overloaded (compile output, CI build, deployment target). When the
  meaning is "which shape of Horizon is running", use **Build Target**, **Cloud Build**, or
  **Desktop Build** — never just "build".
- **"user"** (new) — in the Cloud Build, the only authenticated identity is the **Owner**;
  Horizon is single-tenant, so "user" should be reserved for UI/UX language ("the user
  clicks…"). Never use "user" to imply multi-tenant data ownership in the data layer.
- **"production"** (new) — historically used to mean "the deployed instance with real data".
  Prefer **Cloud Build** when the contrast is with the Desktop Build, and reserve "production"
  for environment-vs-development distinctions (production vs staging).
- **"backup"** (new) — overloaded (file copy, OS-level snapshot, online backup). Always
  qualify as **Online Backup** when referring to the `Storage.backup(destPath)` mechanism
  using better-sqlite3's `db.backup` API. A plain file copy of `horizon.db` is **not** an
  Online Backup — it misses `.db-wal`/`.db-shm` and risks a torn snapshot.
- **"checkpoint"** (new) — in SQLite specifically, the operation that folds the WAL back
  into the main database file. Always qualify as **WAL Checkpoint** to disambiguate from
  generic "save point" or "checkpoint" usage in other domains.
- **"pragma"** (new) — SQLite has both schema-affecting pragmas (`user_version`, used by
  migrations) and connection-state pragmas (`journal_mode`, `synchronous`, `busy_timeout`).
  Always qualify as **Connection Pragma** when discussing per-connection tuning, to keep
  the boundary between connection state and schema state explicit.
- **"main"** (new) — overloaded (the `main` git branch, `package.json` `main` field,
  the C `main()` function). When discussing the Desktop Shell, always use **Electron Main**
  for the privileged Node process that owns app lifecycle and the Server Handle.
- **"renderer"** (new) — overloaded (React renderer, server-side renderer). In the
  Desktop Shell context, **Renderer** is the sandboxed Chromium process that runs the
  React app. Never use "renderer" alone in code discussions that span both meanings.
- **"child process"** (new) — generic Node term. In the Desktop Build, prefer
  **Server Handle** for the Electron-managed wrapper, and **utilityProcess** for the
  Electron API itself. Never use raw `child_process.fork`/`spawn` for the Express server —
  the architectural decision in design log 10 is `utilityProcess.fork()`.
- **"port"** (new) — in the Desktop Build the server's port is **always ephemeral**
  (`PORT=0`); never assume `3001` or any fixed number. The authoritative port flows from
  the server through the **Ready Handshake** and reaches the **Renderer** via
  **API Base URL Injection**.
- **"IPC"** (updated) — overloaded (Electron's renderer IPC, OS-level IPC, the parent-port
  channel between Electron Main and a utilityProcess). In the Desktop Shell, the Server Handle
  IPC consists of the **Ready Handshake**, **Shutdown Handshake**, and **Fatal Message** on
  the parent port. The **Renderer** additionally communicates with **Electron Main** through
  the **Preload Bridge** — `window.horizon.updates` exposes update event listeners and
  `quitAndInstall`/`downloadUpdate` invokes. The Renderer still never talks to SQLite directly.
