## Problem Statement

Horizon's current visual presentation does not match the quality standard expected of a portfolio project demonstrating full-stack and desktop engineering. The Meridian design system works functionally but uses a generic palette, a single font, and a top-bar layout that is poorly suited to a data-dense desktop application. The account overview has no visual identity — every account looks identical, making it slow to scan. The codebase also carries two pieces of dead weight: the Milestone feature, which was built for AI capabilities that are permanently deferred, and the `isActive` flag on recurring transactions, which has no scheduling engine to act on it. These add noise to the codebase and surface confusing UI affordances (a checkbox on recurring transactions that does nothing meaningful).

## Solution

A full visual refresh of all views, implementing the Stitch reference design (`src/assets/DESIGN.md`), restructuring the shell from a top bar to a fixed left sidebar, removing dead features, and adding account icon and color personalisation so the account overview is immediately scannable. The visual language upgrades to a dual-font typography system (Hanken Grotesk for UI text, JetBrains Mono for all financial figures), a Material Design 3 color token set, and a 3-level tonal elevation model. The result should read as considered, authoritative, and purpose-built for long-term financial oversight.

## User Stories

### Shell & Navigation

1. As a user, I want a fixed left sidebar so that navigation is always accessible without taking vertical space from content.
2. As a user, I want to see the Horizon wordmark at the top of the sidebar so that the app feels branded and grounded.
3. As a user, I want a "Dashboard" nav item in the sidebar so that I can always return to the overview from any view.
4. As a user, I want an "Outlook" nav item in the sidebar so that I can navigate directly to my 10-year financial projection.
5. As a user, I want a "Settings" nav item pinned to the bottom of the sidebar so that it is accessible but visually secondary.
6. As a user, I want the active nav item to be visually highlighted so that I always know which view I am on.
7. As a user, I want content to use the full available width (up to 1200px) so that data-dense tables and charts have room to breathe on a desktop display.

### Typography

8. As a user, I want headings and labels to use Hanken Grotesk so that the interface feels sharp and engineered.
9. As a user, I want all monetary amounts, balances, and financial figures to render in JetBrains Mono so that numbers in columns align vertically and are easy to scan.

### Color & Elevation

10. As a user, I want cards to sit visually above the base background through a tonal color shift so that the page hierarchy is clear without heavy drop shadows.
11. As a user, I want modals and popovers to sit above cards through a further tonal shift and a diffused shadow so that the layering is unambiguous.
12. As a user, I want semantic colors to be consistent throughout — blue for primary actions, emerald for savings/positive values, gold for mortgage payoff, rose for liabilities — so that I develop a reliable mental model.

### Primitives & Components

13. As a user, I want primary buttons to use a solid filled style so that the primary action on any surface is immediately obvious.
14. As a user, I want secondary buttons to use a bordered transparent style so that secondary actions are present but do not compete with primary ones.
15. As a user, I want input fields to have a visible focus ring (primary blue border + glow) so that keyboard navigation is always clear.
16. As a user, I want account kind badges to be pill-shaped so that they are visually distinct from rectangular data cells.
17. As a user, I want cards to have softly rounded corners (12px) so that the interface feels approachable without losing its technical character.

### Data Tables

18. As a user, I want transaction rows to be separated by a subtle 1px bottom border with no vertical dividers so that the list reads as a continuous sequence.
19. As a user, I want a hover highlight on transaction rows so that I can track my position in a long list.
20. As a user, I want the same row treatment across all data tables (transactions, recurring transactions, projection plan) so that the visual pattern is consistent.

### Chart Colors

21. As a user, I want each account kind to have a consistent, deterministic chart color so that the same kind always looks the same regardless of which accounts I have.
22. As a user, I want Mortgage accounts (debt) to appear in rose on the chart, savings accounts in emerald, and my main Girokonto in primary blue, so that the chart is immediately legible.

### Progress Indicators

23. As a user, I want the mortgage payoff progress bar to use the gold/tertiary color so that it is visually distinguished from savings goals.
24. As a user, I want progress bars to be thin (4px) so that they read as understated indicators rather than dominant visual elements.

### Account Personalisation

25. As a user, I want to choose an icon for each account from a curated set when creating it so that the account overview is scannable at a glance.
26. As a user, I want to choose a color for each account from a curated palette when creating it so that my accounts are visually distinct.
27. As a user, I want a random color to be pre-selected when I open the account creation modal so that every account gets a color without any extra effort on my part.
28. As a user, I want icon and color selection to be optional so that I am not blocked from creating an account if I do not want to personalise it.
29. As a user, I want to see each account's icon and color rendered in the account overview so that I can identify accounts at a glance without reading the name.
30. As a user, I want the account color palette to have 10 distinct options so that even if I have 8 accounts, each can have a unique color.

### Dead Feature Removal

31. As a user, I no longer want to see a Milestone Tracker on the dashboard so that the dashboard focuses on real data rather than a feature with no active AI backend.
32. As a user, I no longer want to see a checkbox on recurring transactions so that the recurring transaction list presents a clean, actionable set of items without a confusing inactive state.
33. As a user, I want to delete a recurring transaction to stop it, rather than toggling it inactive, so that the recurring transaction list always reflects what is actually scheduled.

### Empty and Error States

34. As a user, I want loading states (Spinner) to remain visually coherent with the new design so that loading does not look broken.
35. As a user, I want error messages to use the MD3 error color so that they are consistent with the overall palette.
36. As a user, I want the Settings / Storage page to look consistent with the rest of the app so that no view feels unfinished.

## Implementation Decisions

### Token layer

- Replace all Meridian color tokens with the full MD3 token set from `src/assets/DESIGN.md`, using camelCase token names (e.g. `surfaceContainerHigh`, `outlineVariant`, `primaryContainer`).
- Add a `chartColors` record to the theme keyed by `AccountKind` — maps each kind to a specific MD3 color. Unknown kinds fall back to `onSurfaceVariant`. The record must be exhaustive over `AccountKind` at the TypeScript level.
- Add `accountColorPalette` (10 hex values) and `accountIconSet` (8 lucide icon name strings) as exported constants in the tokens layer.
- Update radius tokens: cards/sections to 12px, buttons/inputs to 8px, badges to 9999px (pill).
- Update typography tokens: font families to Hanken Grotesk (UI text) and JetBrains Mono (numeric). Load both from Google Fonts in `index.html`.
- Spacing tokens (`space1` through `space16`) are unchanged.
- TypeScript will surface every stale color token reference as a compile error — treat the compiler as the migration checklist.

### Shell layout

- Rewrite `AppLayout` from a top-bar pattern to a sidebar pattern. The sidebar is a fixed-width column (220px); the content area fills the remaining width with a centred max-width container (1200px).
- Active nav item is identified by comparing the current route to the nav item path — highlighted using the `primaryContainer` tint.
- The back button that previously appeared on Account Detail moves to the Account Detail page header (inline navigation, not in the sidebar).

### Primitive restyle

- All primitive `.styles.ts` files are updated to reference new MD3 token names — purely visual changes with no structural changes to props or component APIs.
- `Badge` gains pill-shape radius (9999px).
- `Button` primary variant switches to `primaryContainer` fill with `onPrimary` text; secondary variant uses transparent background with `outlineVariant` border; danger variant maps to `error` colors.
- `Input` and `Select` gain `surfaceContainerLowest` background and a focus state with `primary` border plus 2px glow.

### Schema changes — three migrations

1. **Drop milestones table.** A new migration drops the `milestones` table.
2. **Remove `is_active` from `recurring_transactions`.** SQLite does not support `ALTER TABLE ... DROP COLUMN` on the version in use — the migration recreates the table without `is_active`, copies existing data, swaps the tables, and drops the index on `is_active`. Done in a single transaction.
3. **Add `icon` and `color` to `accounts`.** Two nullable `TEXT` columns added via `ALTER TABLE accounts ADD COLUMN`.

### Server changes

- Delete all milestone routes, service layer, and storage implementation.
- Remove `is_active` from the recurring transaction Zod schema, storage type, SQLite repository, and all projection logic that filters by it.
- Add `icon` and `color` to the Account Zod schema, SQLite repository SELECT/INSERT/PATCH, and the `AccountWithBalance` DTO.

### Client type changes

- Remove `src/types/milestone.ts`.
- Remove `isActive` from the `RecurringTransaction` interface.
- Add `icon: string | null` and `color: string | null` to the `AccountWithBalance` interface.

### Account create modal

- Add an icon grid control: 8 icon buttons in a 4x2 grid, each rendering the lucide icon. Selected state uses `primaryContainer` tint with a `primary` ring.
- Add a color swatch row: 10 circular swatches. Selected state shows a 2px `primary` ring. A random color from the palette is chosen on modal mount as the default.
- Both controls are optional — the user may clear the icon selection; color defaults to random.
- The form submits `icon` (string or null) and `color` (hex string or null) alongside existing fields.

### Account overview rendering

- Each account row renders the account icon (if set) in its chosen color (or a neutral fallback if neither is set).
- Fallback when no icon is set: render the account kind initial or a neutral placeholder shape.

### Recurring transaction list

- Remove the `onToggle` prop and the checkbox column entirely.
- Remove `toggleIsActive` from `useRecurringTransactions`.
- The list becomes a clean, clickable table of scheduled transactions.

### Milestone removal

- Delete the entire `src/features/milestones/` directory.
- Remove `MilestoneTracker` from `DashboardPage`.
- Delete `src/types/milestone.ts`.
- Delete server milestone routes, storage, and schemas.
- Remove milestone-related projection references.

### Chart colors

- The per-kind color map lives in the tokens layer, not inside the chart component.
- The chart component reads the map from the theme and applies it per account kind.
- If an account kind is not in the map (defensive case only), the fallback color is `onSurfaceVariant`.

### Data table restyle

- `TransactionList`, `RecurringTransactionList`, and `PlanSummary` each receive the same row treatment: 1px `outlineVariant` bottom border per row, no vertical dividers, `surfaceContainerHigh` hover background.

### Progress bars

- `MortgageCountdown` progress bar: `tertiary` (gold) fill, 4px height.
- Any savings-related progress indicators: `secondary` (emerald) fill, 4px height.

## Testing Decisions

**What makes a good test:** Tests verify externally observable behaviour — what renders, what the user sees, what gets submitted — not implementation details like internal state or CSS class names.

### Modules to test

- **Token layer** — Update `tokens.test.ts` to assert new MD3 color token names are present and the `chartColors` map covers all `AccountKind` values. Fast, high-confidence regression guard for the token shape.
- **Account create modal** — Extend existing tests: icon selection changes the submitted icon value; color selection changes the submitted color value; a color is pre-selected on mount (not null); submitting without selecting icon or color sends null for both.
- **Recurring transaction list** — Update existing tests to assert no checkbox is rendered and no toggle prop exists.
- **AppLayout** — Update existing layout tests to assert the sidebar structure (wordmark, Dashboard link, Outlook link, Settings link) and that the active nav item is highlighted for the current route.
- **Account overview** — Extend tests to assert that an account with an icon renders the icon element and an account with a color applies it.

### Modules not requiring new tests

- Primitive `.styles.ts` restyle — visual changes only; existing primitive tests cover rendering and interaction and do not assert specific CSS values.
- Token hex values — the token test covers shape; specific hex values are not worth asserting.
- Migration SQL — verified by the SQLite parity spec running against a fresh in-memory database on each run.

### Prior art

- Primitive tests follow the `unit / interaction` nested describe structure from design log 04.
- Modal tests use `@testing-library/react` with `userEvent` for interactions.
- `tokens.test.ts` is the existing reference for token shape assertions.

## Out of Scope

- Light mode or theme toggle — dark mode only.
- Sidebar collapse or icon-only mode — fixed 220px, always visible.
- Animated page or nav transitions.
- Account icon or color editing after creation — add-only in this phase.
- More than 8 icons or 10 colors in the curated sets.
- Custom color input or color wheel — only the 10 curated swatches.
- Milestone feature in any form — permanently removed, not deferred.
- `isActive` or pause-recurring in any form — permanently removed; delete is the affordance.
- Storybook or any component documentation tooling.
- Bundling Google Fonts as local assets in the packaged Desktop Build — fonts load from Google Fonts in both dev and production for this phase.

## Further Notes

- The SQLite table recreation for removing `is_active` is the most operationally sensitive migration. It must execute in a single transaction: create new table, copy rows excluding `is_active`, drop old table, rename new table, recreate the account_id index.
- The `chartColors` record must be exhaustive over `AccountKind` at the TypeScript level — a mapped type or a compile-time assertion should enforce this so adding a new `AccountKind` without a chart color becomes a type error.
- "Outlook" is purely the user-visible nav label. The route stays `/plan`, the component stays `PlanPage`, and internal code terminology stays "Plan". This distinction is captured in the ubiquitous language document.
