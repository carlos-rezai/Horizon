# 05 — Trajectory Horizon Refactor + Post-Ship Bug Fixes

## Problem Statement

After shipping the Trajectory Horizon feature (issues #38–#41), several bugs and
layout issues were found in production. Additionally the TrajectoryHorizon component
accumulated a few code-quality violations (inline styles, oversized file) that should
be cleaned up before the AI features begin.

The specific problems:

1. **Category reset bug** — editing an existing RecurringTransaction always resets
   the Category selector to the first category ("Income"). `CategorySelect` has no
   way to receive a pre-selected value; `useCategoriesWithInlineAdd` always seeds
   from the first fetched category.

2. **Negative Restschuld** — the Projection Engine applies Sondertilgung transfers
   at full face value regardless of the remaining Mortgage balance. Once the mortgage
   is nearly paid off, projected Restschuld goes negative and Tagesgeld is
   over-debited.

3. **Back arrow still visible** — `AppLayout` renders a back button on every
   non-dashboard route. Issue #36 established the wordmark as the home link; the
   back button is now redundant and should be removed.

4. **Account detail page unstyled** — `AccountDetailPage` uses bare HTML elements
   (`<main>`, `<h2>`, `<button>`) with no Meridian styling. On the dark background
   these render with browser-default black text, making buttons and headings
   unreadable.

5. **Chart Y-axis labels clipped** — `ComposedChart` has no `margin` prop. The left
   Y-axis value labels are cut off at the left edge of the widget.

6. **Inline styles in ChartTooltip** — `ChartTooltip` uses `style={{ color: ... }}`
   inline, violating the design-system constraint ("no inline style for colour or
   spacing — styled-components only").

7. **Trajectory Horizon placement on Dashboard** — widget currently appears after
   MilestoneTracker. It should follow PlanSummary directly, keeping the planning
   widgets grouped together.

8. **Trajectory Horizon missing from PlanPage** — `/plan` shows only the
   `ProjectionAccordion`. The chart should appear above the accordion so users see
   the visual arc before drilling into monthly rows.

9. **PlanSummary shows 20 years on Dashboard** — the compact dashboard widget is
   too tall. Limit it to the next 10 years.

## Solution

Fix each issue in a separate focused commit. Bugs first, then layout, then the code
quality clean-up.

## Commits

### Commit 1 — Fix: clamp Mortgage balance to zero in Projection Engine

In `projectBalances`, when a Sondertilgung fires, compute the actual debit as
`min(stAmount, currentMortgageBalance)`. Debit only that amount from Tagesgeld and
reduce the Mortgage to exactly zero (never below). If the Mortgage is already at
zero, skip the transfer entirely. Update existing projection tests to cover the
clamped scenario.

### Commit 2 — Fix: CategorySelect initialCategoryId prop

Add an optional `initialCategoryId` prop to `CategorySelect`. Update
`useCategoriesWithInlineAdd` to accept an optional `initialId` parameter. After
categories load, prefer `initialId` if it is present in the fetched list; otherwise
fall back to `data[0]._id` as before. Pass `transaction?.category` from
`RecurringTransactionModal` to `CategorySelect`.

### Commit 3 — Fix: remove back button from AppLayout

Delete the `StyledBackButton` element and its click handler from `AppLayout`. Remove
the `isDashboard` guard and the `useNavigate` import if no longer used. Update the
`AppLayout` test to confirm the back button is gone.

### Commit 4 — Fix: apply Meridian styling to AccountDetailPage

Replace bare HTML elements in `AccountDetailPage` with Meridian-styled equivalents:

- Wrap the page in `StyledDashboard` or a new `StyledAccountDetail` page layout
- Replace raw `<h2>` with `<Heading level={2}>`
- Replace raw `<button>` with `<Button>` from primitives
- Ensure all text is readable against the dark background

### Commit 5 — Fix: chart Y-axis margins

Add a `margin` prop to the `ComposedChart` in `TrajectoryHorizon` so the left and
right Y-axis labels are no longer clipped. Values `{ top: 8, right: 70, left: 70,
bottom: 8 }` give both axes room. Verify visually that all tick labels are fully
visible.

### Commit 6 — Refactor: extract ChartTooltip inline styles to styled-components

In `TrajectoryHorizon.styles.ts`, add styled components for the tooltip rows
(`StyledTooltipLabel`, `StyledTooltipRow`). Replace every `style={{ color: ... }}`
and `style={{ marginBottom: ... }}` in `ChartTooltip` with these components. No
behaviour change.

### Commit 7 — Layout: move Trajectory Horizon after PlanSummary on Dashboard

In `DashboardPage`, move the `<TrajectoryHorizon>` section to immediately follow the
`<PlanSummary>` section, before `<MilestoneTracker>`. No logic changes.

### Commit 8 — Feature: add Trajectory Horizon to PlanPage

In `PlanPage`, import `useAllRecurringTransactions` and `TrajectoryHorizon`. Render
`<TrajectoryHorizon>` above `<ProjectionAccordion>`, passing `snapshots`, `accounts`,
`recurringTransactions`, and `isLoading={projectionLoading}`. The hook is already
used in `DashboardPage` — reuse the same pattern.

### Commit 9 — Feature: limit PlanSummary to 10 years on Dashboard

Add an optional `maxYears` prop to `PlanSummary`. When set, slice the `rows` array
to `rows.slice(0, maxYears)` before rendering. On `DashboardPage`, pass
`maxYears={10}`. On `PlanPage`, if `PlanSummary` is ever added there, omit the prop
to show all years. Update the PlanSummary test to cover the `maxYears` slice
behaviour.

## Decision Document

### Modules modified

- `server/src/lib/projection.ts` — Projection Engine clamp logic
- `server/src/__tests__/projection.test.ts` — new clamped-ST tests
- `src/features/categories/useCategoriesWithInlineAdd.ts` — accept `initialId`
- `src/features/categories/CategorySelect/CategorySelect.tsx` — `initialCategoryId` prop
- `src/features/transactions/RecurringTransactionModal/RecurringTransactionModal.tsx` — pass `transaction?.category`
- `src/layouts/AppLayout/AppLayout.tsx` — remove back button
- `src/layouts/AppLayout/AppLayout.test.tsx` — update test
- `src/pages/AccountDetailPage.tsx` — Meridian styling
- `src/features/projection/TrajectoryHorizon/TrajectoryHorizon.tsx` — margin + inline style removal
- `src/features/projection/TrajectoryHorizon/TrajectoryHorizon.styles.ts` — new tooltip row styles
- `src/pages/DashboardPage.tsx` — reorder sections + maxYears prop
- `src/pages/PlanPage.tsx` — add TrajectoryHorizon
- `src/features/projection/PlanSummary/PlanSummary.tsx` — maxYears prop

### Projection Engine clamp behaviour

When a Sondertilgung (annual Recurring Transfer to Mortgage) fires:

- `actualDebit = min(stAmount, currentMortgageBalance)`
- If `actualDebit === 0`, skip the transfer entirely
- Tagesgeld is debited by `actualDebit`, not `stAmount`
- Mortgage is set to `max(0, mortgage - stAmount)` — equivalent to `mortgage - actualDebit`

This ensures Restschuld is always ≥ 0 in all projected months.

### CategorySelect interface change

```
interface Props {
  onChange: (id: string) => void;
  initialCategoryId?: string;
}
```

`useCategoriesWithInlineAdd` accepts an optional `initialId?: string`. After fetch,
if `initialId` is present in the fetched category list, it is used as the initial
`selectedCategoryId`; otherwise `data[0]._id` is used as before.

### PlanSummary interface change

```
interface Props {
  snapshots: MonthlySnapshot[];
  accounts: AccountWithBalance[];
  recurringTransactions: RecurringTransaction[];
  maxYears?: number;
}
```

When `maxYears` is set, `rows.slice(0, maxYears)` is applied before rendering.

## Testing Decisions

Good tests verify observable behaviour — what the user sees or what data comes out —
not internal implementation steps.

**Projection Engine (server/src/**tests**/projection.test.ts):**

- New test: ST fires when Mortgage balance > ST amount → same as existing
- New test: ST is clamped when Mortgage balance < ST amount → Mortgage reaches 0,
  Tagesgeld debited only by remaining balance
- New test: ST is skipped entirely when Mortgage is already at 0
- Prior art: existing `projectBalances - Sondertilgung` describe block

**CategorySelect (src/features/categories/CategorySelect/CategorySelect.test.tsx):**

- New test: when `initialCategoryId` is provided, `onChange` is called with that
  id after categories load (not the first category's id)
- Prior art: existing CategorySelect tests

**PlanSummary (no existing test file — add one if time permits, otherwise covered
by the maxYears prop being straightforward slice logic):**

- The `maxYears` slicing is a one-liner — acceptable to verify visually and rely on
  TypeScript; formal test optional

**AppLayout:**

- Update existing test: confirm back button is not rendered on any route
- Prior art: existing AppLayout.test.tsx

## Out of Scope

- Sondertilgung allowance cap enforcement (the lender-set maximum annual ST amount
  is stored but not enforced by the Projection Engine — separate future issue)
- Full Meridian re-skin of AccountDetailPage (only fixing unreadable text; full
  redesign is a separate UI pass)
- Animating or highlighting the Freedom Phase region on the chart
- Persisting the 10-year limit as a user preference

## Further Notes

The negative Restschuld bug is the highest priority fix — it produces visually
misleading projections and undermines the core value of the chart. It should be
committed first.

The `ChartTooltip` inline-style fix (commit 6) is pure code quality with no
user-visible change — it can be deferred if the other commits take longer than
expected.
