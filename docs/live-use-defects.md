# Live-Use Defects

Running intake for the **Live-Use Repair** epic — things that felt wrong while
using Horizon as the real personal finance tracker. Append as you find them;
this file is the input to the grill-me session, after which it stops growing
and the design log takes over.

## How to log one

Record what you did, what you expected, and what happened. Leave **Class**
blank — classification happens at triage, not at capture, because the two
entries below prove that "this used to work" is unreliable from memory.

| Class          | Meaning                                                    |
| -------------- | ---------------------------------------------------------- |
| `regression`   | Verifiably worked in an earlier version and no longer does |
| `product gap`  | Works exactly as coded; the coded behaviour is the problem |
| `never-worked` | Genuinely broken, and always was                           |

Verify `regression` with `git log -S"<some string from the code>" -- <path>`
before assigning it. Both entries below _felt_ like regressions and neither was.

---

## 1. Recurring transfer between accounts rejects negative amounts

**Did:** Added a recurring transaction from account A to account B, entering
`-500` on A expecting B to receive `+500`.
**Expected:** The signed pair to be accepted as entered.
**Actual:** "Transfer amount must be greater than zero."

**Class:** product gap
**Evidence:** `src/features/transactions/RecurringTransactionModal/RecurringTransactionModal.tsx:87`

```ts
if (linkedAccountId && parsedAmount <= 0) {
  setError("Transfer amount must be greater than zero.");
```

Deliberate, with a hand-written message. Transfers are modelled as "enter a
positive amount, the link derives the direction" — the signed pair is never
user-entered. Introduced `d2109d2` (2026-04-19, financial-projection-dashboard),
so it has never behaved otherwise.

**Open question for grill-me:** is the fix a clearer direction control on the
modal, or should the signed pair be directly expressible? These imply different
data models.

---

## 2. Mortgage Countdown card absent on the Dashboard after a fresh start

**Did:** Launched a freshly installed Horizon against an empty database.
**Expected:** The Mortgage Countdown card on the Dashboard.
**Actual:** No card at all.

**Class:** product gap
**Evidence:** `src/features/mortgage/MortgageCountdown/MortgageCountdown.tsx:75`

```ts
if (mortgageAccounts.length === 0) {
  return null;
}
```

A fresh database has no mortgage account, so the card correctly hides itself.
Introduced `bc4b132` (2026-04-12, account create modal) and unchanged since.
Invisible during development because dev databases always had a mortgage.

**Open question for grill-me:** should the card render an empty state inviting
you to add a mortgage account, or is silent absence right and the gap is really
in first-run onboarding? Likely a wider question than this one card — worth
auditing every Dashboard surface that returns `null` on empty data.

---

## 3.

**Did:**
**Expected:**
**Actual:**

**Class:**
**Evidence:**
