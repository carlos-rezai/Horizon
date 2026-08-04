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

## 3. Every Import review row shares one DOM id, so row labels focus the wrong picker

**Did:** Opened the Import wizard's Review step with a multi-row statement and
clicked the "Category" label on the second row.
**Expected:** Focus to land on that row's own category picker.
**Actual:** Focus lands on the _first_ row's picker. The same applies to the
inline "New category name" field once a row is adding a category.

**Class:** never-worked
**Evidence:** `src/features/categories/CategorySelect/CategorySelect.tsx:71,74,94,97`

```tsx
<StyledLabel htmlFor="category-select">
  Category
  <Select id="category-select" aria-label="Category" ...>
```

Both ids are hardcoded string literals, and `ReviewTable` renders one
`CategorySelect` per row (`ReviewTable.tsx:94`), so an N-row statement puts N
elements in the document sharing `id="category-select"` — invalid HTML. Every
`<label for="category-select">` then resolves to the first match in document
order.

Measured directly against two mounted `CategorySelect`s: both labels report a
`.control` of the _first_ select. It has been this way since the component was
written; the other two call sites
(`TransactionCreateModal`, `RecurringTransactionModal`) each render exactly one
at a time inside a dialog, which is why it never showed up before the Review
table started rendering them in a list.

Not a screen-reader-only problem: the accessible name is still correct via
`aria-label`, so the pickers are announced properly and are individually
operable. What breaks is label-click targeting.

**Fixed** 2026-08-04: both ids now derive from React's `useId()`, so each
instance carries its own. Locked by three tests in `CategorySelect.test.tsx`
that mount three pickers at once and assert distinct ids, that every
`<label>.control` resolves to its own picker, and that two rows adding a
category at the same time get distinct inline-add fields.

**Found:** 2026-08-04, while investigating the `ImportWizard` test flake — the
test drives rows by `getAllByLabelText` index, which is what put the duplicate
ids under a microscope. The duplicate ids are _not_ the cause of that flake:
`getAllByLabelText` still returns the pickers in document order, so the test's
indexing is correct.
