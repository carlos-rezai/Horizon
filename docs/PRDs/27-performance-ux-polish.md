## Problem Statement

Horizon works, but it does not _feel_ fast. Two daily annoyances stand out:

1. **First-interaction stutter.** The first time a given view renders —
   most noticeably clicking through months on the Month Overview — the UI
   hitches for a beat, then runs smooth on every subsequent visit. The
   same pattern repeats across the app. As a user I notice the hesitation
   on the very interaction I do most.
2. **Perceived latency.** Every view is gated behind an all-or-nothing
   spinner: the Dashboard shows a bare centered spinner until _both_
   accounts and the 240-month projection resolve, then the whole page
   snaps in at once. Navigating away and back re-fetches everything from
   scratch — nothing is remembered. Recording or editing a transaction
   waits for the server round-trip before the list changes. The result is
   "stare at a spinner, then everything jumps," over and over.

None of this is broken. It is friction, and it is on the surfaces I touch
every day.

## Solution

A whole-app pass for speed and fluidity — no new features or surfaces.

- **Remember what was already fetched.** A lightweight, hand-rolled
  in-memory cache means revisiting a view is instant instead of a fresh
  fetch waterfall. Data stays honest via stale-while-revalidate: reads
  paint immediately from cache while a background refetch reconciles, so a
  stale value self-corrects within a frame rather than lying.
- **Reveal the page progressively.** Layout-matched skeletons replace the
  single blocking spinner on the heaviest views, and each section lights
  up the instant its own data is ready — the layout is stable from the
  first frame, with no reflow when data lands.
- **Make frequent edits feel instant.** Transaction create / edit / delete
  on the Month page apply to the UI immediately (optimistic), rolling back
  and notifying if the server rejects.
- **Soften the hard cuts.** Restrained cross-fades on month/account data
  swaps and skeleton→content, honoring `prefers-reduced-motion`.
- **Root-cause the stutter.** Diagnose the first-interaction hitch with
  real cold-first-click profiler traces before choosing its fix, rather
  than guessing.

The work is tiered. The daily-driver trio — **Dashboard, Plan, Month** —
gets the full treatment. **Account Detail, History, Import, Settings** get
only the inherited wins (cache, the skeleton primitive, incidental
memoization). This right-sizing — deep on feel, disciplined on
architecture — is deliberate: a single-user local SQLite app does not need
heavy request-orchestration machinery.

## User Stories

1. As a user, I want a view I have already visited to appear instantly
   when I return to it, so that navigating around the app never re-runs a
   fetch I already paid for.
2. As a user, I want the Dashboard to show its layout immediately with
   skeletons, so that I am not staring at a bare spinner while accounts
   and a 240-month projection both load.
3. As a user, I want each Dashboard section (KPIs, trajectory chart,
   accounts, savings streak, plan summary) to appear the moment its own
   data is ready, so that a slow section never holds back a fast one.
4. As a user, I want the Plan page to reveal progressively behind
   layout-matched skeletons, so that the projection accordion feels like
   it is filling in rather than blocking.
5. As a user, I want clicking through months on the Month Overview to be
   smooth on the very first click, so that my most frequent interaction
   does not hitch.
6. As a user, I want a transaction I add to appear in the list instantly,
   so that recording spending feels immediate rather than laggy.
7. As a user, I want a transaction I edit to update in place instantly,
   so that correcting a typo does not stall on the server.
8. As a user, I want a transaction I delete to disappear instantly, so
   that clearing a mistake feels responsive.
9. As a user, when an optimistic transaction change fails on the server, I
   want the UI to roll back to its previous state and show me a
   notification, so that I am never misled into thinking a change saved
   when it did not.
10. As a user, I want a newly created transaction to settle onto its real
    server id without any visible flicker, so that I can immediately edit
    or delete the row I just added.
11. As a user, I want switching months or accounts to cross-fade rather
    than hard-cut, so that the data swap feels intentional instead of
    jarring.
12. As a user, I want skeletons to fade smoothly into real content, so
    that the transition from loading to loaded is calm.
13. As a user who has reduced-motion enabled, I want all transitions to be
    suppressed or instant, so that the app respects my system preference.
14. As a user, I want cached data to correct itself automatically if it
    ever drifts from the truth, so that a stale value is at worst a
    one-frame flicker, never a persistent lie.
15. As a user, I want my Total Liquid and projection to update promptly
    after I record a transaction, so that the numbers that depend on my
    spending stay trustworthy immediately.
16. As a user, I want a view that is loading for the first time (nothing
    cached yet) to show its skeleton, so that a genuine cold load still
    communicates progress.
17. As a user, I want a view whose data fails to load to show a clear
    error state instead of an empty or frozen page, so that I know
    something went wrong.
18. As a user, I want a view with genuinely no data (e.g. a month with no
    transactions) to show its existing empty state, so that empty is never
    confused with loading.
19. As a user, I want the secondary views (Account Detail, History,
    Import, Settings) to also benefit from the instant-revisit cache, so
    that the whole app feels consistent even where I did not get bespoke
    skeletons.
20. As a user, I want the app to feel no heavier and start no slower after
    this pass, so that the polish never comes at the cost of the qualities
    it is meant to improve.
21. As the developer, I want before/after profiler traces captured on the
    primary trio, so that the improvement is evidenced rather than
    asserted, and the traces serve as a portfolio artifact.
22. As the developer, I want the cache layer to preserve today's `useX()`
    call-site shape, so that migrating hooks onto it is mechanical and
    low-risk.
23. As the developer, I want the stutter root-caused from real traces
    before I fix it, so that I do not memoize the wrong thing.

## Implementation Decisions

### Cache-context (the deep module)

- A hand-rolled, in-memory cache **provider** mounted once near the app
  root, plus an internal read-through primitive that hooks call instead of
  each owning a `useEffect` fetch. The provider holds slow-changing global
  resources; the primitive hides fetch, in-flight dedup, cache storage,
  and background revalidation behind a small interface.
- **Resources cached:** `accounts`, `projection`, `categories`,
  `recurring`, and the other cross-view globals currently fetched
  per-mount. Per-key entries (e.g. month transactions keyed by
  account + month) are supported so the Month view participates too.
- **Freshness model: stale-while-revalidate + explicit bumps.** A read
  paints instantly from cache if present; a background refetch always runs
  and reconciles the result. High-impact transaction mutations
  additionally fire an **explicit invalidation bump** on `accounts` +
  `projection`, so balances and the plan feel instant rather than
  one-frame-stale.
- **Call-site compatibility:** each migrated hook keeps its current return
  shape (`{ data, isLoading, error, refresh/refetch }`), so pages need no
  changes. `useAccounts`, `useProjection`, `useCategories`,
  `useAllRecurringTransactions`, and the month-transaction hooks read
  through the cache.
- **Rejected:** TanStack Query (needless machinery + new dependency + large
  test surface for a single-user local SQLite app); pure explicit
  invalidation (fragile hand-maintained dependency map with a silent-stale
  failure mode); a generic `useResource` rewrite (over-reach).

### Skeleton primitive

- New `Skeleton` primitive in `src/primitives/` (co-located
  `.tsx` / `.test.tsx` / `.styles.ts`), styled purely from Meridian
  tokens — no new visual language. Sits alongside the existing `Spinner`;
  Spinner is not removed.
- Consumed by **layout-matched** skeleton compositions on the primary trio.
  Secondary views may reuse the primitive incidentally but get no bespoke
  per-view skeleton work.

### Progressive reveal

- Remove the all-or-nothing loading gate on the primary trio — starting
  with the Dashboard's combined
  `if (accountsLoading || projectionLoading) return <Spinner />` — so each
  section renders its own skeleton and reveals independently when its data
  resolves. Error and empty states remain distinct from loading.

### Optimistic transaction CRUD

- In the Month transaction hooks (`create` / `update` / `remove`, across
  both the single-account and all-account month hooks): apply the change
  to local state immediately, then reconcile with the server. On failure,
  **roll back** to the prior state and `notify`. On a successful create,
  swap the provisional id for the server-assigned id without a visible
  flicker.
- The apply/rollback/id-swap logic is a candidate for a small **pure
  helper** (a reducer-style transform over the transaction list) so it can
  be unit-tested in isolation from React and the network.
- Rare mutations (account / mortgage / savings CRUD) stay **synchronous** —
  optimism is reserved for cheap, high-frequency edits.

### Transitions

- Restrained, targeted motion (~150–200ms): content cross-fade on
  month/account data swap, skeleton→content fade, eased easing on the
  existing instant accordion/expand interactions. **No route-level page
  transitions** (they add perceived latency). All motion honors
  `prefers-reduced-motion`.

### Stutter diagnosis (a deliverable, not pre-solved)

- Establish a cold-first-click trace protocol (React Profiler +
  chrome-devtools trace recorded while clicking a cold view, focused on
  Month switching). Capture baseline traces for Dashboard, Plan, Month and
  write them into `dev-journal.md`. Root-cause among the three candidate
  mechanisms — uncached fetch waterfall, styled-components runtime style
  injection, or Recharts (`^3.8.1`) cold first-mount — then apply the
  matching fix (e.g. `React.memo` chart wrappers, memoized chart data, or
  deferred chart mount). The cache-context already removes the waterfall
  candidate; the fix targets whatever remains.

### Sequencing

Profiling/baseline → cache-context thinnest slice (`accounts`) → migrate
remaining resources + explicit bumps → Skeleton primitive + progressive
reveal → optimistic Month CRUD → transitions → stutter-specific fix →
re-capture traces and write up before/after.

## Testing Decisions

Good tests here assert **external behavior**, not internal wiring — what a
consumer of a module observes, so the tests survive the refactor they are
meant to protect.

- **Cache-context** is the primary unit-test target (it is the deepest
  module). Test through its public read interface: a second read of a
  cached resource does not trigger a second fetch (dedup / instant
  revisit); a stale read paints the cached value then reconciles to the
  revalidated one; an explicit bump forces the next read to refetch;
  concurrent reads of the same key share one in-flight request; an error
  surfaces as an error state without wedging the cache. Do not assert on
  private cache internals.
- **Optimistic CRUD pure helper** — unit-test the apply/rollback/id-swap
  transform directly: create appends a provisional row; a successful
  create swaps the provisional id for the server id in place; a failed
  mutation returns the list to its exact prior state; update and delete
  behave optimistically and roll back on failure. Testing the pure helper
  avoids brittle network/React mocking.
- **Skeleton primitive** — a light render test in the style of the
  existing primitive tests (e.g. `Spinner.test.tsx`): renders, respects
  size/shape props, and is inert (no logic).
- **Progressive reveal** — a component-level test that a primary-trio page
  shows section skeletons while loading and swaps to content per section
  as data resolves, and that error/empty states remain distinct from
  loading. Prior art: existing page/component tests under `features/` and
  `pages/`.
- **Transitions** are largely visual; assert only the testable seam —
  that `prefers-reduced-motion` suppresses motion — rather than animation
  frames.
- **Prior art** to mirror: existing hook tests, the primitive tests under
  `src/primitives/`, and the provider tests under
  `src/components/*Provider/`.

## Out of Scope

- **No new features or surfaces.** This is a feel/performance pass only.
- **No visual redesign.** Skeletons and transitions match the current
  design and Meridian tokens — not a reinterpretation.
- **No projection-engine math changes.** The engine is audited and
  correct; cache and memoize _around_ it only, never inside it.
- **No data-layer architecture beyond the lightweight cache-context** — no
  new dependencies, no TanStack Query, no generic `useResource` rewrite.
- **Secondary views (Account Detail, History, Import, Settings) get
  inherited wins only** — no bespoke per-view skeletons, transitions, or
  optimistic flows.
- **No optimism on rare mutations** — account / mortgage / savings CRUD
  stay synchronous.
- **No hard numeric performance budgets** — acceptance is directional and
  evidence-backed via before/after traces, not millisecond targets
  (meaningless across hardware and tempting to game over the actual feel).

## Further Notes

- "Done" is **evidence-backed and qualitative**: before/after profiler
  traces on the primary trio — including the cold-first-click Month-switch
  trace — written up in `dev-journal.md` with the raw traces kept
  alongside as portfolio artifacts.
- **Trade-off accepted:** layout-matched skeletons must be kept in sync
  when a primary view's layout changes. This is the reason skeletons are
  limited to the three primary views rather than all seven.
- **Trade-off accepted:** optimistic creates carry a provisional-id
  subtlety (the row must remain editable/deletable across the id swap).
- SWR adds a few extra background local-SQLite queries per revisit —
  near-free on a local single-user database.
- Targets the **1.2.0** release.
