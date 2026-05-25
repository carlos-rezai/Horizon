## Problem Statement

When a user has multiple accounts of the same kind (e.g., two Girokonto accounts), the Trajectory Horizon chart renders both lines in the same color, making it impossible to distinguish them at a glance. The Balance Summary Bar in the Month Overview shows all accounts side by side with no color differentiation. The `account.color` field already exists in the data model and is already applied in two surfaces — the account avatar in AccountOverview and the tab underline/text in MonthOverview Account Tabs — but the two most visually dense surfaces (the chart and the summary bar) ignore it entirely. The visual identity established by the account color picker is not reflected where it matters most.

## Solution

Apply `account.color` consistently to every surface where accounts appear side by side. Where `account.color` is null, fall back to the per-kind color from `chartColors` in `src/tokens/colors.ts` — the same fallback already used in AccountOverview and MonthOverview tabs. Introduce a new `Chip` primitive (pill-shaped, text-free) for use in the Balance Summary Bar. Update the Trajectory Horizon to color each chart line by account color rather than account kind.

## User Stories

1. As a user with two Girokonto accounts, I want each account's line in the Trajectory Horizon chart to have its own distinct color, so that I can tell them apart without reading the legend.
2. As a user, I want the Trajectory Horizon chart line color for an account to match the color I chose in AccountCreateModal, so that the visual identity is consistent across the app.
3. As a user who has not set a custom color on an account, I want the chart line to fall back to the per-kind chart color, so that something meaningful is always shown even without personalization.
4. As a user viewing the Month Overview Balance Summary Bar, I want each account to show a colored pill indicator before its name, so that I can orient myself at a glance without reading every label.
5. As a user, I want the colored pill in the Balance Summary Bar to use the same color as the account's avatar and tab underline, so that the visual language is coherent across every surface.
6. As a user without a custom account color, I want the Balance Summary Bar pill to fall back to the per-kind color, so that accounts are always differentiated even without personalization.
7. As a user setting up a new account, I want the 10-swatch color palette in AccountCreateModal to remain the only way to set an account color, so I cannot accidentally pick a color that clashes with the dark Meridian theme.
8. As a user who has set colors on all my accounts, I want every surface — avatar, tab underline, chart line, and balance bar pill — to show the same hex color, so that there is one authoritative color per account throughout the app.
9. As a developer building a future surface that displays accounts, I want a domain-agnostic `Chip` primitive that accepts a raw hex color, so I can add account color identity to new surfaces without leaking domain logic into the primitive layer.
10. As a user viewing the legend of the Trajectory Horizon chart, I want the legend color markers to match the chart line colors (account color with kind fallback), so the legend is accurate when accounts have custom colors.

## Implementation Decisions

### New Primitive: Chip

- A new `Chip` primitive lives at `src/primitives/Chip/` with three co-located files: `Chip.tsx`, `Chip.styles.ts`, `Chip.test.tsx`
- Props: `color: string` (explicit hex string) and `size?: 'sm' | 'md'` (default `'md'`)
- Pill-shaped, no text, no icon — purely a color indicator
- **Domain-agnostic**: `Chip` does not import `AccountKind`, `chartColors`, or any account type; the caller always resolves the final hex color including fallback
- Exported from `src/primitives/index.ts` alongside existing primitives
- `sm` is sized for inline use next to labels (Balance Summary Bar); `md` is for standalone emphasis

### Trajectory Horizon Update

- The `kindColor()` function (which maps `AccountKind` to `chartColors[kind]`) is replaced with an account-level color resolver: `account.color ?? chartColors[account.kind]`
- This resolver is applied to: each chart line `stroke`, the legend color marker, and any `data-color` attribute used for the custom tooltip
- No new data fetching or server changes — `account.color` is already present on the `AccountWithBalance` object the component receives
- Two accounts of the same kind with different colors will now render as distinct lines

### Balance Summary Bar Update

- Render `<Chip color={account.color ?? chartColors[account.kind]} size="sm" />` before each account name in the Balance Summary Bar in `MonthOverview`
- The Chip sits inline to the left of the account name label; the name label is unchanged
- Spacing follows the existing `StyledBalanceSummaryItem` flex layout
- Styled components changes are in `MonthOverview.styles.ts`

### Fallback Logic (canonical)

- `account.color ?? chartColors[account.kind]` is the single canonical fallback expression, identical across all three surfaces
- `chartColors` is the `Record<AccountKind, string>` already defined in `src/tokens/colors.ts`
- The fallback is always resolved at the call site — never inside `Chip` or any primitive

### No Changes To

- `account.color` database column — already exists, no migration needed
- AccountCreateModal color picker — 10-swatch palette stays as-is; no new picker UI
- `Badge` primitive — kind-semantic text pills; data contract is different and independent
- `AccountDetailPage` — single-account view; no color accent needed
- Transaction list rows — no cross-account list view exists yet
- Server-side routes or storage — purely a frontend change

## Testing Decisions

A good test verifies external behavior: what the component renders and what the user sees. Tests must not inspect implementation details like internal function names, styled-component class hashes, or inline CSS property strings directly.

### Chip (new — test in full isolation)

- Renders without error given a valid hex color and no size
- Renders without error given a hex color and `size="sm"` or `size="md"`
- The rendered element has a background-color that matches the supplied hex color
- Prior art: `Badge.test.tsx` — renders the badge and asserts on its structure

### TrajectoryHorizon (existing tests — update to cover new behavior)

- A chart rendered with an account that has a custom `color` applies that color to the chart line (not the kind fallback)
- A chart rendered with an account whose `color` is `null` applies `chartColors[account.kind]` as the line color
- Two accounts of the same kind but different `color` values produce two lines of different colors
- Prior art: `TrajectoryHorizon.test.tsx` already sets up account fixtures — extend them with `color` populated and verify the rendered output

### MonthOverview (existing tests — extend)

- The Balance Summary Bar renders one `Chip` per account
- Each `Chip` receives the correct resolved color (`account.color` when set, `chartColors[kind]` fallback when null)
- Prior art: `MonthOverview.test.tsx` already renders the component with mock accounts — add assertions on Chip presence and color prop

## Out of Scope

- A free color wheel or any color picker beyond the existing 10-swatch palette
- Transaction list row color accents — no cross-account list view exists yet
- AccountDetailPage color accents — single-account view needs no differentiation
- Badge refactor — different data contract, unnecessary coupling
- Expanding the palette beyond 10 swatches
- Any AccountCreateModal changes
- Any server, API, or database changes

## Further Notes

- `account.color` and the 10-swatch picker were introduced as part of the Monthly Ledger feature (design log 14). This feature closes the remaining two surfaces that still ignore the field.
- The `Chip` primitive is intentionally minimal — it is a building block for account color identity today and potentially for other color-coded indicators in future features.
- The `sm` Chip in the Balance Summary Bar should feel lightweight next to the account name — visually close to the tab underline thickness already used in MonthOverview Account Tabs.
