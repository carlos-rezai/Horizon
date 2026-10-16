# Plan: Balance Anchor

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/229

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**:
  - `POST /accounts` and `PATCH /accounts/:id` carry `anchorBalance` /
    `anchorDate` in place of `openingBalance` / `openingDate`. Both reject
    an `anchorDate` later than today with `400`, using the same
    today-as-ISO idiom as `linkedSince`. `AccountUpdateInput` gains
    `anchorDate`, so both anchor fields save on update.
  - `POST /mortgages` stays valid with the renamed fields. Its rules hold
    against the anchor: `startDate ≤ anchorDate`, and an original principal
    of at least the Restschuld.
  - `GET /projection/history` keeps its path. Its points carry explicit
    `null` for Unknown (see Key models).
  - No new routes. There is no `knownSince` field in the API, because the
    client reads Known Since from the first non-null history point.
- **Schema**: migration `017_rename_opening_to_anchor.sql` renames
  `accounts.opening_balance` → `anchor_balance` and `accounts.opening_date`
  → `anchor_date`. It renames only and rewrites no values. There are no
  aliases and no compatibility shim: client and server ship together.
- **Key models**:
  - **Balance Anchor**: one per account, an **Anchor Balance** (integer
    cents) at an **Anchor Date** (ISO date). It is the balance at the
    **end** of that day, including that day's transactions. Re-anchoring
    overwrites it, and no anchor history is kept.
  - **Formula** for any date `d`:
    ```
    balanceAt(d) = anchorBalance + Σ tx where anchorDate < date ≤ d     (d ≥ anchorDate)
    balanceAt(d) = anchorBalance − Σ tx where d < date ≤ anchorDate     (d < anchorDate)
    Current Balance = anchorBalance + Σ tx where date > anchorDate
    ```
    Future-dated transactions still count toward the Current Balance.
  - **Known Since** = `min(anchorDate, oldest transaction date)`, counting
    transactions from every source (import, manual, settlement). Earlier
    months are **Unknown**.
  - **`balanceAnchor` lib**: a pure server lib in the `lib/<name>/<name>`
    shape, exposing `balanceAt(anchor, transactions, date)` → cents and
    `knownSince(anchor, transactions)` → ISO date. It is the single
    TypeScript definition of the formula. The engine and settlement call
    it.
  - **Current Balance in SQL**: stays native SQL in the Storage layer
    (list, by id, Total Liquid), adding only transactions dated after
    `anchor_date`. The storage parity suite keeps it equal to
    `balanceAt(today)`.
  - **Anchor Gate**: a recurring occurrence is dated at the month's
    `dayOfMonth`, clamped to the month's length. It moves a leg's balance
    only if that date is after that leg's account's Anchor Date. Each leg
    is checked on its own. The gate applies in the Replay Loop and in the
    Forward Projection, month 0 included.
  - **`MonthlySnapshot.accounts[id].actual`**: from `balanceAt(end of
month)`. It is omitted before Known Since (the field is already
    optional).
  - **`HistoryPoint`**: `accounts: Record<string, number | null>`,
    `restschuld: number | null` (`null` before the Mortgage's Known Since),
    `totalLiquid: number | null` (the sum of the liquid accounts known that
    month, `null` only when none is known). Unknown is always an explicit
    `null`, never an omitted key and never `0`.
  - **UI names**: the account form says **Balance** / **As of**, with the
    help text "Your balance at the end of this day, including that day's
    transactions". The Account stat strip shows **Balance anchor** with the
    amount and "as of {date}".

---

## Phase 1: Anchored Current Balance everywhere

**User stories**: 1, 7, 8, 9, 10, 11, 16, 17, 18, 19, 41, 42

### What to build

The rename and the new balance formula, end to end. Migration 017 renames
the two columns, and the anchor fields replace the opening fields through
storage, routes, shared client types, the projection inputs and Mortgage
Setup. The three Current Balance statements count only transactions after
the Anchor Date. The `balanceAnchor` lib arrives with its tests. The
projection engine takes each account's `actual` from `balanceAt` and leaves
it out before Known Since, so the Accounts card, Account Hero, Total
Liquid, the Dashboard and the Trajectory Horizon all agree. Demo: create a
Girokonto with today's balance and today's date, import 12 past months, and
the balance is unchanged on every surface.

### Acceptance criteria

- [ ] Migration 017 renames both columns. Existing rows keep their stored
      values.
- [ ] No `openingBalance` / `openingDate` / `opening_*` identifiers are
      left in server or client code. `POST /accounts` and
      `POST /mortgages` work with the renamed fields.
- [ ] `balanceAt` is covered on, after and before the anchor date, for a
      transaction exactly on the anchor date (absorbed), a date before
      Known Since, an empty transaction list and future-dated transactions.
- [ ] `knownSince` is covered when the anchor is earliest, when a
      transaction is earliest, and with transactions from every source.
- [ ] The storage parity check holds: the SQL Current Balance (list, by id,
      Total Liquid) equals `balanceAt(today)` for the live-use fixture
      (anchored today, 12 months imported), for an anchor that precedes
      every transaction, and for a transaction on the anchor date.
- [ ] Engine `actual` matches `balanceAt(end of month)` from Known Since
      on, and is omitted before it.
- [ ] Typecheck and the full test suite are green.

---

## Phase 2: Re-anchoring in the account form

**User stories**: 2, 3, 4, 5, 6, 12, 13, 14

### What to build

Make the anchor something the user can see and change. The account form
labels its fields "Balance" and "As of", shows the end-of-day help text,
and its date picker stops at today. In edit mode both anchor fields save
and replace the old anchor. The server rejects a future `anchorDate` on
create and update. The Account stat strip shows "Balance anchor" with the
amount and "as of {date}". Demo: edit an account to a statement's closing
Saldo and end date, and the stat strip and Current Balance follow.

### Acceptance criteria

- [ ] The labels "Balance" and "As of" and the help text render on create
      and edit.
- [ ] The date picker is capped at today.
- [ ] Edit mode submits a changed `anchorDate`, and it persists. Saving
      replaces the anchor rather than adding a second one.
- [ ] `POST /accounts` and `PATCH /accounts/:id` answer `400` for an
      `anchorDate` later than today.
- [ ] A past anchor date (a statement's end date) is accepted.
- [ ] The Account stat strip shows "Balance anchor", the amount and
      "as of {date}".

---

## Phase 3: Anchor Gate in the projection

**User stories**: 29, 30, 31, 32, 33, 34, 39, 40

### What to build

Recurring flows stop rewriting history the anchor already contains. Each
recurring occurrence gets a date (the `dayOfMonth`, clamped to the month's
length). Each leg moves its account's balance only when that date is after
that account's Anchor Date. The gate applies in both the Replay Loop and
the Forward Projection. The Mortgage's Restschuld no longer loses payments
from before it was entered, and this month's rate is not counted twice.
Mortgage Setup's rules still hold against the anchor. Demo: a mortgage
anchored today, funded from an older Girokonto, keeps the Restschuld you
entered, and its payoff date does not move earlier.

### Acceptance criteria

- [ ] A Mortgage anchored later than its funding Girokonto takes no
      pre-anchor payments in the replay.
- [ ] A month-0 rate dated on or before the anchor day is not counted
      again.
- [ ] A transfer gated on the destination still debits the source.
- [ ] `dayOfMonth` 31 lands on the last day of February (and of 30-day
      months) for the gate check.
- [ ] Replay and forward follow the same rule.
- [ ] `POST /mortgages` still enforces `startDate ≤ anchorDate` and an
      original principal of at least the Restschuld.

---

## Phase 4: Settlement from the anchor

**User stories**: 37, 38

### What to build

Credit Card auto-settlement works out the end-of-month closing balance from
the anchor, not from the anchor plus every transaction ever recorded. Past
statements imported before the anchor no longer distort the amount pulled
from the funding account. Creating a CreditCard with a funding account
still defaults `linkedSince` to the Anchor Date. Demo: import past
statements onto an anchored credit card, and the next settlement pulls the
right amount.

### Acceptance criteria

- [ ] The closing balance equals `balanceAt(end of month)` when past
      statements sit before the anchor.
- [ ] `linkedSince` defaults to the Anchor Date on CreditCard creation with
      a funding account.
- [ ] Existing settlement tests stay green.

---

## Phase 5: Import — no recurring flag on or before the anchor

**User stories**: 35, 36

### What to build

Recurring Detection never pre-unchecks a row dated on or before the target
account's Anchor Date. The anchor already contains those rows, and the
Anchor Gate means nothing replays them. The preview passes the anchor date
in. Rows after the anchor are flagged as before. Demo: import 12 past
months, and salary and standing-order rows before the anchor are checked
and land in the derived history.

### Acceptance criteria

- [ ] A row that matches a RecurringTransaction and is dated on or before
      the anchor date is not flagged `recurring`.
- [ ] The same row dated after the anchor date is still flagged.
- [ ] The import preview supplies the target account's anchor date.

---

## Phase 6: Unknown, not €0

**User stories**: 20, 21, 22, 23, 24, 25, 26, 27, 28

### What to build

Months Horizon has no data for read as unknown everywhere they appear.
History points carry an explicit `null` for an account before its Known
Since, for the Restschuld before the Mortgage's Known Since, and for Total
Liquid only when no liquid account is known (otherwise it is a partial
sum). History derivation drops its `?? 0` fallback. The History chart line
breaks on `null`, and the tooltip reads "No data before {Mon YYYY}". The
Year Archive shows "—". The Savings Streak treats a month as neither met
nor missed when any Tracked Account is Unknown in that month or the one
before, and the streak and Recent Savings Pace skip it. Demo: with 12
months imported, the History chart starts at Known Since with a gap
before it, and no surface shows €0 for a month without data.

### Acceptance criteria

- [ ] `HistoryPoint` uses `number | null` for `accounts` values,
      `restschuld` and `totalLiquid`. Unknown is never an omitted key or
      `0`.
- [ ] History derivation covers partial Total Liquid and an all-Unknown
      month. `GET /projection/history` returns `null`s before Known Since.
- [ ] The History chart breaks the line on `null` (no `connectNulls`), and
      the tooltip reads "No data before {Mon YYYY}".
- [ ] The Year Archive renders "—" for Unknown cells, never "€0".
- [ ] The savings-goal util: a month with an Unknown Tracked Account, in
      that month or the month before, is neither met nor missed. The streak
      and Recent Savings Pace skip it. The `?? 0` read is gone.
- [ ] The Dashboard, Outlook and Account pages are unchanged (they read the
      current month, which is always known).

---

## Phase 7: Docs

**User stories**: 15, 43

### What to build

Make the docs describe Horizon as it now behaves. The manual covers the
anchor in the account form, the account page and Mortgage Setup, and the
"opening date is fixed at creation" caution is gone. The release notes
carry the migration caveat: a transaction dated on the old opening date is
now absorbed into the anchor, so re-anchor if a balance changed. The README
build status ticks Balance Anchor when the epic closes.

### Acceptance criteria

- [ ] The manual describes "Balance" / "As of", the end-of-day meaning,
      re-anchoring in edit mode and the "Balance anchor" stat strip.
- [ ] The "fixed at creation" caution is removed.
- [ ] The release notes include the migration caveat and how to re-anchor.
- [ ] The README build status ticks Balance Anchor.
