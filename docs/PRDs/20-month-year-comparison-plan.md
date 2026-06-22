# Plan: Month Year-Comparison

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/144

Replace the Month Overview's inert "This year so far" placeholder with the
prototype's real Year Comparison card: per-category cumulative **YTD Variable
Spending** from January 1 through the **Viewed Month**, this year against the
same window last year, drawn as two stacked horizontal bars.

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: new read-only `GET /reports/year-comparison?month=YYYY-MM`. This
  is the first route under a new `/reports` router. Invalid or missing `month`
  (not `^\d{4}-\d{2}$`) returns `400`.
- **API contract**: `{ month: "YYYY-MM", rows: [{ category: string, thisYear:
number, lastYear: number }] }`. `rows` length ≤ 5, sorted by `thisYear`
  descending, magnitudes ≥ 0 in cents. Ranking and cap happen server-side.
- **Schema**: none. Reads existing transactions and account kinds only — no
  migration, no new persisted state.
- **Deep module**: a single pure function in `server/src/lib/yearComparison/`
  takes all transactions, account-kind data, and the viewed `YYYY-MM`, and
  returns the ranked, capped rows. It owns window resolution, the
  Variable-Spending filter, the spending-account filter, magnitude summation,
  year pairing, ranking, and the cap. The route is a thin handler that
  validates `?month`, loads storage, calls the module, returns JSON. Mirrors
  how `lib/projection` backs the projection route and `lib/cashflow` /
  `lib/settlement` back theirs.
- **Window & metric**: anchored to the Viewed Month. Window is January of the
  viewed year through the Viewed Month inclusive, counted as **whole calendar
  months** (no day-of-month cutoff); `lastYear` is the identical month span in
  the prior year. Metric is the sum of Variable Spending **magnitudes**
  (absolute cents) per category — transfer legs and auto-settlement rows
  excluded; only spending accounts contribute (Mortgage and Investment excluded
  by kind). Account-tab independent.
- **Frontend fetch**: a new `useYearComparison` hook fetches the endpoint keyed
  on the viewed month, returning `{ rows, isLoading }`. Mirrors
  `useAllMonthTransactions`.
- **Card**: `YearComparison` is rewritten to render `rows` — per-category
  label, this-year mono value, two stacked bars (this-year in
  `colorForCategoryName(category)`, last-year muted), a single shared max across
  all bars (guard divide-by-zero), and the This-year / Last-year legend. It
  still receives `monthLabel` for the framing copy. The Month Overview swaps in
  the data-backed card keyed on the viewed month.

---

## Phase 1: Tracer bullet — real YoY bars end-to-end (happy path)

**User stories**: 1, 2, 3, 5, 7, 8, 9, 10, 11, 12, 18, 19

### What to build

The full pipe, end to end, for a fully-populated month. The pure
`yearComparison` module computes per-category `{ category, thisYear, lastYear }`
for the standard window (Jan → Viewed Month inclusive, whole months, prior-year
twin), applying the Variable-Spending and spending-account filters, summing
magnitudes, ranking by `thisYear` descending, and capping at five. A new
`/reports` router exposes `GET /reports/year-comparison?month=YYYY-MM` as a thin
handler over the module. The `useYearComparison` hook fetches it keyed on the
viewed month. The `YearComparison` card is rewritten to drop the Planned
placeholder and render the rows as two stacked bars per category — this-year in
the category color, last-year muted — scaled to a single shared max, with the
this-year value shown numerically and a This-year / Last-year legend. The Month
Overview passes the viewed month to the data-backed card.

Demo: open the Month Overview on a populated month (e.g. June 2026), see the
top-five category bars for this year against the same Jan→June window last year;
step the navigator and watch the card recompute to the new viewed month.

### Acceptance criteria

- [ ] `GET /reports/year-comparison?month=YYYY-MM` returns
      `{ month, rows }` with rows sorted by `thisYear` desc and capped at five.
- [ ] The window is January of the viewed year through the Viewed Month
      inclusive; `lastYear` covers the identical span one year earlier.
- [ ] Only spending accounts contribute; Mortgage and Investment are excluded
      by kind, and the result is independent of the left-column account tabs.
- [ ] Categories are ranked by `thisYear` descending and the top five returned.
- [ ] The card renders, per category, two stacked bars — this-year in
      `colorForCategoryName(category)`, last-year muted — scaled to a single
      shared max across all bars, with the this-year value shown as a number and
      a This-year / Last-year legend.
- [ ] Stepping the month navigator recomputes the card from the new viewed
      month.
- [ ] `lib/yearComparison` covers the window math (both years), spending-account
      filtering, ranking, and the top-5 cap; the route is supertested for 200
      response shape and ordering against seeded data; the card test asserts
      bars/value/legend render for provided rows; the hook has light
      fetch/loading/refetch-on-month-change coverage.

---

## Phase 2: Honest states & correctness hardening

**User stories**: 4, 6, 13, 14, 15, 16, 17

### What to build

Tighten the edges the prototype faked, so the card is truthful in every
situation rather than only the happy path. The module and card handle: the
empty result ("No spending yet this year." — never fabricated bars), the
first-year case (this-year bars render with last-year bars at zero), fewer than
five categories (render only what exists, no padding), and the drop-off case (a
category with heavy last-year spend but ~zero this-year falls out of the top
five because ranking is by `thisYear`). The module pins whole-month granularity
for an in-progress month (no day-of-month cutoff, stable day to day), correct
absolute-cents summation across mixed signs, and exclusion of transfer legs and
auto-settlement rows. The route validates `?month` and returns `400` on a
malformed or missing value. The card loads without stalling the rest of the
Month Overview.

Demo: step the navigator to a barren month and to a first-year window and see
honest empty / zero-last-year output instead of fabricated bars; hit the
endpoint with a bad `?month` and get a 400.

### Acceptance criteria

- [ ] No Variable Spending this year → card shows "No spending yet this year."
      and renders no bars.
- [ ] First-year case (no prior-year data) → this-year bars render with
      last-year bars at zero length.
- [ ] Fewer than five spending categories → only the existing categories render,
      with no empty padding rows.
- [ ] A category heavy last year but ~zero this year drops off the top five
      (ranking is by `thisYear`).
- [ ] An in-progress Viewed Month is counted as a whole calendar month in both
      years; the comparison does not change as the month elapses.
- [ ] Magnitudes are summed as absolute cents across mixed signs; transfer legs
      and auto-settlement rows are excluded.
- [ ] Missing or malformed `?month` (not `^\d{4}-\d{2}$`) returns `400`.
- [ ] The card resolves asynchronously without blocking the rest of the Month
      Overview.
- [ ] `lib/yearComparison` covers the empty result, first-year, fewer-than-five,
      drop-off, in-progress whole-month, mixed-sign magnitude, and
      transfer/auto-settlement-exclusion cases; the route is supertested for the
      400 validation; the card test covers the empty and first-year states.
