# Plan: Live-Use Repair — Round 1

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/220

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**:
  - **New:** `POST /mortgages`. Body validated by `MortgageSetupSchema`
    (zod). Answers `{ issues }` on failure and the created account (with
    balance) on success. Follows the routes folder convention: router,
    schema module and route test.
  - **Changed:** `POST /recurring-transactions` and
    `PATCH /recurring-transactions/:id`. A row with `linkedAccountId` must
    have `amount > 0` and `linkedAccountId !== accountId`. On `PATCH`, both
    rules are checked against the **merged** row (stored + patch). The
    update schema gains an optional `accountId`, so flipping a transfer's
    direction is one `PATCH`. All validation failures answer `{ issues }`.
  - `POST /accounts` is unchanged, including Mortgage creation on the
    Accounts page.
- **Schema**: **no migration**. The stored recurring model and the
  projection engine are unchanged. A Recurring Transfer stays one row on
  its **source** account, with a positive amount and `linkedAccountId`
  pointing at the destination. Mortgage Setup writes to the existing
  account, origination and recurring tables.
- **Key models**:
  - **Transfer Direction**: a UI choice, never stored. On account A,
    "To B" emits `accountId: A, linkedAccountId: B`; "From B" emits
    `accountId: B, linkedAccountId: A`. The recurring form payload carries
    a required `accountId` (the source). The recurring hook passes it
    through and no longer overwrites it with the viewed account.
  - **Mirrored Transfer Row**: the destination account's read-only reading
    of a transfer. It shows +amount in green, labelled "from <source>",
    and links to the source account. It is never edited in place.
  - `recurringAmountFor(recurring, accountId): number`: signed cents as
    the recurring lands on that account. A plain recurring is returned as
    stored, a transfer is negative on its source and positive on its
    destination, and anything else is 0.
  - **ST Month**: an annual Repayment Transfer fires in the month **and**
    the Mortgage still has Restschuld. Computed by
    `effectiveSTMonths(stMonths, snapshots, mortgageIds): Map<string, number>`,
    which keeps `deriveSTMonths` entries up to and including the Payoff
    Month and caps each amount at the Restschuld left at the end of the
    previous month. Every Sondertilgung surface reads this one rule.
  - `AccountColumn { id, name, kind, color }`: every non-Mortgage account,
    in input (`sort_order`) order, regardless of `showInTrajectory`.
  - **Year aggregation**: point and summary carry `month`/`year`,
    `totalLiquid`, `restschuld`, `netCashflow` and
    `accounts: Record<string, number>` (projected balance per non-Mortgage
    account; the end-of-year value on the summary). Only the step-down
    `sondertilgung` field is removed. **`netCashflow` stays**, because the
    History page's Year Archive shares this aggregator and still shows it.
    The Projection accordion simply stops rendering it.
  - `MortgageSetup`, defined with the storage types:
    `Storage.mortgages.create(setup): Promise<AccountWithBalance>`. The
    account, its origination and up to two Recurring Transfers are created
    in one `db.transaction`. Transfers get category "Transfer" and the
    descriptions "Mortgage repayment" / "Sondertilgung".
  - `hasRepaymentTransfer(recurrings, mortgageId): boolean`, in the
    mortgage utils.
- **Pure helpers** go in `src/utils/`, each in its own module folder with
  a co-located test, and are exported through the utils barrel.
- **Manual**: every behaviour change updates `manualContent` in the same
  phase, pinned by `manualContent.test.ts`.
- **Round bookkeeping**: each phase marks its defect resolved, with
  commits, in `docs/live-use-defects.md`. The last phase also closes the
  round.
- **Testing**: Vitest + Testing Library and route tests against real
  SQLite storage. Tests assert external behaviour only. No E2E harness
  this round.

---

## Phase 1: Projection columns (#4)

**User stories**: 45–55, 64 (accordion part)

### What to build

The Financial Plan's Outlook accordion is titled **Projection** and shows
how each account develops. Columns: Period · one per non-Mortgage account
(in the user's account order, each with its colour chip and name) · Total
Liquid · Restschuld. Year rows show each account's projected end-of-year
balance, and expanded month rows show each account's projected balance.
The Net Cashflow and Sondertilgung columns go. Sondertilgung months stay
highlighted, now driven by `effectiveSTMonths` (introduced here) from the
recurring transactions the Plan page already holds. The accordion no
longer detects Restschuld step-downs itself. With many accounts, the body
scrolls horizontally inside its card. The loading skeleton matches the new
layout. The Year Archive keeps its Net Cashflow column unchanged. The
manual's Outlook accordion topic describes the new title, the
per-account columns and the tinted ST months.

### Acceptance criteria

- [ ] The column builder keeps input order, excludes Mortgage, includes
      `showInTrajectory: false` accounts, and carries the resolved colour.
- [ ] Year aggregation returns per-account end-of-year projected balances
      and still returns `netCashflow`; it no longer returns `sondertilgung`.
- [ ] `effectiveSTMonths` keeps entries before payoff, caps the
      payoff-month entry at the remaining Restschuld, drops post-payoff
      entries, and returns empty with no mortgage or no ST map.
- [ ] The accordion renders the "Projection" title and account headers
      with chips in input order, and shows per-account values in year and
      month rows.
- [ ] Only annual-transfer months before payoff are highlighted. A
      monthly-only repayment highlights nothing.
- [ ] No Net Cashflow or Sondertilgung columns. The ST amount is no longer
      printed.
- [ ] Horizontal scroll works inside the card with Period first. The
      skeleton shows Period · two placeholder accounts · Total Liquid ·
      Restschuld, with no layout shift on load.
- [ ] The Year Archive still renders Net Cashflow per year and month.
- [ ] Manual Outlook accordion copy is updated and pinned.
- [ ] Defect #4 is marked resolved in `docs/live-use-defects.md`.

---

## Phase 2: Sondertilgung rule (#5)

**User stories**: 56–61, 64 (summary part)

### What to build

Sondertilgung means one thing everywhere. The Outlook summary's Total
Sondertilgung and its "N annual payments" count sum and count the
`effectiveSTMonths` map instead of walking Restschuld step-downs. The
outlook summary util takes the ST map as a second argument, and
`OutlookSummary` receives the recurring transactions. The Dashboard Plan
Summary and the Trajectory Horizon marks switch from `deriveSTMonths` to
`effectiveSTMonths`, so nothing reports Sondertilgung after payoff. The
real-world case (€955/month, €6,500 each November, payoff ≈ Oct 2031)
reads ≈ −€32,500 over 5 payments. The manual's Outlook summary topic says
Total Sondertilgung counts only the annual extras up to payoff.

### Acceptance criteria

- [ ] The outlook summary util, given points and an ST map, totals and
      counts from the map. A monthly-only repayment yields zero
      Sondertilgung and zero payments.
- [ ] Outlook summary figures exclude monthly repayments and post-payoff
      years.
- [ ] Plan Summary reports no Sondertilgung for years after payoff.
- [ ] Trajectory Horizon ST marks follow the same rule.
- [ ] The real-world reference case is pinned by a test (≈ −€32,500,
      5 payments).
- [ ] Stale ST-only comments in the touched utils are rewritten.
- [ ] Manual Outlook summary copy is updated and pinned.
- [ ] Defect #5 is marked resolved in `docs/live-use-defects.md`.

---

## Phase 3: Recurring transfer display (#1)

**User stories**: 15–22

### What to build

Recurring transfers read like one-off transfers. The recurring hook
returns rows where the viewed account is either the owner or the linked
account. The recurring list takes the viewed account and renders every row
through `recurringAmountFor` with `Money`'s existing gain/loss tone:

- **Source account:** a transfer shows −amount in red with
  "→ ● <destination>" and opens the edit modal.
- **Destination account:** a Mirrored Transfer Row shows +amount in green
  with "← ● from <source>". It links to the source account and never
  opens the modal.
- **Plain recurring transactions:** unchanged.

The Account Detail stat strip's recurring net per month is rewritten on
`recurringAmountFor`, so it agrees with the projection. It does not
reproduce the engine's Mortgage cap. The recurring count includes mirrored
rows.

### Acceptance criteria

- [ ] `recurringAmountFor` handles a plain recurring, a transfer on its
      source, a transfer on its destination, and an unrelated account.
- [ ] `recurringNetPerMonth` counts a transfer negative on its source and
      positive on its destination, weighted by frequency.
- [ ] The hook returns both owned and mirrored rows for the viewed account.
- [ ] The list shows a red −amount on the source and a green +amount with
      "from <source>" on the destination.
- [ ] A mirrored row is a link to the source account page and never opens
      the edit modal.
- [ ] Plain recurring rows render with their stored sign, unchanged.
- [ ] The Account Detail recurring net and count reflect the signed rule
      and mirrored rows. On the Mortgage account, the €955 repayment
      appears as +955.

---

## Phase 4: Recurring transfer entry (#1)

**User stories**: 1–14, 62

### What to build

The recurring modal replaces "Transfer to account" with a **Transfer**
select. Once an account is chosen, a **Transfer Direction** chip pair
appears ("To" / "From", default "To"), reusing the one-off transfer edit
modal's Direction row pattern. Transfer amounts are typed positive. A
negative or zero amount shows "Enter the transfer amount as a positive
number — the direction sets which way it moves." Plain recurring entry
stays signed.

"From B" on account A is stored as B's transfer to A, so it behaves
exactly like one created on B. Editing seeds the positive amount and can
flip the direction in one `PATCH`. A flipped transfer leaves this account's
own list and reappears as a mirrored row. The server enforces the
positive-amount and not-self-linked rules on create and on the merged
`PATCH` row, answering `{ issues }`. The "only Sondertilgung should point
at a mortgage" warning is removed. The manual's recurring transfers topic
describes the select, direction, positive amounts, the red/green pairing,
mirrored rows, and repayments and Sondertilgung as transfers into a
Mortgage. The "only Sondertilgung" and "no in/out control" sentences go.

### Acceptance criteria

- [ ] Direction chips appear only once a transfer account is selected, and
      default to "To".
- [ ] "To" emits `accountId` = the viewed account; "From" emits the
      swapped `accountId` / `linkedAccountId`.
- [ ] A negative or zero transfer amount shows the new message. Plain
      recurring rows still accept signed amounts.
- [ ] Edit seeds the absolute amount and flipping direction sends one
      `PATCH` with the new `accountId`.
- [ ] The hook's create/update pass the payload's `accountId` through.
- [ ] Route: create rejects non-positive linked amounts and self-links
      with `{ issues }`.
- [ ] Route: `PATCH` validates the merged row. An `accountId` flip that
      would self-link is rejected; a valid flip moves ownership.
- [ ] The Mortgage-link warning is absent.
- [ ] Manual recurring transfers copy is updated, and the removed
      sentences are pinned as absent.
- [ ] Defect #1 is marked resolved in `docs/live-use-defects.md`, covering
      the commits from phases 3 and 4.

---

## Phase 5: No-repayment footer (#2)

**User stories**: 43–44, 63 (footer part)

### What to build

A Mortgage Countdown for a mortgage that nothing pays off tells the truth.
The Dashboard passes its recurring transactions into `MortgageCountdown`.
When `hasRepaymentTransfer` is false, the footer reads "No repayment set
up — add a recurring transfer into this mortgage to see the payoff date."
A mortgage that has a repayment transfer but does not pay off within the
horizon keeps the existing "Not paid off within …" footer. The manual's
Mortgage Countdown topic describes the no-repayment footer.

### Acceptance criteria

- [ ] `hasRepaymentTransfer` is true only when a recurring is linked to
      that mortgage.
- [ ] The countdown shows the no-repayment footer when nothing pays the
      mortgage.
- [ ] The countdown shows the "Not paid off within …" footer when a
      repayment exists but payoff falls beyond the horizon.
- [ ] Manual footer copy is updated and pinned.

---

## Phase 6: Mortgage Setup (#2)

**User stories**: 23–42, 63

### What to build

The whole path from a fresh install to a working mortgage.

**Empty state.** With zero Mortgage accounts, the Mortgage Countdown card
renders its section head and the shared `EmptyState`: icon `Landmark`,
"No mortgage yet", "Add your mortgage to see what's paid off and when it's
done.", and a **Set up mortgage** button. The KPI mortgage tiles stay
hidden.

**Setup form.** The button opens `MortgageSetupModal`, one form in three
groups:

- **Mortgage:** name (default "Mortgage"), Restschuld today, as of
  (default today).
- **Origination:** original principal ≥ Restschuld, start date ≤ as of,
  term 1–40 years.
- **Repayment:** paid from a Girokonto or Tagesgeld, monthly rate, day of
  month (default 1), and an optional annual Sondertilgung. When a
  Sondertilgung amount is given, its month is required (default November).

A live "% paid off" preview reuses `percentPaidOff`. With no Girokonto or
Tagesgeld, the repayment group is replaced by "Add a Girokonto to set up
the monthly repayment." and the mortgage can still be created.

**Saving.** Save calls `POST /mortgages`, which creates the account (random
palette colour, no icon), its origination and 0–2 Recurring Transfers
atomically. The Dashboard then refreshes the countdown, KPI tiles and
trajectory. The manual's Getting Started origination step and Mortgage
Countdown topic describe the empty state and the one-form setup.

### Acceptance criteria

- [ ] Route: a valid body creates the account, origination and 0, 1 or 2
      transfers, with category "Transfer" and descriptions "Mortgage
      repayment" / "Sondertilgung".
- [ ] Route: invalid bodies (principal < Restschuld, start after as-of,
      term outside 1–40, ST amount without month, non-positive amounts,
      ineligible funding account) answer `{ issues }`.
- [ ] A failing recurring insert rolls back so no account or origination
      remains.
- [ ] The countdown renders the empty state with zero mortgages, and the
      button opens the setup modal. With ≥1 mortgage, the card is
      unchanged.
- [ ] The modal covers default values, every field rule, the
      no-funding-account note, the payload sent and the live "% paid off"
      preview.
- [ ] After a successful save, the Dashboard shows the new mortgage
      without a reload.
- [ ] Accounts-page Mortgage creation still works as before.
- [ ] Manual Getting Started and Mortgage Countdown copy is updated and
      pinned.
- [ ] Defect #2 is marked resolved and #3 recorded as already fixed
      (2026-08-04) in `docs/live-use-defects.md`. Round 2 starts at #6.
- [ ] The CLAUDE.md roadmap entry "Live-Use Repair — Round 1" is ticked.
