## Problem Statement

I use Horizon as my real personal finance tracker, and five things about it
are wrong in ways that development never showed me.

When I added a recurring transfer from one account to another, I typed
`-500` on the source — the way money leaving an account should look — and
the form refused it with "Transfer amount must be greater than zero." When I
then set up my €955 monthly mortgage rate from Postbank, entered positive,
Postbank
showed the transfer as **+955 in green**, as if the money arrived there,
and the Mortgage account listed nothing at all. The Account Detail stat
strip counted it as income while the projection subtracted it. Recurring
transfers read nothing like one-off transfers, which already show a signed
pair on both accounts.

When I launched a fresh install against an empty database, the Mortgage
Countdown card was simply missing from the Dashboard — no card, no hint. To
get a mortgage with a payoff date I had to create an account on the Accounts
page, open its pencil editor for the origination, then go to a funding
account and create two recurring transfers by hand. Nothing leads there, and
a mortgage without a repayment transfer tells me it is "Not paid off within
10-year horizon", which is misleading when nothing is paying it off.

The Financial Plan's Outlook accordion, titled "Projection Accordion", only
shows totals — Total Liquid, Restschuld, Net Cashflow, Sondertilgung. I want
to see how each of my accounts develops year by year, which is what it used
to show before the design handover recompose.

And the Outlook summary's "Total Sondertilgung" counts every Restschuld
step-down as a Sondertilgung. With my real setup (€955/month, €6,500 each
November, payoff around Oct 2031) it reports roughly −€90,000 over 60+
"annual payments" — the whole Restschuld — instead of about −€32,500 over
five. The accordion highlights every month as a Sondertilgung month for the
same reason, and the Dashboard keeps reporting €6,500 a year after the
mortgage is paid off.

A sixth defect from the same intake — duplicate `CategorySelect` ids in the
Import review table — was already fixed on 2026-08-04 and is recorded here
as closed so the round reads complete.

## Solution

**Recurring transfers read like one-off transfers.** The recurring modal
replaces its single "Transfer to account" select with a **Transfer** select
plus a **Transfer Direction** chip pair, "To" / "From", shown once an account
is chosen. The amount is always typed positive; the direction decides which
account the money leaves. The source account lists the transfer as
**−amount in red** and opens it for editing; the destination account lists a
read-only **Mirrored Transfer Row**, **+amount in green**, labelled
"from <source>", which links to the source account where it can be edited.
The stat strip's recurring net uses the same signed rule, so it agrees with
the projection. Direction can be flipped when editing.

**Mortgage Countdown always invites setup.** With no Mortgage account, the
card shows an empty state — "No mortgage yet", "Add your mortgage to see
what's paid off and when it's done.", **Set up mortgage**. The button opens a
one-form **Mortgage Setup**: the mortgage (name, Restschuld today, as of),
its origination (original principal, start date, term), and its repayment
(paid from, monthly rate, day of month, optional annual Sondertilgung and its
month), with a live "% paid off" preview. One save creates all of it
atomically. With no Girokonto or Tagesgeld to pay from, the repayment group
becomes a note and the mortgage is created without transfers. A mortgage
with no repayment transfer gets an honest footer: "No repayment set up — add
a recurring transfer into this mortgage to see the payoff date."

**The Outlook accordion shows each account.** It is titled **Projection**
and its columns are Period · one per non-Mortgage account (in the user's
account order, each with its colour chip) · Total Liquid · Restschuld. Year
rows show each account's projected end-of-year balance. Net Cashflow and
Sondertilgung columns go; Sondertilgung months keep their highlight. Many
accounts scroll horizontally inside the card.

**Sondertilgung means one thing everywhere.** A Sondertilgung is an annual
**Repayment Transfer** firing while the mortgage still has Restschuld left.
The Outlook summary, the Projection accordion highlight, the Dashboard
Plan Summary and the Trajectory Horizon all read that one rule. The monthly
rate is the Darlehen, never Sondertilgung.

**The manual follows.** Every behaviour change updates the in-app User
Manual in the same phase, so it describes Horizon as it behaves.

## User Stories

### Recurring transfer entry (defect #1)

1. As a Horizon user, I want a Transfer select and a To / From direction
   choice on the recurring modal, so that I can say which way the money
   moves without encoding it in the sign of the amount.
2. As a Horizon user, I want the direction choice to appear only once I pick
   a transfer account, so that plain recurring transactions stay as simple
   as they are today.
3. As a Horizon user, I want the direction to default to "To", so that the
   common case — money leaving the account I am viewing — needs no extra
   click.
4. As a Horizon user on my Mortgage account, I want to create a transfer
   "From Postbank", so that I can set up the repayment from the account it
   pays into.
5. As a Horizon user, I want a "From" transfer stored on the other account
   as its source, so that the transfer behaves exactly like one I created
   from that account.
6. As a Horizon user, I want to type a transfer amount as a positive number,
   so that I never have to think about the sign of a transfer.
7. As a Horizon user who types a negative or zero transfer amount, I want
   the message "Enter the transfer amount as a positive number — the
   direction sets which way it moves.", so that I know how to fix it.
8. As a Horizon user, I want plain (non-transfer) recurring transactions to
   keep signed entry, so that income and expenses work as they always have.
9. As a Horizon user editing an existing transfer, I want its amount field
   seeded with the positive amount, so that I do not see a confusing sign.
10. As a Horizon user editing an existing transfer, I want to flip its
    direction, so that I can fix a transfer I entered the wrong way round
    without deleting and recreating it.
11. As a Horizon user who flips a transfer's direction, I want it to leave
    this account's own list and reappear as a mirrored row, so that the
    list reflects the new source.
12. As a Horizon user, I want the server to reject a transfer with a
    non-positive amount or one linked to its own account, so that no other
    client path can store a transfer the modal would refuse.
13. As a Horizon user, I want validation errors answered in the same
    `{ issues }` shape as every other route, so that the client can show
    them consistently.
14. As a Horizon user linking a transfer to a Mortgage, I no longer want a
    warning that only Sondertilgung should point at a mortgage, so that my
    monthly repayment transfer is not called a mistake.

### Recurring transfer display (defect #1)

15. As a Horizon user, I want a transfer on its source account shown as
    −amount in red, so that money leaving the account looks like money
    leaving.
16. As a Horizon user, I want the destination account to list the transfer
    as +amount in green, so that I can see what arrives there.
17. As a Horizon user, I want the mirrored row labelled "from <source>" with
    the source's colour chip, so that I know where the money comes from.
18. As a Horizon user, I want clicking a mirrored row to take me to the
    source account, so that I can edit the transfer where it lives.
19. As a Horizon user, I want a mirrored row never to open the edit modal,
    so that one transfer has exactly one place it is edited.
20. As a Horizon user, I want plain recurring transactions shown with their
    stored sign, unchanged, so that nothing else in the list moves.
21. As a Horizon user, I want the Account Detail recurring net per month to
    count a transfer as negative on its source and positive on its
    destination, so that the stat strip agrees with the projection.
22. As a Horizon user, I want the recurring count on Account Detail to
    include mirrored rows, so that it counts what the list shows — every
    recurring that moves this account's balance.

### Mortgage Countdown empty state (defect #2)

23. As a first-time Horizon user with no Mortgage account, I want the
    Mortgage Countdown card to render an empty state instead of
    disappearing, so that I know the feature exists and the app is not
    broken.
24. As a first-time user, I want the empty state to carry a "Set up
    mortgage" button, so that I can start from where I noticed the gap.
25. As a Horizon user with at least one Mortgage account, I want the card
    to behave as it does today, so that the empty state never competes with
    real data.
26. As a Horizon user with no mortgage, I want the KPI strip's mortgage
    tiles to stay hidden, so that the Dashboard shows one invitation, not
    two.

### Mortgage Setup (defect #2)

27. As a first-time user, I want one form that creates my mortgage, its
    origination and its repayment, so that I end with a working mortgage
    and payoff date in one step.
28. As a user, I want the mortgage name to default to "Mortgage", so that I
    can accept it if I only have one.
29. As a user, I want to enter the Restschuld I know today and the date it
    is as of (default today), so that I start from the number on my bank
    statement.
30. As a user, I want to enter the original principal, start date and term
    in years, so that "% paid off" and "year N of M" are right from day one
    — including for a 10-year contract entering year 4.
31. As a user, I want the form to refuse an original principal below the
    Restschuld, a start date after the as-of date, or a term outside 1–40
    years, so that the origination is consistent.
32. As a user, I want a live "% paid off" preview while I type, so that I
    can check the numbers before saving.
33. As a user, I want to choose the Girokonto or Tagesgeld the repayment is
    paid from, so that the projection debits the right account.
34. As a user, I want to enter the monthly rate and the day of month it is
    paid, so that the Darlehen is modelled as a monthly Repayment Transfer.
35. As a user, I want to optionally enter an annual Sondertilgung and its
    month (default November), so that the payoff date accounts for it.
36. As a user who enters a Sondertilgung amount, I want its month required,
    so that the annual transfer always has a month to fire in.
37. As a user with no Girokonto or Tagesgeld, I want the repayment group
    replaced by "Add a Girokonto to set up the monthly repayment." and still
    be able to create the mortgage, so that Restschuld and "% paid off" are
    available on their own.
38. As a user, I want the new mortgage to get a random account colour like
    any newly created account, so that it has a colour identity from the
    start; I can change colour and icon later on the account page.
39. As a user, I want the setup saved all-or-nothing, so that a failure
    never leaves a half-set-up mortgage that the empty state no longer
    offers to fix.
40. As a user, I want the repayment transfers created with category
    Transfer and the descriptions "Mortgage repayment" and "Sondertilgung",
    so that they are recognisable in the recurring list.
41. As a user, I want the Dashboard to refresh after setup, so that the
    countdown card, KPI tiles and trajectory show the new mortgage
    immediately.
42. As a user who prefers the Accounts page, I want creating a Mortgage
    account there to keep working as today, so that the plainer path still
    exists.

### Mortgage without repayment (defect #2)

43. As a user whose mortgage has no repayment transfer, I want the card
    footer to say "No repayment set up — add a recurring transfer into this
    mortgage to see the payoff date.", so that I know why there is no payoff
    date.
44. As a user whose mortgage has a repayment transfer but does not pay off
    within the horizon, I want the existing "Not paid off within …" footer,
    so that the two situations are told apart.

### Projection accordion (defect #4)

45. As a Horizon user, I want the Outlook accordion titled "Projection", so
    that its name says what it shows.
46. As a user, I want one column per non-Mortgage account — Girokonto,
    Tagesgeld, Investment, CreditCard — so that I can read how each account
    develops.
47. As a user, I want accounts hidden from the Trajectory chart still shown
    as columns, so that the chart flag does not hide data in the table.
48. As a user, I want the account columns in my own account order, so that
    the table matches the rest of the app.
49. As a user, I want each account column header to show the account's
    colour chip and name, so that columns match the account's colour
    identity.
50. As a user, I want each year row to show each account's projected
    end-of-year balance beside Total Liquid and Restschuld, so that the
    year summary carries the per-account picture.
51. As a user, I want the expanded month rows to show each account's
    projected balance, so that the month view has the same columns.
52. As a user, I want the Net Cashflow and Sondertilgung columns gone, so
    that the table focuses on balances.
53. As a user, I want Sondertilgung months still highlighted, so that they
    stand out without a column.
54. As a user with many accounts, I want the accordion to scroll
    horizontally inside its card with Period as the first column, so that
    no column is crushed.
55. As a user, I want the loading skeleton to match the new column layout,
    so that the page does not shift when data arrives.

### Sondertilgung rule (defect #5)

56. As a user, I want a month to count as a Sondertilgung month only when an
    annual Repayment Transfer fires in it, so that my monthly rate is never
    called a Sondertilgung.
57. As a user, I want Sondertilgung counted only while Restschuld remains,
    with the last one capped at what was left, so that no surface claims a
    payment the engine refunds after payoff.
58. As a user, I want the Outlook summary's Total Sondertilgung and its
    "N annual payments" count to cover only the annual extras up to payoff,
    so that the tile reports what its label says.
59. As a user, I want the Dashboard Plan Summary to stop reporting
    Sondertilgung for years after payoff, so that it agrees with the
    Outlook summary.
60. As a user, I want the Trajectory Horizon's Sondertilgung marks to use
    the same rule, so that all four surfaces agree.
61. As a user with no annual Repayment Transfer, I want no Sondertilgung
    months and a zero total anywhere, so that a monthly-only repayment is
    reported honestly.

### Manual and round close

62. As a user reading the in-app manual, I want the recurring transfers
    topic to describe the Transfer select, To / From direction, positive
    amounts, red/green pairing and mirrored rows, and that monthly
    repayments and Sondertilgung are both transfers into a Mortgage, so that
    it matches the app.
63. As a user reading the manual, I want the Getting Started origination
    step and the Mortgage Countdown topic to describe the empty state, the
    one-form setup and the no-repayment footer.
64. As a user reading the manual, I want the Outlook accordion topic to
    describe the "Projection" title and per-account columns, and the
    Outlook summary topic to say Total Sondertilgung counts only the annual
    extras up to payoff.
65. As the developer, I want defects #1, #2, #4 and #5 marked resolved in
    the live-use intake with their commits and #3 recorded as already fixed,
    so that Round 1 reads complete and Round 2 starts clean at #6.

## Implementation Decisions

### Recurring transfer — one stored row, three readings

- The stored model and the projection engine are **unchanged**. A Recurring
  Transfer stays one row on its **source** account with a positive amount
  and `linkedAccountId` pointing at the destination. No migration.
- **Transfer Direction** is a UI choice, never stored. On account A,
  "To B" emits `accountId: A, linkedAccountId: B`; "From B" emits
  `accountId: B, linkedAccountId: A`.
- The recurring form payload gains a required `accountId` (the source) that
  the modal always sets. The recurring-transactions hook stops overwriting
  it with the viewed account; its create/update payload types gain
  `accountId`.
- The recurring update schema gains an optional `accountId`, so flipping
  direction on edit is a single `PATCH`.
- Server-side rules: on create, a row with `linkedAccountId` must have
  `amount > 0` and `linkedAccountId !== accountId` (zod `superRefine`). On
  `PATCH`, the same two rules are checked against the **merged** row
  (stored + patch) before writing. Both answer `{ issues }`.
- The direction control reuses the one-off transfer edit modal's
  `FormField label="Direction"` + `ChoiceChip` row pattern.
- The "ST-only model" warning on Mortgage links is removed; the glossary
  retires **ST-only Model**. Stale ST-only comments in the accordion and
  outlook utils are rewritten in the phases that touch them.
- The recurring-transactions hook returns rows where the viewed account is
  either the owner or the linked account.
- New pure helper `recurringAmountFor(recurring, accountId): number` —
  signed cents as the recurring lands on that account: a plain recurring as
  stored, a transfer negative on its source and positive on its
  destination, 0 if it does not touch the account. Exported through the
  utils barrel.
- `recurringNetPerMonth` is rewritten on top of `recurringAmountFor`. The
  engine's Mortgage cap is **not** reproduced — the stat strip is an
  average of rules, not a simulation.
- The recurring list gains an `accountId` prop (the viewed account) and
  renders `recurringAmountFor` with `<Money sign />`'s existing gain/loss
  tone — no new tokens. Mirrored rows use `DataRow`'s existing `to`
  (link to the source account page) instead of `onClick`, with a
  "← ● from <source>" linked line; owned transfers keep "→ ● <destination>".

### Mortgage Countdown and Mortgage Setup

- `MortgageCountdown` with **zero** Mortgage accounts renders a `Card` with
  its usual section head holding the shared `EmptyState` (icon `Landmark`,
  title, hint, "Set up mortgage" button). No new empty-state component. KPI
  mortgage tiles keep hiding.
- `MortgageCountdown` gains a `recurringTransactions` prop, passed by the
  Dashboard page (which already holds them). New pure helper
  `hasRepaymentTransfer(recurrings, mortgageId): boolean` in the mortgage
  utils selects the no-repayment footer.
- New feature component `MortgageSetupModal` in the mortgage feature. One
  form, three groups, no wizard:

  | Group       | Field                | Maps to                           | Rule                                |
  | ----------- | -------------------- | --------------------------------- | ----------------------------------- |
  | Mortgage    | Name                 | account name                      | required, default "Mortgage"        |
  |             | Restschuld today     | account opening balance           | > 0                                 |
  |             | As of                | account opening date              | default today                       |
  | Origination | Original principal   | original principal                | ≥ Restschuld                        |
  |             | Start date           | start date                        | ≤ As of                             |
  |             | Term (years)         | term years                        | integer 1–40                        |
  | Repayment   | Paid from            | repayment source account          | Girokonto or Tagesgeld              |
  |             | Monthly rate         | monthly Recurring Transfer amount | > 0                                 |
  |             | Day of month         | day of month (both transfers)     | `Stepper` 1–31, default 1           |
  |             | Annual Sondertilgung | annual Recurring Transfer amount  | optional; > 0 when given            |
  |             | in month             | month of year                     | required when ST given, default Nov |

  Colour defaults to a random account palette entry, as account creation
  does; icon unset. Live "% paid off" preview reuses `percentPaidOff`.

- New endpoint **`POST /mortgages`**, body validated by a
  `MortgageSetupSchema` (zod), answering `{ issues }` on failure and the
  created account (with balance) on success. Follows the routes folder
  convention (router, schema module, route test).
- `Storage` gains `mortgages.create(setup: MortgageSetup):
Promise<AccountWithBalance>`; the `MortgageSetup` type lives with the
  storage types. The SQLite implementation creates the account, its
  origination and up to two Recurring Transfers inside one
  `db.transaction`, like the existing transfer and import writes. Transfers
  are written with category "Transfer" and descriptions "Mortgage
  repayment" / "Sondertilgung".
- Account creation with kind Mortgage on the Accounts page is unchanged.
- "Restschuld today / As of" anticipates Balance Anchor by naming only; it
  is stored as opening balance / opening date. No anchor concept is added.

### Projection accordion

- `buildAccountColumns` keeps its input order (the server already returns
  accounts by `sort_order`), drops `KIND_ORDER`, and adds `color` (resolved
  account colour) to `AccountColumn { id, name, kind, color }`. Every
  non-Mortgage account is a column, regardless of `showInTrajectory`.
- `aggregateYearSummaries` reshapes: both its point and summary types carry
  `month`/`year`, `totalLiquid`, `restschuld` and `accounts:
Record<string, number>` (projected balance per non-Mortgage account;
  end-of-year on the summary). `netCashflow` and `sondertilgung` leave both
  types. Projected values only — no `actual` mixing.
- `ProjectionAccordion` is titled "Projection", gains a
  `recurringTransactions` prop (passed by the Plan page), and highlights
  months from `effectiveSTMonths`. Its in-component step-down detection is
  deleted; the ST amount is no longer printed.
- Column header, year header and month row styles take an `$accountCount`
  transient prop to build `grid-template-columns` (chevron · Period ·
  N × account · Total Liquid · Restschuld). The body scrolls horizontally
  in its card. Account headers use `<Chip color size="sm" />` + name.
- The skeleton reads "Projection" and mimics Period · two placeholder
  account columns · Total Liquid · Restschuld (the #208 layout-match rule).

### Sondertilgung rule

- **ST Month** rule: an annual Repayment Transfer fires in the month
  (`deriveSTMonths`) **and** the Mortgage still has Restschuld. This matches
  the engine, which refunds a post-payoff transfer to its source.
- New pure helper beside `deriveSTMonths`:
  `effectiveSTMonths(stMonths, snapshots, mortgageIds): Map<string, number>`
  — each `deriveSTMonths` entry up to and including the Payoff Month, its
  amount capped at the Restschuld left at the end of the previous month.
  Exported through the utils barrel.
- `deriveOutlookSummary` (the outlook util the summary imports) takes the
  ST map as a second argument and sums/counts it instead of walking
  step-downs. `OutlookSummary` gains a `recurringTransactions` prop.
- `PlanSummary` and `TrajectoryHorizon` switch from `deriveSTMonths` to
  `effectiveSTMonths`. All four Sondertilgung surfaces read one rule.
- The second, unused `deriveOutlookSummary` in the projection utils and the
  `deriveYearSummaries` / `aggregateYearSummaries` overlap are left alone —
  refactor-plan material after the round.

### Manual

- `manualContent` copy changes in the same phase as each behaviour change:
  recurring transfers (direction, positive amounts, red/green, mirrored
  rows, repayments and Sondertilgung as transfers into a Mortgage — the
  "only Sondertilgung" and "no in/out control" sentences go); Getting
  Started origination step and Mortgage Countdown (empty state, one-form
  setup, no-repayment footer); Outlook accordion ("Projection", per-account
  columns, ST months tinted); Outlook summary (annual extras up to payoff
  only).

### Phasing

1. **Projection columns (#4)** — columns util, year aggregation reshape,
   accordion + skeleton, `effectiveSTMonths` (first needed here), Plan page
   prop, manual copy. Frontend only.
2. **Sondertilgung rule (#5)** — outlook summary signature, `OutlookSummary`,
   `PlanSummary`, `TrajectoryHorizon` on `effectiveSTMonths`, manual copy.
3. **Transfer display (#1)** — `recurringAmountFor`, `recurringNetPerMonth`
   rewrite, mirrored rows in the hook, signed/mirrored list, Account Detail
   wiring.
4. **Transfer entry (#1)** — direction chips, `accountId` in payload and
   update schema, server positive/not-self rules, warning removed, manual
   copy for phases 3 + 4.
5. **Mortgage Setup backend (#2)** — schema, `storage.mortgages.create` in
   one transaction, `POST /mortgages`, rollback test.
6. **Mortgage Setup UI (#2)** — empty state, setup modal,
   `hasRepaymentTransfer` + footer, Dashboard wiring, manual copy.
7. **Close the round** — resolve #1, #2, #4, #5 in the live-use intake with
   commits; tick the roadmap entry.

## Testing Decisions

- Tests assert external behaviour only: a pure function's return value for
  given inputs; a route's HTTP status, body and resulting stored rows; a
  component's rendered text, roles, links and the payload it hands its
  callback. No assertions on internal state, styled-component internals or
  call order inside a module.
- No E2E harness for this round: every defect is component- or route-level
  and reachable by Vitest + Testing Library and the existing route tests;
  nothing crosses the Electron/utility-process boundary. Re-decided per
  round.
- **Pure helpers** (co-located `*.test.ts`):
  - `recurringAmountFor` — plain recurring, transfer on source, transfer on
    destination, unrelated account.
  - `recurringNetPerMonth` — a transfer counts negative on source and
    positive on destination, weighted by frequency.
  - `effectiveSTMonths` — entries before payoff kept, payoff-month entry
    capped at remaining Restschuld, post-payoff entries dropped, no
    mortgage / no ST map → empty.
  - `deriveOutlookSummary(points, stMonths)` — totals and counts from the ST
    map; a monthly-only repayment yields zero Sondertilgung.
  - `buildAccountColumns` — preserves input order, excludes Mortgage,
    includes `showInTrajectory: false` accounts, carries colour.
  - `aggregateYearSummaries` — per-account end-of-year projected balances;
    no `netCashflow` / `sondertilgung`.
  - `hasRepaymentTransfer` — true only with a recurring linked to that
    mortgage.
    Prior art: the existing `recurring.test.ts`, `projection.test.ts`,
    `accordion.test.ts`, `outlook.test.ts`, `mortgage.test.ts`.
- **Server** (route tests against a real SQLite storage):
  - Recurring create rejects non-positive linked amounts and self-links with
    `{ issues }`; `PATCH` validates the merged row, including an
    `accountId` flip that would self-link; a valid flip moves ownership.
  - `POST /mortgages` creates account + origination + 0/1/2 transfers with
    the specified category and descriptions; invalid bodies answer
    `{ issues }`; a failing recurring insert rolls back so no account
    remains.
    Prior art: `transfers.test.ts` (route + atomic pair), the recurring
    transactions route tests, `SqliteStorage.test.ts`.
- **Components** (Testing Library, co-located `*.test.tsx`):
  - `RecurringTransactionModal` — direction chips appear only with a
    transfer account; "From" emits the swapped `accountId` /
    `linkedAccountId`; negative transfer shows the new message; edit seeds
    the absolute amount and can flip direction; the Mortgage warning is
    absent.
  - `RecurringTransactionList` — red −amount on source, green +amount and
    "from <source>" on destination; mirrored row is a link to the source
    account and never opens the modal.
  - `useRecurringTransactions` — returns owned and mirrored rows; create
    passes the payload's `accountId` through.
  - `MortgageCountdown` — empty state with zero mortgages, button opens
    setup; no-repayment footer vs "Not paid off" footer.
  - `MortgageSetupModal` — field validation rules, default values, the
    no-funding-account note, the payload sent, "% paid off" preview.
  - `ProjectionAccordion` — "Projection" title, account column headers in
    input order with chips, per-account year/month values, ST highlight
    only on annual-transfer months before payoff.
  - `OutlookSummary` / `PlanSummary` / `TrajectoryHorizon` — Sondertilgung
    figures exclude monthly repayments and post-payoff years.
  - `manualContent.test.ts` — pins the new copy and the absence of removed
    sentences, as it already pins sentences today.
    Prior art: `MortgageModal.test.tsx`, `TransactionEditModal` tests (the
    Direction chips), existing `ProjectionAccordion.test.tsx`,
    `CategorySelect.test.tsx`.

## Out of Scope

- Changing the stored recurring model or the projection engine; a signed
  recurring-transfer pair (rejected at the backlog grill — data-model
  change).
- Signed entry for transfers; plain recurring entry is unchanged.
- KPI tile empty states and a wider Empty-Hidden Surface audit — a later
  round, only if live use asks.
- Redirecting Accounts-page Mortgage creation into Mortgage Setup.
- Interest modelling; a "contract end vs projected payoff" line.
- A Balance Anchor concept (its own epic; Mortgage Setup only uses its
  naming).
- Merging the duplicate `deriveOutlookSummary` and the year-summary helper
  overlap — a `request-refactor-plan` after the round.
- An E2E / Playwright harness.
- Defect #3 work — already fixed 2026-08-04 (`useId()` in `CategorySelect`,
  three tests).
- Anything logged under Round 2 (#6 onward).

## Further Notes

- Source of truth: design log 29 (`docs/design-logs/29-live-use-repair-round-1.md`)
  and `docs/live-use-defects.md`. Glossary terms (Transfer Direction,
  Mirrored Transfer Row, Repayment Transfer, Mortgage Setup, ST Month
  updated, ST-only Model retired) are already in
  `docs/ubiquitous-language.md`.
- Defect #5 was added after the Round 1 freeze as a deliberate, recorded
  exception: the fix is small, and Mortgage Setup makes a monthly Repayment
  Transfer the default path, which would spread the miscount to every
  mortgage. The freeze rule stands for later rounds.
- Month Cash Flow depends on defect #1's mirrored display and is sequenced
  after this epic. `POST /mortgages` and `POST /accounts` must both stay
  valid when Balance Anchor reworks opening-balance fields.
- Real-world reference case: €90k Restschuld, €955/month from Postbank,
  €6,500 each November → payoff ≈ Oct 2031; Total Sondertilgung ≈ −€32,500
  over 5 payments.
