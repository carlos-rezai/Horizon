# 29 — Data-Access Consolidation Refactor

_Follow-on cleanup for the Performance + UX Polish epic (#198)._

## Problem Statement

The Performance + UX Polish epic replaced every per-hook `useEffect`
fetch with a shared stale-while-revalidate cache-context. The cache
module itself (`ResourceCache`, `useCachedResource`, `useCacheBump`) is
cohesive and well-tested. But the _call sites_ that read through it were
migrated one hook at a time, and three inconsistencies were left spread
across the feature hooks:

1. **Cache keys are unguarded magic strings.** `"accounts"`,
   `"projection"`, `"categories"`, and `"recurring"` are written as raw
   string literals inside each hook, and `useOptimisticCommit` calls
   `bump("accounts", "projection")` with raw strings too. `useCacheBump`
   is typed `(...keys: string[]) => void`, so _any_ string compiles. A
   typo such as `bump("accont")` silently no-ops — `invalidate` flags an
   unknown key as stale and it never fires — leaving a view showing
   stale numbers with no error anywhere. The whole "feels instant"
   promise of the epic (SWR baseline + explicit bumps on transaction
   CRUD) depends on the read key and the bump key being the same string,
   and nothing enforces that. The `monthTransactionsKey` builder — the
   one key that _is_ centralised — lives off on its own in
   `features/months/`, so there is no single place that answers "what
   keys does the cache hold?"

2. **The GET-and-check idiom is copy-pasted.** Every cached fetcher
   (`useAccounts`, `useProjection`, `useAllRecurringTransactions`,
   `categoriesApi.fetchCategories`, and the two month hooks) hand-rolls
   the same three lines: `fetch(...)`, `if (!res.ok) throw new
Error(\`Failed to fetch X: ${res.status}\`)`, `return (await
   res.json()) as T`. There is no shared helper — `utils/api/api.ts`exports only`API_BASE`. The error-message shape is re-typed at each
   site and drifts.

3. **A shared error-body parser exists but is not shared.**
   `categoriesApi.ts` already defines `readErrorMessage(res, fallback)`
   to read an `{ error }` message off a failed response. But
   `useOptimisticCommit` hand-rolls that exact parse inline
   (`res.json().catch(() => ({}))` then `body.error ?? failureMessage`).
   Two copies of one idea, one of them feature-local.

None of this is a bug today. It is the kind of spread-out inconsistency
that turns into a bug the next time a resource or a mutation is added —
the exact scalability risk the codebase's conventions exist to prevent.

## Solution

Consolidate the data-access layer the epic left spread out, in three
behaviour-preserving moves, without touching the cache engine, the feel
layer, or the projection math:

1. **A typed cache-key registry.** One module owns every cache key: the
   four global-resource keys as named constants and the
   `monthTransactionsKey` builder, moved in beside them. A `CacheKey`
   type unions the registered keys, and `useCacheBump` /
   `useCachedResource` accept only that type, so a mistyped or
   unregistered key is a compile error rather than a silent stale view.

2. **A shared `fetchJson<T>` GET helper** in `utils/api`, tested per the
   "every util has a test" rule. Each cached fetcher collapses to one
   call with one consistent error-message shape.

3. **Promote `readErrorMessage` to `utils/api`** and have both
   `categoriesApi` and `useOptimisticCommit` use the one copy.

Each step is small, leaves the app working, and is already covered by
the epic's tests, so any behavioural drift surfaces immediately.

## Commits

Ordered so the tree is green after every commit. TDD where a new unit is
introduced (RED test first, then the change).

1. **Add `fetchJson` — test first.** Write the failing test for a new
   `fetchJson<T>(path)` in `src/utils/api/`: resolves to the parsed body
   on a 2xx, throws an `Error` carrying the status on a non-2xx, and
   prefixes the path onto the message. Then implement it against
   `API_BASE`. No call site changes yet. Tree green.

2. **Migrate the two simple GET fetchers to `fetchJson`.** Replace the
   hand-rolled fetch/throw in `useAccounts` and `useProjection` with
   `fetchJson`. Their existing hook tests (mocking `fetch`) must pass
   unchanged; adjust only if a test asserted the exact old message
   string. Delete the now-dead local fetch bodies.

3. **Migrate the remaining GET fetchers.**
   `useAllRecurringTransactions`, `categoriesApi.fetchCategories`, and
   the read paths of `useMonthTransactions` /
   `useAllMonthTransactions`. Keep the month hooks' short-circuit ("no
   account selected → empty list") ahead of the call. The per-account
   fan-out in `useAllMonthTransactions` maps `fetchJson` over the ids.

4. **Promote `readErrorMessage` to `utils/api` — test first.** Add the
   failing test alongside `fetchJson` (reads `{ error }`, falls back on
   missing/non-JSON body), move the implementation out of
   `categoriesApi.ts`, and re-export or re-import it there so the
   categories call sites are unchanged. Tree green.

5. **Use the shared `readErrorMessage` in `useOptimisticCommit`.**
   Replace the inline `{ error }` parse with the helper. The optimistic
   CRUD tests (failure path asserts the surfaced message) must pass
   unchanged.

6. **Create the cache-key registry.** New module in the `CacheProvider`
   folder exporting the four resource-key constants, a `CacheKey` type,
   and the relocated `monthTransactionsKey` builder (re-exported from its
   old path, or update the two month-hook imports — whichever keeps the
   diff smallest). No signature changes yet. Tree green.

7. **Point every read site at the registry constants.** Replace the raw
   string literals in `useAccounts`, `useProjection`, `useCategories`,
   and `useAllRecurringTransactions` with the named constants. Pure
   substitution; behaviour identical.

8. **Narrow the cache signatures to `CacheKey`.** Change
   `useCacheBump` and `useCachedResource` to accept `CacheKey` (the
   month builder returns a branded/registered key type so its dynamic
   keys still satisfy it). Update `useOptimisticCommit`'s
   `bump(ACCOUNTS, PROJECTION)` call to the constants. The compiler now
   rejects any unregistered key — confirm the build is the gate by
   temporarily mistyping a key and seeing it fail, then reverting.

9. **Tidy the test doubles.** Update any test that constructed a raw
   `"accounts"`-style key by hand to import the constant, so the tests
   read against the same registry as the code. Confirm full suite green
   and a real `tsc -b` build (not `tsc --noEmit`, which checks nothing
   here) passes.

## Decision Document

- **Modules built/modified.**
  - New: a `fetchJson` GET helper and a promoted `readErrorMessage` in
    `src/utils/api/`, each with a colocated test.
  - New: a cache-key registry module in the `CacheProvider` folder,
    owning the resource-key constants, the `CacheKey` type, and the
    relocated `monthTransactionsKey` builder.
  - Modified: `useAccounts`, `useProjection`, `useCategories`,
    `useAllRecurringTransactions`, `useMonthTransactions`,
    `useAllMonthTransactions`, `categoriesApi`, `useOptimisticCommit`,
    `useCacheBump`, `useCachedResource`.
- **Interface changes.**
  - `useCacheBump(): (...keys: CacheKey[]) => void` — narrowed from
    `string[]`.
  - `useCachedResource<T>(key: CacheKey, fetcher)` — narrowed from
    `string`.
  - `fetchJson<T>(path: string): Promise<T>` — new; throws on non-2xx
    with the status and path in the message.
  - `readErrorMessage(res, fallback)` — unchanged signature, new home.
- **Registry contents.** Constants for `accounts`, `projection`,
  `categories`, `recurring`; the `monthTransactionsKey(accountIds,
month)` builder; and a `CacheKey` type the builder's return and the
  constants both satisfy.
- **Clarifications from the developer.**
  - `fetchJson` migration is scoped to the epic's six cached fetchers
    only; the other ~14 hooks using the raw fetch idiom are pre-existing
    and out of scope for this pass.
  - The cache-key registry is the centrepiece, not deferred.
- **Architectural decisions.**
  - Shared request plumbing (`fetchJson`, `readErrorMessage`) lives in
    `utils/api` — pure, testable, no React, per the layer table.
  - The key registry lives with the cache it describes
    (`components/CacheProvider/`), not in `utils/`, because it is part of
    the cache's contract.
  - The `useMonthTransactions` / `useAllMonthTransactions` split is kept
    — their signatures genuinely differ (single-account + `removeTransfer`
    vs multi-account + `createTransfer`); merging is out of scope.
- **No schema, API-contract, or persisted-data changes.** This is a
  client-internal refactor; the server, the routes, and the DB are
  untouched.

## Testing Decisions

- **What makes a good test here.** Assert external behaviour, not
  implementation. For `fetchJson`: given a mocked `fetch`, the parsed
  body on success and a thrown error carrying the status on failure —
  not which internal branches ran. For the migrated hooks: the existing
  hook tests already pin the observable contract (`data`, `isLoading`,
  `error`, and that a bump refetches); they should pass **unchanged**,
  which is the strongest signal the refactor preserved behaviour. A test
  that has to change is a flag to inspect, not a formality to update.
- **Modules tested.** `fetchJson` and `readErrorMessage` get new unit
  tests (`utils/` rule: every util has a test). The cache-key registry
  needs no test of its own beyond the type-level guarantee — the
  compiler _is_ the test; the existing `useCacheBump` bump-refetches-key
  test already exercises it through a real key.
- **Prior art.** `optimisticTransactions.test.ts` is the model for the
  new pure-util tests (pure input → output, no mocks beyond the
  boundary). The hook tests under `features/**/use*.test.tsx` — which
  mock `fetch` and assert the SWR contract — are the model for
  confirming the migrated fetchers still behave. `CacheProvider.test.tsx`
  already covers the bump/invalidate path the narrowed signature runs
  through.

## Out of Scope

- The `ResourceCache` engine, `useCachedResource`'s subscription
  mechanics, and `useCacheBump`'s behaviour — cohesive and well-tested;
  only their key _type_ narrows.
- The feel layer: `Skeleton`, the bespoke per-view skeletons,
  `SectionState`, `FadeSwap`, `useReducedMotion`. The layout-matched
  skeletons are a deliberate, accepted maintenance cost, not
  duplication to collapse.
- The optimistic-edit util (`optimisticTransactions.ts`) — already pure
  and tested.
- Merging the two month-transaction hooks.
- Migrating the ~14 non-epic hooks that use the raw fetch idiom
  (`useHistory`, `useImport`, `useYearComparison`, the settings hooks,
  …) to `fetchJson`. A worthwhile later consistency pass, but a separate
  scope — this refactor stays on the epic's surface.
- Any change to the server, routes, SQLite access, projection math, or
  the wire format.
- The knowingly-left transition threads from #206 (the removed
  skeleton→content fade contradicting #205's acceptance criterion, the
  first-mount fade suppression). Those were decided with the trade-off on
  the table and are not reopened here.

## Further Notes

- Verify the real typecheck with `tsc -b` / `npm run build`, not
  `tsc --noEmit` — the root `tsconfig` has `files: []`, so `--noEmit`
  checks nothing. The narrowed `CacheKey` signatures are the payoff of
  the whole refactor; the build passing (and a deliberately mistyped key
  failing) is how we know the silent-stale failure mode is closed.
- The registry doubles as living documentation: one file now answers
  "what does the cache hold, and what may a mutation invalidate?" — the
  question that had no single answer before.
