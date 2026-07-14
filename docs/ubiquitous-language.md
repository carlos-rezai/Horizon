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

| Term                                | Definition                                                                                                                                                                                                                                        | Aliases to avoid                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| **Projection Engine**               | The system that calculates forward balances from RecurringTransactions and current account balances — default horizon is 20 years (240 months)                                                                                                    | Forecast engine, planner             |
| **Recurring-Only Projection Model** | The design constraint that recurring transactions own all regular financial flows; actual transactions exist only for variable one-off spending (new)                                                                                             | —                                    |
| **Recurring History**               | The set of recurring transactions that have already fired between an account's Opening Date and today — replayed by the engine to derive the correct starting balance (new)                                                                       | Past recurring, historical recurring |
| **Replay Loop**                     | The engine phase that simulates Recurring History from each account's Opening Date up to (but not including) the current month, using the same firing logic as the Forward Projection (new)                                                       | Historical replay, backfill          |
| **Forward Projection**              | The engine phase that applies recurring transactions from the current month into the future — runs after the Replay Loop has established the correct starting balance (new)                                                                       | Projection loop, forecast            |
| **monthOfYear**                     | The calendar month number (1–12) stored on a RecurringTransaction that anchors when annual or quarterly transactions fire — e.g. `monthOfYear: 10` fires in October every year (new)                                                              | Month anchor, firing month           |
| **Variable Spending**               | Irregular, one-off actual transactions that record real expenditure (food, dental, shopping, cat food) — the only category of actual transaction in the Recurring-Only Projection Model; entered exclusively via the **Month Overview** (updated) | One-off spending, irregular expenses |
| **MonthlySnapshot**                 | The projected state of all account balances for a given future month                                                                                                                                                                              | Projection row, forecast entry       |
| **TrajectoryDataPoint** (new)       | A chart-ready data shape derived from a MonthlySnapshot — includes totalLiquid, restschuld, netCashflow, isSTMonth, isPayoffMonth                                                                                                                 | Chart point, data point              |
| **Plan**                            | The full set of MonthlySnapshots produced by the Projection Engine — there is no separate plan data store                                                                                                                                         | Financial plan, budget plan          |
| **Actual**                          | The real account balance derived from recorded Transactions                                                                                                                                                                                       | Real balance                         |
| **Variance**                        | The difference between a projected balance and the actual balance for a given account and month                                                                                                                                                   | Delta, difference                    |
| **Payoff Month**                    | The first projected month in which a Mortgage account's balance reaches zero                                                                                                                                                                      | Payoff date, payoff year             |
| **Payoff Year** (new)               | The calendar year that contains the Payoff Month                                                                                                                                                                                                  | Payoff year, final year              |
| **ST Month** (new)                  | A projected month in which an annual Sondertilgung Recurring Transfer fires — detected from RecurringTransaction shape, not hardcoded                                                                                                             | ST date, October payment             |
| **Estimated Completion Month**      | The first projected month in which a Milestone's target balance is reached                                                                                                                                                                        | Target date, goal date               |

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
| **Sidebar Clock** (new)        | The live date and time widget rendered in the sidebar, always visible across all pages — displays HH:MM (24-hour) and the current weekday and date            | Dashboard clock, clock widget    |

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
- **Account Color Identity** is expressed across: account avatar (AccountOverview), tab underline/text (Month Overview Account Tabs), chart line color (Trajectory Horizon), and **Chip** in the **Balance Summary Bar** — the same color is used in all four surfaces
- When **Account Color** is `null`, all surfaces fall back to the **Per-kind Color Map** entry for that account's **AccountKind**
- A **Chip** in the **Balance Summary Bar** is always paired with the account name directly to its right — it is never used as a standalone element without a label nearby
- **Chip** is a domain-agnostic primitive — it knows nothing about accounts or AccountKind; callers supply the resolved hex color including any fallback logic
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
- The **Sidebar Clock** is rendered in the **Sidebar** between the spacer and the Settings nav link — it is always visible across all pages
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

| Term                             | Definition                                                                                                                                                                 | Aliases to avoid                |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **Meridian**                     | The custom design system for Horizon — defines visual tokens, primitives, and components                                                                                   | "the design system", "theme"    |
| **Stitch** (new)                 | The Google design reference (`src/assets/DESIGN.md`) used as the visual target for the UI redesign — defines the MD3 color token set, dual-font system, and shape language | Reference design, Google design |
| **MD3 Tokens** (new)             | The Material Design 3 color token set adopted wholesale from the Stitch reference — replaces the original Meridian color names                                             | Material tokens, design tokens  |
| **Tonal Layering** (new)         | The elevation model that uses progressively lighter surface tints (not shadows) to convey depth — Level 0 base, Level 1 cards, Level 2 modals                              | Shadow elevation, drop shadows  |
| **Sidebar** (new)                | The fixed 220px left-side navigation shell that replaced the top bar in the UI redesign — contains the wordmark, Dashboard, Outlook, and Settings links                    | Nav bar, side nav, top bar      |
| **Per-kind Color Map** (new)     | A `Record<AccountKind, string>` defined in tokens that maps each account kind to a deterministic chart line color — ensures the same kind always renders the same color    | Color palette, chart colors     |
| **Account Icon** (new)           | A lucide-react icon name string chosen by the user at account creation from the curated icon set — stored as `TEXT` in the database, nullable                              | Account image, account avatar   |
| **Account Color** (new)          | A hex color string chosen by the user at account creation from the curated palette — stored as `TEXT` in the database, nullable; random default pre-filled in the modal    | Account tint, account theme     |
| **Account Color Palette** (new)  | The curated set of 20 MD3-derived hex values available for **Account Color** selection — chosen to be visually distinct on dark surfaces                                   | Color picker, color wheel       |
| **Account Icon Set** (new)       | The curated set of 8 lucide-react icon names available for **Account Icon** selection (Wallet, Home, PiggyBank, TrendingUp, CreditCard, Landmark, Building2, Banknote)     | Icon library, icon picker       |
| **Chip** (new)                   | A pill-shaped, text-free color indicator primitive in `src/primitives/Chip/` — takes an explicit `color` hex prop and a `size` (sm\|md) prop; domain-agnostic              | Badge, dot, swatch, color badge |
| **Account Color Identity** (new) | The design principle that an account's **Account Color** is applied consistently across every UI surface where that account appears — charts, tabs, balance bars           | Color theme, account theming    |

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

## Monthly Ledger (new)

| Term                     | Definition                                                                                                                                                                              | Aliases to avoid                           |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Monthly Ledger**       | The feature set that introduces the Month Overview page and restructures transaction entry so one-off spending is recorded per month rather than per account                            | Month view, monthly transactions           |
| **Month Overview**       | The page at `/months/YYYY-MM` that displays the balance summary, recurring commitments, and editable one-off transactions for a given month across all accounts                         | Month page, monthly page                   |
| **Month Card**           | The dashboard widget that always shows the current month — displays month name, total one-off transaction amount, count, and a stacked category bar                                     | Month teaser, month widget                 |
| **Category Bar**         | The stacked horizontal bar on the Month Card that breaks down one-off transaction totals by Category — uses the same per-kind color palette as other chart elements                     | Spending bar, category chart               |
| **Recurring This Month** | The read-only section in the Month Overview that shows the selected account's RecurringTransactions for that month — visual reference only, never editable from here                    | Recurring section, standing orders section |
| **Account Tabs**         | The tab row in the Month Overview that selects which account's transactions are displayed — one tab per account, defaults to the first                                                  | Account selector, account switcher         |
| **Balance Summary Bar**  | The row above the Account Tabs in the Month Overview that shows the projected or actual balance for each account for that month — mirrors the data in the Projection Accordion row      | Account balance row, balance header        |
| **DatePicker**           | The reusable `primitives/DatePicker/` component that replaces all `type="date"` inputs — displays in DD.MM.YYYY format, stores an ISO date string internally, opens a calendar on click | Date input, date field                     |
| **Stepper**              | The `− / number / +` input primitive used for the `dayOfMonth` field in RecurringTransactionModal — constrained to 1–31                                                                 | Day picker, number stepper                 |
| **Ordinal Day**          | The formatted display of `dayOfMonth` in RecurringTransactionList — rendered as 1st, 2nd, 15th, 22nd instead of a bare integer                                                          | Day number, day of month                   |
| **Account Edit Mode**    | The state of AccountCreateModal when an existing `AccountWithBalance` is passed as a prop — fields are pre-populated and submit issues a PATCH instead of a POST                        | Edit account modal, account update         |

## Relationships (Monthly Ledger additions)

- A **Month Overview** is always scoped to one ISO month (`YYYY-MM`) and displays data for all accounts via **Account Tabs**
- The **Balance Summary Bar** in the **Month Overview** derives its values from the **MonthlySnapshot** for that month — same source as the **Projection Accordion**
- **Recurring This Month** shows the selected account's **RecurringTransactions** — they are read-only in this context; editing is done from **AccountDetailPage**
- One-off transactions entered in the **Month Overview** are the only form of **Variable Spending** entry — the "Add transaction" and "Add transfer" flows no longer exist on **AccountDetailPage**
- A **Transfer** entered from the **Month Overview** uses the optional linked account picker inside **TransactionCreateModal** — `TransferCreateModal` is removed
- The **Month Card** on the dashboard always shows the current calendar month and navigates to the **Month Overview** on click
- The month label cell in the **Projection Accordion** navigates to the **Month Overview** for that `YYYY-MM` on click
- The **Month Overview** supports prev/next month navigation via arrows in the page header — `navigate(-1)` for back
- The **DatePicker** primitive is used for every date input across the app — `openingDate` in **AccountCreateModal**, transaction date in **TransactionCreateModal** and **TransactionEditModal**, and the transaction date in **Month Overview**
- **Account Edit Mode** replaces the two separate inline edit flows (name, opening balance) in `AccountDetailHeader` — icon and color become editable for the first time via the shared modal
- The **Ordinal Day** is produced by a `toOrdinal(n)` utility in `src/utils/format/` — used by `RecurringTransactionList` for display

## Example dialogue (Monthly Ledger)

> **Dev:** "If I want to record that I spent €80 on groceries on the 14th, where do I go?"
>
> **Domain expert:** "The Month Overview for the current month. You pick the account tab, hit Add Transaction, enter the date, amount, and category. That's it — you can't do this from Account Detail anymore."
>
> **Dev:** "What if it was a transfer — moving money between two accounts?"
>
> **Domain expert:** "Same modal. There's an optional linked account picker. Leave it blank and it's a one-off transaction. Select a destination account and it becomes a Transfer — two linked Transactions sharing a TransferId. TransferCreateModal is gone."
>
> **Dev:** "On the Month Overview I can see my recurring transactions too — can I edit them there?"
>
> **Domain expert:** "No. The Recurring This Month section is read-only. It's there as a reference — you can see what's committed for the month. To change a RecurringTransaction you go to Account Detail."
>
> **Dev:** "The Month Card on the dashboard — does it update as I add transactions?"
>
> **Domain expert:** "Yes. The total and the Category Bar reflect the one-off transactions recorded for the current month. Add a grocery transaction and the food slice grows."

## Credit Card Auto-Settlement (new)

| Term                           | Definition                                                                                                                                                                        | Aliases to avoid                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Auto-Settlement**            | The mechanism that automatically creates a Settlement Transfer on `settlementDay` of month M+1, zeroing out a CreditCard account's month M closing balance                        | Auto-pay, direct debit, CC settlement  |
| **Settlement Day**             | The day of the month (1–28) stored on a CreditCard account on which the Settlement Transfer fires in the following month — capped at 28 so it is valid in every calendar month    | Payment day, due date, billing date    |
| **Settlement Transfer**        | The read-only Transfer pair created by Auto-Settlement — a debit on the Funding Account and a credit on the CreditCard, labelled "Auto-settlement" in the Monthly Ledger          | Auto-transfer, CC payment transfer     |
| **Funding Account**            | The Girokonto account linked to a CreditCard for Auto-Settlement — the source of funds for each Settlement Transfer; only Girokonto accounts are eligible                         | Parent account, linked account, source |
| **Linked Since**               | The ISO date stored on a CreditCard account marking when Auto-Settlement tracking begins — the Replay Loop only generates Settlement Transfers from this date forward             | Link date, settlement start date       |
| **Billing Cycle**              | The calendar month M whose closing CreditCard balance is settled on `settlementDay` of month M+1 — mirrors real credit card direct debit timing                                   | Statement period, payment cycle        |
| **Insufficient Funds Warning** | The error-variant Snackbar shown on app open when the Funding Account's projected balance on Settlement Day is less than the upcoming settlement amount — persists until resolved | Low balance warning, coverage alert    |

## Relationships (Credit Card Auto-Settlement additions)

- A **CreditCard** account may have exactly one **Funding Account** (`linkedAccountId`), one **Settlement Day**, and one **Linked Since** date — all three must be set together; partial configuration is not valid
- **Auto-Settlement** only fires when the CreditCard's closing balance for month M is negative (i.e., there is debt) — a zero or positive balance produces no **Settlement Transfer**
- A **Settlement Transfer** is a standard Transfer pair sharing a `transferId` — it is distinguished by a reserved description prefix and rendered read-only in the **Monthly Ledger**
- The **Replay Loop** generates **Settlement Transfers** for all months from **Linked Since** forward, using the same month-by-month pass as all other RecurringTransactions
- The **Forward Projection** applies the same settlement logic as the **Replay Loop** — no separate code path
- **Linked Since** is set automatically: to `openingDate` when a new CreditCard is created with a Funding Account configured; to today when an existing CreditCard is linked or its settlement config is changed
- Removing the **Funding Account** link stops future **Settlement Transfers** but leaves all existing ones intact as permanent history
- Changing the **Settlement Day** or **Funding Account** resets **Linked Since** to today — past settlements are preserved as-is
- The **Insufficient Funds Warning** compares the **Funding Account**'s projected balance on the **Settlement Day** of next month against the CreditCard's projected closing balance for the current month

## Example dialogue (Credit Card Auto-Settlement)

> **Dev:** "When does the Settlement Transfer actually get created?"
>
> **Domain expert:** "The Replay Loop creates it. When processing month M+1, the engine checks each CreditCard that has a Funding Account configured and a Linked Since date on or before the end of month M. If the CreditCard had a negative closing balance in month M, it creates a Settlement Transfer on Settlement Day of month M+1."
>
> **Dev:** "So if the user just linked their CC today, does it settle last month retroactively?"
>
> **Domain expert:** "No. Linked Since is set to today, so the Replay Loop only generates settlements from this month's billing cycle onward. Past months are untouched."
>
> **Dev:** "What if I change the Settlement Day from 17 to 20 next year?"
>
> **Domain expert:** "Linked Since resets to today. The Replay Loop preserves all existing Settlement Transfers as permanent history and uses day 20 going forward. You can't retroactively move them."
>
> **Dev:** "Is the Settlement Transfer editable in the Monthly Ledger?"
>
> **Domain expert:** "No. It's read-only, labelled 'Auto-settlement', and visually distinct. You can't change the amount or delete it directly — the only way to stop future ones is to unlink the Funding Account on the CreditCard."
>
> **Dev:** "What about the Insufficient Funds Warning — when does it clear?"
>
> **Domain expert:** "As soon as the Funding Account's projected balance on Settlement Day is enough to cover the upcoming settlement amount. If the user's salary lands before day 17, the projected balance accounts for that and the warning disappears."

## Claude Design Handover — Design System (new)

| Term                          | Definition                                                                                                                                                                                | Aliases to avoid                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **Claude Design Handover**    | The full visual rebuild of Horizon from the canonical `docs/handoff/` prototype — token re-palette, new primitives/components, reskinned screens, and the Import UI shell                 | Redesign 2, Stitch v2, reskin     |
| **Prototype**                 | The runnable design artifact under `docs/handoff/` — the single source of truth for visual and interaction spec; it is mock end-to-end and is translated, never redesigned                | Mockup, reference app, demo       |
| **Horizon Gold**              | The single signature accent `#E6B559` — held by the `primary` token role; used for Payoff, Freedom Phase, and primary actions; the only brand hue                                         | Yellow, amber, accent color       |
| **Ink Surface Ladder**        | The tonal-elevation surfaces — the existing MD3 `surfaceContainerLowest`–`surfaceContainerHighest` ladder re-paletted to the prototype's `ink0`–`ink5`, depth by tint not shadow          | Surface levels, grays, elevation  |
| **Money** (primitive)         | The `primitives/Money` atom — renders a cents integer as de-DE € in tabular IBM Plex Mono with optional sign-colouring; the canonical way to display any monetary value                   | Currency text, formatBalance span |
| **Delta** (primitive)         | The `primitives/Delta` atom — a ▲/▼ percentage pill coloured pos/neg; used for KPI trend indicators                                                                                       | Trend pill, percent badge         |
| **Avatar** (primitive)        | The `primitives/Avatar` atom — an account-kind icon tinted in the account's colour                                                                                                        | Account icon, account image       |
| **DataRow** (component)       | The `components/DataRow` grid table row with hover and `minmax(0,…)` columns — the shared row used in every list                                                                          | Table row, list item, ListRow     |
| **StatBlock / SectionHead**   | Layout components — `StatBlock` is a label + figure stat; `SectionHead` is an in-card label/title header with optional right slot                                                         | Stat card, header                 |
| **Tabs** (component)          | The `components/Tabs` underline tab row with optional count and colour dot per tab — used for account tabs and import account filters                                                     | Tab bar, segmented control        |
| **Notify**                    | The global `notify({ variant, action })` call exposed by the **Snackbar Provider** — the single app-wide way to raise a **Snackbar** (info/success/warning/error)                         | Toast, alert, flash message       |
| **Snackbar Provider**         | The `AppLayout`-owned context that queues and renders **Snackbars** and exposes **Notify** — replaces the per-consumer ad-hoc Snackbar rendering                                          | Toast manager, snackbar host      |
| **Capture-and-Recreate Undo** | The Undo mechanism where a delete **Notify** holds the deleted entity's payload and re-creates it on Undo — used for Transaction, One-off Transfer, and RecurringTransaction deletes only | Soft-delete, restore, trash       |
| **Total Liquid Line**         | The gold "SUM" series on the **Trajectory Horizon** — Total Liquid plotted as a hero line; **default hidden** (its value lives in the tooltip)                                            | Sum line, liquid total line       |
| **Trajectory Legend**         | The custom interactive legend on the **Trajectory Horizon** — toggle chips that show/hide each series; hidden series drop from the Y-axis domain (auto-rescale)                           | Chart legend, series toggles      |
| **Isolate** (Solo)            | The Trajectory Legend gesture (double-click a chip) that hides all series except the chosen one; "Show all" resets visibility                                                             | Solo, focus, filter               |
| **Show in Trajectory**        | The per-Account boolean (`showInTrajectory`, default true, not applicable to Mortgage) that sets a line's **default** visibility on the **Trajectory Horizon**                            | Chart visibility, plot toggle     |
| **Freedom Phase Area**        | The shaded gold region + gradient under the **Total Liquid Line** spanning the **Freedom Phase** (Payoff Month → horizon end) — the visual of post-payoff acceleration                    | Shaded region, freedom fill       |
| **Post-Payoff**               | The code-level name for the **Freedom Phase** condition on a data point (renamed from the prototype's internal `freedom`/`freedomNow`)                                                    | freedom, freedomNow               |
| **TODAY Marker**              | The vertical dashed reference line on the **Trajectory Horizon** at the current month, labelled "TODAY"                                                                                   | Now line, current marker          |
| **Mortgage Origination**      | The originating facts of a Mortgage captured for accuracy: **Original Principal**, **Mortgage Start Date**, and **Term** — edited via the **Mortgage Modal**                              | Loan setup, origination details   |
| **Original Principal**        | The Mortgage's loan amount at origination (`originalPrincipal`, ≥ current Restschuld) — the denominator "% paid off" is measured against, so pre-Horizon payments count                   | Loan amount, starting debt        |
| **Mortgage Start Date**       | The calendar date the Mortgage originated (`startDate`) — distinct from the Account's Opening Date in Horizon                                                                             | Loan start, origination date      |
| **Term**                      | The Mortgage's full duration in years (`termYears`) — used to show "year X of N" in the Mortgage Countdown                                                                                | Laufzeit, duration                |
| **Mortgage Modal**            | The edit modal on the Mortgage Countdown card for **Mortgage Origination** — shows a live "% paid off" preview                                                                            | Mortgage edit, origination modal  |
| **Account Sort Order**        | The user-arranged display order of accounts (`sortOrder`), set by drag-to-reorder on the dashboard Accounts card and persisted in the DB                                                  | Account order, ranking            |
| **Category Color**            | The nullable hex `color` on a Category, auto-seeded from the **Account Color Palette** on insert (per-name fallback) — drives the **Breakdown Donut** and category Badges                 | Category tint, tag color          |
| **Breakdown Donut**           | The Month Overview donut that splits the month's Variable Spending by Category, coloured by **Category Color** — supersedes the standalone "Monthly Spending Breakdown Chart"             | Spending donut, category chart    |
| **Year Comparison**           | The Month Overview "Planned" placeholder card for future year-over-year (YoY) category spending — rendered as honest empty, never with fabricated numbers                                 | YoY card, comparison chart        |

## CSV / Bank Statement Import (new)

| Term                               | Definition                                                                                                                                                                                                         | Aliases to avoid                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| **Import**                         | The feature (sidebar nav + `features/import`) for bringing bank statements into Horizon — the **UI** ships with the Handover; the parsing/detection engine is a deferred backend epic                              | Upload, sync, ingest                      |
| **Statement**                      | A single imported bank CSV file, recorded in **Import History** with its account, bank, date range, and transaction count                                                                                          | Bank file, CSV, export                    |
| **Import Wizard**                  | The 3-step modal flow: **Account & file → Map columns → Review & categorize** — the only path to create an Import                                                                                                  | Import flow, upload wizard                |
| **Column Mapping**                 | The mapping from a bank CSV's columns to Horizon's Date / Description / Amount fields, set in the wizard's Map-columns step                                                                                        | Field mapping, schema map                 |
| **Bank Preset** (updated)          | A per-bank remembered **Column Mapping** (+ delimiter/decimal/date) re-applied automatically when a Statement from that bank is imported again — **persisted in the `import_presets` DB table**, not client memory | Bank profile, saved mapping               |
| **Duplicate Detection** (updated)  | The **server-side** heuristic (run during **Import Preview Request**) that flags an imported row as a high-precision duplicate of an existing Transaction — flagged rows are **pre-unchecked**                     | Dedup, duplicate check                    |
| **Recurring Detection** (updated)  | The **server-side** heuristic (run during **Import Preview Request**) that flags an imported row as matching a known RecurringTransaction — flagged rows are **pre-unchecked** to avoid double-counting            | Recurring match, standing-order detection |
| **Imported Transaction** (updated) | A row confirmed in the wizard's Review step — committed as **Variable Spending** on the chosen account with its `import_id` set to its **Import Record**                                                           | Import row, parsed transaction            |
| **Import History** (updated)       | The year-grouped accordion of past **Statements** (**Import Records**) on the Import page; the real per-file actions are **Preview** and **Delete** (Re-download dropped, Re-categorize deferred)                  | Import list, upload history               |
| **Import Preview**                 | The read-only modal showing the transactions of an already-imported **Statement**                                                                                                                                  | File preview, statement view              |

## Relationships (Claude Design Handover additions)

- The **Prototype** is the single source of truth — every fabricated figure in it is wired to real **Projection Engine** / **Storage** data; the only sanctioned placeholder is the **Year Comparison** card
- **Money** is the only sanctioned way to render a monetary value in the UI — raw `formatBalance` text spans are replaced by it
- **Notify** is the only way to raise a **Snackbar** — the **Snackbar Provider** owns rendering; features never mount their own Snackbar
- **Capture-and-Recreate Undo** is offered for Transaction, One-off Transfer, and RecurringTransaction deletes only — account deletion shows a plain confirmation with no Undo
- An **Account** has exactly one **Show in Trajectory** flag (except **Mortgage**, where it does not apply) and exactly one **Account Sort Order**
- The **Total Liquid Line** defaults hidden; each account line defaults to its **Show in Trajectory** flag; **Restschuld** defaults visible and terminates at the **Payoff Month**
- The **Freedom Phase Area** spans the **Freedom Phase** — Payoff Month to the end of the 240-month horizon — under the **Total Liquid Line**
- A **Mortgage** Account has exactly one **Mortgage Origination** (**Original Principal**, **Mortgage Start Date**, **Term**); **Original Principal** ≥ current **Restschuld**
- A **Category** has at most one **Category Color**, auto-seeded from the **Account Color Palette**; the **Breakdown Donut** and category **Badges** read it
- An **Import** produces one **Statement** per file; a **Statement** produces zero or more **Imported Transactions**, each recorded as **Variable Spending**
- A **Bank Preset** is keyed by bank and holds one **Column Mapping** — re-applied on the next **Statement** from that bank
- **Duplicate Detection** and **Recurring Detection** only pre-uncheck rows in the **Import Wizard** — they never delete or merge anything

## Example dialogue (Claude Design Handover)

> **Dev:** "The dashboard KPI shows Total Liquid `▲6.8%`. Where does that delta come from now?"
>
> **Domain expert:** "Not from the prototype's hardcoded number — that was mock. The **Delta** is the projected 12-month change from the **Projection Engine**: Total Liquid now vs the snapshot twelve months out. Every figure traces to real engine output."
>
> **Dev:** "On the Trajectory Horizon, the gold line isn't showing by default."
>
> **Domain expert:** "Correct — the **Total Liquid Line** is the SUM series and it defaults hidden; its value lives in the tooltip. Each account line follows its **Show in Trajectory** flag, and Restschuld shows by default and stops at the **Payoff Month**. Toggle any of them from the **Trajectory Legend**; double-click to **Isolate** one."
>
> **Dev:** "Why does the Mortgage Countdown say 38% paid off when the account was added last month?"
>
> **Domain expert:** "Because **% paid off** is measured against **Original Principal**, not the Opening Balance. The **Mortgage Origination** captures the loan amount and **Mortgage Start Date** at origination, so payments made before Horizon existed are reflected — never a false 0%."
>
> **Dev:** "I imported a Sparkasse CSV and my salary row was unchecked."
>
> **Domain expert:** "**Recurring Detection** flagged it — Horizon already models salary as a RecurringTransaction, so importing it would double-count. It's pre-unchecked. Same with **Duplicate Detection**. Everything you do confirm becomes an **Imported Transaction** in **Variable Spending**, and the CSV is recorded as a **Statement** in **Import History**."

## Bank Statement Import — Backend (new)

| Term                       | Definition                                                                                                                                                                                      | Aliases to avoid                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Import Record**          | The persisted `imports` table row for one imported **Statement** — account, bank, filename, date range, row count, imported-on, size; the durable backing of an **Import History** entry        | Import row, history entry, statement row |
| **Import Preview Request** | `POST /imports/preview` — multipart upload (file bytes + accountId + optional mapping) that parses, auto-categorizes, and runs **Duplicate**/**Recurring Detection**; **writes nothing**        | Parse request, dry run                   |
| **Import Commit**          | `POST /imports` — the JSON request carrying the chosen rows that atomically inserts the **Import Record** + its **Imported Transactions** and upserts the **Bank Preset** in one DB transaction | Save import, finalize import             |
| **Stateless Preview**      | The rule that an **Import Preview Request** holds **no server session** — the **Import Commit** re-sends the reviewed rows and the server re-validates them; the raw file is never persisted    | —                                        |
| **Import Cascade Delete**  | `DELETE /imports/:id` — deletes an **Import Record** and the **Imported Transactions** carrying its `import_id`, implemented in the repo use-case method (not SQL `ON DELETE CASCADE`)          | Cascade, bulk delete                     |
| **Charset Detection**      | The server step that sniffs a statement's encoding (BOM → UTF-8, else **Windows-1252**) and decodes the raw bytes via `TextDecoder` before parsing — owned by the server, never the Renderer    | Encoding sniff, decode                   |
| **Header Signature**       | The set of column names on a **Bank Preset** that identifies the real header row inside a CSV — the parser skips the metadata **preamble** by scanning down to it                               | Header match, column fingerprint         |
| **Preamble**               | The bank-specific metadata lines (IBAN, period, opening balance) that precede the real header row in some exports — discarded by matching the **Header Signature**                              | Header junk, metadata rows               |
| **Auto-Categorization**    | The server keyword→category rule map that assigns each parsed row one of the eight default Categories (`Miscellaneous` fallback); overridable per-row in the wizard                             | Auto-tag, category guess                 |
| **csvImport module**       | The pure, fully-tested `server/src/lib/csvImport/` engine — **Charset Detection**, bank detection, parse, cents/ISO conversion, **Auto-Categorization**, duplicate/recurring detection          | Parser, import engine                    |

## Relationships (Bank Statement Import — Backend additions)

- An **Import Record** belongs to exactly one **Account** and groups zero or more **Imported Transactions** via their `import_id`; a hand-entered **Variable Spending** transaction has `import_id` NULL
- An **Import Commit** is atomic — the **Import Record**, all its **Imported Transactions**, and the **Bank Preset** upsert succeed or fail together (one better-sqlite3 transaction), the same all-or-nothing guarantee as `transfers.create`
- **Bank detection** matches the parsed **Header Signature** against the shipped **Bank Presets** — it is driven by the file's columns, never by which **Account** the import targets
- **Charset Detection**, **Header Signature** matching, **Auto-Categorization**, and both detections all run inside the **csvImport module** during the **Import Preview Request** — the **Renderer** only renders the returned rows
- An **Imported Transaction** always keeps its real sign — an included positive credit becomes a positive **Variable Spending** transaction
- **Import Cascade Delete** is the only path that removes imported rows in bulk; **Duplicate** and **Recurring Detection** never delete or merge — they only pre-uncheck in the wizard
- The whole flow is **offline and on-device**: the Express server is the local `utilityProcess` child on **127.0.0.1** (**Loopback Bind**); the CSV never leaves the machine

## Example dialogue (Bank Statement Import — Backend)

> **Dev:** "When I drop a DKB CSV, where does the parsing actually happen — in the browser?"
>
> **Domain expert:** "No. The Renderer uploads the raw bytes to the local Express child over loopback. The **csvImport module** does **Charset Detection** — DKB exports are Windows-1252, so decoding in the browser would mangle the umlauts. That's the whole reason it's a multipart upload and server-side."
>
> **Dev:** "The first few lines of the file are account info, not transactions. How does it skip them?"
>
> **Domain expert:** "The **Bank Preset** carries a **Header Signature** — the column names that mark the real header row. The parser scans past the **Preamble** until it matches, then parses from there."
>
> **Dev:** "I reviewed the rows but haven't confirmed yet. Is the server holding my parse somewhere?"
>
> **Domain expert:** "No — it's a **Stateless Preview**. The **Import Preview Request** writes nothing and keeps no session. When you confirm, the **Import Commit** sends the rows you kept back to the server, which re-validates them and inserts the **Import Record** and **Imported Transactions** in one transaction."
>
> **Dev:** "If I delete that import later, what happens to the transactions?"
>
> **Domain expert:** "**Import Cascade Delete** removes the **Import Record** and every **Imported Transaction** carrying its `import_id`. Your hand-entered **Variable Spending** is untouched — those rows have a NULL `import_id`."
>
> **Dev:** "And re-importing the same file next month?"
>
> **Domain expert:** "**Duplicate Detection** flags the overlap and pre-unchecks it, and **Recurring Detection** pre-unchecks your salary and rent so you don't double-count what the Projection Engine already models. Nothing is dropped silently — you decide."

## Real Bank CSV Import (new)

| Term                          | Definition                                                                                                                                                                                                                                                                           | Aliases to avoid                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| **Verified Preset**           | A **Bank Preset** built from a real, owner-supplied export with a data-row fixture behind it — the four real formats (**Sparkasse**, **Postbank giro**, **Postbank CC**, **Renault**) that replace the retired guessed Sparkasse / DKB / ING presets                                 | Real preset, confirmed preset     |
| **Header De-duplication**     | The parse-time rule that renames repeated header names — the _n_-th occurrence of a name `X` (n ≥ 2) becomes `X (n)` — so duplicate columns are individually addressable (Postbank CC's two `Betrag` → `Betrag`, `Betrag (2)`)                                                       | Column disambiguation, unique-ing |
| **Pending Row**               | An imported row a bank marks provisional (Sparkasse `Info` = `Umsatz vorgemerkt`) — flagged `pending` in the **Import Preview Request** and **pre-unchecked** in the wizard, because it re-books later and would otherwise duplicate                                                 | Vorgemerkt row, provisional entry |
| **Pending Column**            | The **Bank Preset** fields (`pendingColumn` + `pendingValues`) that name the status column and the cell values meaning provisional — only Sparkasse sets them; other presets have none                                                                                               | Status column, vorgemerkt column  |
| **Signature-Driven Encoding** | The refinement of **Charset Detection**: with no BOM, decode under **both** Windows-1252 and UTF-8 and keep whichever surfaces a known **Header Signature** — the signature match is the oracle for "decoded correctly" (fixes real-umlaut headers like `Begünstigter`, `Gläubiger`) | Encoding retry, charset fallback  |
| **Generic Fallback**          | The `Generic` (non-bank) path for a statement matching no **Verified Preset** — treats the first non-empty row as the header and keyword-matches columns; retained for unknown banks after **header-less** parsing was ruled out                                                     | Generic parse, unknown-bank path  |
| **Rejected Row**              | A parsed row that has a non-empty date but whose date/amount fails to convert — **surfaced** in the preview summary, never silently dropped (distinct from an empty-date row, which is skipped as a blank line or balance footer)                                                    | Bad row, dropped row, error row   |

## Relationships (Real Bank CSV Import additions)

- A **Verified Preset** is a **Bank Preset** whose `map`, `headerSignature`, decimal, dateFmt, delimiter, and quoting were confirmed against a real export; the retired **Sparkasse / DKB / ING** guessed presets are deleted
- **Header De-duplication** runs before mapping — a **Bank Preset**'s `map` and **Header Signature** reference the de-duplicated names; Postbank CC maps `amount → "Betrag (2)"` (the EUR column), never the foreign-currency `Betrag`
- Description is always a **single column** chosen per **Verified Preset** — counterparty for Sparkasse / Postbank giro; `Verwendungszweck` for Postbank CC (no counterparty); `Buchungstext` for **Renault** (its counterparty is empty on interest/tax postings)
- Amount is always the signed `Betrag` column — Postbank's separate `Soll` / `Haben` pair is ignored; card purchases are already negative, so no sign inversion
- 2-digit years expand as **`20YY`** always (Sparkasse `DD.MM.YY`); single-digit day/month are zero-padded (Postbank / Postbank CC `D.M.YYYY`); every format normalizes to an ISO date
- A row is **skipped** when its mapped date cell is empty (blank line / balance footer) and counted as a **Rejected Row** when it has a date but fails to parse — the `MAX_ROWS` / `MAX_COLUMNS` caps still reject the whole file past their limits
- The four **Header Signatures** are mutually exclusive, so bank detection order is irrelevant: Postbank CC (`Belegdatum`,`Eingangstag`,`Kurs`), Postbank giro (`Umsatzart`,`Soll`,`Haben`), Renault (`Bezeichnung Auftragskonto`,`Saldo nach Buchung`), Sparkasse (`Auftragskonto`,`Sammlerreferenz`,`Kategorie`)
- Migration `013` resets `import_presets` so the new **Verified Preset** defaults replace any remembered guessed-bank mapping

## Example dialogue (Real Bank CSV Import)

> **Dev:** "The Postbank credit-card file has two columns both called `Betrag`. Which one is the amount?"
>
> **Domain expert:** "The EUR one. **Header De-duplication** renames the second occurrence to `Betrag (2)`, and the **Verified Preset** maps `amount → Betrag (2)`. The first `Betrag` is the foreign-currency figure — we ignore it and `Kurs` too."
>
> **Dev:** "My Postbank export's header didn't match at first — `Begünstigter` looked like garbage."
>
> **Domain expert:** "That's **Signature-Driven Encoding**. No BOM, so the parser tries Windows-1252 and UTF-8 and keeps whichever makes the **Header Signature** appear. Sparkasse dodges it with ASCII spellings like `Beguenstigter`; Postbank and Renault use real umlauts, so the retry is what rescues them."
>
> **Dev:** "A Sparkasse row came in unchecked with no duplicate or recurring flag."
>
> **Domain expert:** "It was a **Pending Row** — its `Info` said `Umsatz vorgemerkt`. The **Pending Column** on the Sparkasse preset flags it and the wizard pre-unchecks it, because it re-books in a few days and importing it now would duplicate."
>
> **Dev:** "And the Renault Tagesgeld — its counterparty column is blank on the interest rows."
>
> **Domain expert:** "Right, so Renault's description is `Buchungstext`, not counterparty — `Kapitalertragsteuer`, `Abschluss`. Single column, just the one that's actually populated for a savings account. The other three banks keep counterparty."
>
> **Dev:** "What about a bank we don't have a preset for?"
>
> **Domain expert:** "The **Generic Fallback** — first row as header, keyword-matched columns. We looked at supporting truly header-less exports, but all four real banks ship a header, so that's a non-goal now."

## Month Year-Comparison (new)

| Term                       | Definition                                                                                                                                                                                | Aliases to avoid                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Year Comparison**        | The Month Overview right-column card that pairs this year's **YTD Variable Spending** against the prior year's, per **Category**, over the same Jan-through-**Viewed Month** window       | YoY, year-over-year, annual comparison |
| **YTD Variable Spending**  | The cumulative sum of a **Category**'s **Variable Spending** magnitude from January 1 through the **Viewed Month**, in cents — whole calendar months, never a day-of-month cutoff         | Year-to-date spend, running total      |
| **Viewed Month**           | The `YYYY-MM` currently selected in the Month Overview month navigator — anchors the **YTD Variable Spending** window's end; not necessarily today's real-world month                     | Current month, selected month          |
| **Year Comparison Report** | The `GET /reports/year-comparison?month=YYYY-MM` endpoint that aggregates per-**Category** `{ thisYear, lastYear }` magnitudes server-side and returns the top 5 by `thisYear`            | YoY endpoint, comparison API           |
| **thisYear / lastYear**    | The two per-**Category** cents magnitudes in a **Year Comparison Report** row — `thisYear` is the **Viewed Month**'s **YTD Variable Spending**; `lastYear` is the same window, prior year | currentYear/previousYear, ytd/priorYtd |

## Relationships (Month Year-Comparison additions)

- A **Year Comparison** card is always derived from the **Viewed Month** — stepping the month navigator recomputes it; it never pins to today's real-world month
- **YTD Variable Spending** spans whole calendar months from January through the **Viewed Month** inclusive — an in-progress month counts in full, both years, so the comparison is apples-to-apples at month granularity
- A **Year Comparison Report** ranks **Categories** by `thisYear` descending and returns at most five — a Category with heavy `lastYear` but ~zero `thisYear` correctly falls off the list
- **Year Comparison** is computed across all spending accounts (excludes **Mortgage** and **Investment**), independent of the Month Overview **Account Tabs** — it answers a portfolio-level question
- A **Year Comparison Report** row's magnitudes are absolute cents (like the Month Overview breakdown), so bars render regardless of expense sign; bar color is resolved client-side from the **Category** name, never sent in the payload
- When no **Variable Spending** exists in the window, the **Year Comparison** card shows an honest empty state; when only the prior year is empty (first year of use), it renders this-year bars with zero-length last-year bars and keeps both legend entries
- The **Year Comparison Report** is the first route under `/reports` — SQLite aggregation and the YTD/year-pairing math live in `server/src`; `src/` renders exactly what the endpoint returns

## Example dialogue (Month Year-Comparison)

> **Dev:** "When I step the Month Overview back to March 2024, does the Year Comparison card change?"
>
> **Domain expert:** "Yes — it's anchored to the **Viewed Month**, not today. It recomputes to **YTD Variable Spending** from Jan 1 through March 2024, against Jan–March 2023. The whole page describes the Viewed Month, so the card follows it."
>
> **Dev:** "It's June and we're halfway through the month — does June count fully or only up to today?"
>
> **Domain expert:** "Fully. **YTD Variable Spending** is whole calendar months, both years. Horizon is a manual monthly model — there's no live feed, so a day-of-month cutoff would just make the bars twitch every day for no signal."
>
> **Dev:** "Which categories get bars — the same five as the breakdown donut?"
>
> **Domain expert:** "Not necessarily. The **Year Comparison Report** ranks by `thisYear` across the whole YTD window and returns the top five. The donut is one month; this is the year so far. A category you spent on heavily last year but dropped this year just won't appear — that's correct."
>
> **Dev:** "Where does the per-category math run — in a hook?"
>
> **Domain expert:** "Server-side. `GET /reports/year-comparison?month=` does the aggregation and pairing and sends one small payload of `thisYear`/`lastYear` cents. The card just colors each bar from the category name and scales to the shared max. `src/` never touches SQLite."

## Category Management (new)

| Term                      | Definition                                                                                                                                                                                 | Aliases to avoid                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| **Category Management**   | The feature giving the user control over the Category set — add/rename/recolor/delete **Custom Categories**, recolor/hide **Default Categories** — plus per-row category editing in import | Category editor, tag management          |
| **Custom Category**       | A user-created Category — full CRUD (add, rename, recolor, delete); `is_default = 0`                                                                                                       | User category, added category            |
| **Default Category**      | One of the eight seeded Categories (`is_default = 1`) — **recolor + hide only**, never renamed or deleted, because some names are referenced in code (`settlement.ts`, `categorize.ts`)    | Seeded category, built-in category       |
| **Hidden Category**       | A **Default Category** with `hidden = 1` — filtered out of the **CategorySelect** pickers but still valid on existing data and in reports; a picker-visibility filter, never a data filter | Archived/disabled category, blend-out    |
| **Category Reassignment** | The atomic bulk move of a Category's Transactions **and** RecurringTransactions from one name to another — the shared cascade behind both **rename** and **reassign-on-delete**            | Recategorize, category migration         |
| **CategoryManagerModal**  | The modal (opened from the **CategoriesCard** in Settings) that is the full CRUD surface — lists Default and Custom Categories with rename/recolor/hide/delete affordances                 | Category modal, manage-categories dialog |
| **CategoriesCard**        | The Settings-page card with a blurb and a "Manage categories" button that opens the **CategoryManagerModal**                                                                               | Category settings card                   |

## Relationships (Category Management additions)

- A **Category** is referenced by its **name** (TEXT) on both Transactions and RecurringTransactions — never by id; **Category Reassignment** is the only safe way to change a name in use
- A **rename** of a **Custom Category** runs **Category Reassignment** across `categories` + `transactions` + `recurring_transactions` in one transaction — a **Default Category** is never renamed
- **Delete** of a **Custom Category** that is in use triggers **reassign-on-delete**: the user picks a target Category (default Miscellaneous) and **Category Reassignment** runs before the row is deleted — data is never orphaned or silently dropped
- **Category Color** is now authoritative (read from the stored `color` column); `colorForCategoryName` is only a fallback for a **Default Category** whose color is still NULL
- The category palette (`categoryColorPalette`) is **20** on-theme swatches, mirrored identically in `server/src/storage/categoryColors.ts` and `src/utils/categoryColor/categoryColor.ts`
- A **Hidden Category** is dropped from **CategorySelect** options everywhere (transaction, recurring, import) except that a Transaction already sitting in it still shows its current value when edited; the **CategoryManagerModal** always lists it (disabled) so it can be un-hidden
- The CSV **Auto-Categorization** map stays hardcoded to **Default Categories** — flexibility comes from the per-row **CategorySelect** in the import review, not from custom keyword rules
- Name uniqueness is **case-insensitive**; a colliding create/rename is rejected (409), never silently merged

## Example dialogue (Category Management)

> **Dev:** "If I rename a Custom Category from 'Vet' to 'Pets', what happens to the 30 transactions already tagged 'Vet'?"
>
> **Domain expert:** "**Category Reassignment** runs — one transaction updates the `categories` row and every `transactions` and `recurring_transactions` row holding 'Vet' to 'Pets'. Because a Category is referenced by name, rename _is_ a cascade. That's also why you can't rename a Default Category: 'Transfer' and 'Miscellaneous' are hardcoded in settlement and import."
>
> **Dev:** "I never use the 'Investment' Default Category. Can I delete it?"
>
> **Domain expert:** "No — Default Categories are never deleted. But you can **hide** it. It drops out of the pickers, so you stop seeing it when you add a transaction, while any existing 'Investment' spend still shows in the breakdown donut and year-comparison. Hiding is a picker filter, never a data filter."
>
> **Dev:** "I delete a Custom Category that has transactions — do they vanish?"
>
> **Domain expert:** "Never. Deleting an in-use Custom Category opens a Modal asking where to move its transactions — default Miscellaneous, or any Category you pick. **Category Reassignment** runs, then the row is deleted. No orphans."
>
> **Dev:** "During a CSV import, can I put rows into a Custom Category I just made?"
>
> **Domain expert:** "Yes — that's the whole point of slice two. The import review row now uses the same **CategorySelect** as the transaction modal, with inline-add. The auto-categorizer still guesses into Default Categories, but you override any row into any Category, custom included."

## Flagged ambiguities

- **"ink" / "accent" vs MD3 token names"** (new) — the **Prototype** names colors
  `ink0`–`ink5` / `accent` / `textDim`; the real token layer keeps the **MD3
  vocabulary** (`surfaceContainer*`, `primary`, `onSurfaceVariant`) and remaps
  values onto it. `ink*`/`accent` are **prototype-source names only** — never
  introduce them as token keys in `src/tokens/`. Translate via the documented
  ink↔MD3 mapping table. The token names are semantic (role), not hue — a
  `primary` token holding **Horizon Gold** is correct, not a mismatch.
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
- **"Dashboard Clock" vs "Sidebar Clock"** (new) — the build status entry uses "Dashboard Clock" (the original feature name), but the widget lives in the **Sidebar**, not on the Dashboard page. The canonical term is **Sidebar Clock**. The feature slug `dashboard-clock` is retained for commit and issue tracking only — never use "Dashboard Clock" in code identifiers or UX copy.
- **"Chip" vs "Badge"** (new) — visually similar (both pill-shaped) but different contracts. **Badge** is kind-semantic: it derives its color from **AccountKind** and always carries a text label ("Girokonto", "CreditCard"). **Chip** is color-explicit: the caller passes a raw hex string and there is no text. Never use Badge as a color-only swatch, and never add an AccountKind prop to Chip.
- **"linked account"** (new) — `linkedAccountId` appears on two different entities with different meanings: on a **RecurringTransaction** it names the destination account of a **Recurring Transfer**; on a **CreditCard** Account it names the **Funding Account** for **Auto-Settlement**. Always qualify which entity is being discussed. In code, both use the field name `linkedAccountId` — this is intentional (same shape, different semantic); the distinction comes from the entity type, not the field name.
- **"settlement"** (new) — do not use this word without the qualifier **Auto-Settlement** or **Settlement Transfer**. "Settlement" alone collides with general accounting usage (settling invoices, clearing) and with the ambiguous existing flag on "payment".
- **"IPC"** (updated) — overloaded (Electron's renderer IPC, OS-level IPC, the parent-port
  channel between Electron Main and a utilityProcess). In the Desktop Shell, the Server Handle
  IPC consists of the **Ready Handshake**, **Shutdown Handshake**, and **Fatal Message** on
  the parent port. The **Renderer** additionally communicates with **Electron Main** through
  the **Preload Bridge** — `window.horizon.updates` exposes update event listeners and
  `quitAndInstall`/`downloadUpdate` invokes. The Renderer still never talks to SQLite directly.
- **"Statement" vs "Import Record"** (new) — **Statement** is the UX/domain word for an imported bank CSV file; **Import Record** is its persisted `imports` table row. Use **Import Record** in storage/repo/migration discussions and **Statement** in UI/UX copy. They are 1:1 — never imply a Statement exists without an Import Record (the raw file is not stored).
- **"import"** (new) — overloaded (ES module import, the **Import** feature, a single **Import Record**). In data-layer discussion, prefer **Import Record** for the row and **Import Commit**/**Import Preview Request** for the operations; reserve plain "Import" for the feature/nav. Never use "import" to mean an **Imported Transaction**.
- **"preview"** (new) — overloaded: **Import Preview** is the read-only modal for an **already-committed** Statement; the **Import Preview Request** (`/imports/preview`) is the pre-commit parse-and-detect call. Always qualify which one — they sit on opposite sides of the **Import Commit**.
- **"current month"** (new) — the build-status wording "Jan 1 through the current month" means the **Viewed Month** (the month selected in the Month Overview navigator), not today's real-world calendar month. The **Year Comparison** card recomputes as you step the navigator. Reserve "current month" for the dashboard's live-today widgets; use **Viewed Month** anywhere the month is navigable.
- **"YTD" / "year so far"** (new) — in Horizon, **YTD Variable Spending** runs January 1 → **Viewed Month** inclusive in **whole calendar months** — never Jan 1 → today's date. The UI title "This year so far" is the user-facing label for this metric; never let "so far" imply a day-of-month cutoff. Only **Variable Spending** counts (transfer legs and auto-settlement are excluded), so "YTD spend" is never total cashflow.
- **"header-less"** (new) — retired as a goal. Early design assumed some real exports were header-less (positional), but all four **Verified Presets** ship a header row. Never build positional/index-based mapping for the real banks; the **Generic Fallback** (first row as header) is the only path for unknown files. The roadmap's "harden … header-less exports" wording is superseded by this decision.
- **"Betrag"** (new) — not unique. Postbank CC has two columns literally named `Betrag` (foreign-currency and EUR). Always address the EUR one as **`Betrag (2)`** (post **Header De-duplication**); never map `amount → "Betrag"` for that format. The bare name `Betrag` is unambiguous only in the single-`Betrag` presets (Sparkasse, Postbank giro, Renault).
- **"pending"** (new) — in import context, a **Pending Row** is a bank-provisional entry (Sparkasse `Umsatz vorgemerkt`), flagged and pre-unchecked like duplicates/recurring. Do not conflate with a **Rejected Row** (parse failure) or with any UI loading/submitting state. Only a **Verified Preset** with a **Pending Column** produces Pending Rows.
- **"description column"** (new) — never assume it is the counterparty. It is a single column chosen per **Verified Preset**: counterparty for Sparkasse / Postbank giro, `Verwendungszweck` for Postbank CC, `Buchungstext` for Renault. There is no counterparty + purpose composite.
- **"hide" / "delete"** (new) — for Categories these are different operations on different targets. **Hide** applies to **Default Categories** only and is a reversible **picker-visibility** filter — the row and all its data stay. **Delete** applies to **Custom Categories** only and removes the row (via **reassign-on-delete** when in use). Never say "delete" when you mean hide a default, and never expose a hide toggle on a Custom Category or a delete on a Default Category.
- **"rename" (Category)** (new) — rename is never a rename-in-place of a string key; it is a **Category Reassignment** cascade across `categories` + `transactions` + `recurring_transactions`, because Categories are referenced by name. Never treat a Category rename as a single-row `UPDATE`. A **merge** (rename onto an existing name) is explicitly _not_ rename — it is expressed as **reassign-on-delete**; rename collisions are rejected.
- **"Category Color" authoritative vs derived** (new) — after Category Management the stored `categories.color` is the source of truth; `colorForCategoryName` is a **NULL-only fallback** for untouched Default Categories. Never re-hash the name for a Category that has a stored color, and never let the two mirrored `categoryColorPalette` files (server + frontend) diverge.

## Historical Month Navigation (new)

| Term                      | Definition                                                                                                                                                                                                               | Aliases to avoid                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| **History** (page/nav)    | The `/history` route and its sidebar nav item (Clock icon, between Month and Import) — the multi-year backward-looking view of Reconstructed Actuals                                                                     | Past view, archive page                   |
| **Historical Trajectory** | The title and concept of the History page's chart — the actuals-only counterpart to the forward-looking **Trajectory Horizon**; right edge is always today, no Payoff Marker, no Freedom Phase                           | Past trajectory, history graph            |
| **Reconstructed Actuals** | The per-month historical balance series derived by replaying the ledger (Opening Balance + reconciled Transactions per month) — cash lines use the account `actual`, Restschuld uses the mortgage `projected` (replayed) | Historical balances, past actuals         |
| **HistoryPoint**          | The purpose-built per-month DTO returned by `GET /projection/history` — `{ month, totalLiquid, restschuld, netCashflow, accounts: Record<id, balance> }`, all cents                                                      | History row, history snapshot             |
| **HistoryChart**          | The actuals-only Recharts chart on the History page — reuses the Trajectory Horizon's visual language (per-account lines, dashed Restschuld, toggle-chip legend) with its own independent visibility state               | History graph, actuals chart              |
| **Year Archive**          | The import-gated, expandable year list on the History page — one row per year with ≥1 imported Statement, showing that year's end-of-data Total Liquid / Restschuld / Net Cashflow + a statement badge                   | Year list, history accordion              |
| **MonthYearPicker**       | The jump-to popover on Month Overview (label + chevron between the unchanged prev/next arrows) — `◀ year ▶` + 3×4 month grid, portaled to `document.body`, out-of-**Browsable Range** months disabled                    | Jump-to picker, month picker, date picker |
| **Browsable Range**       | The window of navigable months: from the **earliest imported Transaction month** through the current month — bounds the Historical Trajectory span and the MonthYearPicker's enabled months                              | Data range, history range                 |

## Relationships (Historical Month Navigation additions)

- **Reconstructed Actuals** are produced by `GET /projection/history`, which runs the existing **Projection Engine** with `from` = the earliest imported Transaction month and `currentDate` = the current month — no new balance math
- A **HistoryPoint**'s cash figures (per-account balances, **Total Liquid**) come from each account's `actual`; its **Restschuld** comes from the mortgage's replayed `projected` — because a Mortgage's `actual` is just its flat un-replayed Opening Balance
- A **HistoryPoint**'s **Net Cashflow** is the real sum of that month's stored Transactions — never the recurring/projected figure
- The **Year Archive** shows only years present in **Import History** (≥1 Statement) — it can never display a year with no imported data behind it
- A **Year Archive** month row deep-links to the existing **Month Overview** (`/months/:month`); the statement badge links to the **Import** page
- The **MonthYearPicker** derives its lower bound from `GET /imports` (min `startDate` month), not from the full **HistoryPoint** series — keeping the heavy history fetch off the Month page
- **HistoryChart** persists its own series visibility (`horizon.history.visibility.v1`), independent of the **Trajectory Horizon**'s (`horizon.trajectory.visibility.v2`)
- With no imported Statements, **History** shows an EmptyState and the **Browsable Range** collapses to the current month

## Example dialogue (Historical Month Navigation)

> **Dev:** "The History chart says 'reconstructed actuals' — is that the same `actual` we already had?"
>
> **Domain expert:** "It's that `actual`, but as a multi-month series. For every past month, a HistoryPoint's cash balances are `Opening Balance + reconciled Transactions through that month` — and since imported Statements are the real ledger, that's the true historical balance."
>
> **Dev:** "Then why does the Restschuld line still slope down if the mortgage's `actual` is flat?"
>
> **Domain expert:** "Because Restschuld is the one exception — it uses the replayed `projected`, exactly like the Projection Accordion. A Mortgage's `actual` is just its un-replayed Opening Balance; Sondertilgung is modelled as a Recurring Transfer, not a stored Transaction."
>
> **Dev:** "How far back can I go?"
>
> **Domain expert:** "The Browsable Range — earliest imported Transaction month through today. That's the lower bound the MonthYearPicker greys out below, and it's where the Historical Trajectory's left edge sits. No imports, no history: the picker pins to the current month."
>
> **Dev:** "And the Year Archive only lists years I've imported?"
>
> **Domain expert:** "Right — it's gated on Import History. A year with zero Statements never appears, because there'd be nothing real behind it."

## Flagged ambiguities (Historical Month Navigation)

- **"Trajectory"** (new) — now two charts. **Trajectory Horizon** is forward-looking (240-month projection, Payoff Marker, Freedom Phase); **Historical Trajectory** is backward-looking (Reconstructed Actuals, right edge = today, no payoff/freedom concepts). Never use "Trajectory" unqualified when both could be meant.
- **"Actual" vs "Reconstructed Actuals"** (new) — **Actual** is a single account/month real balance; **Reconstructed Actuals** is the per-month historical series rendered on the History page. The series is honest cash _except_ Restschuld, which is the replayed `projected` — never claim the History Restschuld line is an `actual`.
- **"history"** (new) — overloaded three ways: **Recurring History** (the Replay Loop's past recurring firings), **Import History** (persisted Statements/Import Records), and **History** (the `/history` page). Always qualify; the History page is driven by Reconstructed Actuals, not by Recurring History.
- **"current month"** (updated) — in the **MonthYearPicker** and **Browsable Range**, "current month" is today's real calendar month (the upper bound), _not_ the navigable **Viewed Month** used by the Year Comparison card. The two senses coexist on the Month Overview screen.

## Savings Streak (new)

| Term                       | Definition                                                                                                                                                                         | Aliases to avoid                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **Savings Streak**         | The count of consecutive most-recent months in which every **Tracked Account** met its **Monthly Savings Target** — the motivational metric on the Dashboard's Savings Streak card | Streak counter, saving run        |
| **Current Streak**         | The Savings Streak measured backward from the latest reconstructed month — resets to zero on the first missed month                                                                | Active streak, streak count       |
| **Best Streak**            | The longest run of consecutive met months ever recorded across all reconstructed history                                                                                           | Record streak, longest streak     |
| **Savings Goal**           | The single persisted configuration behind the Savings Streak: a mode, a milestone target, a start month, and per-account monthly targets — one per Horizon database                | Savings plan, target config       |
| **Monthly Savings Target** | The cents-per-month a **Tracked Account** must grow by for that month to count as met — `balance[thisMonth] − balance[lastMonth] ≥ target`                                         | Monthly goal, save rate           |
| **Trackable Account**      | Any account eligible for a savings target — kind `Girokonto`, `Tagesgeld`, or `Investment`; **Mortgage** and **CreditCard** are never trackable                                    | Eligible account, savings account |
| **Tracked Account**        | A Trackable Account whose Monthly Savings Target is greater than zero — the ones the streak actually evaluates                                                                     | Active account, targeted account  |
| **Not Tracked**            | The dimmed row state for a Trackable Account with a zero target — shown, not hidden, so the user can enable it                                                                     | Untracked, disabled, excluded     |
| **Milestone Mode**         | The Savings Goal mode where the user sets one total amount + target month; Horizon auto-derives each Monthly Savings Target, weighted by the account's recent savings pace         | Goal mode, target mode            |
| **Manual Mode**            | The Savings Goal mode where the user sets each Monthly Savings Target directly; editing any target in Milestone Mode silently converts the goal to Manual                          | Custom mode, direct mode          |
| **Recent Savings Pace**    | An account's trailing-12-month average of its positive month-over-month balance gains — the weight used to split a Milestone target across Tracked Accounts (never raw balance)    | Balance weight, average gain      |
| **Goal Start Month**       | The `startedAt` month the Savings Goal was first saved — fixed thereafter, not user-editable; anchors the per-account cumulative progress bars                                     | Start date, since date            |
| **Calendar Strip**         | The Jan→Dec tile row on the Savings Streak card — one tile per month of the current year: filled = met, muted = missed, dashed = **Upcoming**                                      | Month strip, streak bar           |
| **Upcoming Month**         | A calendar-strip month not yet resolved — either a future month or a past month with no reconstructed history behind it (rendered as a dashed outline)                             | Future month, pending month       |

## Relationships (Savings Streak additions)

- A **Savings Goal** is a single per-database configuration — persisted in the one-row `savings_goal` table, covered by **Online Backup**/**Restore** like any other data
- A **Savings Goal** is either in **Milestone Mode** or **Manual Mode** — never both
- A **Monthly Savings Target** applies to exactly one **Trackable Account**; an account becomes a **Tracked Account** only when its target is greater than zero
- The **Savings Streak** evaluates only **Tracked Accounts** — a month is "met" when every Tracked Account's month-over-month balance gain reaches its **Monthly Savings Target**
- The month-over-month balances come from the **Reconstructed Actuals** (`GET /projection/history`) — the Savings Streak adds no new balance math, it reuses the History feed
- The **Calendar Strip**, **Current Streak**, and **Best Streak** scan all available reconstructed history — independent of the **Goal Start Month**
- The **Goal Start Month** anchors only the per-account cumulative progress bars ("saved of target since the goal started")
- In **Milestone Mode** the per-account split is derived from **Recent Savings Pace** and never stored; only **Manual Mode** targets are persisted
- The Savings Streak is deliberately **not** part of the **Trajectory Horizon** — that chart is a forward projection; a Savings Goal is a manual aspirational target layered on actual history

## Example dialogue (Savings Streak)

> **Dev:** "What makes a month count toward the Savings Streak?"
>
> **Domain expert:** "Every Tracked Account has to have grown by at least its Monthly Savings Target that month — `balance this month minus balance last month ≥ target`. Miss on even one Tracked Account and the month is missed, and the Current Streak resets."
>
> **Dev:** "Where do those balances come from — do we recompute them?"
>
> **Domain expert:** "No. Same Reconstructed Actuals the History page uses — `GET /projection/history`. The Savings Streak is a read on that series, not new balance math."
>
> **Dev:** "The dashboard shows Main and Tagesgeld greyed out with 'Not tracked' — why not just hide them?"
>
> **Domain expert:** "Because they're Trackable — Girokonto and Tagesgeld both qualify by kind. They're just at a zero target, so they're Not Tracked. We show them dimmed so the user can turn them on; a Mortgage or CreditCard would never appear at all."
>
> **Dev:** "In Milestone Mode, how does Horizon decide how much each account should save?"
>
> **Domain expert:** "By Recent Savings Pace — each account's trailing-12-month average of its positive monthly gains. Not by balance. A big idle balance that never moves shouldn't get a big target it can't hit — that's the failure mode we designed around."
>
> **Dev:** "And if I hand-edit one account's target while in Milestone Mode?"
>
> **Domain expert:** "The whole goal silently converts to Manual Mode, pre-filled with the milestone's derived split. You never lose your starting point — you just take the wheel."

## Flagged ambiguities (Savings Streak)

- **"Goal"** (new) — a **Savings Goal** is unrelated to the removed dashboard **Milestone** concept. Do not resurrect "Milestone" as a synonym for a savings target; **Milestone Mode** here names a _mode of the Savings Goal_, not a standalone tracked target.
- **"Target"** (new) — overloaded: **Monthly Savings Target** (cents/month per account) vs. the Milestone Mode **milestone target** (one total amount + target month). Qualify which is meant.
- **"Tracked"** (new) — **Trackable Account** (eligible by kind) is not the same as **Tracked Account** (eligible _and_ target > 0). A Trackable Account can be **Not Tracked**.
- **"met / missed / upcoming"** (new) — an **Upcoming Month** is not a missed month: it is unresolved (future, or past-with-no-data). Only a resolved month with a shortfall is "missed".
