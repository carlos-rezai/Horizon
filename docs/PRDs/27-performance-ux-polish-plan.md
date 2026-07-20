# Plan: Performance + UX Polish

> Source PRD: https://github.com/carlos-rezai/horizon/issues/198

## Architectural decisions

Durable decisions that apply across all phases:

- **Cache provider mount point**: mounted **once at the app root, above
  `HashRouter`** (in `App.tsx` or `main.tsx`) — **not** in `AppLayout`.
  `AppLayout` wraps each route individually and remounts on navigation, so
  a cache mounted there would be wiped on every page change, defeating the
  instant-revisit goal.
- **Cache shape**: a hand-rolled in-memory cache provider plus an internal
  read-through primitive that hooks call. Resources are keyed strings:
  global singletons (`accounts`, `projection`, `categories`, `recurring`)
  and composite per-key entries for month transactions
  (`transactions:<accountId>:<month>` and the all-account month variant).
- **Freshness model**: stale-while-revalidate + explicit invalidation
  bumps. A read paints instantly from cache when present; a background
  refetch always runs and reconciles. High-impact transaction mutations
  additionally bump `accounts` + `projection`.
- **Call-site compatibility**: every migrated hook keeps its current return
  shape verbatim — `useAccounts` → `{ accounts, isLoading, error, refresh }`,
  `useProjection` → `{ snapshots, isLoading, error, refetch }`,
  `useMonthTransactions` → `{ transactions, isLoading, error, create,
update, remove, removeTransfer, refetch }`, etc. Pages need no changes.
- **Skeleton primitive**: new `src/primitives/Skeleton/` with co-located
  `Skeleton.tsx` / `Skeleton.test.tsx` / `Skeleton.styles.ts`, styled purely
  from Meridian tokens. Sits alongside `Spinner`; `Spinner` is not removed.
- **Tiering**: primary trio (**Dashboard, Plan, Month**) gets the full
  treatment (skeletons, progressive reveal, transitions; Month also gets
  optimistic CRUD). Secondary views (**Account Detail, History, Import,
  Settings**) get inherited wins only (cache, primitive availability,
  incidental memoization) — no bespoke skeletons/transitions/optimism.
- **Optimistic scope**: only Month transaction create/update/remove.
  Account / mortgage / savings CRUD stay synchronous.
- **Motion**: restrained ~150–200ms cross-fades; no route-level page
  transitions; all motion honors `prefers-reduced-motion`.
- **No new dependencies**: no TanStack Query, no generic `useResource`
  rewrite, no projection-engine math changes.

---

## Phase 1: Baseline profiling & trace protocol

**User stories**: 21, 23

### What to build

A repeatable cold-first-click trace protocol (React Profiler +
chrome-devtools trace, focused on the Month-switch interaction), plus the
captured baseline. Record the app cold, click through a cold view, and
capture traces for Dashboard, Plan, and Month — including the
cold-first-click Month-switch. No production code changes; this is
evidence-gathering that de-risks the Phase 8 stutter fix.

### Acceptance criteria

- [ ] A written, repeatable trace protocol lives in `dev-journal.md`
      (how to record, what to click, what to capture).
- [ ] Baseline cold-first-click traces captured for Dashboard, Plan, and
      Month, including the Month-switch interaction.
- [ ] Raw traces are saved alongside the journal as portfolio artifacts.
- [ ] The `dev-journal.md` entry names the three candidate stutter
      mechanisms (fetch waterfall, styled-components injection, Recharts
      cold-mount) as hypotheses to be tested in Phase 8.

---

## Phase 2: Cache-context — thinnest slice (`accounts`)

**User stories**: 1, 22, 14 (partial)

### What to build

The in-memory cache **provider** and its internal read-through primitive,
mounted once at the app root above the router. Migrate **only**
`useAccounts` to read through the cache while preserving its exact return
shape. The primitive hides fetch, in-flight dedup, cache storage, and
background revalidation behind a small interface. Reads paint instantly
from cache when present, then a background refetch reconciles
(stale-while-revalidate).

### Acceptance criteria

- [ ] Cache provider mounted once above `HashRouter`; not in `AppLayout`.
- [ ] `useAccounts` reads through the cache and returns
      `{ accounts, isLoading, error, refresh }` unchanged; the Dashboard
      needs no edits to consume it.
- [ ] Navigating away from and back to a view that uses accounts paints
      instantly from cache with no second fetch on revisit (dedup).
- [ ] A stale cached read paints the cached value, then reconciles to the
      revalidated value.
- [ ] Concurrent reads of the same key share a single in-flight request.
- [ ] A fetch error surfaces as an error state without wedging the cache
      (a later read can still succeed).
- [ ] Cache unit tests assert only the public read interface — no
      assertions on private cache internals.

---

## Phase 3: Migrate remaining resources + explicit bumps

**User stories**: 1, 15, 19, 14

### What to build

Move the remaining cross-view resources onto the cache: `projection`,
`categories`, `recurring`, and the per-key month-transaction reads (keyed
by account + month, including the all-account month hook). Each migrated
hook keeps its current return shape. Wire high-impact transaction
mutations to fire an explicit invalidation bump on `accounts` +
`projection`, so balances and the plan update promptly rather than
one-frame-stale. Secondary views inherit the instant-revisit win by virtue
of their hooks now reading through the cache.

### Acceptance criteria

- [ ] `useProjection`, `useCategories`, `useAllRecurringTransactions`, and
      the month-transaction hooks read through the cache with unchanged
      return shapes.
- [ ] Month transactions are cached per account+month key; revisiting a
      previously viewed month paints instantly.
- [ ] A transaction mutation bumps `accounts` + `projection`, so Total
      Liquid and the projection refresh promptly after recording spending.
- [ ] An explicit bump forces the next read of the bumped key to refetch.
- [ ] Secondary views (Account Detail, History, Import, Settings) appear
      instantly on revisit via the shared cache, with no bespoke work.

---

## Phase 4: Skeleton primitive + progressive reveal (Dashboard)

**User stories**: 2, 3, 16, 17, 18

### What to build

The `Skeleton` primitive (co-located tests/styles, Meridian tokens only),
then remove the Dashboard's all-or-nothing
`if (accountsLoading || projectionLoading) return <Spinner />` gate. Each
Dashboard section — KPIs, trajectory chart, accounts, savings streak, plan
summary — renders its own layout-matched skeleton and reveals the instant
its own data resolves. The layout is stable from the first frame (no
reflow when data lands). Error and empty states remain visually distinct
from loading.

### Acceptance criteria

- [ ] `Skeleton` primitive exists under `src/primitives/Skeleton/` with a
      light render test (renders, respects size/shape props, is inert).
- [ ] The Dashboard's combined loading gate is removed.
- [ ] Each Dashboard section shows its own skeleton while its data loads
      and swaps to content independently when ready — a slow section does
      not hold back a fast one.
- [ ] The layout does not reflow when data lands (skeletons are
      layout-matched).
- [ ] A cold load (nothing cached) shows section skeletons; a failed load
      shows a clear error state; a genuinely empty result shows the
      existing empty state — all three remain distinct.

---

## Phase 5: Progressive reveal (Plan + Month)

**User stories**: 4, 5 (partial)

### What to build

Extend layout-matched skeletons and progressive reveal to the remaining
two primary views, reusing the `Skeleton` primitive. The Plan page reveals
behind skeletons so the projection accordion feels like it is filling in
rather than blocking; the Month Overview shows layout-matched skeletons on
first load of a month rather than a blocking spinner.

### Acceptance criteria

- [ ] The Plan page renders layout-matched skeletons and reveals
      progressively instead of one blocking spinner.
- [ ] The Month page renders layout-matched skeletons on first load of a
      month, with a stable layout and no reflow when data lands.
- [ ] Error and empty states on both views remain distinct from loading.
- [ ] Both views reuse the shared `Skeleton` primitive (no new visual
      language).

---

## Phase 6: Optimistic Month transaction CRUD

**User stories**: 6, 7, 8, 9, 10, 15

### What to build

A small **pure helper** (reducer-style transform over the transaction
list) implementing apply / rollback / id-swap, unit-tested in isolation
from React and the network. Then wire create / update / remove in both the
single-account and all-account month hooks to apply the change to local
state immediately, reconcile with the server, roll back to the exact prior
state and `notify` on failure, and — on a successful create — swap the
provisional id for the server-assigned id without a visible flicker. The
row must remain editable/deletable across the id swap. Mutations still fire
the Phase 3 explicit bumps so dependent numbers stay trustworthy.

### Acceptance criteria

- [ ] The pure helper is unit-tested directly: create appends a
      provisional row; a successful create swaps the provisional id for the
      server id in place; a failed mutation returns the list to its exact
      prior state; update and delete apply optimistically and roll back on
      failure.
- [ ] Adding a transaction shows it in the list instantly; editing updates
      in place instantly; deleting removes it instantly.
- [ ] A server-rejected optimistic change rolls back to the previous state
      and shows a `notify` notification.
- [ ] A just-created row is immediately editable/deletable with no visible
      flicker across the provisional→server id swap.
- [ ] Total Liquid and the projection update promptly after an optimistic
      transaction change (via the explicit bumps).

---

## Phase 7: Transitions

**User stories**: 11, 12, 13

### What to build

Restrained, targeted motion (~150–200ms): a content cross-fade on
month/account data swaps, a skeleton→content fade, and eased easing on the
existing instant accordion/expand interactions. No route-level page
transitions. All motion honors `prefers-reduced-motion`.

### Acceptance criteria

- [ ] Switching months or accounts cross-fades rather than hard-cuts.
- [ ] Skeletons fade smoothly into real content.
- [ ] Existing accordion/expand interactions use eased easing (no new
      behavior, just softened).
- [ ] No route-level page transitions are introduced.
- [ ] With `prefers-reduced-motion` enabled, all of the above motion is
      suppressed or instant — asserted at the testable seam (the media
      query), not on animation frames.

---

## Phase 8: Stutter root-cause, fix & before/after write-up

**User stories**: 5, 20, 23; closes 21

### What to build

Using the Phase 1 baseline traces (the fetch-waterfall candidate now
removed by the cache), re-capture cold-first-click traces and root-cause
the remaining hitch between the two surviving candidates — styled-components
runtime style injection vs. Recharts cold first-mount. Apply the matching
fix (e.g. `React.memo` chart wrappers, memoized chart data, or deferred
chart mount) rather than guessing. Re-capture after-traces and write the
before/after up in `dev-journal.md`.

### Acceptance criteria

- [ ] The stutter is root-caused from real traces (not assumed) and the
      chosen mechanism is documented.
- [ ] The matching fix is applied and the cold-first-click Month-switch is
      smooth on the first click.
- [ ] After-traces are captured on the primary trio and written up beside
      the Phase 1 baseline in `dev-journal.md`, with raw traces kept as
      artifacts.
- [ ] The app feels no heavier and starts no slower than before the pass
      (directional, evidence-backed — no numeric budget).
