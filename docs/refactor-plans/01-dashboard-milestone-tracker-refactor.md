## Problem Statement

The dashboard + milestone tracker feature was built to spec and is fully
tested, but the implementation drifted from the architectural boundaries
defined in CLAUDE.md in several ways. Specifically:

- Domain-specific hooks (`useAccounts`, `useMilestones`, `useProjection`)
  landed in `src/hooks/`, which is reserved for global shared hooks only.
  The architecture requires feature hooks to be co-located with their feature.
- A formatting utility (`formatBalance`) was duplicated identically across
  three files instead of being extracted to `src/utils/`.
- A shared configuration constant (`API_BASE`) was repeated in every hook
  that makes a network call, with no single source of truth.
- Type interfaces already defined in `src/types/` were re-declared inline
  in three test files, making type changes require edits in multiple places.
- The milestone creation form silently swallows errors — if `addMilestone`
  throws, the form clears as if the operation succeeded and the user gets
  no feedback.
- The dashboard does not handle loading or error state from `useMilestones`,
  so milestone fetch failures are invisible to the user.
- The milestone form has no client-side validation: an empty name and a
  blank target balance field (which resolves to `0`) can both be submitted.
- The server does not validate that `targetBalance` is a number or that it
  is non-negative, relying entirely on the client.
- The `GET /accounts` route issues one `Transaction.find` query per account,
  causing N+1 database queries that will degrade as the account count grows.
- The 120-month projection horizon is a bare magic number repeated in the
  server projection library with no explanation or named constant.

## Solution

Refactor the feature in small, behaviour-preserving commits that address
each issue independently. No new features are introduced. Every commit
leaves the codebase in a working, testable state.

The ordering moves from zero-risk infrastructure changes (extract constants,
fix types) through structural moves (hooks, format utility) to backend fixes
(N+1, validation) and finally to frontend behaviour fixes (error handling,
form validation), so that each phase builds on a stable base.

## Commits

### Commit 1 — Extract `formatBalance` to `src/utils/format.ts`

Create `src/utils/format.ts` and move the `formatBalance(cents: number): string`
function into it as a named export. The function is identical in
`DashboardPage.tsx`, `MilestoneTracker.tsx`, and `MortgageCountdown.tsx` —
remove all three local definitions and replace them with an import from
`src/utils/format.ts`. No behaviour changes. No test changes.

### Commit 2 — Extract `API_BASE` to `src/utils/api.ts`

Create `src/utils/api.ts` and move the `API_BASE` constant into it as a
named export:

```
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";
```

Remove the identical declaration from `useAccounts`, `useMilestones`, and
`useProjection` and replace with an import. No behaviour changes.
No test changes.

### Commit 3 — Remove inline type declarations from test files

In `src/utils/projection.test.ts`, `src/features/milestones/MilestoneTracker.test.tsx`,
and `src/features/mortgage/MortgageCountdown.test.tsx`, delete all locally
declared interfaces and type aliases (`MonthlySnapshot`, `AccountSnapshot`,
`AccountKind`, `AccountWithBalance`) and replace them with imports from
`src/types/projection.ts` and `src/types/account.ts`. No behaviour changes.
Tests continue to pass without modification.

### Commit 4 — Extract `PROJECTION_MONTHS` constant in server projection library

In `server/src/lib/projection.ts`, replace the bare `120` in the loop
condition with a named constant `const PROJECTION_MONTHS = 120` declared
at the top of the file. No behaviour changes. No test changes needed —
existing projection tests already assert on the 120-month output and will
continue to pass.

### Commit 5 — Move `useProjection` to `src/features/projection/`

Create the directory `src/features/projection/`. Move `useProjection.ts`
from `src/hooks/` into it. Update the import in `DashboardPage.tsx`.
No behaviour changes. Tests are co-located with the hook's feature consumers,
not with the hook itself, so no test file moves are required.

### Commit 6 — Move `useAccounts` to `src/features/accounts/`

Move `useAccounts.ts` from `src/hooks/` into `src/features/accounts/`.
Update the import in `DashboardPage.tsx`. No behaviour changes.

### Commit 7 — Move `useMilestones` to `src/features/milestones/`

Move `useMilestones.ts` from `src/hooks/` into `src/features/milestones/`.
Update the import in `DashboardPage.tsx`. After this commit, `src/hooks/`
is empty. Leave the directory — it is the intended home for future global
hooks such as `useMediaQuery` and `useTheme`. No behaviour changes.

### Commit 8 — Fix N+1 queries in `GET /accounts` and `GET /liquid`

Replace the per-account `Transaction.find` calls in both routes with a
single MongoDB aggregation that groups transaction amounts by `accountId`
in one query. Merge the results in JavaScript before building the response.
Both routes currently issue `N + 1` queries (one to fetch accounts, one per
account to fetch transactions). After this commit, both routes issue exactly
2 queries regardless of account count.

The shape of the response must remain identical so that all existing tests
and frontend consumers pass without change.

### Commit 9 — Add `targetBalance` validation to `POST /milestones`

In `server/src/routes/milestones.ts`, add a guard after the presence check
that rejects requests where `targetBalance` is not a number (`typeof
targetBalance !== "number"`) or is negative (`targetBalance < 0`). A value
of `0` is valid — a milestone targeting a zero balance (e.g. paying off a
debt) is a legitimate use case. Return `400` with a descriptive error
message.

Add two new test cases to `server/src/__tests__/milestones.test.ts`:

- `POST /milestones` with a string `targetBalance` returns 400
- `POST /milestones` with a negative `targetBalance` returns 400

### Commit 10 — Add client-side form validation to `MilestoneTracker`

In `MilestoneTracker.tsx`, derive a boolean `isValid` from the current form
state: the name field must be non-empty after trimming, and the target
balance field must be non-empty (the user must have typed something). Disable
the submit button when `isValid` is false.

Do not add inline error messages per field — disabling the button is
sufficient at this stage.

Add two new test cases to `MilestoneTracker.test.tsx`:

- Submitting with an empty name does not call `onAdd`
- Submitting with an empty target balance field does not call `onAdd`

### Commit 11 — Make `MilestoneTracker` await `onAdd` and surface errors

In `MilestoneTracker.tsx`:

- Change the `onAdd` prop type from `(data: NewMilestone) => void` to
  `(data: NewMilestone) => Promise<void>`.
- Make `handleSubmit` async and wrap the `onAdd` call in a `try/catch`.
- On success: clear the form fields as before.
- On failure: keep the form fields populated (so the user can retry) and
  set a local `submitError` state string. Render the error message as a
  `<p>` below the form.

`DashboardPage` passes `addMilestone` from `useMilestones`, which already
returns `Promise<void>` — no change needed in the page.

Add two new test cases to `MilestoneTracker.test.tsx`:

- When `onAdd` rejects, the form fields retain their values
- When `onAdd` rejects, an error message is rendered below the form

### Commit 12 — Handle milestone loading and error state in `DashboardPage`

In `DashboardPage.tsx`, destructure `isLoading: milestonesLoading` and
`error: milestonesError` from `useMilestones`. Add `milestonesLoading` to
the existing loading guard and `milestonesError` to the existing error
display. Milestone data should block and gate the page the same way
accounts and projection data do — all three are needed to render the
dashboard meaningfully.

No new test file for `DashboardPage` is introduced in this refactor
(see Out of Scope).

## Decision Document

**`src/utils/api.ts` — not `src/lib/api.ts`**
The CLAUDE.md folder structure defines `src/utils/` as the home for pure
helpers and shared utilities. There is no `src/lib/` in the frontend
architecture. Using `src/lib/` would introduce an undefined layer.

**`src/utils/format.ts` — single format utility**
`formatBalance` is a pure function with no side effects and no domain
knowledge. It belongs in `src/utils/`, not inside a feature folder.
Future formatting functions (e.g. for dates) should be added to the
same file.

**Domain hooks move to feature folders**
CLAUDE.md is explicit: `src/hooks/` is for global shared hooks only.
`useAccounts`, `useMilestones`, and `useProjection` are domain hooks that
own their own fetching logic. They belong alongside the components and types
of their feature. The `src/features/projection/` directory is created as
part of this refactor to house `useProjection`, consistent with the design
log.

**`src/hooks/` directory is kept empty after the moves**
It is the designated home for future global hooks (`useMediaQuery`,
`useTheme`). Deleting it would require recreating it when those hooks
are built.

**MongoDB aggregation for N+1 fix**
A single `$match` + `$group` aggregation is the idiomatic Mongoose/MongoDB
approach. The alternative (fetch all transactions and group in JS) trades
a network-efficient aggregation for unnecessary data transfer. The
aggregation approach is preferred.

**`PROJECTION_MONTHS` is a server-only constant**
The client never needs to know the projection horizon — it just consumes
the 120 snapshots the server returns. Introducing a shared config between
server and client (e.g. a monorepo-level constants file) would be
over-engineering. The constant lives in `server/src/lib/projection.ts`
where it is used.

**`targetBalance: 0` is valid**
A user may set a milestone to track when a debt (e.g. a CreditCard) reaches
zero. Rejecting zero would break this use case. Only negative values are
rejected server-side.

**`onAdd` prop type changed to `Promise<void>`**
The underlying `addMilestone` function already returns `Promise<void>`.
Making the prop type explicit forces consumers to pass an async function and
allows `handleSubmit` to correctly await it.

**Milestone loading blocks the full page**
All three data sources (accounts, projection, milestones) are required to
render the dashboard. Showing a partially loaded page with a skeleton
milestone section is a UI concern for the Meridian design phase, not for
this refactor. The simplest correct behaviour is to block on all three.

## Testing Decisions

**What makes a good test here**
Tests should assert on external behaviour observable by the user or API
consumer — not on which file a constant is imported from, not on internal
state shape. A test for form validation asserts that `onAdd` is not called;
it does not assert on the value of an internal `isValid` boolean.

**Modules that need new tests**

- `server/src/__tests__/milestones.test.ts` — two new cases for invalid
  `targetBalance` (string and negative). Prior art: the existing
  `POST /milestones` describe block which uses `createAccount()` helper
  and `request(app).post(...)` assertions.

- `src/features/milestones/MilestoneTracker.test.tsx` — four new cases:
  empty name blocks submit, empty target balance blocks submit, failed
  `onAdd` retains form values, failed `onAdd` renders error message. Prior
  art: existing `handleSubmit` tests in the same file which use
  `fireEvent.change` and `vi.fn()` mocks.

**Modules that do not need new tests**

- `src/utils/format.ts` — extracted from existing usage; no new logic.
  The existing component tests already exercise the output indirectly.
- `src/utils/api.ts` — a constant extraction with no logic to test.
- Structural hook moves — no behaviour change.
- `PROJECTION_MONTHS` constant — no behaviour change; existing server
  projection tests continue to assert on 120-month output.
- `DashboardPage.tsx` — no test file exists and creating one is out of
  scope for this refactor.

## Out of Scope

- **DashboardPage integration tests.** No test file exists for
  `DashboardPage.tsx`. Writing one from scratch is a separate task.
- **Timezone handling in `currentMonth()`.** The `currentMonth()` helper
  in `MortgageCountdown.tsx` uses local system time via `new Date()`. For
  a German user running the app in the German timezone this is correct
  behaviour. UTC normalisation is not needed.
- **Milestone editing.** Confirmed out of scope at design time — delete
  and recreate is the intended flow.
- **Shared `PROJECTION_MONTHS` between server and client.** The client
  never depends on this value directly.
- **`src/features/projection/` barrel `index.ts`.** Index files for feature
  folders are not yet established in the codebase; adding them selectively
  would be inconsistent.
- **`GET /accounts/liquid` N+1 fix.** The `/liquid` endpoint duplicates the
  same N+1 pattern but is not used by any current frontend consumer. It
  should be fixed when it is actively used.

## Further Notes

After the hook moves (commits 5–7), the import structure in `DashboardPage`
will read:

```typescript
import { useAccounts } from "../features/accounts/useAccounts";
import { useProjection } from "../features/projection/useProjection";
import { useMilestones } from "../features/milestones/useMilestones";
```

This is the target shape defined in the CLAUDE.md architecture — pages
compose features, and feature hooks live with their feature.
