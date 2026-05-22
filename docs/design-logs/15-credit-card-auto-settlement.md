# 15 — Credit Card Auto-Settlement

## Background

Horizon tracks a `CreditCard` account kind alongside Girokonto, Tagesgeld,
Mortgage, and Investment. Credit cards are currently treated as plain accounts
with no special settlement logic. In real life, a credit card direct debit
pulls the full statement balance from a checking account on a fixed day each
month. This feature brings that behaviour into the Replay Loop and Projection
Engine so cash timing is modelled honestly.

## Problem

There is no mechanism to automatically transfer the monthly CC balance to the
linked Girokonto, meaning:

- The Projection Engine does not account for the cash outflow from the
  checking account on settlement day
- The Monthly Ledger shows no settlement transaction
- The user must manually remember to record the transfer

## Questions and Answers

**Q1: Does auto-settlement create real transactions or is it a projection-only concept?**
Real transfer transaction pairs written into the ledger.

**Q2: What triggers settlement — a manual button or automation?**
Automated: the CC account stores a `settlementDay`. The Replay Loop fires the
settlement as part of normal month replay. No button required.

**Q3: Is the settlement amount the full balance or partial (minimum payment)?**
Always the full balance — the CC is zeroed to 0 on settlement day.

**Q4: Are settlement transactions editable in the Monthly Ledger?**
Read-only, visually distinct, labelled "Auto-settlement". Cannot be edited or
deleted individually; only unlinking the account stops future ones.

**Q5: Which billing cycle does each settlement cover?**
Previous month's balance — month M's ending CC balance is settled on
`settlementDay` of month M+1. Mirrors real CC direct debit behaviour.

**Q6: What if the CC balance at end of month M is zero or positive?**
Settlement is skipped — no transaction is created.

**Q7: What if the linked Girokonto has insufficient funds?**
An error-variant snackbar is shown on every app open until the projected
Girokonto balance on settlement day is ≥ the upcoming settlement amount.
The check uses the Projection Engine's forward data, not today's balance.

**Q8: If a CC is linked mid-year, do past months get retroactive settlements?**
No. A `linkedSince` ISO date is stored on the account. The Replay Loop only
generates settlement transactions from that date forward.

**Q9: What happens to existing settlement transactions if the CC is unlinked?**
They are preserved as permanent history. Unlinking stops future settlements only.

**Q10: What is the max value for `settlementDay`?**
28 — enforced at the UI input level, eliminating month-length edge cases without
any runtime clamping logic.

**Q11: If the settlement day or linked account is changed, are past settlements re-created?**
No. The change is applied going forward. `linkedSince` is reset to today,
leaving all existing settlement transactions intact.

**Q12: Where is the CC settlement configured?**
In the account creation modal (new fields appear when `CreditCard` kind is
selected) and in the account edit modal (same fields, pre-filled).

**Q13: How is `linkedSince` set?**

- New CC created with link configured: `linkedSince = openingDate`
- Existing CC linked later, or config changed: `linkedSince = today`

**Q14: Which account types can be the funding account?**
Girokonto only. Paying a CC from a Mortgage, Investment, Tagesgeld, or another
CreditCard makes no financial sense and is blocked at the UI level.

## Design

### Data Model

Three new optional fields on `Account`, populated only for `CreditCard` kind:

```ts
interface Account {
  // existing fields ...
  linkedAccountId?: string; // Girokonto funding account
  settlementDay?: number; // 1–28, day of month M+1 when settlement fires
  linkedSince?: string; // ISO date — Replay Loop ignores months before this
}
```

No new table required — stored as nullable columns on the existing `accounts`
table.

### Settlement Transaction Shape

A settlement is a standard transfer pair (two `Transaction` rows sharing a
`transferId`), with a reserved description prefix:

```
"Auto-settlement · <CC account name>"   // on the Girokonto (debit)
"Auto-settlement · <Girokonto name>"    // on the CC (credit)
```

A boolean flag `isAutoSettlement: true` (or a reserved `category` value) marks
the pair as read-only in the Monthly Ledger UI.

### Replay Loop Integration

```
for each month M (from openingDate to today):
  1. fire recurring transactions for month M
  2. apply variable spending for month M
  3. for each CreditCard account with linkedAccountId set:
       if linkedSince <= end-of-month(M):
         settlementAmount = CC balance at end of month M
         if settlementAmount < 0:                     // negative = debt
           on day settlementDay of month M+1:
             create transfer: Girokonto → CC for abs(settlementAmount)
```

Forward Projection follows the same logic.

### Insufficient Funds Check

Runs once on app start, after the Replay Loop completes:

```
for each CreditCard with linkedAccountId:
  upcomingSettlement = CC balance at end of current month (projected)
  fundingBalanceOnDay = Girokonto projected balance on settlementDay of next month
  if fundingBalanceOnDay < abs(upcomingSettlement):
    show error snackbar: "Upcoming CC settlement of €X.XX may not be covered"
```

### UI Changes

| Location               | Change                                                                                                            |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Account creation modal | `linkedAccountId` dropdown (Girokonto only) + `settlementDay` input (1–28) appear when `CreditCard` kind selected |
| Account edit modal     | Same fields, pre-filled with current values                                                                       |
| Monthly Ledger         | Settlement transfers shown read-only with "Auto-settlement" label                                                 |
| App shell / startup    | Error snackbar if insufficient funds detected                                                                     |

### Approaches

✅ **Settlement as Replay Loop event with `linkedSince` guard** — fits the
existing engine contract, no new scheduling infrastructure, no retroactive
side-effects.

❌ **Manual "Settle" button** — rejected; user forgets to press it, defeating
the purpose of automation.

❌ **Projection-only (no real transactions)** — rejected; ledger history would
be inaccurate.

❌ **Partial / minimum payment** — rejected; always full balance to keep the
model simple and honest.

❌ **Allow any account kind as funding account** — rejected; only Girokonto
makes financial sense.

## Implementation Plan

**Phase 1 — Data model + migration**

- Add `linkedAccountId`, `settlementDay`, `linkedSince` nullable columns to
  `accounts` table via a migration
- Update `Account` TypeScript interface and SQLite mapper
- No UI yet; verify schema with a manual query

**Phase 2 — Replay Loop + Projection Engine**

- Extend the Replay Loop to detect CC settlement events and insert transfer
  transaction pairs for months from `linkedSince` forward
- Extend the Forward Projection with the same logic
- Covered by unit tests against an in-memory store

**Phase 3 — Account creation / edit UI**

- Conditional fields in the account modal for `CreditCard` kind
- `linkedAccountId` dropdown filters to Girokonto accounts only
- `settlementDay` number input, max 28
- `linkedSince` set automatically (no user input)

**Phase 4 — Monthly Ledger read-only display**

- Detect `isAutoSettlement` flag and render settlement rows as read-only
- Apply distinct visual treatment ("Auto-settlement" label)

**Phase 5 — Insufficient funds warning**

- Post-replay check on app start
- Error snackbar component wired to the result

## Trade-offs

**Easier:** Cash flow timing is accurate; no manual data entry for the most
predictable monthly outflow; the Projection Engine automatically accounts for
the Girokonto drawdown.

**Harder:** The Replay Loop now has a look-back dependency (month M+1 settlement
depends on month M CC balance); ordering of replay steps must be explicit.

**Out of scope:**

- Partial / minimum payments
- CC interest modelling (balance is always paid in full)
- Multiple linked funding accounts per CC
- Tagesgeld, Investment, or cross-CC funding
