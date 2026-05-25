# Plan: Account Color Identity

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/111

## Architectural decisions

- **No schema or API changes** — `account.color` already exists on `AccountWithBalance`; this is a purely frontend change
- **Canonical fallback expression** — `account.color ?? chartColors[account.kind]` is the single resolver used identically across all surfaces; fallback logic always lives at the call site, never inside `Chip`
- **Chip is domain-agnostic** — it accepts a raw hex string and knows nothing about `AccountKind` or `chartColors`
- **Marker testid shape change** — `data-testid` on TrajectoryHorizon color markers moves from `chart-line-${kind}` to `chart-line-${id}` to correctly support multiple accounts of the same kind

---

## Phase 1: Chip primitive

**User stories**: #9

### What to build

A new `Chip` primitive at `src/primitives/Chip/` with three co-located files (`Chip.tsx`, `Chip.styles.ts`, `Chip.test.tsx`). Props are `color: string` (hex) and `size?: 'sm' | 'md'` (default `'md'`). Pill-shaped, no text, no icon. Exported from `src/primitives/index.ts`. No domain wiring in this phase — just the component in isolation.

### Acceptance criteria

- [ ] `Chip` renders a pill-shaped element given a hex `color` and no `size`
- [ ] `Chip` renders correctly for both `size="sm"` and `size="md"`
- [ ] The rendered element's background color reflects the supplied hex string
- [ ] `Chip` is exported from `src/primitives/index.ts`
- [ ] `Chip` imports nothing from `types/account`, `tokens/colors`, or any feature layer
- [ ] All three files (`Chip.tsx`, `Chip.styles.ts`, `Chip.test.tsx`) are co-located in `src/primitives/Chip/`

---

## Phase 2: Trajectory Horizon account color

**User stories**: #1, #2, #3, #10

### What to build

Replace the `kindColor()` resolver in `TrajectoryHorizon` with an account-level color resolver: `account.color ?? chartColors[account.kind]`. Apply it to chart line strokes, the custom tooltip row colors, and the hidden color-marker `<span>` elements used for test assertions. Move the marker `data-testid` from `chart-line-${kind}` to `chart-line-${id}` so two same-kind accounts each get a unique, queryable marker. Update all affected tests in `TrajectoryHorizon.test.tsx` to use the new testid shape and assert on account color vs. kind fallback behavior.

### Acceptance criteria

- [ ] A chart line for an account with `color` set uses that hex value as its stroke color
- [ ] A chart line for an account with `color: null` falls back to `chartColors[account.kind]`
- [ ] Two accounts of the same kind with different `color` values produce two chart lines with different colors
- [ ] The tooltip row for an account with `color` set uses that hex value for its text color
- [ ] The hidden color-marker `data-testid` is `chart-line-${account.id}` (not `chart-line-${account.kind}`)
- [ ] The hidden color-marker `data-color` reflects `account.color ?? chartColors[account.kind]`
- [ ] All existing TrajectoryHorizon tests pass (updated to the new testid shape)

---

## Phase 3: Balance Summary Bar Chip

**User stories**: #4, #5, #6, #7, #8

### What to build

Wire `<Chip size="sm" color={account.color ?? chartColors[account.kind]} />` before each account name in the Balance Summary Bar inside `MonthOverview`. Adjust `StyledBalanceSummaryItem` flex layout in `MonthOverview.styles.ts` to accommodate the inline Chip. Extend `MonthOverview.test.tsx` with assertions that each account in the bar renders a Chip and that the Chip receives the correct resolved color.

### Acceptance criteria

- [ ] The Balance Summary Bar renders one `Chip` per account
- [ ] Each `Chip` receives `account.color` when the account has a color set
- [ ] Each `Chip` receives `chartColors[account.kind]` when `account.color` is null
- [ ] The `Chip` appears visually before the account name in each balance item
- [ ] `MonthOverview` layout accommodates the Chip without breaking the existing balance label and value layout
- [ ] MonthOverview tests assert on Chip presence and correct `color` prop for both the set and fallback cases
