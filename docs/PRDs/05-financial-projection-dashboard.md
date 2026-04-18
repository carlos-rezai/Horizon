## Problem Statement

I can see my current account balances and know my mortgage will be paid off eventually — but I have no way to see _when_ or _how_ the numbers unfold month by month. The Projection Engine calculates 10 years of forward balances on every page load, but that data is invisible. I can't see whether I'm on track, when my Tagesgeld will recover after a Sondertilgung, or what my Total Liquid looks like in three years. The plan exists — I just can't read it.

## Solution

A dedicated Plan Page (`/plan`) showing the full 10-year projection as a year-grouped accordion — one collapsible section per year, each expanding to reveal 12 monthly rows with per-account balances, Restschuld, Net Cashflow, and Total Liquid. Sondertilgung months are visually highlighted. The Payoff Year is badged. Past months show actual balances in a muted style; future months show projected values.

A compact Plan Summary widget on the dashboard shows one clickable row per year-end. Clicking a row navigates directly to that year on the Plan Page, with the accordion section auto-expanded.

When any RecurringTransaction changes — salary increase, new expense, paused standing order — the entire projection recalculates and every row updates automatically. No manual re-entry.

## User Stories

1. As a user, I want to see a year-by-year summary on the dashboard so I can read the trajectory of my finances at a glance without navigating away.
2. As a user, I want to click a year row on the dashboard and land on that year in the full plan with it already expanded, so I don't have to scroll to find it.
3. As a user, I want to see 12 monthly rows per year on the Plan Page so I can track exactly how my balances change month by month.
4. As a user, I want each account shown as its own column, labelled by name, so I can follow individual accounts across time.
5. As a user, I want account columns ordered consistently (Girokonto then Tagesgeld then Investment, then Restschuld, Net Cashflow, Total Liquid) so the layout is predictable.
6. As a user, I want Sondertilgung months visually highlighted so I can immediately see when ST payments fire and how much Restschuld drops.
7. As a user, I want the ST highlight to reflect whichever month my annual ST Recurring Transfer fires — not hardcoded to October — so the feature works for any setup.
8. As a user, I want the Payoff Year accordion header to show a "Paid off [month]" badge so the milestone is immediately visible in the plan.
9. As a user, I want the specific month row where Restschuld first reaches zero to be highlighted so I can see exactly when the loan clears.
10. As a user, I want past months to show actual balances in a visually distinct style so I can tell the difference between what has already happened and what is projected.
11. As a user, I want future months to show projected balances in the default style so the plan reads cleanly.
12. As a user, I want the current year to be auto-expanded when I land on the Plan Page so I can immediately see where I am right now.
13. As a user, I want all other years to be collapsed by default so the page is not overwhelming on first load.
14. As a user, I want to manually expand and collapse any year section so I can focus on the years I care about.
15. As a user, I want the dashboard year rows to show Total Liquid, Restschuld, and ST amount fired for each year-end so I can read the annual trajectory without needing account-level detail.
16. As a user, I want post-payoff years to remain visible in the accordion with Restschuld shown as zero so I can see how my liquid balances continue to grow after the loan clears.
17. As a user, I want the Plan Page to use the back button pattern consistent with Account Detail so navigation feels coherent.
18. As a user, I want all visual elements — row highlights, badges, muted text, hover states, chevrons — to use design system tokens so the plan respects the current theme without any hardcoded styles.
19. As a user, I want an empty state on the Plan Page if no accounts exist yet, prompting me to add accounts from the dashboard.
20. As a user, I want an account that was deleted but still appears in historical snapshots to display as "[deleted]" rather than crashing or showing a blank column.

## Implementation Decisions

### Data flow

No backend changes required. `useProjection` (returns `MonthlySnapshot[]`) and `useAccounts` (returns `AccountWithBalance[]`) both already exist. Account metadata is joined client-side — account names and kinds are resolved by matching snapshot account IDs against the accounts array. A new `useAllRecurringTransactions` hook fetches all recurring transactions globally (without account-scoped filtering) to support ST month detection on the Plan Page.

### New pure utility functions

Three new pure functions added to `src/utils/`, each fully tested in isolation:

- **`deriveSTMonths`** — given snapshots, recurring transactions, and mortgage account IDs, returns a Set of month strings (YYYY-MM) where an ST fires. An ST month is identified by an annual RecurringTransaction with a `linkedAccountId` pointing to a Mortgage account. Replicates the projection engine's annual firing logic (`index % 12 === 0` from projection start) to stay in sync with the engine's output.
- **`deriveYearSummaries`** — given snapshots and the ST months set, returns one `YearSummaryRow` per calendar year. Each row samples the December MonthlySnapshot for that year, or the last available snapshot if December falls outside the window. Includes Total Liquid, Restschuld, and ST amount fired that year.
- **`buildAccountColumns`** — given an accounts array, returns an ordered column definition array sorted by AccountKind (Girokonto, then Tagesgeld, then Investment). Mortgage accounts are excluded — Restschuld is a fixed column, not an account column.

**Reused without modification:** `findMortgagePayoffMonth` from the existing projection utilities.

### New hook

**`useAllRecurringTransactions`** — fetches `GET /recurring-transactions` and returns the full unfiltered list. Lives in `src/features/projection/`. Required for ST detection across all accounts on the Plan Page.

### New UI components

- **`PlanSummary`** — dashboard widget. Renders one clickable row per year summary. On click, navigates to `/plan` with a hash anchor (`#YYYY`) and passes the target year via navigation state so the accordion knows which section to auto-expand. Shows empty state if no snapshots exist.
- **`ProjectionAccordion`** — plan page accordion. One section per year. Reads the URL hash and navigation state on mount to determine the initially expanded year; falls back to the current calendar year. Each section header shows year label, Total Liquid, Restschuld, and ST or payoff badges where applicable. Expanded state shows 12 monthly rows with dynamic account columns.
- **`PlanPage`** — composition only, no logic. Composes `ProjectionAccordion` with `useProjection`, `useAccounts`, and `useAllRecurringTransactions`.

### Column structure

Monthly rows display: one column per non-Mortgage account ordered by AccountKind, then Restschuld derived from the Mortgage account balance, then Net Cashflow, then Total Liquid. Columns are dynamic — driven by whichever accounts exist. If an account ID in a snapshot has no matching account in the accounts array, the column label falls back to `[deleted]`.

### ST detection

An ST month is any MonthlySnapshot month where an annual RecurringTransaction fires whose `linkedAccountId` is a Mortgage account ID. Detection replicates the projection engine's annual frequency logic (`index % 12 === 0`) so highlighting stays in sync with the engine's actual output.

### Visual treatment — all via Meridian tokens, no hardcoded values

- ST month row background: `positiveTint`
- ST badge in Restschuld cell: `positive` text colour
- Payoff month row background: `warningTint`
- Payoff year header badge: `warning` text colour
- Actual balance (past months): `textMuted`
- Projected balance (future months): `textPrimary`
- Clickable year row hover: `bgElevated` background
- No new tokens required — all visual needs are covered by existing Meridian tokens

### Routing

Add `/plan` route to `App.tsx` wrapped in `AppLayout`. The existing back button in `AppLayout` handles navigation back to the dashboard. No changes to the nav chrome required.

## Testing Decisions

Tests verify external behaviour only — inputs in, outputs out. No testing of React rendering, hook internals, or implementation details.

**Modules to test:**

- **`deriveSTMonths`** — correctly identifies ST months from annual Recurring Transfers to Mortgage accounts; ignores non-annual recurring transactions; ignores annual transactions without `linkedAccountId`; ignores annual transfers to non-Mortgage accounts; handles empty inputs.
- **`deriveYearSummaries`** — samples December snapshots correctly per year; sums ST amount for years with ST events; returns null ST amount for years without ST; handles the final year where December may fall outside the projection window.
- **`buildAccountColumns`** — orders accounts Girokonto then Tagesgeld then Investment; excludes Mortgage accounts; handles empty input.

**Prior art:** `server/src/__tests__/projection.test.ts` and `server/src/__tests__/cashflow.test.ts` — pure function tests with minimal fixtures.

**Not tested:** `useAllRecurringTransactions` (hook), `PlanSummary`, `ProjectionAccordion`, `PlanPage` (UI components — no component tests per project convention for feature-layer components).

## Out of Scope

- **Restschuld trajectory chart** — separate PRD; requires Recharts installation and a new backend baseline endpoint
- **Multi-account column overflow** — handling 5+ accounts of the same kind causing horizontal overflow; future PRD
- **ETF growth rate modelling** — Investment columns track cost basis only; market value projection is a future consideration
- **Variance column** — projected vs actual difference; belongs to the Anomaly Detection PRD
- **Per-account breakdown on dashboard year rows** — dashboard shows Total Liquid only; per-account detail is exclusive to the Plan Page

## Further Notes

The Projection Engine uses `index % 12 === 0` to fire annual recurring transactions relative to the projection start month — not against a fixed calendar month. `deriveSTMonths` must replicate this logic exactly so that ST highlighting stays in sync with what the engine actually computed.

`useAllRecurringTransactions` reuses the same `GET /recurring-transactions` endpoint already called by `useRecurringTransactions`. On pages where both hooks are mounted this produces a duplicate network request. Acceptable for now — request deduplication is a future optimisation.

---

GitHub issue: https://github.com/carlos-rezai/Horizon/issues/31
