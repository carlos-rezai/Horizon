# Design Log 12 — UI Redesign

## Background

Horizon has a fully working Meridian design system (Inter font, `#0F1117`
base palette, single blue accent, top-bar shell layout). The system was
designed in design log 04 and applied across all views by design log 06.

A Google Stitch reference file (`src/assets/DESIGN.md`) was added to the
repository defining a richer visual language: Material Design 3 color
tokens, a dual-font typography system (Hanken Grotesk + JetBrains Mono),
3-level tonal elevation, and a "Precision Minimalism / Control Center"
aesthetic aimed at a high-net-worth demographic.

The project also has two pieces of dead weight: the Milestone feature
(designed for permanently-deferred AI capabilities) and the `isActive`
flag on RecurringTransactions (a toggle with no scheduling engine behind
it).

## Problem

Refresh all views to match the Stitch reference design, restructure the
shell from a top bar to a sidebar, remove dead features, and add account
personalisation (icon + color) so the account overview is immediately
scannable.

## Questions and Answers

**Q1: Which views are in scope?**
All views: Dashboard, Account Detail, Outlook (Plan), Settings / Storage,
and the AppLayout shell.

**Q2: Does the shell structure change?**
Yes. Replace the horizontal top bar with a fixed 220px left sidebar, always
visible, no collapse.

**Q3: What is the sidebar structure?**
Horizon wordmark at top. Nav items: Dashboard, Outlook. Settings pinned to
the bottom. No icons in the first pass — text labels only.

**Q4: What is the Plan page labeled in the nav?**
**Outlook** — pairs well with Dashboard (operational vs forward-looking),
fits Horizon's positioning as a long-term thinking tool.

**Q5: What is the content max-width?**
Expanded from 960px to 1200px. The full 1280px from DESIGN.md is too wide
alongside a 220px sidebar on standard 1440px desktops.

**Q6: Does typography change?**
Yes. Replace Inter with a dual-font system:

- **Hanken Grotesk** — headings, labels, UI text
- **JetBrains Mono** — all numerical values, balances, amounts

**Q7: Does the color palette change?**
Yes. Adopt the full MD3 token set from `src/assets/DESIGN.md` wholesale.
All existing Meridian color token names are replaced.

**Q8: What is the elevation model?**
3-level tonal stack:

- Level 0 — base: `surface` `#10131a`
- Level 1 — cards: `surface-container` `#1d2027`, 1px `outline-variant`
  border, subtle 1px top-stroke inner highlight
- Level 2 — modals/popovers: `surface-container-high` `#272a31`,
  diffused drop shadow `0px 10px 25px -5px rgba(0,0,0,0.5)`

**Q9: Do spacing tokens change?**
No. The existing 4px grid (`space1`–`space16`) is kept. It is already a
superset of the 8px grid specified in DESIGN.md.

**Q10: Do radius tokens change?**
Yes. Update to Stitch shape language:

- Cards/sections: 12px
- Buttons/inputs: 8px
- Badges/chips: 9999px (pill)

**Q11: Are all primitives restyled?**
Yes. Button, Input, Select, Badge, Text, Heading, Spinner — all `.styles.ts`
files updated to the new token set.

**Q12: Do data tables change?**
Yes. TransactionList, RecurringTransactionList, PlanSummary adopt Stitch
row style: no vertical dividers, 1px bottom border per row,
`surface-container-high` hover highlight. No alternating row stripes.

**Q13: Do progress bars change?**
Yes. 4px height. `secondary` (emerald `#4edea3`) for savings milestones.
`tertiary` (gold `#ffb786`) for mortgage payoff.

**Q14: How are chart line colors handled?**
A per-`AccountKind` color map is defined in tokens — a
`Record<AccountKind, string>`. Deterministic: the same kind always renders
the same color. Debt kinds → `error` (`#ffb4ab`). Savings kinds →
`secondary` (`#4edea3`). Main → `primary` (`#adc6ff`). Unknown kinds fall
back to `on-surface-variant` (`#c2c6d6`).

**Q15: What happens to the Milestone feature?**
Removed entirely: UI, hooks, server routes, data model, DB migration, tests.
It was designed for permanently-deferred AI capabilities and adds no value
to the current build.

**Q16: What happens to `isActive` on RecurringTransaction?**
Removed entirely: DB column, server logic, toggle UI, hooks. There is no
scheduling engine that acts on the flag. Removing a recurring transaction
is the correct affordance for stopping it.

**Q17: What is the transaction list checkbox?**
The `isActive` toggle affordance. Removed along with the flag.

**Q18: Do accounts get icons?**
Yes. User-chosen at account creation from a curated set of ~8 lucide-react
icons: Wallet, Home, PiggyBank, TrendingUp, CreditCard, Landmark,
Building2, Banknote. Stored as icon name string in DB, nullable. Not
required to create an account.

**Q19: Do accounts get colors?**
Yes. User-chosen from a curated palette of 10 hand-picked MD3-derived hex
values. Stored as hex string in DB, nullable. Optional — not required.
A random color from the palette is pre-filled as default in the create
modal so every account gets a color with zero friction.

**Q20: How are icon and color stored?**
Both are nullable columns on the accounts table. Icon: `TEXT` (lucide icon
name, e.g. `"Wallet"`). Color: `TEXT` (hex string, e.g. `"#adc6ff"`). The
hex value is stored — not a palette index — so existing accounts are
unaffected if the curated palette ever changes.

## Design

### Token changes

```
src/tokens/colors.ts     — replace Meridian palette with full MD3 set
                           from src/assets/DESIGN.md
src/tokens/radius.ts     — update to Stitch spec (12 / 8 / 9999)
src/tokens/typography.ts — update font families to Hanken Grotesk /
                           JetBrains Mono; update scale to match DESIGN.md
src/tokens/spacing.ts    — no change
src/tokens/index.ts      — update theme shape to match new token names;
                           add chartColors: Record<AccountKind, string>
```

MD3 color token shape (subset):

```typescript
export const colors = {
  surface: "#10131a",
  surfaceContainerLowest: "#0b0e15",
  surfaceContainerLow: "#191b23",
  surfaceContainer: "#1d2027",
  surfaceContainerHigh: "#272a31",
  surfaceContainerHighest: "#32353c",
  onSurface: "#e1e2ec",
  onSurfaceVariant: "#c2c6d6",
  outline: "#8c909f",
  outlineVariant: "#424754",
  primary: "#adc6ff",
  onPrimary: "#002e6a",
  primaryContainer: "#4d8eff",
  secondary: "#4edea3",
  tertiary: "#ffb786",
  error: "#ffb4ab",
  // ... full set from DESIGN.md
};
```

Account color palette (10 values):

```typescript
export const accountColorPalette = [
  "#adc6ff", // primary blue
  "#4edea3", // secondary emerald
  "#ffb786", // tertiary gold
  "#ffb4ab", // error rose
  "#c084fc", // purple
  "#67e8f9", // cyan
  "#fde047", // yellow
  "#f9a8d4", // pink
  "#86efac", // lime green
  "#94a3b8", // slate
] as const;
```

Account icon set (lucide-react):

```typescript
export const accountIconSet = [
  "Wallet",
  "Home",
  "PiggyBank",
  "TrendingUp",
  "CreditCard",
  "Landmark",
  "Building2",
  "Banknote",
] as const;

export type AccountIcon = (typeof accountIconSet)[number];
```

### Shell & layout

```
src/layouts/AppLayout/
  AppLayout.tsx        — sidebar + content wrapper (no top bar)
  AppLayout.styles.ts  — StyledSidebar, StyledWordmark, StyledNav,
                         StyledNavItem, StyledNavSpacer, StyledMain,
                         StyledContent
```

Sidebar layout:

```
┌─────────────────────────────────────────────────────┐
│ Sidebar (220px fixed)  │  Content (flex 1, max 1200px) │
│                        │                               │
│  HORIZON               │  <page content>               │
│                        │                               │
│  Dashboard             │                               │
│  Outlook               │                               │
│                        │                               │
│  ─────────────         │                               │
│  Settings              │                               │
└─────────────────────────────────────────────────────┘
```

### Data model changes

```sql
-- New migration: add icon + color to accounts
ALTER TABLE accounts ADD COLUMN icon TEXT;
ALTER TABLE accounts ADD COLUMN color TEXT;

-- Remove isActive from recurring_transactions
-- (requires table recreation in SQLite — no ALTER DROP COLUMN)
```

Account type additions:

```typescript
// src/types/account.ts
interface Account {
  // ... existing fields
  icon: string | null; // lucide icon name
  color: string | null; // hex string
}
```

RecurringTransaction type removal:

```typescript
// src/types/recurring.ts — remove:
isActive: boolean;
```

### Features removed

- `src/features/milestones/` — deleted entirely
- `MilestoneTracker` removed from `DashboardPage`
- `useMilestones` hook deleted
- Server routes `GET/POST/DELETE /milestones` deleted
- `milestones` DB table migration kept for reference; down-migration added
- `isActive` column removed from `recurring_transactions`
- `onToggle` prop removed from `RecurringTransactionList`
- `toggleIsActive` removed from `useRecurringTransactions`

### Account icon + color UI

```
src/features/accounts/AccountCreateModal/
  AccountCreateModal.tsx  — add IconSelect + ColorSelect controls
  AccountCreateModal.styles.ts — StyledColorSwatch, StyledIconGrid

src/features/accounts/AccountOverview/
  AccountOverview.tsx  — render icon + color swatch per account row
```

- Icon select: grid of 8 icon buttons, selected state highlighted
- Color select: row of 10 circular color swatches, selected state with
  ring indicator
- Both optional; color random-default on mount

### Chosen approaches

- ✅ Full MD3 token adoption — faithful to the Stitch reference, richer
  semantic vocabulary
- ❌ Map Stitch values onto existing Meridian token names — loses MD3
  hierarchy, would require semantic compromises

- ✅ Left sidebar, fixed 220px — standard desktop app pattern, suits
  data-dense views
- ❌ Keep top bar — insufficient vertical nav for future growth, doesn't
  match reference

- ✅ Hanken Grotesk + JetBrains Mono — strong typographic distinction
  between UI text and financial data
- ❌ Keep Inter — misses the dual-font opportunity, less readable at
  dense data tables

- ✅ Per-kind chart color map — deterministic, semantically meaningful
- ❌ Index-based cycling palette — colors shift on account reorder

- ✅ Store icon name string + hex color — self-contained, palette changes
  don't break existing accounts
- ❌ Store palette index — fragile, breaks if palette order changes

- ✅ Random color default in create modal — accounts always get a color,
  zero friction
- ❌ No default (blank until chosen) — accounts render colorless until
  manually set

- ✅ Remove Milestone feature entirely — dead code, no AI engine behind it
- ❌ Keep behind a feature flag — adds complexity, no activation path

- ✅ Remove isActive entirely — no scheduling engine acts on the flag
- ❌ Resurface in edit modal as a toggle — keeps dead concept alive

## Implementation Plan

### Phase 1 — Token refresh

- Update `colors.ts` to full MD3 set
- Update `radius.ts` to Stitch spec
- Update `typography.ts` for Hanken Grotesk / JetBrains Mono
- Add `accountColorPalette` and `accountIconSet` to `tokens/index.ts`
- Add `chartColors` Record to theme
- Load Hanken Grotesk + JetBrains Mono from Google Fonts in `index.html`
- Update `GlobalStyle.ts` body font to Hanken Grotesk
- Fix any TypeScript errors from token name changes across all `.styles.ts`

### Phase 2 — Shell: sidebar layout

- Rewrite `AppLayout.tsx` + `AppLayout.styles.ts` to sidebar pattern
- Active nav item highlighted using `primaryContainer` tint
- Back button on Account Detail moves inside the sidebar or page header

### Phase 3 — Primitive restyle

- Restyle Button, Input, Select, Badge, Text, Heading, Spinner to new
  tokens
- Apply pill radius to Badge
- Apply 12px to Card, 8px to Button/Input

### Phase 4 — Feature removals

- Delete `src/features/milestones/` entirely
- Remove Milestone from `DashboardPage`
- Delete server milestone routes + service
- Remove `isActive` from recurring_transactions: DB migration, server,
  types, hooks, UI
- Write and run migration

### Phase 5 — Account icon + color

- DB migration: add `icon` + `color` columns to accounts
- Update Account type and server serialisation
- Add icon grid + color swatch picker to `AccountCreateModal`
- Render icon + color in `AccountOverview` account rows

### Phase 6 — Data surface restyle

- Apply Stitch row style to `TransactionList`, `RecurringTransactionList`,
  `PlanSummary`
- Apply 4px progress bar + semantic colors to `MilestoneTracker` removal
  site, `MortgageCountdown`
- Remap `TrajectoryHorizon` chart line colors to per-kind color map

### Phase 7 — Full view pass

- Dashboard: layout, spacing, card elevation
- Account Detail: layout, spacing, header
- Outlook (Plan): layout, spacing
- Settings / Storage: layout, spacing

## Trade-offs

**Easier:**

- MD3 token vocabulary is richer — elevation and state colors have
  explicit names rather than being improvised from the Meridian set
- Sidebar gives more vertical space to content vs top bar overhead
- Dual-font system makes numerical vs textual content immediately
  distinguishable without `font-variant-numeric`

**Harder:**

- Every `.styles.ts` file needs touching — old `theme.colors.bgBase`
  etc. all gone; TypeScript will surface every miss at compile time
- SQLite `ALTER TABLE ... DROP COLUMN` is not supported before SQLite
  3.35 — `recurring_transactions` table must be recreated to remove
  `isActive`
- Hanken Grotesk is not on all systems by default — must be loaded via
  Google Fonts (or bundled); adds a network dependency in dev, bundled
  in prod

**Out of scope:**

- Light mode / theme toggle
- Sidebar collapse / icon-only mode
- Animated transitions between nav states
- Account icon/color editing after creation (add-only in this phase)
- More than 8 account icons or 10 colors in this phase
