# Plan: Financial Projection Dashboard

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/31

## Architectural decisions

- **Route**: `/plan` added to existing React Router config, wrapped in `AppLayout` — back button returns to dashboard, consistent with `/accounts/:id`
- **Backend**: no new routes — reuses `GET /projection` (MonthlySnapshot[]) and `GET /recurring-transactions` (RecurringTransaction[])
- **Data join**: account metadata (name, kind) joined client-side from `useAccounts` — no schema changes
- **Utilities**: new pure functions in `src/utils/` — each tested in isolation
- **Styling**: all visual elements via Meridian tokens in `.styles.ts` files — no inline styles, no hardcoded values

---

## Phase 1: Plan Page + Projection Accordion

**User stories**: 3, 4, 5, 10, 11, 12, 13, 14, 17, 19, 20

### What to build

Add a `/plan` route and a `PlanPage` composition component. Build a `ProjectionAccordion` that renders one collapsible year section per projected year, each expanding to reveal 12 monthly rows.

Account columns are derived dynamically from the accounts list — ordered by AccountKind (Girokonto → Tagesgeld → Investment), then Restschuld as a fixed column, then Net Cashflow, then Total Liquid. A new `buildAccountColumns` pure utility handles the ordering and exclusion of Mortgage accounts from the dynamic columns; it has full test coverage.

The current calendar year is auto-expanded on load; all other years are collapsed. Past months (where `actual` is set on the snapshot) display the actual balance in the muted Meridian text colour. Future months display the projected balance in the default text colour. If an account ID in a snapshot has no match in the accounts list, its column renders `[deleted]`. An empty state is shown when no accounts or snapshots exist.

### Acceptance criteria

- [ ] Navigating to `/plan` renders the Plan Page without errors
- [ ] Each projected year appears as a collapsible accordion section
- [ ] The current calendar year is expanded on load; all others are collapsed
- [ ] Clicking a year header toggles its expanded/collapsed state
- [ ] Monthly rows show one column per non-Mortgage account, labelled by account name
- [ ] Account columns are ordered: Girokonto accounts, then Tagesgeld, then Investment
- [ ] Restschuld, Net Cashflow, and Total Liquid appear as fixed columns after the account columns
- [ ] Past month cells display actual balance in `textMuted` colour
- [ ] Future month cells display projected balance in `textPrimary` colour
- [ ] A snapshot referencing a deleted account displays `[deleted]` in that column
- [ ] An empty state is shown when no accounts exist
- [ ] The back button returns to the dashboard
- [ ] `buildAccountColumns` has passing tests covering sort order, Mortgage exclusion, and empty input

---

## Phase 2: ST Month Detection + Highlighting

**User stories**: 6, 7

### What to build

Introduce a `useAllRecurringTransactions` hook that fetches all recurring transactions without account-scoped filtering. Implement a `deriveSTMonths` pure utility that identifies which projected months are ST months by scanning for annual RecurringTransactions whose `linkedAccountId` points to a Mortgage account — replicating the projection engine's `index % 12 === 0` annual firing logic so detection stays in sync with the engine's output.

Wire the detection result into `ProjectionAccordion`: ST month rows receive the `positiveTint` background, and a badge showing the ST amount appears in the Restschuld cell for that row.

### Acceptance criteria

- [ ] ST month rows render with `positiveTint` row background
- [ ] The Restschuld cell on an ST month row shows an ST amount badge using `positive` text colour
- [ ] The highlighted month reflects whichever calendar month the annual ST Recurring Transfer fires in — not hardcoded to October
- [ ] Changing the ST Recurring Transfer's setup (e.g. deactivating it) removes the highlighting on next projection fetch
- [ ] Non-annual recurring transactions are never highlighted
- [ ] Annual recurring transactions without a Mortgage `linkedAccountId` are never highlighted
- [ ] `deriveSTMonths` has passing tests: correct ST month identification, non-annual ignored, no `linkedAccountId` ignored, non-Mortgage destination ignored, empty inputs

---

## Phase 3: Payoff Year Treatment

**User stories**: 8, 9, 16

### What to build

Using the existing `findMortgagePayoffMonth` utility, identify the Payoff Month and Payoff Year from the projection snapshots. In `ProjectionAccordion`, the year section containing the Payoff Month receives a "Paid off [month]" badge in its header using `warning` colour. The specific month row where Restschuld first reaches zero receives the `warningTint` row background. All years after the payoff year remain in the accordion with Restschuld displayed as zero.

### Acceptance criteria

- [ ] The Payoff Year accordion header displays a "Paid off [month]" badge
- [ ] The payoff month row renders with `warningTint` row background
- [ ] Post-payoff year rows show Restschuld as zero without errors
- [ ] Years before the Payoff Year are unaffected
- [ ] If no Mortgage account exists, no payoff badge or highlight appears

---

## Phase 4: Dashboard Plan Summary

**User stories**: 1, 2, 15

### What to build

Implement a `deriveYearSummaries` pure utility that samples the December MonthlySnapshot for each projected year (or the last available snapshot if December falls outside the window) and returns one `YearSummaryRow` per year with Total Liquid, Restschuld, and ST amount fired. Build a `PlanSummary` dashboard widget that renders one clickable row per year summary — showing Total Liquid, Restschuld, and ST amount. Clicking a row navigates to `/plan` with a URL hash (`#YYYY`) and passes the target year via navigation state; `ProjectionAccordion` reads this on mount and auto-expands the matching year section. Add `PlanSummary` to `DashboardPage`.

### Acceptance criteria

- [ ] Dashboard shows a Plan Summary section with one row per projected year-end
- [ ] Each row displays: year label, Total Liquid, Restschuld, ST amount fired (or blank if no ST that year)
- [ ] Clicking a year row navigates to `/plan` and auto-expands that year's accordion section
- [ ] If no snapshots exist, the Plan Summary shows an appropriate empty state
- [ ] `deriveYearSummaries` has passing tests: December sampling, ST amount summing, null ST for years without ST events, final-year edge case
