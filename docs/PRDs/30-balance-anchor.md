## Problem Statement

I use Horizon as my real personal finance tracker. When I set up my
Girokonto, I typed in the balance my bank app showed me that day. I then
imported the last 12 months of statements so that Horizon would have my
history, and the balance went wrong. It now reads my real balance **plus**
the net of those twelve months. Nothing is missing; the number is just
wrong, and every surface that reads it is wrong with it: the Accounts card,
the Account Hero, Total Liquid, the Trajectory Horizon and the projection.

The only workaround is to enter the balance as it stood on the day before
my oldest imported transaction. I don't know that number. My bank exports
12 months at most, and I don't know when the account was really opened.

The history surfaces have the matching problem in the other direction.
Before the first month Horizon has data for, the History chart and the
Year Archive show **€0**. That reads as "you had nothing", not "Horizon
doesn't know". The Savings Streak then counts those false €0 months as
missed or met.

My mortgage is wrong in a subtler way. I entered the Restschuld as it
stands today, but the monthly repayment from my Girokonto is replayed from
the Girokonto's opening month. Payments from before I entered the
Restschuld come off it again, and in the current month the rate I already
paid comes off a second time.

Finally, the account form shows the opening date in edit mode, but a
change to it is silently thrown away. The manual tells me the date is
fixed at creation.

## Solution

**One known balance on one known day.** Every account has a **Balance
Anchor**: the balance I know (the **Anchor Balance**) on the day I know it
(the **Anchor Date**). That might be today's balance from the bank app or a
statement's closing Saldo. The anchor is the balance at the **end** of that
day, including that day's transactions.

- After the anchor, the balance is the anchor plus later transactions. This
  is the Current Balance on every surface.
- Before the anchor, the balance is derived backwards: the anchor minus the
  transactions between that day and the anchor.
- A balance is known back to **Known Since**: the earlier of the Anchor Date
  and the account's oldest transaction. Before that it is **Unknown**.
- Importing older statements extends the known history backwards and never
  moves today's balance.

**Unknown is never €0.** The History chart breaks its line where data is
missing, and the tooltip reads "No data before {Mon YYYY}". The Year Archive
shows "—". The Savings Streak skips a month it cannot judge instead of
counting it as met or missed.

**Recurring never rewrites the past.** A recurring flow moves an account's
balance only on dates after that account's Anchor Date. A mortgage's
Restschuld no longer has old payments taken off, and this month's rate is
not counted twice. In import, salary and standing-order rows dated on or
before the anchor are no longer pre-unchecked as recurring, because the
anchor already contains them and nothing replays them.

**Re-anchoring is just editing.** The account form calls the fields
**Balance** and **As of**, with the help text "Your balance at the end of
this day, including that day's transactions". In edit mode both fields
save. The date cannot be in the future. The Account stat strip shows
**Balance anchor**: the amount and "as of {date}".

Existing accounts migrate without changes to their data. An account whose
opening date came before all of its transactions keeps the same numbers. An
account set up today with past months imported afterwards fixes itself.

## User Stories

### Setting the anchor

1. As a new user, I want to create an account with the balance my bank shows
   today and today's date, so that I can start tracking without knowing any
   historical balance.
2. As a user, I want the balance field labelled "Balance" and the date field
   "As of", so that I enter what I actually know rather than guess at an
   "opening" figure.
3. As a user, I want help text saying the balance is the end-of-day balance
   including that day's transactions, so that I know a bank app balance or a
   statement's closing Saldo is the right number to type.
4. As a user, I want the "As of" date picker to stop at today, so that I can't
   anchor a balance I can't know yet.
5. As a user, if a future date reaches the server anyway, I want it rejected
   with a clear error, so that a bad anchor never reaches the data.
6. As a user, I want to enter a statement's closing Saldo and the statement's
   end date as the anchor, so that I can anchor to a past date I have
   evidence for.

### Current Balance

7. As a user who anchored today and then imported 12 months, I want my
   balance to stay exactly what my bank shows, so that the import adds
   history without changing the present.
8. As a user, I want transactions dated after the anchor to change my
   balance, so that everything I record from now on is reflected.
9. As a user, I want a transaction dated on the anchor day to count as
   already part of the anchor, so that today's booked rows in a fresh export
   are not counted twice.
10. As a user, I want future-dated transactions to keep counting toward the
    Current Balance as they do today, so that nothing else changes behind my
    back.
11. As a user, I want Total Liquid, the Accounts cards, the Account Hero and
    the Dashboard to show the anchored balance, so that every surface agrees.

### Re-anchoring

12. As a user, I want to change the anchor balance and the anchor date in the
    account edit form and have both save, so that I can re-anchor when I
    notice a difference from my bank.
13. As a user, I want re-anchoring to replace the old anchor rather than add
    a second one, so that there is only one source of truth per account.
14. As a user, I want the Account stat strip to show "Balance anchor" with
    the amount and "as of {date}", so that I can see what Horizon is anchored
    to.
15. As a user, I want the manual to stop saying the date is fixed at
    creation, so that the docs describe Horizon as it now behaves.

### Derived history

16. As a user, I want the balance for any past month on or after Known Since
    to be derived backwards from the anchor through my recorded transactions,
    so that past balances match what my statements imply.
17. As a user, I want importing an older statement to extend how far back
    Horizon knows my balance, without moving the anchor or today's balance.
18. As a user, I want Known Since to take account of manual and settlement
    transactions as well as imported ones, so that any recorded transaction
    extends history.
19. As a user, I want Horizon to treat the transactions between Known Since
    and the anchor as complete, so that it gives a definite answer rather
    than a hedge on every month.

### Unknown months

20. As a user viewing the History chart, I want the account's line to break
    before Known Since, so that I see a gap rather than a false drop to €0.
21. As a user hovering an Unknown month, I want the tooltip to say "No data
    before {Mon YYYY}", so that I know why there is no value.
22. As a user viewing the Year Archive, I want Unknown months shown as "—",
    so that they are not mistaken for an empty account.
23. As a user, I want Total Liquid for a month to sum only the liquid
    accounts known that month, and be Unknown only when none is known, so
    that one account with a short history does not blank the total.
24. As a user, I want an account before its Known Since to be treated like an
    account that did not exist yet, so that Total Liquid behaves the same in
    both cases.
25. As a user with a mortgage, I want the Restschuld before the mortgage's
    Known Since to be Unknown, so that the chart doesn't invent a paydown.
26. As a user, I want no surface to show €0 for an Unknown month, so that
    "no data" never looks like "no money".

### Savings Streak

27. As a user, I want a month where any tracked account is Unknown, in that
    month or the month before, to be neither met nor missed, so that the
    streak isn't judged on data Horizon doesn't have.
28. As a user, I want the streak and the Recent Savings Pace to skip Unknown
    months, so that a short history doesn't break or inflate them.

### Recurring and the Anchor Gate

29. As a user, I want a recurring occurrence to move an account's balance
    only if its date is after that account's Anchor Date, so that recurring
    flows never rewrite history the anchor already contains.
30. As a user with a recurring transfer into my mortgage, I want payments
    dated before the Restschuld's anchor not to be taken off it, so that the
    Restschuld I entered stays the Restschuld.
31. As a user who anchored the Restschuld after this month's rate was paid,
    I want this month's rate not to be taken off again, so that the payoff
    date isn't pulled forward by a payment counted twice.
32. As a user, I want the gate checked on each leg of a recurring transfer
    separately, so that the source account is still debited when only the
    destination is gated.
33. As a user, I want the occurrence date to be the month at the recurring
    day of month, clamped to the month's length, so that a flow on the 31st
    is placed correctly in shorter months.
34. As a user, I want the gate applied in both the replay of past months and
    the forward projection, so that past and future follow the same rule.

### Import

35. As a user importing a statement, I want rows dated on or before the
    account's Anchor Date never to be pre-unchecked as recurring, so that my
    salary and standing orders from those months appear in the derived
    history.
36. As a user, I want rows after the anchor still flagged as recurring as
    before, so that the duplicate protection I rely on keeps working.

### Credit Card settlement

37. As a user with a linked credit card, I want the end-of-month closing
    balance worked out from the anchor, so that auto-settlement pulls the
    right amount after past statements are imported.
38. As a user creating a credit card with a funding account, I want "linked
    since" to keep defaulting to the anchor date, so that settlement starts
    where my known balance starts.

### Mortgage

39. As a user setting up a mortgage, I want "Restschuld today / as of" to be
    that mortgage's anchor, so that the mortgage follows the same model as
    every other account.
40. As a user, I want the existing mortgage rules kept: the start date on or
    before the anchor date, and an original principal no less than the
    Restschuld, so that the setup can't contradict itself.

### Migration

41. As an existing user, I want my accounts migrated without any change to
    their stored values, so that accounts whose opening date came before all
    their transactions show the same numbers.
42. As an existing user who set up an account today and imported the past
    afterwards, I want the balance to correct itself after the update, so
    that I don't have to repair it by hand.
43. As an existing user who once entered a transaction dated on the opening
    date, I want the release notes to say that it is now absorbed into the
    anchor and how to re-anchor, so that a changed number is not a surprise.

## Implementation Decisions

### Model: rename, reinterpret, replace

- **Opening Balance / Opening Date become Anchor Balance / Anchor Date.** The
  two account columns are renamed in place by a new migration (the next in
  sequence, 017). It renames only and does not rewrite any values. The DTO
  fields become `anchorBalance` / `anchorDate` across storage, routes, shared
  client types, `ProjectionAccountEntry`, Mortgage Setup and the history
  types. There are no aliases and no compatibility shim: client and server
  ship together and Horizon has no external API consumers.
- **One anchor per account.** Re-anchoring overwrites it. There is no anchor
  history.
- **End-of-day semantics.** The anchor includes transactions dated on the
  Anchor Date.

### The formula

For any date `d`:

```
balanceAt(d) = anchorBalance + Σ tx where anchorDate < date ≤ d     (d ≥ anchorDate)
balanceAt(d) = anchorBalance − Σ tx where d < date ≤ anchorDate     (d < anchorDate)
Current Balance = anchorBalance + Σ tx where date > anchorDate
```

`knownSince = min(anchorDate, oldest transaction date)`, counting
transactions from every source (import, manual, settlement). Its month is
the first known month.

### Deep module: Balance Anchor lib

- A new pure server lib, `balanceAnchor`, in the same `lib/<name>/<name>`
  shape as `projection` and `settlement`. It exposes two functions:
  - `balanceAt(anchor, transactions, date)` → integer cents
  - `knownSince(anchor, transactions)` → ISO date
- The lib has no I/O and owns the date arithmetic. It is the single
  definition of the formula on the TypeScript side, and the engine and
  settlement both call it.

### Current Balance in storage

- The Current Balance stays native SQL in the Storage layer (the
  AccountWithBalance rule). All three statements (list, by id, Total Liquid)
  only add transactions dated after the anchor date.
- The storage parity suite checks that the SQL Current Balance equals
  `balanceAt(today)` from the lib, so the two definitions cannot drift.

### Account API

- `AccountUpdateInput` gains `anchorDate` beside `anchorBalance`, so editing
  either saves.
- The account create and update routes reject an `anchorDate` later than
  today with `400`, using the same today-as-ISO idiom as `linkedSince`.
- The Mortgage route keeps its rules: `startDate ≤ anchorDate`, and an
  original principal of at least the Restschuld. When a CreditCard is created
  with a funding account, `linkedSince` still defaults to the Anchor Date.

### Projection engine

- Each account's `actual` for a month comes from `balanceAt(end of month)`.
  It is omitted for months before Known Since; the field is already
  optional.
- **Anchor Gate:** a recurring occurrence, dated at the month's `dayOfMonth`
  clamped to the month's length, moves a leg's balance only if that date is
  after that leg's account's Anchor Date. The gate is checked for each leg
  separately, so a transfer gated on the destination still debits the
  source. It applies in the Replay Loop and in the Forward Projection,
  including month 0.
- Non-mortgage accounts keep re-anchoring their running balance to `actual`
  for past and current months. Mortgages keep the replayed Restschuld, which
  the Anchor Gate now makes correct.

### Settlement

- A CreditCard's end-of-month closing balance is computed with `balanceAt`
  instead of opening balance plus everything.

### Import

- Recurring Detection never flags a row dated on or before the target
  account's Anchor Date. The preview builder passes the anchor date in.
  Detection after the anchor is unchanged.

### Unknown through the API

- `HistoryPoint.accounts` becomes `Record<string, number | null>`.
- `HistoryPoint.restschuld` is `number | null`. It is `null` before the
  Mortgage's Known Since.
- `HistoryPoint.totalLiquid` is `number | null`. It sums the liquid accounts
  known that month and is `null` only when none is known.
- Unknown is always an explicit `null`, never an omitted key or `0`, so the
  compiler forces every consumer to handle it. The client reads Known Since
  from the first non-null point; no `knownSince` field is added to the API.
- History derivation stops falling back to `?? 0` on `actual`.

### Rendering

- **HistoryChart:** `null` values break the line (no `connectNulls`). The
  tooltip row for an Unknown value reads "No data before {Mon YYYY}".
- **YearArchive:** Unknown cells show "—".
- **Savings Streak:** a month is neither met nor missed when any Tracked
  Account is Unknown in that month or the month before. The streak and the
  Recent Savings Pace skip that month. The `?? 0` read in the savings-goal
  util is removed.
- The Dashboard, Outlook and Account pages read the current month, which is
  always known. They need no Unknown handling.

### Account form and stat strip

- The labels are **Balance** and **As of**, with the help text "Your balance
  at the end of this day, including that day's transactions". The DatePicker
  caps at today. In edit mode the date field saves.
- The Account stat strip shows **Balance anchor** with the amount and "as of
  {date}".

### Docs

- The manual is updated for the account form, the account page and the
  mortgage, and the "opening date is fixed at creation" caution is removed.
- The release notes carry the migration caveat: a transaction dated on the
  old opening date is now absorbed into the anchor; re-anchor if a balance
  changed.
- The README build status is ticked when the epic closes.

### Delivery slices

1. Anchor model and Current Balance: migration, the rename end to end, the
   anchored SQL, `anchorDate ≤ today`, and the editable anchor in Account
   Edit Mode with the new labels. This slice alone fixes the live-use case.
2. Engine and settlement: the `balanceAnchor` lib, `actual` from `balanceAt`
   and omitted before Known Since, the Anchor Gate in replay and forward
   loops, and the settlement closing balance.
3. Import: the anchor skip in Recurring Detection.
4. Unknown, not €0: the nullable history types, history derivation, the
   chart line break and tooltip, "—" in the archive, and Savings Streak
   skipping.
5. Docs: manual, release notes, README.

## Testing Decisions

- Good tests check external behaviour through each module's public
  interface: a balance for a date, a snapshot for a month, a history point,
  a flag per row, what renders. They don't check internal loops or query
  shape. Amounts are integer cents and dates are ISO strings in every
  fixture.
- **`balanceAnchor` lib** (new, co-located test). Cover `balanceAt` on, after
  and before the anchor date; a transaction exactly on the anchor date
  (absorbed); a date before Known Since; an empty transaction list; and
  future-dated transactions. Cover `knownSince` when the anchor is earliest,
  when a transaction is earliest, and with transactions from every source.
- **Storage parity.** The SQL Current Balance equals `balanceAt(today)` for
  the live-use fixture (anchored today, 12 months imported), for an account
  whose anchor precedes all transactions, and for a transaction on the
  anchor date. Covers all three statements, including Total Liquid. Prior
  art: the existing `storage.parity` suite.
- **Projection engine.** `actual` is omitted before Known Since and matches
  `balanceAt` after it. Anchor Gate cases: a Mortgage anchored later than the
  funding Girokonto takes no pre-anchor payments; a month-0 rate dated on or
  before the anchor day is not counted again; a destination-gated transfer
  still debits the source; `dayOfMonth` 31 in February. Prior art: the
  existing projection engine test file.
- **Settlement.** The closing balance uses the anchor when past statements
  sit before it. Prior art: the existing settlement tests.
- **Recurring Detection.** A matching row on or before the anchor date is not
  flagged; the same row after it is. Prior art: the csvImport tests.
- **History derivation.** Nullable account values, `restschuld` and
  `totalLiquid`, including a partial Total Liquid and an all-Unknown month.
  Prior art: the existing history lib test and the projection route tests
  for `GET /projection/history`.
- **Account routes.** A future `anchorDate` is rejected with `400` on create
  and update; an `anchorDate` update persists; the mortgage `startDate`
  rule still holds against `anchorDate`.
- **Savings goal util.** A month with an Unknown tracked account, this month
  or last, is neither met nor missed; the streak and Recent Savings Pace skip
  it. Prior art: the existing savingsGoal util tests.
- **HistoryChart and YearArchive.** The line breaks on `null`, the tooltip
  reads "No data before {Mon YYYY}", and the archive renders "—" (never
  "€0"). Prior art: their existing co-located tests.
- **AccountCreateModal.** The "Balance" and "As of" labels and help text
  render, the date picker is capped at today, and edit mode submits a
  changed `anchorDate`. Prior art: the existing AccountCreateModal tests.

## Out of Scope

- The Current Balance missing skipped recurring flows after the anchor. This
  is handed to **Month Cash Flow**.
- Back-deriving the Restschuld from the Original Principal to the Mortgage
  Start Date, and any trend views. Both belong to **Financial History**.
- Multiple anchors per account, anchor history, and a reconciliation hint
  ("Horizon has €X on this date").
- A cutoff at today for future-dated transactions in the Current Balance.
- Widening the Browsable Range beyond the earliest import.
- A `knownSince` field in the API.

## Further Notes

- Source of truth: design log 30 (`docs/design-logs/30-balance-anchor.md`).
  Glossary terms (Balance Anchor, Anchor Balance, Anchor Date, Known Since,
  Unknown, Anchor Gate) are already in `docs/ubiquitous-language.md`.
- This epic is a prerequisite for **Financial History**: past balances can't
  be drawn correctly until they are derived backwards from a known balance.
- Live Use Repair Round 1 asked that `POST /mortgages` and `POST /accounts`
  both stay valid through this rework. They do, with the renamed fields.
- Known trade-off: Total Liquid over a month in which some accounts are
  Unknown is a partial sum by definition.
