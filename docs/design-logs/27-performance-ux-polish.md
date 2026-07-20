# 27 — Performance + UX Polish

## Background

Horizon is a shipping, single-user, offline-first Electron app. Every
data hook fetches independently in a `useEffect` with no shared cache or
dedup: `useAccounts`, `useProjection` (240 months every load),
`useAllRecurringTransactions`, `useSavingsGoal`, `useMonthTransactions`,
`useAllMonthTransactions`, `useYearComparison`, `useCategories`, and
more. Navigating away and back re-fetches everything from scratch.
Loading is all-or-nothing (e.g. `DashboardPage` shows a bare centered
`<Spinner />` until _both_ accounts and projection resolve, then the
page snaps in). Charts use **Recharts** (`^3.8.1`), which has a real
cold-first-mount cost. There is no `Skeleton` primitive today — only
`Spinner`.

This is the roadmap item "Performance + UX Polish — a whole-app pass for
speed and fluidity rather than new surfaces" (targets 1.2.0).

## Problem

The app is functional but not _fluid_. Two concrete pains:

1. **First-interaction stutter, app-wide.** Clicking through months on
   the Month Overview hitches the _first_ time a given view renders, then
   runs smooth. The pattern repeats across the whole app. It has three
   plausible mechanisms, each needing a different fix:
   uncached fetch waterfall, styled-components runtime style injection,
   or Recharts cold first-mount.
2. **Perceived latency.** All-or-nothing spinners, hard-cut view swaps,
   and mutations that wait for the server before the UI changes.

Establish scope for a pass that fixes daily-annoyance _feel_ without
over-engineering the architecture of a single-user local app.

## Questions and Answers

1. **What makes the pass "done" — measure-first or judgment-driven?**
   Hybrid leaning measure-first. Profile **Dashboard and Plan first**
   with real profiler traces, but hold to pragmatic _directional_
   targets, not arbitrary millisecond budgets.

2. **How far may we go on the data layer?**
   Lightweight, hand-rolled cache-context. **No new dependency.** Not
   TanStack Query (more machinery than a single-user local SQLite app
   needs); not surgical-only (leaves the re-fetch-on-nav pattern in
   place).

3. **How deep overall — feel vs. architecture?**
   Deeper on _feel_, disciplined on _architecture_. Right-sizing is the
   portfolio signal; heavy request-orchestration machinery would read as
   over-reach. The extra investment goes into stutter root-cause,
   skeletons, optimistic updates, and transitions — not a data-layer
   rewrite.

4. **Breadth — whole-app evenly or tiered?**
   Tiered. **Primary: Dashboard, Plan, Month** (daily-driver trio, the
   heaviest views) get the full treatment. **Secondary: Account Detail,
   History, Import, Settings** get only inherited wins.

5. **Loading-state fidelity?**
   Layout-matched skeletons (new `Skeleton` primitive) on the primary
   trio, **and** drop the all-or-nothing gate so each section reveals the
   instant its own data is ready. Both together kill the
   "stare-at-spinner-then-everything-jumps" feel.

6. **Optimistic updates — how far?**
   Cheap, high-frequency mutations only: transaction create / edit /
   delete on the Month page, with rollback + notify on failure and a
   provisional id swapped on server response. Rare mutations
   (account/mortgage/savings) stay synchronous.

7. **Transitions — how much motion?**
   Restrained and targeted: data-swap cross-fade on month/account
   switch, skeleton→content fade, easing on existing instant expands.
   ~150–200ms; honor `prefers-reduced-motion`. **No route-level page
   transitions** (they add perceived latency — the opposite of the goal).

8. **How does cached data stay honest?**
   Stale-while-revalidate as the baseline safety net (self-healing: a
   forgotten dependency is a one-frame flicker that corrects itself, not
   a persistent lie) **plus explicit invalidation bumps** on the
   high-impact transaction CRUD so those feel instant. Not
   pure-explicit-invalidation (fragile hand-maintained dependency map
   with silent-stale failure mode).

9. **What counts as done, and what evidence?**
   Evidence-backed, qualitative targets. Before/after profiler traces on
   the primary trio (including cold-first-click on Month switching),
   written up in `dev-journal.md` with the raw traces kept alongside. Not
   hard numeric budgets (meaningless across hardware; tempt gaming the
   number over the feel).

10. **Explicit non-goals?** All five adopted (see Trade-offs).

## Design

### Data layer — cache-context (✅)

A hand-rolled in-memory cache provider for slow-changing global
resources, hooks read through it instead of each owning a `useEffect`
fetch.

- Resources cached: `accounts`, `projection`, `categories`,
  `recurring`, and the other cross-view globals.
- **Freshness: stale-while-revalidate + explicit bumps.** Reads paint
  instantly from cache; a background refetch always runs and reconciles.
  High-impact transaction mutations additionally call an explicit
  invalidation bump on `accounts` + `projection` so they feel instant
  rather than one-frame-stale.
- Call-sites keep close to today's `useX()` shape.

❌ TanStack Query — needless machinery for single-user local SQLite; new
dependency + large test surface.
❌ Pure explicit invalidation — fragile dependency map; silent-stale bug
as the failure mode.
❌ Generic `useResource` rewrite (Q3 option B) — declined as over-reach.

### Feel layer

- **`Skeleton` primitive** — new, in `src/primitives/Skeleton/`
  (`Skeleton.tsx` / `.test.tsx` / `.styles.ts`). Layout-matched
  skeletons on the primary trio; secondary views may reuse it
  incidentally.
- **Progressive reveal** — remove the combined loading gate on the
  primary trio (starting with `DashboardPage`'s
  `if (accountsLoading || projectionLoading) return <Spinner />`), so
  sections light up independently.
- **Optimistic transaction CRUD** — in `useMonthTransactions`
  (`create` / `update` / `remove`) and `useAllMonthTransactions`:
  apply to local state immediately, roll back + `notify` on failure,
  swap provisional id on the create response.
- **Transitions** — content cross-fade on month/account data swap,
  skeleton→content fade, eased expands; `prefers-reduced-motion`
  respected; no route transitions.

### Stutter diagnosis (deliverable, not pre-solved)

Root-cause the first-interaction hitch via cold-first-click profiler
traces on Month switching before choosing its fix. Candidates: uncached
waterfall (fixed by cache-context), styled-components injection, Recharts
cold-mount (`React.memo` chart wrappers / memoized chart data / deferred
mount).

### Breadth

| Tier      | Views                                     | Treatment                                                                        |
| --------- | ----------------------------------------- | -------------------------------------------------------------------------------- |
| Primary   | Dashboard, Plan, Month                    | profiling + cache + bespoke skeletons + transitions + optimistic (Month)         |
| Secondary | Account Detail, History, Import, Settings | inherited wins only: cache-context, `Skeleton` primitive, incidental memoization |

## Implementation Plan

1. **Profiling harness + baseline.** Establish the cold-first-click
   trace protocol (React Profiler + chrome-devtools trace recorded while
   clicking cold). Capture baseline traces for Dashboard, Plan, Month.
   Root-cause the stutter mechanism. Write baseline into `dev-journal.md`.
2. **Cache-context, thinnest slice.** Provider + one resource
   (`accounts`) on SWR semantics; `useAccounts` reads through it.
   Verify no re-fetch on back-nav. Tests.
3. **Migrate remaining global resources** (`projection`, `categories`,
   `recurring`, …) onto the cache-context. Add explicit-bump
   invalidation on transaction CRUD → `accounts` + `projection`.
4. **`Skeleton` primitive + progressive reveal** on the primary trio;
   remove all-or-nothing gates. Tests.
5. **Optimistic transaction CRUD** in the Month hooks with rollback.
6. **Transitions** — data-swap cross-fade, skeleton→content fade, eased
   expands, `prefers-reduced-motion`.
7. **Stutter-specific fix** for whatever phase 1 diagnosed (e.g.
   memoize/defer Recharts mounts).
8. **After/verify.** Re-capture traces on the primary trio; confirm
   directional acceptance criteria; write before/after up in
   `dev-journal.md` with traces kept alongside.

## Trade-offs

**Easier:** revisiting any view is instant (cache); the primary trio
paints a stable layout from frame one with no reflow; frequent
transaction edits feel instant; month/account switches no longer
hard-cut. Before/after traces double as portfolio artifacts.

**Harder:** layout-matched skeletons must be kept in sync when a view's
layout changes (accepted for the three primary views — a reason not to
skeleton all seven). Optimistic creates carry a provisional-id subtlety.
SWR adds a few background local-SQLite queries (near-free here).

**Non-goals (fence):**

1. No new features or surfaces.
2. No visual redesign — skeletons/transitions match the current design
   and Meridian tokens, not a reinterpretation.
3. No touching the projection engine math (audited/correct) — cache and
   memoize _around_ it only.
4. No data-layer architecture beyond the lightweight cache-context — no
   new dependencies, no generic `useResource` rewrite.
5. Secondary views get inherited wins only — no bespoke per-view
   skeletons, transitions, or optimistic flows.
