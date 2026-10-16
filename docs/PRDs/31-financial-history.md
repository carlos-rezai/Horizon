## Problem Statement

I use Horizon as my real personal finance tracker. My mortgage runs for ten
years and is about to enter its fourth. The three years I have already paid off
are the most motivating number Horizon could show me, and no screen shows them.

The History page starts at my earliest imported statement. A mortgage has no
transactions of its own, so Horizon knows its Restschuld only from the day I
entered it. The Restschuld line on History therefore starts today, and so does
the Trajectory Horizon on the Dashboard. Everything I see is the remainder still
to pay, never the paydown behind it.

Savings and spending have the same gap. Month Overview shows one month at a
time, and the Savings Streak only says met or missed. Nothing shows whether I
saved more this year than last, or whether my spending is creeping up.

Horizon reads as a tool that projects the future. I want it to show where my
money has been as well as where it is going, without inventing a monthly figure
it does not know and without ever showing an Unknown month as €0.

## Solution

**The mortgage's whole life on one line.** Horizon knows one Restschuld before
the day I entered it: the **Origination Point**, which is the Original Principal
at the Mortgage Start Date. History now starts there. Between the Origination
Point and the Mortgage's Known Since, Horizon draws a **Paydown Bridge**: a
straight, dotted, faded line joining the two known points. It is a connection,
not data. Interest is not modelled, so the monthly path is unknown. When I hover
a bridge month, the tooltip reads "No monthly data · €X paid off {Mon YYYY}–{Mon
YYYY}" and never shows an interpolated figure. From the Mortgage's Known Since
onwards the solid Restschuld line carries on as it does today.

**History begins where my data begins.** The History page spans every month
from the earliest point Horizon knows anything (an account's Known Since or the
Mortgage Start month) up to the current month. A user with no imports but a
mortgage origination now has a History. The Year Archive lists only the years
with real recorded data, so years covered only by the bridge are left out. The
Month Overview picker is unchanged: it still opens only months that have
transactions.

**The past behind the projection.** The Dashboard's Trajectory Horizon gains a
**Past Lead-in**: up to ten years of real history drawn to the left of the
projection, on a band labelled "ACTUALS", with the Paydown Bridge drawn as on
History. The TODAY Marker moves from the left edge to where today really is.
The Payoff Marker, the Freedom Phase and the Sondertilgung months stay
forward-only.

**Trends, not single months.** A new **History Trends** card sits between the
History chart and the Year Archive. It shows monthly bars I can switch between
**Saved** and **Spent**, with a trailing-12-month average line.

- **Monthly Savings** is how much my liquid and Investment accounts' balances
  grew that month, so a transfer between two of them nets to zero and a
  Sondertilgung counts as money that left savings.
- **Monthly Spending** is that month's Variable Spending, under the same rule
  as Month Year-Comparison, so the two can never disagree.
- A month Horizon cannot judge draws no bar, and its tooltip explains why.

The History chart's 1Y / 3Y / All chips govern both cards.

**The pitch catches up.** The README and CLAUDE.md overviews are rewritten so
that Horizon reads as past, present and projected. The in-app manual describes
the bridge, the lead-in and the trends.

## User Stories

### Mortgage paydown since origination

1. As a user with a mortgage that started years before I set up Horizon, I want
   History to start at the Mortgage Start Date, so that I can see the paydown I
   have already achieved.
2. As a user, I want the Restschuld before the mortgage's Known Since drawn as a
   straight, dotted, faded line from the Original Principal to the first known
   Restschuld, so that I can see the two facts Horizon knows joined up.
3. As a user, I want the bridge to meet the solid Restschuld line at the
   mortgage's first known month, so that the paydown reads as one continuous
   story.
4. As a user hovering a bridge month, I want the tooltip to read "No monthly
   data · €X paid off {Mon YYYY}–{Mon YYYY}", so that I know the total paid off
   across the bridge without mistaking the line for a monthly value.
5. As a user, I want the tooltip never to show an interpolated Restschuld for a
   bridge month, so that Horizon never presents a number it does not know.
6. As a user, I want the bridge's style (dotted, faded) to differ clearly from
   the dashed Restschuld line, so that I can tell a connection from data at a
   glance.
7. As a user who edits the Mortgage Start Date or Original Principal in the
   Mortgage Modal, I want the bridge to reshape the next time History loads, so
   that it always reflects my current origination.
8. As a user with no mortgage origination entered, I want no bridge drawn, so
   that Horizon draws nothing it has no basis for.
9. As a user whose Mortgage Start Date falls in the same month as its Known
   Since, I want no bridge drawn, so that a zero-length segment does not appear.
10. As a user with no mortgage at all, I want History to behave as it does
    today, so that the change is invisible to me.
11. As a user, I want the Restschuld itself to stay Unknown under the bridge, so
    that every other surface that reads it still treats those months as
    Unknown.
12. As a user, I want the bridge to obey the Restschuld line's legend toggle, so
    that hiding the Restschuld hides its bridge too.

### History Span

13. As a user with a mortgage origination but no imports, I want History to show
    the paydown since origination instead of an empty state, so that a mortgage
    on its own is enough to have a history.
14. As a user, I want History to start at the earliest month Horizon knows
    anything about any account (or the Mortgage Start month), so that no known
    data is cut off.
15. As a user, I want History to always end at the current month, so that it
    meets the present.
16. As a brand-new user whose earliest data is this month, I want the History
    empty state, so that a one-month chart is never drawn.
17. As a user with an empty History, I want the hint to read "Import a bank
    statement or add your mortgage's origination to see your history", so that I
    know both ways to start one.
18. As a user, I want the Month Overview picker to keep opening only months with
    transactions, so that widening History does not open empty months to browse.
19. As a user, I want the 1Y / 3Y / All chips to keep working across the wider
    span, so that I can zoom in on recent years.

### Year Archive

20. As a user, I want the Year Archive to list every year with at least one
    month of real recorded data, so that a year whose data is a manual anchor,
    not an import, still appears.
21. As a user, I want years covered only by the bridge left out of the Year
    Archive, so that the archive lists recorded data only.
22. As a user, I want the statement badge shown only on a year that has
    statements, so that a year without imports does not show "0 statements".
23. As a user, I want the archive's month rows to keep linking to that month's
    overview, so that I still have one way in to a past month.

### Past Lead-in on the Trajectory Horizon

24. As a user on the Dashboard, I want the Trajectory Horizon to show my real
    past balances to the left of the projection, so that past and projected sit
    on one chart.
25. As a user, I want the lead-in capped at ten years back, so that an old
    mortgage cannot squash the ten-year forward view.
26. As a user, I want a band labelled "ACTUALS" behind the lead-in, so that I can
    tell recorded history from projection.
27. As a user, I want the TODAY Marker at the current month's real position, so
    that it divides past from future correctly.
28. As a user, I want each line to keep its colour across the lead-in and the
    projection, so that an account reads as one line through time.
29. As a user, I want the Paydown Bridge drawn on the lead-in the same way as on
    History, so that the two charts tell the same story.
30. As a user, I want the current month drawn once, from the projection, so that
    the join between past and future has no doubled or jumping point.
31. As a user, I want the Payoff Marker, the Freedom Phase and the Sondertilgung
    months to stay in the future, so that the lead-in does not change what they
    mean.
32. As a user with no history, I want the Trajectory Horizon exactly as it is
    today, with TODAY at the left edge, so that a new install is unchanged.
33. As a user, I want the lead-in to break where an account is Unknown, as
    History does, so that the Dashboard never draws a false €0.
34. As a user, I want the chart's legend toggles and saved visibility to apply to
    the lead-in too, so that hiding an account hides its whole line.
35. As a user, I want the chart title to stay "10-Year Projection", so that the
    forward window it names is unchanged.

### Cached history

36. As a user moving between the Dashboard, the History page and the Savings
    Streak, I want history loaded once and shared, so that the app feels fast
    and the screens agree.
37. As a user who adds a transaction, edits an account, a recurring flow or the
    mortgage, or commits or deletes an import, I want every history surface to
    refresh, so that no screen shows stale history.
38. As a user who commits or deletes an import, I want the Year Archive's
    statement badges to refresh, so that the counts are current.

### Monthly Savings trend

39. As a user, I want a bar per month for how much my liquid and Investment
    accounts grew, so that I can see my saving over time.
40. As a user, I want a transfer between two of those accounts to count as zero,
    so that moving money between my own accounts is not mistaken for saving.
41. As a user, I want a Sondertilgung paid out of those accounts to count as
    money that left savings, so that the bar reflects my liquid position.
42. As a user, I want a negative month drawn as a bar below zero in the error
    colour, and a positive month in the success colour, so that a bad month
    stands out.
43. As a user, I want no bar for a month where any liquid or Investment account
    is Unknown, that month or the month before, so that a partial sum is never
    shown as my savings.
44. As a user, I want no bar for the first month of my history, so that a month
    with nothing to compare against is not judged.
45. As a user hovering a month with no bar, I want the tooltip to read "No data
    before {Mon YYYY}", so that I know why it is empty.
46. As a user, I want Monthly Savings to count all my liquid and Investment
    accounts whether or not they have a savings target, so that the trend shows
    my whole savings and not just the streak's subset.

### Monthly Spending trend

47. As a user, I want a bar per month for my Variable Spending, so that I can see
    whether my spending is rising.
48. As a user, I want Monthly Spending to use exactly the rule Month
    Year-Comparison uses, so that the two never disagree.
49. As a user, I want spending shown as a positive magnitude, so that a taller
    bar means more spending.
50. As a user, I want a month where no spending account is known yet to draw no
    bar, so that the months before my first import do not read as €0 spent.
51. As a user, I want a known month with no spending to draw a real €0, so that
    a quiet month is distinguishable from an Unknown one.

### History Trends card

52. As a user, I want a Saved / Spent segmented control on the card, so that I
    can switch between the two trends.
53. As a user, I want a trailing-12-month average line on the bars, so that I can
    tell a trend from a single unusual month.
54. As a user, I want the average to use only known months, so that Unknown
    months do not drag it toward zero.
55. As a user, I want the average left undrawn where its window holds no known
    month, so that it never starts from nothing.
56. As a user, I want the History chart's 1Y / 3Y / All chips to govern the
    trends card too, so that both cards show the same period.
57. As a user, I want the trend bars not to be clickable, so that the Year
    Archive stays the single way into a past month.
58. As a user with no history, I want the trends card hidden along with the rest
    of History's content, so that the empty state stays one clear message.
59. As a user on a slow load, I want the card to show the History page's loading
    treatment, so that it does not pop in late.
60. As a user who prefers reduced motion, I want the card to respect that
    setting like the rest of the app, so that bars do not animate in.

### Net Cashflow

61. As a user, I want Net Cashflow kept as the sum of a month's stored
    transactions in the History tooltip and the Year Archive, so that "what
    happened" stays available beside the new savings trend.
62. As a user hovering a month where nothing is known, I want the tooltip to
    leave out Net Cashflow, so that a bridge month never reads "Net Cashflow €0".

### Known limitation

63. As a user whose past months after the Anchor Date lack their recurring
    salary, I want the trend copy not to hide that those months may read low, so
    that I know to import or re-anchor, until Month Cash Flow fixes it.

### Docs

64. As a reader of the README, I want the overview to present Horizon as past,
    present and projected, so that the pitch matches the product.
65. As a user reading the manual's History topic, I want the bridge, the History
    Span and the trends explained, so that I know what each line and bar means.
66. As a user reading the manual's Dashboard topic, I want the Past Lead-in and
    the moved TODAY Marker explained, so that the changed chart is not a
    surprise.

## Implementation Decisions

### The History payload

- `HistoryPoint` gains three fields. Existing fields are unchanged.
  - `restschuldBridge: number | null`. It is the straight line from the
    Origination Point to the Mortgage's Known Since. It is non-null from the
    Mortgage Start month through the Mortgage's first known month inclusive, and
    at that month it equals `restschuld`. Everywhere else it is `null`.
  - `monthlySavings: number | null`. It is the sum of month-over-month balance
    gains across the Trackable Accounts (Girokonto, Tagesgeld, Investment). It
    is `null` when any Trackable Account is Unknown in that month or the month
    before, and in the first month of the span.
  - `monthlySpending: number | null`. It is the magnitude of the month's
    Variable Spending outflows on the spending accounts. It is `null` when no
    spending account is known that month.
- `restschuld` keeps its Unknown rule: under the bridge it stays `null`. The
  bridge never writes into it.
- `HistoryAccount` gains optional `originalPrincipal` and `startDate`. The route
  passes the stored accounts, which are a structural superset, instead of the
  projection entry, so the origination reaches `deriveHistory`.
- Nothing is stored. The bridge, the span and the trends are all derived on
  every read.
- Single-mortgage, as today. `deriveHistory` keeps reading the one Mortgage.

### Deep module: history derivation (server)

- `deriveHistory(snapshots, transactions, accounts)` stays the one place that
  turns engine snapshots into `HistoryPoint[]`, per log 23's rule that the
  server owns all history derivation. It now also computes the bridge and both
  trend fields.
- The Trackable Account kinds become a server-side domain rule beside it. The
  client's Savings Streak keeps its own per-account gain logic, which answers a
  different question (per account against a target, not summed).
- Monthly Spending calls the shared Variable Spending lib (`isVariableSpending`,
  `selectSpendingAccounts`), the one behind Month Year-Comparison. That rule is
  not copied anywhere.
- A pure **History Span** helper returns the first month of the span, given the
  accounts and transactions. That month is the earliest of every account's Known
  Since month (from the Balance Anchor lib) and the Mortgage Start month.

### `GET /projection/history`

- The `imports.length === 0 → []` guard is replaced. The response is `[]` when
  the History Span would hold only the current month.
- The engine replays from the History Span's first month through the current
  month.
- The response stays a flat `HistoryPoint[]`, with no envelope and no new
  endpoint.

### Year Archive

- A year is listed when at least one of its months has a known value in a
  series other than the bridge. This replaces "years with at least one import".
- The statement badge still comes from the imports list. A year with zero
  statements shows no badge.

### HistoryChart

- A new dotted, faded bridge `Line` is keyed to `restschuldBridge` and governed
  by the Restschuld legend toggle and colour.
- In a bridge month, the Restschuld tooltip row reads "No monthly data · €X paid
  off {Mon YYYY}–{Mon YYYY}". X is the Original Principal minus the Restschuld at
  the Mortgage's first known month. The months are the Mortgage Start month and
  that first known month.
- In a month where every account is Unknown, the tooltip leaves out the Net
  Cashflow row.
- The empty-state hint is "Import a bank statement or add your mortgage's
  origination to see your history".

### Cache

- Two keys are added to the cache key registry:
  - `HISTORY`, for `GET /projection/history`;
  - `IMPORT_HISTORY`, for the imports list the Year Archive reads its badges
    from.
- `useHistory` and `useSavingsGoal` read `HISTORY` through `useCachedResource`.
  This replaces two raw fetches of the same endpoint.
- Every mutation that bumps `PROJECTION` also bumps `HISTORY`. Import commit and
  delete bump `IMPORT_HISTORY` too.

### Deep module: Past Lead-in (client)

- `buildPastLeadIn(points, accounts)` is a pure function in the projection util,
  beside `buildTrajectoryData`, with its own test. It returns chart rows for the
  history points before the current month, at most 120 of them, keyed with the
  same series keys `buildTrajectoryData` uses plus the bridge. Unknown values
  stay `null`.
- The Trajectory Horizon prepends those rows to the projected rows. The current
  month comes from the projection (month 0) only.
- The TODAY Marker sits at the lead-in's length. With no lead-in it stays at
  index 0, which is today's behaviour.
- A Meridian-token `ReferenceArea` labelled "ACTUALS" spans the lead-in.
- The Payoff Marker, the Freedom Phase Area and the ST month logic read only the
  projected rows and do not change. The Y domain covers the lead-in values too.
- `DashboardPage` passes the cached history points. The title stays "10-Year
  Projection".

### History Trends card

- A new History feature component with co-located styles and test. It is
  composed from the existing Meridian components (`ChartFrame`, `ChartTooltip`,
  the segmented chips) and uses theme tokens only. There is no handoff bundle,
  and `ui-meridian` refines it later.
- Its props are the visible points and the selected range. It has a Saved /
  Spent segmented control.
  - Saved bars diverge around zero on the success and error tokens.
  - Spent bars are a single series.
- A `null` month draws no bar, and its tooltip reads "No data before {Mon
  YYYY}".
- The trailing-12-month average is a pure helper with its own test. It averages
  the known months in the window and is `null` when the window has none. It is
  drawn as a reference line.
- Bars are not clickable.
- The 1Y / 3Y / All range state moves up from the HistoryChart to `HistoryPage`,
  so one range governs both cards.

### Docs

- The README Project Overview and the CLAUDE.md overview are rewritten to "past,
  present and projected".
- The manual's History and Dashboard topics describe the bridge, the History
  Span, the lead-in and the trends.
- The build status entry is ticked when the epic closes.

### Delivery slices

1. **Paydown Bridge end to end.** The origination fields on `HistoryAccount`,
   `restschuldBridge`, the History Span and the new empty rule in the route, the
   bridge line and tooltip, the Year Archive gate, the empty-state copy, and the
   Net Cashflow tooltip rule. The year-4 mortgage shows its paydown on History.
2. **Cached history.** `HISTORY` and `IMPORT_HISTORY`, both hooks on
   `useCachedResource`, and the bumps. Behaviour does not change.
3. **Past Lead-in.** `buildPastLeadIn`, the ACTUALS band, the TODAY Marker at its
   real index, and the bridge on the Trajectory Horizon.
4. **Trends.** `monthlySavings` and `monthlySpending`, the History Trends card,
   the trailing average, and the range lifted to the page.
5. **Docs.** The pitch rewrite, the manual topics and the build status.

## Testing Decisions

- Good tests check external behaviour through each module's public interface:
  a returned `HistoryPoint`, a span start month, a chart row, what renders and
  what a tooltip reads. They do not check internal loops or Recharts internals.
  Amounts are integer cents and dates are ISO strings in every fixture. Unknown
  is asserted as `null`, never `0`.
- **`deriveHistory`.**
  - Bridge: the start and end values, linear between them, equal to
    `restschuld` at the join, and `null` outside the bridge. It is `null` when
    there is no Mortgage, no origination, or the start month equals Known Since.
    `restschuld` stays `null` under it.
  - Monthly Savings: a Recurring Transfer between Trackable Accounts nets to
    zero, and a Sondertilgung out of them is negative. It is `null` when one
    Trackable Account is Unknown that month or the month before, and in the
    first month. It counts a Trackable Account that has no target.
  - Monthly Spending: it agrees with the year-comparison rule on the same
    fixture, it is `null` before any spending account is known, and it is a
    real `0` in a known month with no spending.
  - Prior art: the existing history lib test.
- **History Span helper.**
  - An account's Known Since is earliest.
  - The Mortgage Start month is earliest.
  - There is no Mortgage origination.
  - Only the current month is known.
- **`GET /projection/history` route.**
  - A mortgage origination without imports returns points from the start month.
  - A fresh install returns `[]`.
  - The span runs through the current month.
  - Prior art: the existing projection route tests for `/history`.
- **`buildPastLeadIn`.**
  - Caps at 120 rows.
  - Excludes the current month.
  - Uses the same series keys as `buildTrajectoryData`.
  - Keeps `null`s.
  - Returns an empty array for no points.
  - Prior art: the projection util and trajectory tests.
- **Trailing average helper.**
  - Averages a full window.
  - Averages a partial window.
  - Skips Unknown months.
  - Returns `null` for an all-Unknown window.
- **HistoryChart.**
  - The bridge line renders.
  - A bridge-month tooltip reads "No monthly data · €X paid off …" and never shows
    an interpolated amount.
  - Net Cashflow is left out in an all-Unknown month.
  - The new empty-state hint renders.
  - Prior art: its co-located test.
- **YearArchive.**
  - A bridge-only year is not listed.
  - A year without imports but with known data is listed, with no badge.
  - Prior art: its co-located test.
- **HistoryTrends.**
  - The Saved / Spent switch.
  - Diverging Saved bars.
  - No bar, and the "No data before …" tooltip, for a `null` month.
  - The average line.
  - Prior art: the HistoryChart and Month breakdown chart tests.
- **HistoryPage.** One range chip change updates both cards.
- **TrajectoryHorizon.**
  - The TODAY Marker sits at the lead-in index.
  - The ACTUALS band renders only with a lead-in.
  - Without history the render is unchanged.
  - Prior art: its co-located test.
- **`useHistory` and `useSavingsGoal`.**
  - They read through the cache: one fetch shared across both.
  - A `PROJECTION`-paired bump refetches.
  - Prior art: the existing `useCachedResource` hook tests.

## Out of Scope

- Interest modelling and annuity curves. The bridge is a straight connection
  only.
- Restschuld readings from lender statements, which would be multiple anchors
  (log 30 Q2).
- More than one Mortgage in history.
- Per-category spending trends.
- Net worth.
- Widening the Browsable Range (the MonthYearPicker).
- The missing recurring flows in past months after the Anchor Date, which
  belongs to Month Cash Flow.
- Extracting chrome shared by HistoryChart and the Trajectory Horizon, which is
  left for a later refactor plan.
- Clickable trend bars.

## Further Notes

- Design log: `docs/design-logs/31-financial-history.md`. Q15 (Monthly Spending
  can be Unknown) and Q16 (no Net Cashflow row in an all-Unknown month) were
  settled while writing this PRD. Both follow from the rule that Unknown is
  never €0, which the wider History Span would otherwise break.
- The design log and glossary first called the Monthly Savings set "Tracked
  Accounts". The glossary already uses that term for accounts with a target
  above zero, so they now say **Trackable Accounts**.
- Depends on Balance Anchor (#230–#237): Known Since, Unknown as `null`, and the
  Anchor Gate.
- Once this ships, the Restschuld paydown since origination is visible on both
  History and the Dashboard. That was the live-use trigger for this epic.
