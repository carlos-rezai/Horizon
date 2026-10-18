# Live-Use Defects

Running intake for the **Live-Use Repair** rounds — things that felt wrong
while using Horizon as the real personal finance tracker. Live use is reviewed
in rounds: each round's defects are frozen at a grill-me session and become one
**Live-Use Repair — Round N** epic. Anything found afterwards is appended under
the next round's heading, never into a frozen round.

**Round 1** (defects #1–#4) was frozen at the 2026-10-15 backlog grill; #5 was
added at the Round 1 grill the same day as a recorded exception. Log new
findings under **Round 2** at the bottom of this file.

**Round 1 closed** 2026-10-16: #1, #2, #4 and #5 fixed in issues #221–#227;
#3 was already fixed on 2026-08-04, before the round began. Round 2 starts at
#6.

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

**Answered (backlog grill, 2026-10-15): direction control, display-only.** The
same live session surfaced the display half of this defect: a €955 monthly
recurring transfer Postbank → Mortgage (category Transfer > Mortgage) renders
as **+955 in green** on Postbank, and the Mortgage account lists nothing. Cause:
a recurring transfer is one stored row on the source account with a positive
amount and `linkedAccountId` (`src/types/recurring.ts`);
`RecurringTransactionList` renders `<Money cents={rt.amount} sign />` and lists
only rows whose `accountId` is the viewed account. One-off transfers, by
contrast, are already a signed pair linked by `transferId`
(`src/types/transaction.ts`) — the two models disagree.

Decision: keep the single stored row — no migration, the projection engine is
untouched (it already treats the row correctly; the payoff month proves it).
Fix it at the edges:

- **Entry:** the modal gets a direction control (to / from account); the user
  always types a positive amount and the sign follows the direction.
- **Display:** the source account renders the row as **−amount in red**; the
  destination account shows a **read-only mirrored row, +amount in green**,
  labelled with its origin ("from Postbank") and editable only from the source.

Goal: recurring transfers read exactly like one-off transfers.

**Fixed** 2026-10-16 in two issues. Display — issue #223 (RED `6ceb8d3`,
build `9461d81`): `recurringAmountFor` signs a transfer per viewed account, so
the source reads −amount in red and the destination shows a mirrored row,
+amount in green, labelled "from …" and linking to the source to edit. Entry —
issue #224 (RED `f5eab36`, test fix `369795f`, build `ad38b51`): the
modal's "Transfer" select gains a To / From Direction chip pair; amounts are
typed positive, and "From B" is stored as B's transfer to this account. The
hook passes the payload's `accountId` through, the update schema takes an
optional `accountId` so a direction flip is one `PATCH`, and the route rejects
non-positive linked amounts and self-links on create and on the merged
`PATCH` row with `{ issues }`. The Mortgage-link warning is gone and the
manual's transfers copy is rewritten.

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

**Answered (backlog grill, 2026-10-15):** empty state. On an empty database the
card renders an editable empty state whose action creates the Mortgage account
and its origination in one flow — original principal, start date, term in
years, and today's Restschuld (the opening balance) — instead of the current
Accounts-page detour followed by the pencil edit. Real case: a 10-year contract
entering year 4, where the paid-off-to-date amount must show from day one.
The origination editor and "% paid off" already exist; the gap is only that
nothing leads to them. The wider "show the past, not just the future" ask this
raised is split out as the **Financial History** epic.

The flow must also capture the **repayment transfer** (monthly rate from a
funding account, optional annual Sondertilgung). The payoff month comes only
from `findMortgagePayoffMonth` walking the projection — the term is used for
the "year N of M" label alone, and no interest is modelled — so an origination
without a linked transfer shows no payoff, and an under-entered transfer shows
a misleadingly late one (a €90k Restschuld read as Jun 2037 until the real
€955/month + €6,500 November Sondertilgung were set up, then Oct 2031). A
"contract end vs projected payoff" line was considered and dropped: with the
real transfers entered, the projected date alone is right.

**Fixed** 2026-10-16 in three issues. Footer — issue #225 (RED `0d6c826`,
build `2706f2d`): a mortgage no recurring transfer pays into reads "No
repayment set up — add a recurring transfer into this mortgage to see the
payoff date." instead of a misleading "Not paid off within …". Empty state and
setup — issue #226 (RED `dd475e3`, build `234ad05`): with no Mortgage account
the card renders "No mortgage yet" and a **Set up mortgage** button opening
`MortgageSetupModal`, one form that creates the Mortgage account and its
origination through `POST /mortgages` in one transaction. Repayment — issue
#227 (RED `c38317b`, test fix `c98d973`, build in the `feat:` commit closing
#227): the form's Repayment group (Paid from, Monthly rate, day of month,
optional annual Sondertilgung defaulting to November) writes the Recurring
Transfers in the same transaction, so one save ends with a payoff date. The
KPI mortgage tiles were left always-on, as they have been since #132.

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

**Fixed** 2026-08-04 (already fixed before Round 1; recorded as such at the
round's close, 2026-10-16): both ids now derive from React's `useId()`, so each
instance carries its own. Locked by three tests in `CategorySelect.test.tsx`
that mount three pickers at once and assert distinct ids, that every
`<label>.control` resolves to its own picker, and that two rows adding a
category at the same time get distinct inline-add fields.

**Found:** 2026-08-04, while investigating the `ImportWizard` test flake — the
test drives rows by `getAllByLabelText` index, which is what put the duplicate
ids under a microscope. The duplicate ids are _not_ the cause of that flake:
`getAllByLabelText` still returns the pickers in document order, so the test's
indexing is correct.

---

## 4. Outlook accordion hides per-account balances behind summary columns

**Did:** Opened the Financial Plan's Outlook accordion to read how each
account develops year by year.
**Expected:** A balance per account (Giro 1, Giro 2, Tagesgeld, …) beside the
totals.
**Actual:** Only Period · Total Liquid · Restschuld · Net Cashflow ·
Sondertilgung, under a section title reading "Projection Accordion".

**Class:** product gap
**Evidence:** `src/features/projection/ProjectionAccordion/ProjectionAccordion.tsx:130`
(title) and the `StyledColumnHeader` block below it. Before #138 (`1fe7ee1`,
2026-06-15) the accordion rendered per-account columns via
`buildAccountColumns` (`src/utils/projection/projection.ts:24`, still present);
#138 replaced them with summary columns. Working as coded — the coded choice
is what is being reverted.

**Decided (backlog grill, 2026-10-15):**

- Section title becomes **"Projection"** (kept, renamed — also in
  `ProjectionAccordionSkeleton.tsx:35`).
- Columns become **Period · one per account · Total Liquid · Restschuld**, in
  both the year header rows (end-of-year balances, as Total Liquid and
  Restschuld already are) and the month rows.
- **Net Cashflow and Sondertilgung columns are removed.** The Sondertilgung
  month keeps its row highlight so it still stands out.
- **Every non-Mortgage account** gets a column — Girokonto, Tagesgeld,
  Investment, CreditCard. The Mortgage is the Restschuld column.
- Column order follows the user's account **`sortOrder`**, not
  `buildAccountColumns`' kind order, which predates `sortOrder`.
- Each account column header carries the account's **colour chip** (Account
  Color Identity).

**Fixed** 2026-10-15 (issue #221; RED `73c3191`, build in the `feat:` commit
closing #221): the accordion reads "Projection", with columns Period · one per
non-Mortgage account in sortOrder (colour chip + name) · Total Liquid ·
Restschuld, in year and month rows; the body scrolls horizontally inside its
card. Net Cashflow and Sondertilgung columns are gone; ST months stay tinted,
now from `effectiveSTMonths` (annual transfers before payoff) instead of
Restschuld step-downs. The skeleton matches; the Year Archive keeps Net
Cashflow.

---

## 5. Outlook summary counts every Restschuld step-down as a Sondertilgung

**Did:** Set up a €955 monthly recurring transfer Postbank → Mortgage plus a
€6,500 November Sondertilgung, then read the Outlook summary.
**Expected:** Total Sondertilgung and its count to cover the November
payments only.
**Actual:** Every monthly repayment is counted as a Sondertilgung — twelve a
year, and the total includes all the monthly rates.

**Class:** product gap
**Evidence:** `src/utils/outlook/outlook.ts:27`

```ts
for (let i = 1; i < points.length; i++) {
  const step = points[i - 1].restschuld - points[i].restschuld;
  if (step > 0) {
```

The derivation assumes the ST-only model ("the Restschuld only ever decreases
via a Sondertilgung"), but the engine reduces Restschuld for **any** Recurring
Transfer into a Mortgage (`server/src/lib/projection/projection.ts:93`).
`deriveSTMonths` (`src/utils/projection/projection.ts:60`) already identifies
Sondertilgung from the recurring's shape and is what `TrajectoryHorizon` and
`PlanSummary` use.

Introduced `3f195e6` (2026-06-15, #138 `deriveOutlookSummary` util) and
unchanged since — working as coded under the ST-only assumption.

**Found:** 2026-10-15, during the Live-Use Repair — Round 1 grill, after the
freeze. **Added to Round 1** by the user's decision (design log 29, Q3): the fix
is small, and Round 1's Mortgage Setup makes a monthly repayment transfer the
default path, so shipping Round 1 without it would spread the miscount to every
mortgage. A deliberate, recorded exception to the freeze rule.

**Decided (Round 1 grill, 2026-10-15):** a Sondertilgung is an annual
Repayment Transfer firing while Restschuld remains (`effectiveSTMonths`), read
by every Sondertilgung surface — Outlook summary, Projection accordion,
`PlanSummary`, `TrajectoryHorizon`. The monthly rate is the Darlehen, never
Sondertilgung.

**Fixed** 2026-10-15 (issue #222; RED `ce749bc`, build in the `feat:` commit
closing #222): `deriveOutlookSummary` takes the effective ST map as a second
argument and totals and counts from it, so a monthly-only repayment yields zero
Sondertilgung and zero payments. `OutlookSummary` receives the recurring
transactions; `PlanSummary` and `TrajectoryHorizon` switch from
`deriveSTMonths` to `effectiveSTMonths`, so no surface reports Sondertilgung
after payoff and the payoff year's payment is capped at the Restschuld left.
The reference case (€955/month, €6,500 each November, payoff Oct 2031) reads
−€32,500 over 5 payments. The manual's Total Sondertilgung definition is
rewritten to match.

---

# Round 2

_Open — append new live-use findings here, numbered from 6._

## 6. Deleting an import from Import History happens at once, with no confirmation

**Did:** Expanded a year in Import History and clicked a statement's trash
icon ("Delete import").
**Expected:** A confirmation (the in-app `ConfirmModal`) or an Undo before
the statement and its transactions are removed.
**Actual:** The import and its 3 transactions were deleted immediately. Only
a snackbar ("Import … deleted · 3 transactions removed") followed.

**Found:** 2026-10-18, during the UI Consistency Audit runtime pass (issue
#267), on the throwaway audit database. Logged here because it is behaviour,
not appearance.

---

## 7. Month spending rows and Account Detail recurring rows can't be reached by keyboard

**Did:** Tabbed through Month Overview → Variable Spending, and through a
Girokonto's Recurring transactions on Account Detail.
**Expected:** Each row that opens an edit modal on click is focusable and
opens on Enter, like the Fixed Flows rows and the Mortgage's incoming
recurring rows, which are links.
**Actual:** The rows are `div`s with a click handler and no role or
`tabindex`, so the keyboard skips them and the edit modal is mouse-only.

**Found:** 2026-10-18, UI Consistency Audit runtime pass (#267).

---

## 8. Import review row checkboxes are all named "toggle"

**Did:** Inspected the accessible names on the Import wizard's Review step.
**Expected:** Each row's include checkbox is named for its row (for example
"Include MUSTER STROM AG").
**Actual:** Every row's checkbox button has the accessible name "toggle".
Screen readers hear "toggle" four times, with no row context.

**Found:** 2026-10-18, UI Consistency Audit runtime pass (#267).

---

## 9. Money inputs show numbers in English format

**Did:** Opened Edit savings goal, Edit transaction and Mortgage details on
existing data.
**Expected:** Prefilled amounts in the German format the app displays
everywhere else (`200,00`, `8,60`, `260.000,00`).
**Actual:**

- Savings goal targets read `200.00`, `500.00` and `300.00`.
- The transaction amount reads `8.6`.
- The mortgage principal reads `260000,00` (a comma decimal, but no
  thousands separator).

So three money inputs follow three different conventions.

**Found:** 2026-10-18, UI Consistency Audit runtime pass (#267). Copy and
format are out of scope for the audit.
