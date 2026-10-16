# Plan: Financial History

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/238

## Architectural decisions

These decisions apply to every phase:

- **Routes**:
  - `GET /projection/history` keeps its path and still returns a flat
    `HistoryPoint[]`, with no envelope.
  - Its months are the **History Span**, the earliest of:
    - every account's Known Since month;
    - the Mortgage Start month, from Phase 2.

    The span always runs through the current month.

  - It returns `[]` when the span holds only the current month. This
    replaces the "no imports → `[]`" guard.
  - No new routes. `GET /imports` is unchanged.

- **Schema**: there are no migrations. The bridge, the span and both trends
  are worked out again on every read, and nothing new is stored.
- **Key models**:
  - `HistoryPoint` gains three fields. Every existing field, including its
    Unknown rule, is unchanged.
    ```ts
    restschuldBridge: number | null; // Origination Point → Mortgage Known Since, inclusive
    monthlySavings: number | null; // Σ month-over-month gain of Trackable Accounts
    monthlySpending: number | null; // |Variable Spending outflows| on spending accounts
    ```
  - `HistoryAccount` gains the optional `originalPrincipal` and `startDate`.
    The route passes the stored accounts, so the origination reaches the
    history derivation.
  - The **Paydown Bridge** never writes into `restschuld`, which stays
    `null` under it. At the Mortgage's first known month the bridge equals
    `restschuld`.
  - The **Trackable Accounts** are Girokonto, Tagesgeld and Investment,
    counted whether or not they have a savings target. They are a
    server-side rule beside the history derivation.
  - Monthly Spending uses the shared Variable Spending lib, and that rule
    is never copied.
  - Unknown is always an explicit `null`, never `0`, on every surface.
- **Cache**:
  - Two new registered keys:
    - `HISTORY` for `GET /projection/history`;
    - `IMPORT_HISTORY` for the imports list behind the Year Archive badges.
  - Every bump of `PROJECTION` also bumps `HISTORY`.
  - Import commit and delete bump `IMPORT_HISTORY` as well.
- **Derivation ownership**: the server works out every history value (log
  23). The client only builds chart rows, through the Past Lead-in builder
  and the trailing-average helper.
- **Single mortgage**: the history derivation keeps reading one Mortgage.

---

## Phase 1: History Span

**User stories**: 13–23, 62

### What to build

History starts at the earliest month Horizon knows anything about, rather
than at the earliest imported statement. The span runs from the earliest
Known Since across all accounts through the current month. The Mortgage
Start month joins the lower bound in Phase 2, together with the bridge that
gives those months something to draw. Until then, a stretch of nothing but
Unknown months would be blank.

- The route's empty rule becomes "the span holds only the current month".
- The empty-state hint reads "Import a bank statement or add your
  mortgage's origination to see your history".
- The Year Archive lists every year with at least one month where a series
  is known. The statement badge comes from the imports list and is left
  out when the year has no statements.
- In a month where every account is Unknown, the HistoryChart tooltip
  leaves out Net Cashflow.
- The MonthYearPicker's Browsable Range is left alone.

You can check it with an account anchored months ago and no imports: it
now has a History, and its year appears in the archive with no badge.

### Acceptance criteria

- [ ] A pure History Span helper returns the earliest Known Since month
      across accounts. It has a co-located test that covers:
  - [ ] the anchor-earliest case;
  - [ ] the transaction-earliest case;
  - [ ] the only-current-month case.
- [ ] `GET /projection/history`:
  - [ ] returns points from that month through the current month, with or
        without imports;
  - [ ] returns `[]` on a fresh install and when only the current month is
        known.
- [ ] The History empty-state hint shows the new copy.
- [ ] The Year Archive lists a year that has known data but no imports,
      with no badge, and still lists imported years with their badge.
- [ ] The HistoryChart tooltip shows no Net Cashflow row in an all-Unknown
      month.
- [ ] The MonthYearPicker still enables only months from the earliest
      imported transaction.
- [ ] Route, YearArchive and HistoryChart tests cover the above.

---

## Phase 2: Paydown Bridge

**User stories**: 1–12

### What to build

The mortgage's paydown since origination shows on History.

- The route passes the stored accounts, origination included, to the
  history derivation.
- The History Span's lower bound now also takes in the Mortgage Start
  month.
- `restschuldBridge` is a straight line in cents:
  - it starts at the Original Principal at the Mortgage Start month;
  - it ends at the Restschuld at the Mortgage's first known month, which
    it includes;
  - it is `null` everywhere else.
- The bridge is all `null` when:
  - there is no Mortgage;
  - there is no origination;
  - the start month is not earlier than Known Since.
- HistoryChart draws the bridge as a dotted, faded `Line` in the Restschuld
  colour, controlled by the Restschuld legend toggle.
- In a bridge month the Restschuld tooltip row reads "No monthly data · €X
  paid off {Mon YYYY}–{Mon YYYY}" and never shows the interpolated value.
- The Year Archive does not list a year covered only by the bridge.
- Editing the origination in the Mortgage Modal reshapes the bridge the
  next time History loads.

You can check it with the year-4 mortgage: History shows a dotted line from
the Original Principal down to today's Restschuld.

### Acceptance criteria

- [ ] History derivation tests cover:
  - [ ] the bridge's start and end values;
  - [ ] linear values in between;
  - [ ] equality with `restschuld` at the join;
  - [ ] `null` outside the bridge;
  - [ ] all-`null` for no mortgage, no origination, and start month equal
        to Known Since;
  - [ ] `restschuld` staying `null` under the bridge.
- [ ] The History Span helper covers the case where the Mortgage Start month
      is earliest.
- [ ] A route test shows that a mortgage origination with no imports
      returns points from the start month.
- [ ] HistoryChart renders the bridge line. Its tooltip reads "No monthly
      data · €X paid off …" with the correct X and months, and no
      interpolated amount appears.
- [ ] Toggling Restschuld hides both the line and its bridge.
- [ ] A bridge-only year is not listed in the Year Archive.

---

## Phase 3: Cached History

**User stories**: 36–38

### What to build

History becomes one cached resource, like the rest of the app.

- `HISTORY` and `IMPORT_HISTORY` join the cache key registry.
- `useHistory` reads both through `useCachedResource`, and `useSavingsGoal`
  reads `HISTORY` the same way. These replace their raw fetches.
- Every mutation that bumps `PROJECTION` also bumps `HISTORY`.
- Import commit and delete bump `IMPORT_HISTORY` too.

Nothing the user sees changes, but moving between the Dashboard and History
makes one request instead of two.

### Acceptance criteria

- [ ] Both keys are registered, and a mistyped key is a compile error.
- [ ] `useHistory` and `useSavingsGoal` share one fetch of
      `/projection/history` when both are mounted.
- [ ] Every `PROJECTION` bump site also bumps `HISTORY`. A test proves that
      a projection-affecting mutation refetches history.
- [ ] Import commit and delete refresh the Year Archive badges.
- [ ] The existing History page, Savings Streak and Dashboard tests still
      pass.

---

## Phase 4: Past Lead-in

**User stories**: 24–35

### What to build

The Dashboard's Trajectory Horizon draws real history to the left of the
projection.

- A pure Past Lead-in builder turns the cached history points from before
  the current month into chart rows.
  - It takes at most 120 rows.
  - The rows use the same series keys as the projection rows, plus the
    bridge.
  - Unknown values stay `null`.
- The chart prepends these rows, and the current month comes only from the
  projection.
- The TODAY Marker moves to the lead-in's length.
- A Meridian-token `ReferenceArea` labelled "ACTUALS" spans the lead-in.
- The bridge is drawn as on History.
- Legend toggles and saved visibility apply across the whole line.
- The Y domain covers the lead-in values.
- The Payoff Marker, the Freedom Phase and the Sondertilgung months read
  only the projected rows.
- The title stays "10-Year Projection".
- With no history, the chart is exactly as it is today.

### Acceptance criteria

- [ ] The Past Lead-in builder has a co-located test that covers:
  - [ ] the 120-row cap;
  - [ ] leaving out the current month;
  - [ ] series keys that match the projection rows;
  - [ ] keeping `null`s;
  - [ ] an empty input.
- [ ] TrajectoryHorizon tests cover:
  - [ ] the TODAY Marker at the lead-in index;
  - [ ] the ACTUALS band appearing only when there is a lead-in;
  - [ ] the bridge line appearing in the lead-in;
  - [ ] an unchanged render with no history.
- [ ] The Payoff Marker, the Freedom Phase and the ST months land on the same
      months as before.
- [ ] The Dashboard reads history from the `HISTORY` cache and makes no
      extra fetch.

---

## Phase 5: Saved Trend

**User stories**: 39–46, 53–61, 63

### What to build

History shows how much was saved each month.

- The server derives `monthlySavings`: the sum of the month-over-month
  gains of the Trackable Accounts.
  - It is `null` when any Trackable Account is Unknown that month or the
    month before, and in the first month of the span.
  - A Recurring Transfer between two Trackable Accounts nets to zero.
  - A Sondertilgung paid out of them counts as negative.
- A new History Trends card sits between HistoryChart and the Year Archive.
  - It shows Saved bars diverging around zero, on the success and error
    tokens.
  - A `null` month has no bar, and its tooltip reads "No data before {Mon
    YYYY}".
  - The bars are not clickable.
  - Its copy says that months after the Anchor Date may read low.
- A trailing-12-month average line comes from a pure helper.
  - The helper averages only known months.
  - It returns `null` when its window has no known month.
- The 1Y / 3Y / All range state moves up to `HistoryPage`, so one set of
  chips controls both cards.
- The card is hidden in the empty state, uses the page's loading treatment
  and respects reduced motion.

### Acceptance criteria

- [ ] History derivation tests cover:
  - [ ] a transfer between Trackable Accounts netting to zero;
  - [ ] a Sondertilgung giving a negative month;
  - [ ] `null` when an account is Unknown this month or last;
  - [ ] `null` in the first month;
  - [ ] a Trackable Account without a target still being counted.
- [ ] Trailing-average helper tests cover:
  - [ ] a full window;
  - [ ] a partial window;
  - [ ] skipping Unknown months;
  - [ ] `null` for an all-Unknown window.
- [ ] HistoryTrends tests cover:
  - [ ] diverging bar colours;
  - [ ] no bar and the "No data before …" tooltip for a `null` month;
  - [ ] the average line;
  - [ ] bars that are not clickable.
- [ ] A HistoryPage test shows that one range chip change updates both the
      chart and the trends card.
- [ ] The card is hidden in the empty state and appears in the loading
      skeleton.

---

## Phase 6: Spent Trend

**User stories**: 47–52

### What to build

History shows how much was spent each month.

- The server derives `monthlySpending` through the shared Variable Spending
  lib.
  - It is the outflow magnitude on the spending accounts.
  - It is `null` when no spending account is known that month.
  - It is a real `0` in a known month with no spending.
- History Trends gains a Saved / Spent segmented control.
- Spent shows single-series bars with their own trailing average.
- Unknown months follow the same no-bar and tooltip rule as Saved.

### Acceptance criteria

- [ ] History derivation tests cover:
  - [ ] agreeing with the year-comparison rule on a shared fixture;
  - [ ] `null` before any spending account is known;
  - [ ] a real `0` in a known month with no spending.
- [ ] HistoryTrends tests cover:
  - [ ] the switch between Saved and Spent;
  - [ ] Spent bars and their average;
  - [ ] the Unknown-month treatment.
- [ ] Spending for the same months agrees with Month Year-Comparison.

---

## Phase 7: Docs

**User stories**: 64–66

### What to build

Rewrite the README Project Overview and the CLAUDE.md overview as "past,
present and projected".

Update the manual's topics:

- History: the History Span, the Paydown Bridge (no monthly data) and the
  History Trends.
- Dashboard: the Past Lead-in, the ACTUALS band and the moved TODAY Marker.

Tick Financial History in the CLAUDE.md build status.

### Acceptance criteria

- [ ] The README and CLAUDE.md overviews describe past, present and
      projected.
- [ ] The manual's History and Dashboard topics describe Horizon as it now
      behaves. The bridge copy never says "estimated" or "interpolated".
- [ ] The manual content tests pass.
- [ ] The build status entry is ticked.
