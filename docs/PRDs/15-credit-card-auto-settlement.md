## Problem Statement

When a CreditCard account is tracked in Horizon, the real-world behaviour is that the full monthly statement balance is pulled from a checking account via direct debit on a fixed day each month. Horizon currently has no mechanism to model this: the Projection Engine does not account for the Girokonto drawdown on settlement day, the Monthly Ledger shows no settlement transaction, and the user must manually remember to record the transfer. Projected cash flows are therefore inaccurate, and the ledger is incomplete for anyone using a credit card.

## Solution

Auto-Settlement links a CreditCard account to a Girokonto Funding Account with a Settlement Day (1–28). Each month, the Settlement Engine computes the CreditCard's closing balance for month M, and if negative, creates a read-only Settlement Transfer on Settlement Day of month M+1. This transfer appears in the Monthly Ledger as a permanent non-editable record and is included in the Projection Engine's forward balance calculations. An error-variant Snackbar is shown at app startup whenever the Funding Account's projected balance on the upcoming Settlement Day is insufficient to cover the settlement amount.

## User Stories

1. As a user, I want to configure a Funding Account and Settlement Day when creating a new CreditCard account, so that Auto-Settlement is active from the account's opening date.
2. As a user, I want to configure a Funding Account and Settlement Day on an existing CreditCard account at any time, so that I can enable Auto-Settlement after the fact.
3. As a user, I want `linkedSince` to be set automatically — to the opening date for a new account, and to today for an update — so that I never have to enter it manually.
4. As a user, I want the funding account dropdown to show only Girokonto accounts, so that invalid funding sources are impossible to choose.
5. As a user, I want the Settlement Day input to accept values from 1 to 28 only, so that the configuration is valid in every calendar month without edge cases.
6. As a user, I want to see the current Funding Account and Settlement Day pre-filled when I open the edit modal for a CreditCard, so that I can review or change the configuration easily.
7. As a user, I want to change the Settlement Day for a CreditCard at any time, so that I can keep Horizon aligned with my bank's actual billing cycle.
8. As a user, I want to change the Funding Account for a CreditCard at any time, so that I can update it if I switch current accounts.
9. As a user, I want past Settlement Transfers to remain unchanged when I update the Settlement Day or Funding Account, so that my historical ledger is not retroactively modified.
10. As a user, I want changing the Settlement Day or Funding Account to reset `linkedSince` to today, so that the new configuration applies only from this point forward.
11. As a user, I want to unlink a CreditCard from its Funding Account, so that future Auto-Settlement stops immediately.
12. As a user, I want existing Settlement Transfers to remain intact after unlinking, so that my past ledger is preserved accurately.
13. As a user, I want Settlement Transfers to appear automatically in the Monthly Ledger for every month where the CreditCard closed with a negative balance, so that I do not need to record them manually.
14. As a user, I want each Settlement Transfer to appear on Settlement Day of month M+1 for the closing CreditCard balance of month M, so that the timing mirrors my bank's real direct debit.
15. As a user, I want months where the CreditCard balance was zero or positive to produce no Settlement Transfer, so that the ledger is not cluttered with zero-amount entries.
16. As a user, I want Settlement Transfers to be labelled "Auto-settlement" with a visually distinct style in the Monthly Ledger, so that I can identify them at a glance.
17. As a user, I want Settlement Transfers to be read-only — no edits, no individual delete — so that the automated record cannot be accidentally corrupted.
18. As a user, I want the only way to stop future settlements to be unlinking the Funding Account on the CreditCard, so the action is always intentional.
19. As a user, I want the Projection Engine to deduct the settlement amount from the Funding Account on Settlement Day in all future months, so that projected Girokonto balances are honest.
20. As a user, I want the CreditCard's projected balance to be zeroed after each Settlement Transfer fires in the Forward Projection, so that projected CC balances remain meaningful.
21. As a user, I want an error-variant Snackbar shown at app startup when the Funding Account's projected balance on the upcoming Settlement Day is less than the outstanding settlement amount, so that I can act before the settlement fires.
22. As a user, I want the Insufficient Funds Warning to resolve automatically once the projected Funding Account balance on Settlement Day meets or exceeds the settlement amount (for example, because my salary lands before that day), so that I am not alerted unnecessarily.
23. As a user, I want the Insufficient Funds Warning to reappear on the next app open if the projected shortfall persists, so that I am reminded consistently until I act.
24. As a user, I want no retroactive Settlement Transfers created for months before the CreditCard was linked, so that linking a CreditCard mid-year does not silently alter past history.
25. As a user, I want Settlement Transfers to appear correctly in both the Monthly Ledger of the CreditCard account and the Funding Account (as a debit), so that both accounts reflect the movement.

## Implementation Decisions

### Data Model Changes

**`accounts` table — three new nullable columns** (single migration):

- `linked_account_id TEXT` — ID of the Girokonto Funding Account; NULL when not linked
- `settlement_day INTEGER` — 1–28; day of month M+1 when the Settlement Transfer fires; NULL when not linked
- `linked_since TEXT` — ISO date; the Replay Loop only generates Settlement Transfers from this date forward; NULL when not linked

All three fields must be set together or all NULL — partial configuration is rejected at the API layer.

**`transactions` table — one new boolean column** (same migration):

- `is_auto_settlement INTEGER NOT NULL DEFAULT 0` — marks a Settlement Transfer leg as system-generated and read-only

**TypeScript interface changes:**

- `Account` gains three optional fields: `linkedAccountId?`, `settlementDay?`, `linkedSince?`
- `AccountCreateInput` and `AccountUpdateInput` gain the same three optional fields
- `Transaction` gains `isAutoSettlement?: boolean`

### Settlement Engine (deep module)

A pure function module (`server/src/lib/settlement.ts`) with no side effects:

```ts
computeMissingSettlements(
  accounts: Account[],
  transactions: Transaction[],
  asOf: string          // ISO date — generate settlements up to and including this month
): SettlementTransferInput[]
```

The engine iterates each CreditCard with a complete settlement config month by month from `linkedSince` to `asOf`. For each month M where the CreditCard's closing balance is negative and no Settlement Transfer already exists for that (CC account, month M) pair, it emits a transfer input for Settlement Day of month M+1. The "already exists" check uses `isAutoSettlement: true` + account ID + date on existing transactions — making the function idempotent when called with the full transaction set.

### Settlement Generation Service

A backend service (`server/src/services/settlementService.ts`) that:

1. Calls `computeMissingSettlements` with all accounts, all transactions, and today's date
2. Persists each returned transfer pair via `storage.transfers.create()` with `isAutoSettlement: true`

Triggered at two points:

1. **Express server startup** — runs before routes are opened, backfilling any missing historical settlements
2. **Via `POST /api/settlements/generate`** — called by the frontend after any CreditCard create or update that changes settlement config

### Projection Engine Extension

The Forward Projection in `server/src/lib/projection.ts` applies the same settlement logic as the Settlement Engine but **writes nothing to the database**. For each future month M, if a CreditCard's projected closing balance is negative, the Funding Account's balance is reduced by the settlement amount on Settlement Day of month M+1. This flows through to `totalLiquid` and `netCashflow` in the projected `MonthlySnapshot` values.

The look-back dependency (month M+1 settlement depends on month M CC closing balance) requires that variable spending for month M is applied before any settlement for month M is computed. The existing month-by-month loop order in the Replay Loop already establishes this; it must be made explicit in the extended code.

### Insufficient Funds Check

A pure function that inspects the Forward Projection output:

```ts
detectInsufficientFunds(
  accounts: Account[],
  projection: MonthlySnapshot[]
): InsufficientFundsWarning[]
```

Returns one `InsufficientFundsWarning` per CreditCard where the Funding Account's projected balance on the upcoming Settlement Day is less than the CC's projected closing balance for the current month. Exposed via `GET /api/settlements/warnings`.

The frontend calls this endpoint on app startup and renders each warning as a persistent error-variant Snackbar (the same component used by the Update Banner).

### Account Modal Changes

In `AccountCreateModal` (create and Account Edit Mode), when `CreditCard` kind is selected:

- A dropdown appears for Funding Account, listing Girokonto accounts only; can be left empty
- A number input (1–28) appears for Settlement Day; required if a Funding Account is selected
- `linkedSince` has no UI — set automatically by the API

If the user clears the Funding Account in edit mode, the PATCH request sends `linkedAccountId: null`, unlinking the account.

### API Changes

| Endpoint                         | Change                                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/accounts`             | Accepts `linkedAccountId?`, `settlementDay?` for CreditCard; sets `linkedSince = openingDate`; validates all-or-nothing     |
| `PATCH /api/accounts/:id`        | Accepts same fields; resets `linkedSince = today` if either config field changes; accepts `linkedAccountId: null` to unlink |
| `POST /api/settlements/generate` | Runs the Settlement Generation Service; idempotent; returns count of newly created settlement pairs                         |
| `GET /api/settlements/warnings`  | Returns `InsufficientFundsWarning[]` derived from the Forward Projection                                                    |

### Monthly Ledger Read-Only Display

Settlement Transfer legs (`isAutoSettlement: true`) are rendered in the transaction list with:

- Description showing "Auto-settlement" label and a distinct badge or muted styling
- No click-to-edit behaviour — clicking opens no modal, or opens a read-only info sheet
- No delete affordance in the row actions

The existing pattern in `TransactionEditModal` (detects `transferId` → disables all inputs) is extended: when `isAutoSettlement: true`, the modal is not opened at all (or a read-only summary is shown instead).

### Schema Migration

One new forward-only migration file adds all four columns: three on `accounts`, one on `transactions`. No existing columns are modified.

## Testing Decisions

Good tests assert external behaviour — outputs given specific inputs — without asserting on internal implementation steps.

**Settlement Engine (`computeMissingSettlements`) — unit tested in isolation:**

- Month M with negative CC closing balance and no existing settlement → settlement transfer pair emitted for Settlement Day of M+1
- Month M with zero or positive CC closing balance → no pair emitted
- Month before `linkedSince` → no pair emitted regardless of CC balance
- Month where a settlement pair already exists (identified by `isAutoSettlement: true` + account + date) → no duplicate emitted
- Settlement amount equals the absolute value of the CC's month M closing balance
- Settlement fires on `settlementDay` of month M+1, not month M

**Settlement Generation Service — integration tested against an in-memory SQLite store:**

- Two transaction rows created per settlement, sharing a `transferId`, both with `isAutoSettlement: true`
- Running the service twice with no intervening changes produces no duplicate rows
- Unlinking (setting `linkedAccountId: null`) stops future generation without deleting existing rows

**Projection Engine extension — extend existing projection tests:**

- Funding Account projected balance reflects the settlement deduction on Settlement Day in future months
- CreditCard projected balance reaches zero after a settlement fires in the Forward Projection
- `totalLiquid` excludes CreditCard balances and correctly accounts for the Girokonto drawdown
- No rows written to the `transactions` table during a projection run

**Insufficient Funds Check — unit tested:**

- Warning returned when Funding Account projected balance on Settlement Day < settlement amount
- No warning when balance ≥ amount
- Warning absent when salary or other inflow before Settlement Day raises projected balance above the threshold

**UI — component tests:**

- `isAutoSettlement: true` transaction rows render with the "Auto-settlement" label
- Clicking an auto-settlement row does not open the edit modal
- CreditCard account kind selection in `AccountCreateModal` shows the Funding Account dropdown and Settlement Day input
- Non-CreditCard account kind selection hides both fields
- Settlement Day input rejects values below 1 and above 28

Prior art: `TransactionEditModal` transfer read-only pattern (line 33 of `TransactionEditModal.tsx`); `UpdateBanner` Snackbar usage in `features/updates/`.

## Out of Scope

- Partial or minimum payment — settlement always covers the full CreditCard closing balance
- CC interest modelling — the CreditCard balance is always paid in full; no interest is calculated
- Multiple Funding Accounts per CreditCard
- Non-Girokonto funding accounts (Tagesgeld, Investment, Mortgage, other CreditCard)
- Manual "Settle" button or user-initiated settlement trigger
- Retroactive settlement generation for months before `linkedSince`
- Notification or alert for settlement transfers other than the Insufficient Funds Warning

## Further Notes

- The Settlement Transfer is structurally identical to a user-created Transfer (two `Transaction` rows sharing a `transferId`). The `isAutoSettlement: true` flag is the only distinguishing property. The `transfers.create()` storage method can be reused without modification, provided it accepts the flag on each leg.
- `linkedAccountId` appears on both `RecurringTransaction` (destination of a Recurring Transfer) and `Account` (Funding Account for Auto-Settlement). Both use the field name `linkedAccountId` intentionally — the semantic difference comes from the entity type, not the field. Code handling CreditCard settlement should document which entity is in scope.
- Settlement Day is capped at 28 at the UI input level only. No runtime clamping is needed; the UI constraint is the single enforcement point.
- The Settlement Engine's look-back dependency (month M+1 requires month M CC balance) must be handled by ensuring variable spending for month M is applied before the settlement check for that month runs. The existing Replay Loop's month-by-month order already supports this; the implementation must not reorder steps.
