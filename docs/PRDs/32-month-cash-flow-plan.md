# Plan: Month Cash Flow

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/247

## Architectural decisions

These decisions apply to every phase:

- **Routes**:
  - New `GET /reports/month-cash-flow?month=YYYY-MM`, beside
    `/reports/year-comparison`. A malformed month answers
    `400 { issues }`, the reports route's existing shape.
  - A month at or after the current month runs the engine from the current
    month, as `/projection` does. An earlier month runs from the History
    Span's start, as `/projection/history` does. A month before the History
    Span returns empty groups.
  - `GET /projection` and `GET /projection/history` keep their paths and
    payload shapes. `GET /accounts` keeps `AccountWithBalance`; only the
    meaning of `balance` changes (Current Balance).
- **Schema**: there are no migrations. Recurring occurrences are never
  booked as Transactions (the Recurring-Only Model stays). Rules carry no
  effective dates, so Recurring History always uses today's rules.
- **Key models**:
  - **Recorded Balance** = Anchor Balance + stored Transactions after the
    Anchor Date (the storage SQL, unchanged in logic).
  - **Current Balance** = Recorded Balance + **Recurring History** through
    today.
  - `MonthCashFlowReport = { month, accounts: AccountFixedFlows[] }`, with
    `AccountFixedFlows = { accountId, flows: FixedFlow[] }`.
  - `FixedFlow`:
    ```ts
    kind: "recurring" | "settlement";
    recurringId?: string;              // recurring rows only
    date: string;                      // ISO
    description: string;
    category?: string;
    amount: number;                    // signed cents, for this account
    counterpartId?: string;
    side?: "source" | "destination";
    inAnchor: boolean;                 // blocked by the Anchor Gate, excluded from the net
    ```
  - The Month-End Balance is `{ basis: "actual" | "projected", cents }`
    or `{ basis: "unknown", knownFrom }`. It is derived on the client from
    the cached `PROJECTION` and `HISTORY`. It is not part of the report.
- **One firing rule**: one server module is the only place that decides
  firing, occurrence dates (day clamped to the month's length) and the
  Anchor Gate (a leg moves its account only when dated after its Anchor
  Date). The Replay Loop, the Forward Projection, Recurring History and the
  report all use it.
- **Derivation ownership**: the server derives the flows and balances; the
  client only joins the cached projection/history for the Month-End
  Balance.
- **Cache**: a branded per-month `monthCashFlowKey(month)`, minted like
  `monthTransactionsKey`, read through `useCachedResource`. Month page
  commits do not bump it. A future projected settlement moved by a
  CreditCard expense refreshes on the next visit, which is accepted.
- **Unknown** is always explicit, never `0`, on every surface.
- **Single mortgage**: unchanged.

---

## Phase 1: One firing rule

**User stories**: 53, 54, 55

### What to build

Extract the engine's private firing logic into the shared
recurring-occurrence module and make firing a pure function of the rule
and the month:

- A calendar-aware quarterly rule fires in every month of its cycle, the
  projection's first month included.
- A legacy rule without a month of year counts its cycle from its source
  account's Anchor month, in both the Replay Loop and the Forward
  Projection.

The engine calls the module instead of its own logic. Apart from the
firing fix, `/projection` and `/projection/history` output is unchanged.
You can check it in Outlook: a quarterly rule due this month now fires
this month, and Outlook and History agree on a legacy rule.

### Acceptance criteria

- [ ] Monthly, quarterly-with-month-of-year, annual and legacy rules fire in
      the right months regardless of where a run starts
- [ ] The current month's quarterly occurrence fires; the engine's
      current-month quarterly test is rewritten to the new rule
- [ ] Occurrence dates clamp to the month's length (31st in February, leap
      years)
- [ ] Anchor Gate: a leg on the Anchor Date is blocked, the day after
      passes, an account with no anchor passes
- [ ] Replay and forward loops agree on every legacy rule's firing months
- [ ] Existing projection and history tests pass, except where the firing
      fix changes them on purpose

---

## Phase 2: Fixed rows, end to end

**User stories**: 1–26, 52

### What to build

A future month on Month Overview shows its salary, transfers and
subscriptions:

- The engine exposes `projectMonths(…)`, which returns each monthly
  snapshot plus the flows applied in it. `projectBalances` becomes
  `projectMonths` with the flows dropped. The projection recurring entry
  gains the rule's `id`.
- `deriveMonthCashFlow` builds the report from the same run's applied
  flows, with **recurring rows only** for now:
  - plain income/expense legs, and transfer source and destination legs
    with their counterparts;
  - the capped Repayment Transfer in the payoff month;
  - capped-to-zero and plain-on-Mortgage rules excluded;
  - groups for every account kind in `sortOrder`, rows by date.
- The new route serves it; a month before the History Span gets empty
  groups.
- On the client, `useMonthCashFlow(month)` reads it under
  `monthCashFlowKey(month)`. The Fixed Flows card sits full width between
  MonthStatStrip and the columns, in its own `SectionState`
  (`month-section-cash-flow`), with a layout-matched skeleton.
- One group per account: Chip + name header, signed red/green rows with
  day block, description, category and a "→ ● / ← ● from" counterpart
  line, then a "Net fixed" footer. An empty group reads "No fixed flows
  this month.". Each row links to its source account page.
- No editing, no tabs, and theme tokens only. The card is composed from
  existing parts.

### Acceptance criteria

- [ ] Opening a future month lists that month's recurring flows per account
      instead of €0
- [ ] Source legs are red with "→ ● {destination}", destination legs green
      with "← ● from {source}"; a Repayment Transfer is a green inflow on
      the Mortgage
- [ ] Annual and quarterly rows appear only in their months; the payoff
      month shows the capped repayment; capped-to-zero and
      plain-on-Mortgage rules are absent
- [ ] Groups cover every account kind, follow `sortOrder`, rows ordered by
      date; "Net fixed" sums the group
- [ ] Route: `400 { issues }` on a malformed month; a future month runs
      forward; a past month matches History's run; a month before the
      History Span returns empty groups
- [ ] `/projection` payload unchanged; `projectMonths` reports applied
      flows including the capped repayment
- [ ] A revisited month paints from cache then revalidates; slow loads show
      the skeleton; a failed report shows the section error state without
      blanking the page; reduced motion is honoured
- [ ] Each recurring row links to its source account page

---

## Phase 3: Month-End Balance

**User stories**: 32–38

### What to build

Each group header shows where the account ends the month. A pure client
util, `monthEndBalance(month, currentMonth, snapshots, points, accountId)`,
follows the Past Lead-in's join rule:

- a month at or after the current month reads the projection snapshot's
  `projected` value;
- an earlier month reads the History point, where a number is "actual" and
  `null` is Unknown;
- a month neither source covers is Unknown.

The card's `SectionState` also waits on accounts, projection and history.
The header captions read "Month-end · Actual", "Month-end · Projected" or
"No data before {Mon YYYY}". Because the util reads the already-cached
`PROJECTION`/`HISTORY`, an expense added on the Month page moves the
balance straight away.

### Acceptance criteria

- [ ] Actual for a past month, Projected for the current and a future month
- [ ] Unknown for a `null` point, a month before the span, and a month past
      the projection horizon, never rendered as €0
- [ ] The figure equals Outlook / Trajectory Horizon / History for the same
      month and account
- [ ] Adding an expense on the Month page updates the Month-End Balance
      without a reload
- [ ] Util exported from the utils barrel, with its own test

---

## Phase 4: Recurring History in the Current Balance

**User stories**: 39–42, 48, 56, 57, 62

### What to build

The salary paid since the anchor counts toward the balance:

- `recurringHistory(accountId, accounts, recurrings, through)` returns the
  signed cents of the account's gated legs in (Anchor Date, `through`].
  Firing, dates and gating come from the recurring-occurrence module, and
  Mortgage legs are capped at the remaining Restschuld in date order.
- A new balance service, shaped like the settlement service, provides
  `findAllWithBalance`, `findByIdWithBalance` and `getTotalLiquid`. These
  return Current Balance = Recorded Balance + Recurring History through
  today.
- The storage methods keep their names but return `recordedBalance`.
  Storage `getTotalLiquid` and its SQL are removed.
- The accounts routes call the service. The client contract is unchanged.

The Dashboard balances and Total Liquid now include the recurring flows
since the anchor. An install with no recurring rules sees no change.

### Acceptance criteria

- [ ] Recurring History sums gated legs in (Anchor Date, through]; a leg
      later this month is excluded; a leg on the Anchor Date is excluded
- [ ] Transfer legs move both accounts with the right signs; Mortgage legs
      are capped
- [ ] Zero with no rules and when `through` is on or before the anchor
- [ ] Current Balance = Recorded Balance + Recurring History; Total Liquid
      sums only liquid accounts; an account without rules is unchanged
- [ ] Storage parity: `recordedBalance` equals `balanceAt(today)` on every
      driver
- [ ] Editing or deleting a rule changes the balance on the next read

---

## Phase 5: Recurring History in actuals

**User stories**: 43–47

### What to build

Past months after the anchor stop reading low:

- The engine keeps a per-account Recurring History accumulator, fed by
  every gated leg in both loops.
- For a month at or before the current month, `actual` =
  `balanceAt(endOfMonth)` + the accumulator through that month's end.
- The non-Mortgage "reset to actual" therefore keeps the current month's
  legs into month 1.
- A Mortgage is not reset, but its `actual` includes the accumulator, so
  its History value equals the replayed Restschuld from Known Since.
- Before the anchor the accumulator is 0, so Reconstructed Actuals are
  unchanged.
- The settlement lib's CreditCard closing balance becomes `balanceAt` +
  `recurringHistory` through the closing date, so a stored
  auto-settlement pulls what the engine projects.

### Acceptance criteria

- [ ] `actual` includes the accumulator after the anchor and is unchanged
      before it
- [ ] The current month's recurring legs survive into the projection's
      month 1
- [ ] The Mortgage's History value equals the replayed Restschuld from Known
      Since
- [ ] History and Monthly Savings for post-anchor months include their
      recurring flows
- [ ] A recurring subscription on a CreditCard is included in the stored
      settlement's closing balance
- [ ] `/projection` snapshots unchanged apart from the Phase 1 firing fix

---

## Phase 6: Honest around the anchor

**User stories**: 49–51

### What to build

The report and the card show the anchor month honestly:

- In an account's anchor month, legs blocked by the Anchor Gate are listed
  with `inAnchor: true`. They render with the existing dimmed treatment
  and an "In balance anchor" note, and are left out of "Net fixed".
- In months before the anchor month, the account's group lists no rule
  rows. It reads "Before {D MMM YYYY} this account's history comes from
  its statements".

### Acceptance criteria

- [ ] Anchor-month gate-blocked legs appear muted as "In balance anchor"
      and are excluded from "Net fixed"
- [ ] Legs after the Anchor Date in the same month render normally and
      count
- [ ] Before the anchor month no rule rows are listed and the
      before-anchor note shows
- [ ] An account without an anchor is unaffected

---

## Phase 7: Settlement rows

**User stories**: 27–31

### What to build

CreditCard auto-settlements join the card as `kind: "settlement"` rows,
listed on both the CreditCard and its funding account and linking to the
CreditCard:

- months at or before the current month use the stored auto-settlement
  Transactions;
- future months use the engine's pending settlement from the same run.

### Acceptance criteria

- [ ] A past or current month lists the stored settlement on both the card
      and the funding account, with matching opposite signs
- [ ] A future month lists the engine's projected settlement
- [ ] Settlement rows link to the CreditCard and count in "Net fixed"
- [ ] A CreditCard expense changes a future month's projected settlement by
      the next visit to that month

---

## Phase 8: Docs

**User stories**: 58–61

### What to build

- The Month Overview PageHeader subtitle reads "Fixed flows · Variable
  spending · Month-end balances".
- The manual's Month Overview topic gains a "Fixed flows" detail and an
  updated blurb that explain rows, muted rows and the balance basis.
- Accounts and Getting Started explain three points:
  - the balance counts recurring flows since the As-of date;
  - editing a rule rewrites the months since the anchor;
  - re-anchoring is the correction.
- The release notes carry the upgrade caveat for balances anchored in the
  past, including re-anchoring if a figure looks doubled.
- The glossary and the CLAUDE.md / README build status are updated when
  the epic closes.

### Acceptance criteria

- [ ] New subtitle renders on Month Overview
- [ ] Manual topics updated and copy matches shipped behaviour
- [ ] Release notes include the anchored-balance caveat
- [ ] Ubiquitous language and build status updated
