## Problem Statement

I use Horizon as my real personal finance tracker. I have set up my salary, a
Repayment Transfer to the mortgage, a few subscriptions and a November
Sondertilgung as recurring flows. When I open Month Overview for any future
month, every account reads €0. The page only shows Variable Spending, so the
money that actually defines my month (what comes in, what goes out to the
mortgage, the annual lump sum) does not appear on it. To see it I have to switch
to Outlook or the Trajectory Horizon, which show balances but not the flows
behind them.

There is a second, quieter fault. Since Balance Anchor, a recurring flow dated
after my Anchor Date is never stored, and Recurring Detection pre-unchecks the
matching imported rows as "already modelled". But the Current Balance never
counts them. A salary paid since I anchored my Girokonto is simply missing from
the balance on the Dashboard, and past months after the anchor read low on
History and in Monthly Savings. A Month page that listed "+€3,000 salary" above
a month-end balance that leaves it out would contradict itself.

Finally, a quarterly or legacy recurring rule can fire in different months
depending on whether Outlook or History computed it, and the current month's
quarterly occurrence is skipped altogether. Nobody notices today because no
screen lists the firings month by month. Once one does, the inconsistency will
be visible.

## Solution

**Every month, whole.** Month Overview gains a full-width **Fixed Flows** card
between the stat strip and the spending columns. It groups the month's
**Fixed Flows** by account, every account kind included (Mortgage and
Investment too, which the spending tabs leave out):

- income in green, expenses and transfers out in red, transfers in in green, as
  the Mirrored Transfer Row convention already does on the account pages;
- each transfer leg names its counterpart ("→ ● Mortgage", "← ● from
  Postbank");
- annual and quarterly items only in the months they fire, so the November
  Sondertilgung appears in November;
- CreditCard settlements on the card and its funding account;
- a "Net fixed" footer per account.

Each row links to the account page where its rule is edited. Rules are not
editable from the Month page.

**Where each account ends the month.** Every group header shows that account's
**Month-End Balance**: "Month-end · Actual" for a past month, "Month-end ·
Projected" for the current and future months, and "No data before {Mon YYYY}"
where Horizon does not know it. It is never shown as €0. The figure is the same
one Outlook, the Trajectory Horizon and History show for that month, so the
screens cannot disagree.

**The salary since the anchor is counted.** A recurring flow dated after an
account's Anchor Date and on or before today is **Recurring History**, and it is
part of the balance. The Current Balance becomes the **Recorded Balance** (the
anchor plus stored transactions after it) plus the Recurring History since the
anchor. The engine's actuals, History, Monthly Savings and the CreditCard
settlement all count it too. Before the anchor nothing changes: imported
statements remain the history there.

**Honest around the anchor.** In the anchor month, recurring flows the anchor
already covers are listed muted as "In balance anchor" and left out of the net,
so I can see my salary was counted, not lost. In months before the anchor month
an account lists no rule rows. It reads "Before {D MMM YYYY} this account's
history comes from its statements".

**One firing rule.** Whether a rule fires in a month depends only on the rule
and the month, never on where a run starts. The current month's quarterly
occurrence is no longer skipped, and Outlook and History agree on every legacy
rule.

## User Stories

### Fixed Flows card

1. As a user opening a future month, I want to see that month's salary,
   transfers and subscriptions, so that the month no longer reads €0 on every
   account.
2. As a user, I want the fixed flows grouped by account, so that I can read each
   account's month on its own.
3. As a user, I want every account kind to have a group, Mortgage and Investment
   included, so that a Repayment Transfer's destination leg and an
   Investment savings plan are visible.
4. As a user, I want the groups ordered like my accounts everywhere else, so that
   the card matches my account order.
5. As a user, I want each group headed by the account's colour Chip and name, so
   that I recognise the account at a glance.
6. As a user, I want a plain recurring income shown in green with a plus and a
   plain expense in red with a minus, so that direction is obvious.
7. As a user, I want a Recurring Transfer's source leg shown as a red outflow
   with "→ ● {destination}", so that I see where the money went.
8. As a user, I want the destination leg shown as a green inflow with "← ● from
   {source}", so that both sides of the transfer are visible.
9. As a user, I want both legs of a transfer visible at once, not hidden behind
   tabs, so that I can read the transfer across accounts.
10. As a user, I want a Repayment Transfer shown as a green inflow on the
    Mortgage, so that the Mortgage's group shows the money that paid it down.
11. As a user in the mortgage's payoff month, I want the Repayment Transfer shown
    at its capped amount, so that the card never shows more than the remaining
    Restschuld.
12. As a user whose mortgage is paid off, I want its capped-to-zero repayment
    left off the card, so that a flow that moves nothing is not listed.
13. As a user with a plain recurring on a Mortgage, which the engine never
    applies, I want it left off the card, so that the card lists only what moves
    a balance.
14. As a user, I want an annual item, such as a November Sondertilgung, listed
    only in its month, so that each month shows exactly what it carries.
15. As a user, I want a quarterly item listed only in the months of its cycle, so
    that the card matches its schedule.
16. As a user, I want each row to show its day of the month, description and
    category, so that I can identify the flow.
17. As a user, I want a day past the month's end clamped to the last day, so that
    a rule on the 31st still shows in February.
18. As a user, I want the rows within a group ordered by date, so that the month
    reads in order.
19. As a user, I want a "Net fixed" footer per account summing its rows, so that
    I can see what the fixed flows do to that account this month.
20. As a user, I want an account with no fixed flows to read "No fixed flows this
    month.", so that an empty group is not mistaken for a loading failure.
21. As a user, I want each recurring row to link to its source account's page,
    so that I can edit the rule where it lives.
22. As a user, I want the card not to offer editing, so that a rule has one place
    it is edited.
23. As a user who revisits a month, I want the card to paint instantly from cache
    and then refresh, so that the page feels as fast as the rest of the app.
24. As a user on a slow load, I want the card to show a layout-matched skeleton,
    so that it does not pop in late.
25. As a user whose report fails to load, I want the card to show the page's
    section error state, so that one failure does not blank the page.
26. As a user who prefers reduced motion, I want the card to follow the app's
    reduced-motion behaviour.

### CreditCard settlements

27. As a user with a CreditCard linked to a funding account, I want the month's
    settlement listed on both the card and the funding account, so that the pull
    is visible from both sides.
28. As a user, I want a settlement row to link to the CreditCard, so that I can
    inspect what was settled.
29. As a user looking at a past or current month, I want the settlement shown as
    booked, so that the card matches what was stored.
30. As a user looking at a future month, I want the engine's projected settlement
    shown, so that the coming pull is visible.
31. As a user who adds a CreditCard expense, I want a future month's projected
    settlement to update by my next visit to that month, accepting that it does
    not refresh instantly.

### Month-End Balance

32. As a user, I want every account group to show where the account ends the
    month, so that I see the result of the month, not just its flows.
33. As a user looking at a past month, I want the balance labelled "Month-end ·
    Actual", so that I know it is recorded.
34. As a user looking at the current or a future month, I want it labelled
    "Month-end · Projected", so that I know it is a projection.
35. As a user looking at a month before an account's Known Since, I want "No data
    before {Mon YYYY}" instead of €0, so that Horizon never shows an Unknown
    balance as zero.
36. As a user looking at a month beyond the projection horizon, I want the
    balance shown as Unknown, so that nothing is invented.
37. As a user, I want the Month-End Balance to equal the figure Outlook, the
    Trajectory Horizon and History show for the same month and account, so that
    no two screens disagree.
38. As a user who adds an expense on the Month page, I want the Month-End Balance
    to move straight away, so that the balance reflects my change.

### Recurring History

39. As a user who anchored an account in the past, I want the recurring flows
    since the anchor counted in its Current Balance, so that my salary since then
    is not missing.
40. As a user, I want the Dashboard's balances and Total Liquid to include that
    Recurring History, so that the headline numbers are right.
41. As a user, I want a recurring flow dated later this month not counted until
    its day arrives, so that the Current Balance reflects today.
42. As a user, I want a flow on or before the Anchor Date never counted, so that
    the anchor is not double-counted.
43. As a user, I want past months after the anchor to show actual balances that
    include their recurring flows, so that History and Monthly Savings no longer
    read low.
44. As a user, I want the current month's recurring flows carried into next
    month's projection, so that the projection does not drop them.
45. As a user with a mortgage, I want its replayed Restschuld from Known Since to
    match History's actual line, so that the mortgage reads the same everywhere.
46. As a user with a subscription charged to a CreditCard, I want the
    auto-settlement to pull the card's balance including that subscription, so
    that the stored settlement matches the projection.
47. As a user, I want Reconstructed Actuals before the anchor unchanged, so that
    my imported history is not rewritten.
48. As a user, I want Recurring Detection's pre-unchecked rows to be truly
    covered by the balance, so that excluding them at import no longer drops
    money.

### The anchor month and before

49. As a user looking at an account's anchor month, I want recurring flows the
    anchor already covers listed muted as "In balance anchor", so that I can see
    they were counted, not lost.
50. As a user, I want those muted rows left out of "Net fixed", so that the net
    does not count them twice.
51. As a user looking at a month before an account's anchor month, I want no rule
    rows listed, and the note "Before {D MMM YYYY} this account's history comes
    from its statements", so that the card does not invent flows that statements
    already record.
52. As a user looking at a month before the History Span, I want empty groups, so
    that nothing is shown where nothing is known.

### One firing rule

53. As a user with a calendar-aware quarterly rule that is due this month, I want
    it to fire this month, so that the current occurrence is no longer skipped.
54. As a user with an older recurring rule that has no month of year, I want
    Outlook and History to agree on which months it fires in, so that the Month
    page never contradicts the charts.
55. As a user, I want the Month page, the balance, Outlook and History to share
    one firing rule, so that they can never disagree about a month.

### Editing rules

56. As a user who edits or deletes a recurring rule, I want the balance and the
    months since the anchor recomputed from the rule as it now stands, accepting
    that past months change with it, so that the rule stays the single record.
57. As a user who needs to correct drift after a rule change, I want re-anchoring
    to be the documented fix, so that I know how to set the balance straight.

### Copy and docs

58. As a user, I want the Month Overview subtitle to read "Fixed flows ·
    Variable spending · Month-end balances", so that it names what the page
    shows.
59. As a user reading the manual's Month Overview topic, I want the Fixed Flows
    card explained, so that I know what the rows, the muted rows and the
    balance basis mean.
60. As a user reading the manual's Accounts and Getting Started topics, I want to
    learn that the balance counts recurring flows since the As-of date, so that
    the changed figure is not a surprise.
61. As a user upgrading, I want the release notes to warn that balances anchored
    in the past grow by the recurring flows since then, and to re-anchor if a
    figure looks doubled, so that I can correct salary rows I opted back in at
    import.
62. As a user with no recurring flows at all, I want my balances unchanged by the
    upgrade, so that the change is invisible to me.

## Implementation Decisions

### Balance model

- **Recorded Balance** = Anchor Balance + every stored Transaction dated after
  the Anchor Date. This is the existing storage SQL, unchanged in logic.
- **Current Balance** = Recorded Balance + Recurring History through today.
- **Recurring History** is the signed sum of an account's recurring legs that
  pass the Anchor Gate and are dated on or before the day the balance is read. A
  Mortgage leg is capped at the remaining Restschuld, in date order.
- Nothing is stored and no migration is needed. Recurring occurrences are never
  booked as Transactions; the Recurring-Only Model stays.
- Rules carry no effective dates: Recurring History always uses today's rules.

### Deep module: recurring occurrence (server lib, new)

- Extracted from the projection engine. It is the one firing rule for the
  Replay Loop, the Forward Projection, Recurring History and the Month Cash
  Flow Report.
- `firesInMonth(rule, month, sourceAnchorMonth)`: a pure function of the rule
  and the month.
  - A calendar-aware quarterly rule fires in every month of its cycle, the
    projection's first month included.
  - A legacy rule without a month of year counts its cycle from its source
    account's Anchor month, in both loops.
- `occurrenceDate(month, dayOfMonth)`: the day clamped to the month's length.
- `passesAnchorGate(anchorDate, date)`: a leg moves its account only when dated
  after that account's Anchor Date.

### Deep module: recurring history (server lib, new)

- `recurringHistory(accountId, accounts, recurrings, through)` returns integer
  cents: the signed sum of the account's gated legs in (Anchor Date, `through`].
- Uses the recurring-occurrence module for firing, dates and gating, and applies
  the Mortgage cap in date order.

### Balance service (server service, new)

- Follows the settlement service's shape: functions that take `storage`.
- `findAllWithBalance(storage)` and `findByIdWithBalance(storage, id)` return the
  API's unchanged `AccountWithBalance`, whose `balance` is the Current Balance.
- `getTotalLiquid(storage)` sums the liquid accounts' Current Balances using the
  existing liquid-account selector.
- The accounts routes call this service instead of storage. The client contract
  does not change.

### Storage

- `findAllWithBalance` and `findByIdWithBalance` keep their names but return
  `AccountWithRecordedBalance` with a `recordedBalance` field.
- Storage `getTotalLiquid` and its SQL statement are removed.
- The storage parity suite checks that `recordedBalance` equals `balanceAt(today)`.

### Projection engine

- The engine calls the recurring-occurrence module instead of its private
  firing logic. The current-month quarterly test is rewritten to the new rule.
- It keeps a per-account Recurring History accumulator. Every leg that passes
  the Anchor Gate adds to it, in both loops.
- For a month at or before the current month, `actual` = `balanceAt(endOfMonth)`
  - the accumulator through that month's end. The non-Mortgage "reset to actual"
    therefore keeps the current month's legs from month 1 on. A Mortgage is not
    reset, but its `actual` includes the accumulator, so its History value equals
    the replayed Restschuld from Known Since on. Before the anchor the accumulator
    is 0.
- A new exported `projectMonths(…)` returns each monthly snapshot plus the flows
  applied in it (`AppliedFlow[]`). `projectBalances` becomes `projectMonths`
  with the flows dropped, so the `/projection` payload is unchanged.
- The projection recurring entry gains the rule's `id`.

### Settlement

- The settlement lib computes a CreditCard's closing balance as `balanceAt` +
  `recurringHistory` through the closing date, so a stored auto-settlement pulls
  what the engine projects.

### Deep module: month cash flow (server lib, new)

- `deriveMonthCashFlow(…)` returns a `MonthCashFlowReport`:
  `{ month, accounts: AccountFixedFlows[] }`, where each group is
  `{ accountId, flows: FixedFlow[] }`.
- `FixedFlow`: `kind` ("recurring" | "settlement"), `recurringId` for recurring
  rows, ISO `date`, `description`, optional `category`, signed `amount` in cents
  for this account, optional `counterpartId`, optional `side` ("source" |
  "destination"), and `inAnchor` (blocked by the Anchor Gate and excluded from
  the net).
- Rows are the engine's applied flows for the month from the same run, joined
  with the rule's description and category. Settlement rows come from stored
  auto-settlement Transactions for months at or before the current month, and
  from the engine's pending settlement for future months.
- In the anchor month, gate-blocked legs are included with `inAnchor: true`.
  Before the anchor month no rule rows are included. A capped-to-zero Mortgage
  rule and a plain recurring on a Mortgage are excluded.
- Groups follow account `sortOrder`, include every kind, and are ordered by date
  within.

### `GET /reports/month-cash-flow?month=YYYY-MM` (new)

- Beside the year-comparison report. A malformed month answers `400 { issues }`,
  the reports route's existing shape.
- A month at or after the current month runs the engine from the current month,
  as `/projection` does. An earlier month runs from the History Span's start, as
  `/projection/history` does. A month before the History Span gets empty groups.

### Deep module: Month-End Balance (client util, new)

- `monthEndBalance(month, currentMonth, snapshots, points, accountId)` returns
  `{ basis: "actual" | "projected", cents }` or `{ basis: "unknown", knownFrom }`.
- A month at or after the current month reads the projection snapshot's
  `projected` value. An earlier month reads the History point: a number is
  "actual", `null` is Unknown. A month neither source covers is Unknown.
- It follows the Past Lead-in's join rule and reads the already-cached
  `PROJECTION` and `HISTORY`; the balance is not part of the report. Exported
  from the utils barrel.

### Client data

- `useMonthCashFlow(month)` in the months feature reads through
  `useCachedResource` with a branded `monthCashFlowKey(month)`, minted like
  `monthTransactionsKey`.
- Month page commits do not bump it, since they do not change rules. A future
  projected settlement moved by a CreditCard expense refreshes on the next visit;
  this is accepted.

### Fixed Flows card

- A new months feature component with co-located styles, test and skeleton,
  composed only from existing parts: `Card` + `SectionHead` (label "Fixed Flows",
  title "Fixed in {Month}"), `Chip`, `DataRow` with SpendingList's day block,
  `Money` (with `sign` for the red/green tone), and the existing dimmed treatment
  for "In balance anchor" rows. Theme tokens only.
- Full width between MonthStatStrip and the columns, inside its own
  `SectionState` (test id `month-section-cash-flow`), loading on accounts +
  report + projection + history.
- One group per account, no tabs. The header carries the Chip and name on the
  left and the Month-End Balance with its caption on the right.
- Recurring rows link to the source account page; settlement rows link to the
  CreditCard.
- No handoff bundle; `ui-meridian` refines it later.

### Copy and docs

- PageHeader subtitle: "Fixed flows · Variable spending · Month-end balances".
- The manual's Month Overview topic gets a "Fixed flows" detail and an updated
  blurb. Accounts and Getting Started say the balance counts recurring flows
  since the As-of date, and that editing a rule rewrites the months since the
  anchor, with re-anchoring as the correction.
- Release notes carry the upgrade caveat on balances anchored in the past.
- Glossary and build status updated when the epic closes.

### Delivery slices

1. **Fixed rows, end to end.** The recurring-occurrence extraction with the
   index-free firing fix, `projectMonths` with flows, `deriveMonthCashFlow`
   (recurring rows only), the route, `monthCashFlowKey`, `useMonthCashFlow` and
   the card with source links. A future month shows its salary and transfers.
2. **Month-End Balance.** `monthEndBalance` and the Actual / Projected / Unknown
   group headers.
3. **Recurring History.** The engine accumulator, `recurringHistory`, the
   balance service with the storage rename and parity, and settlement. The
   anchor-month muted rows and the before-anchor note. The Dashboard balance
   includes the salary since the anchor.
4. **Settlement rows.** Stored auto-settlements for months at or before the
   current month, projected ones for future months.
5. **Docs.** Subtitle, manual topics, release-notes caveat, glossary and build
   status.

## Testing Decisions

- Good tests check external behaviour through each module's public interface: a
  returned boolean, date or cents value, a report group, an HTTP response, what
  renders and what links where. They do not check the engine's internal loops.
  Amounts are integer cents and dates ISO strings in every fixture. Unknown is
  asserted as Unknown, never as `0`.
- **Recurring occurrence.**
  - Monthly, quarterly with month of year, annual and legacy rules fire in the
    right months regardless of where a run starts.
  - The current month's quarterly occurrence fires.
  - Day-of-month clamping (31st in February, leap years).
  - The Anchor Gate: a leg on the Anchor Date is blocked, the day after passes,
    no anchor passes.
- **Recurring history.**
  - Sums gated legs in (Anchor Date, through]; a leg later this month is
    excluded.
  - Signs follow the transfer side; a transfer moves both accounts.
  - A Mortgage leg is capped at the remaining Restschuld.
  - Zero with no rules, and zero when `through` is on or before the anchor.
- **Projection engine** (prior art: its existing test).
  - `actual` includes the accumulator after the anchor and is unchanged before
    it.
  - The current month's legs survive into month 1.
  - The Mortgage's History value equals the replayed Restschuld.
  - `/projection` snapshots are unchanged apart from the firing fix.
  - `projectMonths` reports the applied flows, including the capped repayment.
  - The rewritten current-month quarterly case.
- **Settlement.** The closing balance includes a recurring subscription on the
  card. Prior art: its existing test.
- **Balance service.** Current Balance = Recorded Balance + Recurring History;
  Total Liquid sums only liquid accounts; an account without rules is unchanged.
  Prior art: the settlement service test.
- **Storage parity.** `recordedBalance` equals `balanceAt(today)`.
- **Month cash flow.**
  - Plain, source and destination legs with the right signs and counterparts.
  - Annual and quarterly rows only in their months.
  - Muted anchor-month rows; no rule rows before the anchor month.
  - Capped-to-zero and plain-on-Mortgage rules excluded.
  - Stored settlements for past months, projected ones for future months.
  - Group order by `sortOrder`, rows by date, every kind included.
- **Month cash flow route** (prior art: the year-comparison route test).
  - 400 with `issues` on a malformed month.
  - A future month runs forward; a past month matches History; a month before
    the History Span gives empty groups.
- **Month-End Balance.** Actual for a past month, projected for the current and
  a future month, Unknown for a `null` point, before the span and past the
  projection. Prior art: the Past Lead-in test.
- **`useMonthCashFlow`.** Reads through the cache under its branded key; a
  revisited month paints from cache. Prior art: the existing `useCachedResource`
  hook tests.
- **Fixed Flows card** (prior art: SpendingList and MonthBreakdown tests).
  - Groups per account with Chip, name and Month-End Balance captions,
    including "No data before …".
  - Red/green signed rows with linked lines and source-account links.
  - Muted "In balance anchor" rows left out of "Net fixed".
  - The before-anchor note and "No fixed flows this month."
- **MonthOverview.** The card renders in its own `SectionState` between the stat
  strip and the columns, and the new subtitle shows.

## Out of Scope

- Editing recurring rules from the Month page.
- A start-of-month balance or a reconciliation line.
- Changes to MonthStatStrip, SpendingList, MonthBreakdown or YearComparison.
- One-off Transfers on the Month page (logged as a gap).
- Per-rule effective dates (a candidate later epic).
- Booking recurring occurrences as Transactions.
- Multiple Mortgages.
- Instantly refreshing a future month's projected settlement after a CreditCard
  expense.
- Import Category Learning, the next epic.

## Further Notes

- Design log: `docs/design-logs/32-month-cash-flow.md`. The user approved every
  recommendation in advance, so the log was a solo grill settled from the code.
- Closes the gap handed on by Balance Anchor (log 30 Q8) and Financial History
  (log 31 Q13): salary after the Anchor Date missing from the balance and from
  Monthly Savings.
- Reverses the #138 recompose's variable-only Month Overview. Depends on Live-Use
  Repair Round 1 defect #1 (the mirrored transfer rows), which has shipped.
- Upgrading changes balances anchored in the past; the release notes say so.
