## Problem Statement

Three connected issues surfaced after the projection engine audit build phase
(issues #44–#46):

**1. Stale balance after opening balance edit.** When the user edits an
account's opening balance on the account detail page, the updated balance is
not reflected until the page is refreshed or the user navigates away and back.
`useAccounts` fetches once on mount (empty dependency array) and has no
refresh mechanism. After a successful PATCH the server returns the updated
account with the correct balance, but the response is discarded and the stale
accounts array remains in state.

**2. Category field flickers when editing a recurring transfer.**
`useCategoriesWithInlineAdd` initialises `selectedCategoryId` as `""`.
Before the categories fetch resolves, the `<Select>` has no matching option
and the browser defaults to rendering the first item in the list. After the
fetch completes, the state jumps to the correct saved category. The result is
a visible flicker — particularly noticeable when opening a recurring transfer
whose category is not the first in the list.

**3. Trajectory Horizon: scale, data, and design.** Three sub-problems:

- The Y-axes display raw cent values (e.g. 80,000,000 instead of 800,000 €)
  with no euro conversion. The chart is technically correct but unreadable.
- The cashflow line is flat for all-monthly-recurring setups. A flat line
  on a dual-axis chart is hard to read and adds no useful information. The
  user wants per-account balance lines instead.
- There is no UI guard to prevent a regular (non-ST) recurring transaction
  from being linked to a Mortgage account. The user's "Mortgage" Darlehen
  recurring on the Main Girokonto is linked to the Restschulden account,
  which causes the projection engine to reduce the Restschuld by 955 € every
  month — confirmed by the plan numbers: 101,000 − 9 × 955 − 6,500 = 85,905 ✓.
  This violates the ST-only model. The user was not aware of the consequence
  when selecting "Transfer to account: Restschulden".

## Solution

Fix each issue with a focused commit:

1. Expose a `refresh` function from `useAccounts` and call it in
   `AccountDetailPage` after a successful opening balance PATCH.
2. Pre-initialise `selectedCategoryId` in `useCategoriesWithInlineAdd` with
   `initialId` so the Select renders with the correct value from the first
   paint.
3. Add an inline warning in `RecurringTransactionModal` when the selected
   linked account is a Mortgage account, explaining the ST-only model
   consequence. This is non-blocking — it informs, not enforces.
4. Redesign the Trajectory Horizon chart: remove cashflow, add per-account
   projected balance lines, fix Y-axis euro formatting, collapse to a single
   left axis, and terminate the Restschuld line at zero instead of flatling.

## Commits

### Commit 1 — Add refresh capability to `useAccounts`

Add an internal `refreshKey` counter to `useAccounts`. Include `refreshKey`
in the `useEffect` dependency array so incrementing it re-triggers the fetch.
Return a stable `refresh` callback (bound to `setRefreshKey(k => k + 1)`)
alongside the existing `{ accounts, isLoading, error }` shape.

The fetch logic itself is unchanged. No other consumers of the hook are
affected — `refresh` is opt-in.

### Commit 2 — Call refresh after opening balance update in AccountDetailPage

In `AccountDetailPage`, destructure `refresh` from `useAccounts()`. In
`handleUpdateOpeningBalance`, call `refresh()` immediately after the PATCH
succeeds (before `setIsEditingBalance(false)`). The hook re-fetches the full
account list and the updated balance appears without navigation.

### Commit 3 — Fix CategorySelect flicker

In `useCategoriesWithInlineAdd`, change the `selectedCategoryId` initial
state from `""` to `initialId ?? ""`. The Select now renders with the
correct saved value from the very first paint. When the categories fetch
completes and `setSelectedCategoryId(preferred)` is called, `preferred`
equals `initialId` (assuming it is present in the list), so no state change
occurs and no re-render flicker happens.

### Commit 4 — Add Mortgage-link warning in RecurringTransactionModal

`RecurringTransactionModal` already receives `otherAccounts`. Look up the
`kind` of the currently selected `linkedAccountId` account. When it is
`"Mortgage"`, render an inline warning message directly below the "Transfer
to account" select:

> "Linking to a Mortgage account models a Recurring Transfer that reduces
> the Restschuld each time it fires. Per the ST-only model, only
> Sondertilgung payments should link to a Mortgage account."

Saving is not blocked. The warning disappears when the user selects a
non-Mortgage account or clears the link.

### Commit 5 — Update TrajectoryDataPoint and buildTrajectoryData

In `src/types/projection.ts`:

- Change `restschuld: number` to `restschuld: number | null` — null signals
  that the mortgage has been paid off and the line should terminate.
- Remove `netCashflow`.
- Add an index signature `[accountId: string]: number | null | string |
boolean` to allow per-account balance keys (required for recharts
  `dataKey` compatibility).

In `src/utils/projection.ts`, update `buildTrajectoryData`:

- Accept `accounts: AccountWithBalance[]` as a new parameter so the function
  knows which accounts to include.
- For each snapshot, compute `restschuld` as the sum of Mortgage account
  projected balances. Set it to `null` once it reaches zero (first payoff
  month and every month thereafter) so the recharts line terminates instead
  of flatling.
- Spread per-account projected balances as top-level keys on the data point
  using each account's `_id` as the key. Exclude Mortgage accounts (their
  balance is already represented by `restschuld`).
- Remove `netCashflow` from the returned object.

All callers of `buildTrajectoryData` must pass `accounts`.

### Commit 6 — Redesign TrajectoryHorizon component

In `TrajectoryHorizon.tsx`:

- Remove the right `<YAxis>` and all `yAxisId="right"` attributes.
- Remove the cashflow `<Line>`.
- Add `tickFormatter={(v: number) => formatBalance(v)}` to the single left
  `<YAxis>` so cent values display as formatted euros.
- Map `accounts.filter(a => a.kind !== "Mortgage")` to render one `<Line>`
  per non-Mortgage account, using `a._id` as `dataKey`. Each line gets a
  distinct colour from the theme. Include the account name in the chart
  tooltip.
- Keep the `totalLiquid` `<Line>`.
- Keep the `restschuld` `<Line>` with `connectNulls={false}` so it
  terminates naturally at the payoff month.
- Update `ChartTooltip` to display per-account balances (from `point[a._id]`)
  and remove the cashflow row.
- The `TrajectoryHorizon` component already receives `accounts` and
  `recurringTransactions` as props — no interface change needed.

## Decision Document

- **Refresh pattern**: internal `refreshKey` counter added to `useEffect`
  deps — clean and idiomatic; avoids exposing the fetch URL or implementation
  detail through the hook interface.
- **Category flicker fix**: pre-initialise with `initialId` rather than hide
  the select during loading — one-line change, no loading skeleton needed.
- **Mortgage warning**: inline and non-blocking — the user may intentionally
  link a recurring to a Mortgage in future scenarios not yet foreseen; the
  warning informs without restricting.
- **Per-account recharts lines**: spread account IDs as top-level keys on
  the data object — recharts `dataKey` string prop works directly on flat
  objects, no custom accessor needed.
- **restschuld null vs zero**: null causes recharts to leave a gap (line
  terminates), zero causes the line to flatline. Null is the correct
  semantic: the Mortgage no longer exists after payoff.
- **Single Y-axis**: all values (per-account, total liquid, restschuld) are
  in the same euro order of magnitude once cashflow is removed. Dual axis
  is no longer justified.
- **Euro conversion location**: `tickFormatter` on `<YAxis>`, not a
  data-layer conversion. Data stays in cents throughout the pipeline —
  consistent with every other projection consumer. The chart handles display.
- **netCashflow**: removed from `TrajectoryDataPoint` only. The field remains
  on `MonthlySnapshot` and is still available to the Plan Accordion and
  future AI pipelines.

## Testing Decisions

A good test exercises observable behaviour, not implementation:

- **`useAccounts` refresh**: mock `fetch`, call `refresh()`, assert that
  `fetch` was called a second time and `accounts` reflects the updated
  response.
- **`useCategoriesWithInlineAdd` no-flicker**: render the hook with an
  `initialId`, assert `selectedCategoryId` equals `initialId` synchronously
  before any async resolution.
- **`buildTrajectoryData` restschuld null**: pass snapshots where the
  Mortgage account balance reaches zero at month 6; assert `restschuld` is
  a positive number at month 5 and `null` from month 6 onwards.
- **`buildTrajectoryData` per-account keys**: assert each non-Mortgage
  account `_id` is a key on every data point with a numeric value.
- **`buildTrajectoryData` no netCashflow**: assert `netCashflow` is not
  present on the returned data points.
- **`TrajectoryHorizon` rendering**: existing component tests — update
  assertions to check for per-account lines and the absence of the cashflow
  line.

Prior art: `src/features/projection/useProjection.test.ts` for hook
re-fetch patterns; `src/features/projection/useProjection.test.ts` and
`src/utils/` for `buildTrajectoryData` unit tests.

## Out of Scope

- Issue #46 (server-side `GET /accounts` balance including recurring history)
  — failing tests already committed; implementation follows its own TDD
  cycle.
- Mortgage amortization model — deliberately excluded by design (ST-only).
- Trajectory Horizon accessibility (ARIA roles on the chart).
- Mobile/responsive chart layout.
- Per-account colours in the legend — Meridian theme tokens will need
  extending when more than three non-Mortgage accounts exist; deferred.

## Further Notes

The user's "Mortgage" recurring on the Main Girokonto (955 €, monthly, day 28) is currently linked to the Restschulden (Mortgage) account. After this
refactor ships the warning UI (Commit 4), the user should edit this
recurring transaction: clear the "Transfer to account" field and change the
category from "Transfer" to "Housing" or similar. Once the link is removed,
the Restschuld will decrease only via the annual Sondertilgung (6,500 €),
which is the correct ST-only model behaviour. The plan table figures will
update accordingly on the next page load.
