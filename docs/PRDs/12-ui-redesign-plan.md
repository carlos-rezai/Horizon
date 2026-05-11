# Plan: UI Redesign

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/78

## Architectural decisions

- **Routes**: No new routes. Milestone routes deleted. Account routes (`GET /accounts`, `POST /accounts`, `PATCH /accounts/:id`) extended to include `icon` and `color` fields.
- **Schema**: Three migrations — (1) drop `milestones` table, (2) recreate `recurring_transactions` without `is_active` column and its index, (3) add nullable `icon TEXT` and `color TEXT` columns to `accounts`. All migrations are forward-only; no down-migrations.
- **Key models**: `AccountWithBalance` gains `icon: string | null` and `color: string | null`. `RecurringTransaction` loses `isActive`. `Milestone` type deleted entirely.
- **Token names**: All MD3 color tokens use camelCase (e.g. `surfaceContainerHigh`, `outlineVariant`, `primaryContainer`). Every styled component references tokens only through the theme — no hardcoded hex values.
- **Chart colors**: A `chartColors: Record<AccountKind, string>` map lives in the theme. The map must be exhaustive over `AccountKind` at the TypeScript level — adding a new kind without a chart color is a compile error.
- **Sidebar**: Fixed 220px, always visible. Active route detection via React Router `useLocation` or `NavLink`. Content area: flex-1, max-width 1200px, centred.
- **Fonts**: Hanken Grotesk and JetBrains Mono loaded from Google Fonts in `index.html`. Hanken Grotesk for all UI text; JetBrains Mono for all monetary values and numeric data.

---

## Phase 1: Dead feature removal + DB migrations

**User stories**: 31, 32, 33

### What to build

Remove everything related to Milestone and `isActive` from every layer, and write all three DB migrations so the schema reaches its final state before visual work begins.

Milestone removal cuts through the full stack: the `MilestoneTracker` component and `useMilestones` hook on the client, the milestone server routes and storage implementation, `src/types/milestone.ts`, and any projection references to Estimated Completion Month. The `milestones` table is dropped via migration.

`isActive` removal also cuts the full stack: the checkbox column and `onToggle` prop disappear from `RecurringTransactionList`, `toggleIsActive` is removed from `useRecurringTransactions`, `isActive` is removed from the `RecurringTransaction` type and Zod schema, the server storage repository drops the field from all queries, and the projection engine removes any filtering by `is_active`. The `recurring_transactions` table is recreated without the column (SQLite requires a table recreation to drop a column) — this migration runs in a single transaction: create new table, copy rows, drop old table, rename, recreate index.

The third migration adds nullable `icon TEXT` and `color TEXT` columns to `accounts` via `ALTER TABLE ... ADD COLUMN`. No data changes — existing accounts get `NULL` for both.

### Acceptance criteria

- [ ] Dashboard renders without a Milestone Tracker section
- [ ] Recurring transaction list renders without a checkbox column
- [ ] `MilestoneTracker`, `useMilestones`, and `src/types/milestone.ts` are deleted
- [ ] Milestone server routes, storage, and schema files are deleted
- [ ] `isActive` / `toggleIsActive` do not exist anywhere in the codebase (`grep` returns nothing)
- [ ] All three migrations exist and are numbered sequentially after `002`
- [ ] TypeScript compiles clean with no references to removed types
- [ ] All existing tests pass (recurring transaction tests updated to remove toggle assertions)

---

## Phase 2: Token refresh + sidebar shell

**User stories**: 1–7, 8–9

### What to build

Replace the entire Meridian color token set with the full MD3 set from `src/assets/DESIGN.md`. Update radius tokens (cards 12px, buttons/inputs 8px, badges 9999px) and typography tokens (Hanken Grotesk + JetBrains Mono families, updated size scale). Load both fonts from Google Fonts in `index.html`.

Rewrite `AppLayout` from the top-bar pattern to a sidebar pattern: fixed 220px left column containing the Horizon wordmark, a Dashboard nav link, an Outlook nav link, a spacer, and a Settings nav link pinned to the bottom. The content area fills remaining width with a centred 1200px max-width container. Active nav item is highlighted using the `primaryContainer` tint.

After the token rename, every existing `.styles.ts` file that references old color token names (e.g. `theme.colors.bgBase`, `theme.colors.accent`) will produce a TypeScript error. Fix all of these as part of this phase — treat the compiler as the exhaustive checklist. The phase ends when TypeScript compiles clean.

### Acceptance criteria

- [ ] Sidebar renders on all routes with wordmark, Dashboard, Outlook, Settings links
- [ ] Active nav item is highlighted; inactive items are not
- [ ] Hanken Grotesk loads and applies as the base UI font
- [ ] JetBrains Mono is available as a font family in the theme (applied to numerics in later phases)
- [ ] Content area is centred with a 1200px max-width
- [ ] TypeScript compiles with zero errors
- [ ] `tokens.test.ts` updated to assert new MD3 color token names and the presence of `chartColors` covering all `AccountKind` values
- [ ] `AppLayout` tests updated to assert sidebar structure (wordmark, three nav links, active state)

---

## Phase 3: Primitive restyle

**User stories**: 13–17

### What to build

Restyle all primitives and shared components to the Stitch spec using the new MD3 tokens. No prop API changes — purely visual.

- **Button**: primary variant uses `primaryContainer` fill with `onPrimary` text; secondary uses transparent fill with `outlineVariant` border; danger uses `error` fill. All variants get `transition: all 0.2s ease` on hover.
- **Input / Select**: `surfaceContainerLowest` background, `outlineVariant` border at rest, `primary` border plus 2px outer glow on focus.
- **Badge**: pill radius (9999px), 15% opacity background tint of the semantic color, full-opacity text.
- **Text / Heading**: font family tokens applied; Heading uses Hanken Grotesk weights as specified in the typography scale.
- **Spinner**: color updated to `primary`.
- **Card**: `surfaceContainer` background, 1px `outlineVariant` border, 12px radius, subtle 1px top-stroke inner highlight (lighter than card face, simulating top-down light).
- **Modal**: `surfaceContainerHigh` background, 12px radius, diffused drop shadow `0px 10px 25px -5px rgba(0,0,0,0.5)`.

### Acceptance criteria

- [ ] Primary button renders with `primaryContainer` fill; hover state transitions smoothly
- [ ] Secondary button renders with transparent fill and `outlineVariant` border
- [ ] Input focus state shows `primary` border and 2px glow
- [ ] Badge renders as pill-shaped
- [ ] Card renders with tonal background, border, and visible top-stroke highlight
- [ ] Modal renders elevated above card surfaces with shadow
- [ ] All existing primitive and component tests pass without modification

---

## Phase 4: Account personalisation

**User stories**: 25–30

### What to build

A complete vertical slice: server learns about `icon` and `color`, the account creation modal gains a picker for both, and the account overview renders them.

Server: `GET /accounts` and `GET /accounts/:id` return `icon` and `color` in the response. `POST /accounts` accepts `icon` (string or null) and `color` (hex string or null). `PATCH /accounts/:id` accepts both fields for future editing (even if not exposed in the UI yet). Zod schemas updated.

Account create modal: an icon grid (8 lucide icons in a 4×2 layout, each button showing the icon, selected state uses `primaryContainer` tint with a `primary` ring) and a color swatch row (10 circular swatches, selected state shows a 2px `primary` ring). A random color from the palette is chosen on modal mount — the user always has a color pre-filled. Both controls are optional; icon can be cleared, color defaults to random.

Account overview: each account row renders the account's icon in its chosen color. If no icon is set, a neutral placeholder (account kind initial or generic shape) is shown. If no color is set, `onSurfaceVariant` is used as the fallback.

### Acceptance criteria

- [ ] Creating an account with an icon and color saves both to the database
- [ ] Creating an account without selecting an icon saves `null` for icon
- [ ] A color is always pre-filled when the create modal opens (random, not null)
- [ ] Account overview renders the icon and color for each account that has them
- [ ] Accounts without an icon show a neutral fallback, not a broken layout
- [ ] Server returns `icon` and `color` on all account responses
- [ ] Account create modal tests cover: icon selection, color selection, random-color default on mount, null icon on submission without selection
- [ ] Account overview tests cover: icon renders when present, fallback renders when absent

---

## Phase 5: Data surfaces + chart

**User stories**: 18–22, 23–24

### What to build

Apply the Stitch data table row treatment uniformly across the three main data-dense surfaces, wire the per-kind color map into the chart, and update progress bar styling.

**Data tables**: `TransactionList`, `RecurringTransactionList`, and `PlanSummary` each receive: 1px `outlineVariant` bottom border per row, no vertical dividers, `surfaceContainerHigh` hover background. No alternating row stripes.

**Chart**: `TrajectoryHorizon` reads the `chartColors` record from the theme (keyed by `AccountKind`) rather than using hardcoded hex values. Each account kind is rendered in its designated color. The fallback for an unknown kind is `onSurfaceVariant`. JetBrains Mono is applied to chart axis labels and tooltip values.

**Progress bars**: `MortgageCountdown` progress bar updated to 4px height and `tertiary` (gold) fill. Any savings-related progress indicators updated to `secondary` (emerald) fill.

### Acceptance criteria

- [ ] Transaction rows show 1px bottom border, no vertical dividers, hover highlight
- [ ] Recurring transaction rows show the same row treatment
- [ ] Plan Summary rows show the same row treatment
- [ ] TrajectoryHorizon chart renders each account kind in its mapped color (Mortgage in rose, Girokonto in primary blue, Tagesgeld and savings kinds in emerald)
- [ ] No hardcoded hex values remain inside the chart component
- [ ] Mortgage Countdown progress bar is 4px tall and gold
- [ ] Chart axis labels and tooltip values render in JetBrains Mono

---

## Phase 6: Full view layout pass

**User stories**: 10–12, 34–36

### What to build

Apply the 3-level tonal elevation model and final layout polish to every page so no view looks unfinished. This phase touches page-level and feature-level layout, not primitive internals.

**Dashboard**: Accounts section, Mortgage Countdown, Plan Summary, and Trajectory Horizon each wrapped in a Level 1 Card. Consistent `stack-lg` (32px) spacing between sections. "Add account" button placement and hierarchy reviewed against the Stitch spec.

**Account Detail**: Account header card (Level 1). Transaction section and Recurring Transaction section each in their own Card. Back navigation rendered inline in the page header (not the sidebar).

**Outlook (Plan page)**: Page heading, TrajectoryHorizon chart card, and ProjectionAccordion each in Level 1 Cards with consistent spacing.

**Settings / Storage**: Storage status and action buttons in a Level 1 Card. Page layout consistent with other views.

**Error and loading states**: Spinner colour confirmed as `primary`. Error text uses the `error` MD3 token. Empty states reviewed on all three data table surfaces.

### Acceptance criteria

- [ ] Every page uses Level 1 Cards for surface grouping — no unsurfaced content blocks
- [ ] Dashboard, Account Detail, Outlook, and Settings all use consistent `stack-lg` section spacing
- [ ] No view has unstyled or inconsistently styled sections
- [ ] Back navigation on Account Detail is inline in the page header, not in the sidebar
- [ ] Error messages render in the `error` MD3 color across all views
- [ ] Spinner renders in `primary` color
- [ ] The app visually matches the Stitch reference intent end-to-end
