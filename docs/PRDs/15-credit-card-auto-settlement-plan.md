# Plan: Credit Card Auto-Settlement

> Source PRD: https://github.com/carlos-rezai/horizon/issues/104

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: `POST /api/settlements/generate` (idempotent, runs generation service), `GET /api/settlements/warnings` (returns `InsufficientFundsWarning[]`); `POST /api/accounts` and `PATCH /api/accounts/:id` extended in-place with settlement fields
- **Schema**: Migration 006 — three nullable columns on `accounts` (`linked_account_id TEXT`, `settlement_day INTEGER`, `linked_since TEXT`); one boolean column on `transactions` (`is_auto_settlement INTEGER NOT NULL DEFAULT 0`). All three account fields must be set together or all NULL.
- **Key models**: `SettlementTransferInput` and `InsufficientFundsWarning` (new server types); `Account`, `AccountCreateInput`, `AccountUpdateInput` gain `linkedAccountId?`, `settlementDay?`, `linkedSince?`; `Transaction` gains `isAutoSettlement?: boolean`
- **Settlement Engine**: Pure function `computeMissingSettlements(accounts, transactions, asOf)` in `server/src/lib/settlement.ts` — no DB access, no side effects, idempotent when called with the full transaction set
- **Settlement Service**: `server/src/services/settlementService.ts` — runs at Express startup (backfill) and on demand via `POST /api/settlements/generate` (triggered by frontend after any CreditCard save that changes settlement config)
- **Transfer legs**: Settlement transfers reuse the existing `transfers.create()` storage method with `isAutoSettlement: true` on both legs; the flag is the sole distinguishing property from user-created transfers

---

## Phase 1: Account Settlement Configuration

**User stories**: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12

### What to build

A complete end-to-end path for saving and loading CreditCard settlement configuration. Migration 006 adds the four columns to the database. TypeScript types are extended across the server storage layer and client types. The account API (POST and PATCH) accepts `linkedAccountId` and `settlementDay`, sets `linkedSince` automatically (opening date on create, today on update), and validates that all three fields are either all-set or all-null. The PATCH endpoint accepts `linkedAccountId: null` to unlink; when config fields change, `linkedSince` resets to today; past Settlement Transfers are untouched. The `AccountCreateModal` gains two conditional fields when `CreditCard` kind is selected: a Funding Account dropdown (Girokonto accounts only) and a Settlement Day number input (1–28). Both fields are hidden for all other account kinds. In edit mode the fields pre-fill from the existing account data; clearing the Funding Account sends `linkedAccountId: null` to unlink.

### Acceptance criteria

- [ ] Migration 006 runs cleanly on an existing database; all four columns exist with correct types and defaults
- [ ] `POST /api/accounts` with CreditCard kind, valid `linkedAccountId` and `settlementDay` → account saved with `linked_since = openingDate`
- [ ] `POST /api/accounts` with partial config (only one of `linkedAccountId` / `settlementDay`) → 400 response
- [ ] `PATCH /api/accounts/:id` with changed `settlementDay` → `linked_since` resets to today; existing settlement transfer rows are not modified
- [ ] `PATCH /api/accounts/:id` with `linkedAccountId: null` → account unlinked; existing settlement rows untouched
- [ ] Account create modal: selecting CreditCard kind reveals Funding Account dropdown (Girokonto accounts only) and Settlement Day input (1–28)
- [ ] Account create modal: selecting any non-CreditCard kind hides both fields
- [ ] Account edit modal: opens with Funding Account and Settlement Day pre-filled from existing account data
- [ ] Settlement Day input rejects values below 1 and above 28 at the UI level

---

## Phase 2: Settlement Engine + Generation Service

**User stories**: 13, 14, 15, 24

### What to build

The pure settlement computation module and the service that persists its output. `computeMissingSettlements` iterates each CreditCard with complete settlement config month by month from `linkedSince` to `asOf`. For each month M where the CreditCard's closing balance is negative and no Settlement Transfer already exists for that (CC account, month M) pair, it emits a `SettlementTransferInput` for Settlement Day of month M+1. Months before `linkedSince`, months with zero or positive closing balance, and months that already have a settlement pair are all skipped — making the function idempotent. The Settlement Generation Service calls this function with all accounts, all transactions, and today's date, then persists each returned transfer pair via `transfers.create()` with `isAutoSettlement: true`. The service runs once at Express startup (backfilling any gap) and is also exposed via `POST /api/settlements/generate`. The frontend calls this endpoint after any CreditCard create or update that changes settlement configuration.

### Acceptance criteria

- [ ] `computeMissingSettlements` emits a transfer pair for month M when CreditCard closing balance is negative and no settlement exists for that month
- [ ] `computeMissingSettlements` emits nothing for months with zero or positive closing balance
- [ ] `computeMissingSettlements` emits nothing for months before `linkedSince`
- [ ] `computeMissingSettlements` emits no duplicate when called twice with the same input (idempotent)
- [ ] Settlement amount equals the absolute value of the CreditCard's month M closing balance
- [ ] Settlement transfer date is `settlementDay` of month M+1, not month M
- [ ] `POST /api/settlements/generate` returns the count of newly created settlement pairs
- [ ] Running `POST /api/settlements/generate` twice with no intervening changes creates no duplicate rows
- [ ] Express startup runs the generation service before routes are opened
- [ ] Frontend calls `POST /api/settlements/generate` after saving a CreditCard with settlement config changes
- [ ] No Settlement Transfers are created for months before `linkedSince`

---

## Phase 3: Monthly Ledger — Read-Only Settlement Display

**User stories**: 9, 12, 16, 17, 18, 25

### What to build

Settlement transfer legs are surfaced in the Monthly Ledger with a distinct read-only treatment. Transaction list rows where `isAutoSettlement: true` render an "Auto-settlement" label (badge or muted style) in place of the standard transfer badge. Clicking an auto-settlement row does not open the edit modal. No delete affordance is shown for these rows. Both legs appear in their respective account ledgers — the CreditCard account shows the credit leg, the Funding Account shows the debit leg — so both account histories reflect the movement. Past settlement rows are never modified when settlement config changes or the account is unlinked; the read-only flag is the permanent source of truth.

### Acceptance criteria

- [ ] Auto-settlement transaction rows display an "Auto-settlement" label visually distinct from the standard Transfer badge
- [ ] Clicking an auto-settlement row does not open `TransactionEditModal`
- [ ] No delete affordance is rendered for auto-settlement rows
- [ ] The settlement transfer appears in both the CreditCard account ledger and the Funding Account ledger for the same month
- [ ] Updating settlement config (Settlement Day or Funding Account) does not modify or remove any existing auto-settlement rows in the ledger
- [ ] Unlinking a CreditCard does not remove or modify any existing auto-settlement rows in the ledger

---

## Phase 4: Projection Engine Extension

**User stories**: 19, 20

### What to build

The forward projection in `projectBalances` is extended to model settlement cash flows. For each future month M where a CreditCard's projected closing balance is negative, the Funding Account's projected balance is reduced by the settlement amount on Settlement Day of month M+1, and the CreditCard's projected balance is zeroed at that point. This look-back dependency (month M+1 settlement depends on month M CC closing balance) is satisfied by the existing month-by-month loop order, which applies variable spending for month M before processing month M+1. The settlement deductions flow through to `totalLiquid` and `netCashflow` in every projected `MonthlySnapshot`. No rows are written to the database during a projection run.

### Acceptance criteria

- [ ] Funding Account projected balance reflects the settlement deduction on Settlement Day in every future month where the CC closes negative
- [ ] CreditCard projected balance is zeroed in the projection after each settlement fires
- [ ] `totalLiquid` correctly accounts for the Funding Account drawdown
- [ ] `netCashflow` reflects the settlement in the affected month
- [ ] No rows are written to the `transactions` table during a projection run
- [ ] Months where the CreditCard projected closing balance is zero or positive produce no settlement deduction in the projection

---

## Phase 5: Insufficient Funds Warning

**User stories**: 21, 22, 23

### What to build

A startup alert that warns when the Funding Account cannot cover the upcoming settlement. `detectInsufficientFunds` inspects the Forward Projection output and returns one `InsufficientFundsWarning` per CreditCard where the Funding Account's projected balance on the upcoming Settlement Day is less than the CC's projected closing balance for the current month. The check is forward-looking: if salary or another inflow lands before Settlement Day and raises the projected balance above the threshold, no warning is returned. This function is exposed via `GET /api/settlements/warnings`. The frontend calls this endpoint on app startup and renders each returned warning as a persistent error-variant Snackbar (using the existing `Snackbar` component). The warning resolves automatically on the next app open if the projected shortfall no longer exists.

### Acceptance criteria

- [ ] `detectInsufficientFunds` returns a warning when Funding Account projected balance on the upcoming Settlement Day is less than the CC's projected settlement amount
- [ ] `detectInsufficientFunds` returns no warning when the projected balance meets or exceeds the settlement amount
- [ ] `detectInsufficientFunds` returns no warning when an inflow before Settlement Day raises the projected balance above the threshold
- [ ] `GET /api/settlements/warnings` returns `InsufficientFundsWarning[]` from the Forward Projection
- [ ] App startup calls `GET /api/settlements/warnings` and renders one error-variant Snackbar per returned warning
- [ ] The Snackbar is persistent (not auto-dismissed) and has a close button
- [ ] No warning Snackbar appears on next app open if the projected shortfall has resolved
