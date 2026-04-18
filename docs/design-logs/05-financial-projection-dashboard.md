# 05 — Financial Projection Dashboard

## Background

Horizon already has a fully working Projection Engine (`server/src/lib/projection.ts`) that computes 120 MonthlySnapshots forward from today. The `GET /projection` endpoint and `useProjection` hook both exist. The dashboard uses the snapshots internally for MortgageCountdown and MilestoneTracker — but nothing displays the projection data to the user directly.

The reference document (`financial_plan-april-2026.pdf`) shows the intended end-state: a month-by-month table of all account balances across a 7-year horizon, organised by year, with Sondertilgung months called out and a year-by-year summary for at-a-glance reading. The PDF values are directional, not exact — the app computes its own projections from live data.

The Restschuld trajectory chart (with ST vs baseline comparison) was scoped out of this PRD and will be a separate grill-me → PRD cycle.

## Problem

The user cannot see the Plan. The Projection Engine runs on every dashboard load but the output is only used to derive two derived values (Payoff Month, Estimated Completion Month). The full month-by-month table — the core of what makes Horizon useful for long-term thinking — is invisible.

## Questions and Answers

**Q1: Is the Restschuld chart (with ST vs baseline lines) part of this PRD?**
No. It requires installing Recharts and a new `?withBaseline` backend endpoint. Separate PRD. ✅

**Q2: What appears on the dashboard — a compact year summary or just a link?**
A compact year summary section with one clickable row per year-end. Clicking a row navigates to `/plan` anchored to that year with that accordion section auto-expanded. No separate link element needed. ✅

**Q3: Should the accordion live on the dashboard or on a dedicated `/plan` page?**
Dedicated `/plan` page. The dashboard is already handling Accounts, Mortgage Countdown, and Milestones. An accordion that can expand to 84+ rows belongs on its own page. ✅

**Q4: What columns appear in the monthly rows?**
One column per account, labelled by account name, ordered by AccountKind (Girokonto → Tagesgeld → Investment), then Restschuld, Net Cashflow, Total Liquid. Dynamic — whatever accounts exist drive the columns. Multi-account column overflow left open for a future PRD. ✅

**Q5: How is the ST month determined — hardcoded October or derived?**
Derived. An ST month is any month where an annual RecurringTransaction fires where `frequency === 'annual'` AND `linkedAccountId` points to a Mortgage account. Not hardcoded. Works for any ST month. ✅

**Q6: How are past months (actual data available) shown differently from future months?**
Actual shown when available in muted Meridian text colour. Projected shown in default style. No variance column — variance belongs to anomaly detection. ✅

**Q7: What is the default accordion state on `/plan`?**
Current year auto-expanded. All other years collapsed. ✅

**Q8: What data does each dashboard year row show?**
End-of-year values from the December MonthlySnapshot: Total Liquid, Restschuld, ST amount fired that year (if an ST Recurring Transfer exists). No per-account breakdown on the dashboard — that lives in the accordion expanded rows. ✅

**Q9: Does the payoff year get special treatment?**
Yes. The year header gets a "Paid off [month]" badge. The specific month row where Restschuld first reaches zero gets a highlight consistent with the ST row style. Post-payoff years remain visible with Restschuld at €0. ✅

**Q10: Styling constraints?**
All styling through Meridian tokens and styled-components. No inline styles, no hardcoded colour values. New visual elements (ST row tint, payoff badge, hover state on clickable rows, muted actual text, accordion chevron) use existing tokens or new tokens added to the token layer first. ✅

## Design

### Data flow

```
useProjection()      → MonthlySnapshot[]  (already exists)
useAccounts()        → AccountWithBalance[]  (already exists)
                     ↓ joined client-side
PlanPage / DashboardPage
  → account columns labelled by name
  → ST months detected by RecurringTransaction shape
```

No backend changes required. Both hooks already exist. `useProjection` returns `MonthlySnapshot[]` where each snapshot has `accounts: Record<accountId, { projected, actual? }>`, `netCashflow`, `totalLiquid`.

### New types

```typescript
// src/types/projection.ts (extend existing)
interface YearSummaryRow {
  year: number;
  totalLiquid: number; // from December snapshot
  restschuld: number; // from December snapshot
  stFired: number | null; // sum of ST Recurring Transfers fired that year
}
```

### File structure

```
src/
  pages/
    PlanPage.tsx                              ← new, composition only
  features/
    projection/
      useProjection.ts                        ← exists, no changes
      ProjectionAccordion/
        ProjectionAccordion.tsx               ← new
        ProjectionAccordion.styles.ts         ← new
      ProjectionYearRow/
        ProjectionYearRow.tsx                 ← new (month row inside accordion)
        ProjectionYearRow.styles.ts           ← new
      PlanSummary/
        PlanSummary.tsx                       ← new (dashboard widget)
        PlanSummary.styles.ts                 ← new
      index.ts                               ← new, barrel export
  src/App.tsx                               ← add /plan route
  src/pages/DashboardPage.tsx               ← add PlanSummary section
```

### ST detection logic

```typescript
// Identifies ST-firing months in the projection
function isSTMonth(
  recurringTransactions: RecurringTransaction[],
  mortgageAccountIds: Set<string>,
  monthIndex: number
): boolean {
  return recurringTransactions.some(
    (r) =>
      r.frequency === "annual" &&
      r.linkedAccountId != null &&
      mortgageAccountIds.has(r.linkedAccountId) &&
      monthIndex % 12 === 0
  );
}
```

### Dashboard year row

✅ Clickable row → navigate to `/plan#YYYY` with accordion YYYY auto-expanded  
❌ Separate "View plan →" link — redundant once rows are clickable  
❌ Accordion on dashboard — too heavy alongside existing sections

### Actual vs projected display

✅ One value per cell — actual in muted colour when available, projected in default  
❌ Two values per cell (both projected + actual) — too dense  
❌ Variance column — belongs to anomaly detection PRD

## Implementation Plan

**Phase 1 — `/plan` page with static accordion (no ST highlighting, no payoff badge)**

- Add `/plan` route to `App.tsx`
- Create `PlanPage.tsx`
- Create `ProjectionAccordion` — year sections, monthly rows, account columns derived from `useAccounts`
- Current year auto-expanded, others collapsed
- All styling through Meridian tokens

**Phase 2 — ST highlighting + payoff badge**

- Implement ST month detection from RecurringTransaction data
- Add ST row tint and badge to Restschuld cell
- Add "Paid off [month]" badge to payoff year header
- Highlight payoff month row
- Add any new Meridian tokens required

**Phase 3 — Dashboard year summary widget**

- Create `PlanSummary` component
- Add to `DashboardPage` with clickable rows
- Navigate to `/plan#YYYY` on click, auto-expand target year
- Actual vs projected muted colour treatment

## Trade-offs

**Easier:** The Projection Engine is already complete — this is pure UI work. `useProjection` and `useAccounts` require no changes. Dynamic column generation means any account configuration works without code changes.

**Harder:** Joining account metadata client-side means the component must handle the case where an account in the snapshot no longer exists (deleted account). Will return `[deleted]` as a fallback label.

**Out of scope:**

- Restschuld chart — separate PRD
- Multi-account column overflow handling — future PRD
- ETF growth rate modeling — future consideration
- Variance column — belongs to anomaly detection
