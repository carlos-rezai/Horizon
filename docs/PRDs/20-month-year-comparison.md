## Problem Statement

When I open the Month Overview and step through months, the right-column "Year
comparison / This year so far" card is an honest but inert placeholder — it
tells me a comparison is _planned_ and shows nothing. I can see what I spent
_this_ month (the breakdown donut), but I have no read on whether my spending
this year is running ahead of or behind last year. For a tool built around
long-horizon thinking, the most basic year-over-year signal is missing from the
one screen where it belongs.

## Solution

Replace the placeholder with the canonical prototype's real card. For the
**Viewed Month** (the month selected in the Month Overview navigator), show the
top five spending categories as a **Year Comparison**: for each category, the
cumulative **Variable Spending** from January 1 through the Viewed Month — this
year against the same window last year — drawn as two stacked horizontal bars
(this year in the category color, last year muted), with the this-year value
shown numerically and a This-year / Last-year legend. Stepping the month
navigator recomputes the card. When there's nothing to show, the card says so
honestly.

## User Stories

1. As a long-term planner, I want to see my year-to-date spending per category
   compared with last year, so that I know whether I'm trending over or under.
2. As a user viewing June 2026, I want the card to cover Jan 1 → June 2026 vs
   Jan 1 → June 2025, so that the comparison is the same window in both years.
3. As a user stepping the month navigator back to March 2024, I want the card to
   recompute to Jan–March 2024 vs Jan–March 2023, so that it always reflects the
   month I'm looking at, not today's real-world month.
4. As a user, I want an in-progress month (e.g. viewing June while it's June 23)
   counted as a whole month in both years, so that the comparison stays stable
   day to day rather than twitching as the month elapses.
5. As a user, I want the five categories chosen by this-year YTD spend (largest
   first), so that the card focuses on where my money is actually going now.
6. As a user, I want a category that I spent heavily on last year but barely this
   year to drop off the list, so that the card reflects my current behaviour, not
   history.
7. As a user, I want each category's bar colored by its own category color, so
   that the card reads consistently with the breakdown donut and badges.
8. As a user, I want the two bars scaled to a single shared maximum across the
   whole card, so that bar lengths are comparable between categories and years.
9. As a user, I want the this-year YTD value shown as a number on each row, so
   that I get the exact figure, not just a relative bar.
10. As a user, I want a This-year / Last-year legend, so that I can tell the two
    bars apart.
11. As a user, I want the card to cover all my spending accounts together
    (excluding Mortgage and Investment), so that it answers a portfolio-level
    question.
12. As a user, I want the card to ignore the spending-list account tabs on the
    left, so that clicking a tab there doesn't silently change the comparison.
13. As a user in my first year of using Horizon, I want this-year bars to show
    with last-year bars at zero, so that the card is still useful before I have a
    prior year of data.
14. As a user with no spending recorded yet this year, I want an honest empty
    state ("No spending yet this year."), so that the card never fabricates bars.
15. As a user with fewer than five spending categories, I want the card to show
    only the categories that exist, so that it doesn't pad with empty rows.
16. As a user, I want the card to load without stalling the rest of the Month
    Overview, so that the page stays responsive while the comparison resolves.
17. As a user, I want expense sign handled correctly (magnitudes), so that bars
    render regardless of how amounts are stored.
18. As a developer, I want the comparison computed from one small server response
    rather than dozens of raw-transaction fetches, so that the page stays fast.
19. As a developer, I want the year/window/ranking logic in one isolated,
    testable module, so that the rules are pinned by tests and easy to change.

## Implementation Decisions

- **Anchor & window.** The card is anchored to the **Viewed Month**. The window
  is January of the viewed year through the Viewed Month inclusive, counted as
  **whole calendar months**; `lastYear` is the identical month span in the prior
  year. No day-of-month cutoff.
- **Metric.** **YTD Variable Spending** per category: the sum of Variable
  Spending magnitudes (absolute cents) in the window. Variable Spending excludes
  transfer legs and auto-settlement rows; only spending accounts contribute
  (Mortgage and Investment are excluded by kind). Account-tab independent.
- **Ranking & cap.** Categories ranked by `thisYear` descending, capped at the
  top five. Fewer than five rendered when fewer exist.
- **Data source — dedicated report endpoint.** A new read-only
  `GET /reports/year-comparison?month=YYYY-MM` returns a small payload of
  per-category `{ category, thisYear, lastYear }` (cents), already ranked and
  capped server-side. This is the first route under `/reports`. Rejected:
  widening the transactions query and aggregating client-side (ships large
  payloads, pushes finance math into `src/`); client fan-out over the per-month
  endpoint (~24×N round-trips).
- **Deep aggregation module.** The window resolution, Variable-Spending filter,
  spending-account filter, magnitude summation, year pairing, ranking, and cap
  live in a single pure function in `server/src/lib/` — taking all transactions,
  account-kind data, and the viewed `YYYY-MM`, returning the ranked rows. The
  route is a thin handler that validates `?month`, loads storage, calls the
  module, and returns JSON. This mirrors how `lib/projection` backs the
  projection route and `lib/cashflow` / `lib/settlement` back theirs.
- **API contract.** Response: `{ month: "YYYY-MM", rows: [{ category: string,
thisYear: number, lastYear: number }] }` — `rows` length ≤ 5, sorted by
  `thisYear` desc, magnitudes ≥ 0 in cents. Invalid or missing `month` (not
  `^\d{4}-\d{2}$`) returns 400.
- **Frontend fetch.** A new `useYearComparison` hook fetches the endpoint keyed
  on the viewed month, returning `{ rows, isLoading }`. Mirrors
  `useAllMonthTransactions`.
- **Card rewrite.** `YearComparison` drops the Planned placeholder and renders
  the prototype card from `rows`: per-category label, this-year mono value, two
  stacked bars (this-year in `colorForCategoryName(category)`, last-year muted),
  a single shared max across all bars (guard divide-by-zero), and the This-year /
  Last-year legend. Empty `rows` → "No spending yet this year." It still receives
  `monthLabel` for the framing copy. The Month Overview swaps in the data-backed
  card keyed on the viewed month.
- **No new schema.** Reads existing transactions and account kinds only — no
  migration, no new persisted state.
- **No delta in v1.** Direction is read from the two bars; per-row delta
  figures are deferred.

## Testing Decisions

A good test here asserts external behaviour — given a set of transactions and a
viewed month, the produced rows (categories, values, order, cap) and the card's
visible output — never internal helpers or call counts. All four modules are
tested:

- **`lib/yearComparison` (deep module)** — the core suite. Cover: window math
  (Jan→viewed month inclusive, both years), whole-month granularity for an
  in-progress month, Variable-Spending filtering (transfer legs and
  auto-settlement excluded), spending-account filtering (Mortgage/Investment
  excluded), absolute-cents summation across mixed signs, ranking by `thisYear`
  desc, the top-5 cap, a category with `lastYear` spend but zero `thisYear`
  dropping off, the empty result, and the first-year (no last-year data) case.
  Prior art: `lib/projection`, `lib/cashflow`, `utils/monthBreakdown`.
- **`/reports/year-comparison` route** — supertest the endpoint: 200 response
  shape and ordering against seeded data, `?month` validation, 400 on a
  malformed/missing month. Prior art: `routes/transactions/transactions.test.ts`,
  `routes/recurringTransactions`.
- **`YearComparison` card** — rewrite the existing test off its
  Planned-placeholder assertions: bars render for provided rows, the this-year
  value and legend appear, the empty state renders for no rows, and the
  first-year case renders this-year bars with zero-length last-year bars. Prior
  art: existing `YearComparison.test.tsx`, `MonthBreakdown.test.tsx`.
- **`useYearComparison` hook** — light coverage of fetch/loading/refetch on month
  change. Prior art: `useMonthTransactions.test.ts`.

## Out of Scope

- Per-row delta indicators (`+12%` / `−€340`) — deferred to a v2 enhancement.
- Day-of-month partial-window cutoffs.
- Account-tab-scoped comparison (the card is always all spending accounts).
- Ranking by combined or last-year totals.
- Any window other than Jan 1 → Viewed Month.
- Caching of the aggregation (recomputed per request; fine at single-user desktop
  scale).
- A broader `/reports` surface beyond this one endpoint.

## Further Notes

- Canonical visual source: `docs/handoff/prototype/src/screens/MonthOverview.jsx`
  (the YoY card, lines ~135–537) — bars, shared `yoyMax` scaling, mono values,
  and the This-year/Last-year legend. Its numbers are faked; this PRD replaces
  them with real data.
- Design log: `docs/design-logs/20-month-year-comparison.md`. Ubiquitous
  language: the **Month Year-Comparison** section (Year Comparison, YTD Variable
  Spending, Viewed Month, Year Comparison Report, thisYear/lastYear) and the
  "current month" / "YTD / year so far" flagged ambiguities.
- Architectural fit: SQLite access and aggregation stay in `server/src`; `src/`
  renders exactly what the endpoint returns and never touches the DB.
