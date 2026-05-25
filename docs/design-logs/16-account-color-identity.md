# 16 — Account Color Identity

## Background

`account.color` (hex string, nullable) already exists in the data model and is persisted
to SQLite. A 10-swatch color picker is present in `AccountCreateModal`. Color is already
applied in two places: the account avatar background in `AccountOverview` and the tab
underline/text color in `MonthOverview`. The feature is incomplete because several primary
surfaces still ignore `account.color` entirely.

## Problem

Account color is not applied consistently. The most visible gap is `TrajectoryHorizon`,
which maps chart line colors by `AccountKind` — two accounts of the same kind render
identically. The Balance Summary Bar in `MonthOverview` shows all accounts side-by-side
with no color differentiation. A general-purpose colored indicator primitive is also missing.

## Questions and Answers

**Q1: Should TrajectoryHorizon switch from kind-based to account-color-based line colors?**
Yes. Kind-based colors break as soon as a user has two accounts of the same type.
Fallback to kind-based `chartColors` for accounts with `color: null`.

**Q2: Should we add a full color wheel to AccountCreateModal?**
No. The 10-swatch palette is calibrated for the dark Meridian theme. A free color picker
risks unreadable or clashing colors. 10 swatches is sufficient for a typical 3–6 account
setup. Palette stays at 10.

**Q3: Should individual transaction rows carry a color accent?**
No — not yet. In `MonthOverview` the user is already filtered to one account via the tab;
the tab is the color indicator. A cross-account transaction view does not exist yet.

**Q4: Should the Balance Summary Bar get a color indicator per account?**
Yes. A `Chip` (pill-shaped, no text) before each account name. The bar is the one surface
where all accounts appear side-by-side, so differentiation adds orientation value.

**Q5: Should `Badge` be refactored to also render as a color-only pill?**
No — overhead. `Badge` derives color from `AccountKind` semantically; `Chip` takes a raw
hex string. Different data contracts. Keep them separate.

**Q6: What does the new indicator primitive look like?**
Pill shape, no text. Props: `color` (hex string), `size` (sm | md, with defaults).
Named `Chip` — `Badge` already exists for text-label kind pills.

**Q7: Fallback color for accounts with `color: null`?**
Kind-based color from `chartColors` in `src/tokens/colors.ts`. Consistent with the
existing fallback already used in `AccountOverview` and `MonthOverview`.

**Q8: Expand the color palette beyond 10 swatches?**
No. Keep 10. A typical user has 3–6 accounts; 10 is already more than sufficient.

## Design

### New primitive: `Chip`

```
src/primitives/Chip/
  Chip.tsx
  Chip.test.tsx
  Chip.styles.ts
```

```typescript
interface ChipProps {
  color: string; // hex color string
  size?: "sm" | "md"; // default: 'md'
}
```

✅ General-purpose pill primitive, no domain knowledge, no text  
❌ Extending `Badge` — different data contract (kind-derived vs. explicit hex)  
❌ Color wheel in AccountCreateModal — risks theme-incompatible colors

### TrajectoryHorizon chart update

**File:** `src/features/projection/TrajectoryHorizon/TrajectoryHorizon.tsx`

Replace `kindColor()` (which maps `AccountKind → chartColors[kind]`) with a function
that reads `account.color ?? chartColors[account.kind]`.

✅ Account color drives line color; kind color is fallback  
❌ Kind-based only — breaks with multiple same-kind accounts

### Balance Summary Bar update

**File:** `src/features/months/MonthOverview/MonthOverview.tsx` + `.styles.ts`

Render `<Chip color={account.color ?? chartColors[account.kind]} size="sm" />` before
each account name in the balance summary bar.

✅ Chip before account name — lightweight, consistent with tab color below  
❌ Colored left border on each row — heavier visual, less flexible

### No changes to

- `AccountDetailPage` — single-account focused view; no color accent needed
- `Badge` — kind-semantic text pills; stays independent
- Transaction list rows — no cross-account context yet
- `AccountCreateModal` color picker — 10-swatch palette stays as-is
- `account.color` data model — field already exists

## Implementation Plan

**Phase 1 — Chip primitive**  
Create `src/primitives/Chip/` with `Chip.tsx`, `Chip.styles.ts`, `Chip.test.tsx`.
Export from primitives index. No domain wiring yet — just the component in isolation.

**Phase 2 — TrajectoryHorizon account color**  
Update `TrajectoryHorizon.tsx` to use `account.color ?? chartColors[account.kind]`
for each chart line. Remove or replace `kindColor()`.

**Phase 3 — Balance Summary Bar Chip**  
Wire `<Chip>` into the Balance Summary Bar in `MonthOverview`. Each account row gets
a `Chip` colored with `account.color ?? chartColors[account.kind]`.

## Trade-offs

**Easier:** All surfaces now share one fallback logic (`account.color ?? chartColors[kind]`),
making future additions consistent by default.

**Harder:** Accounts without a custom color now share a color with all same-kind accounts
in the chart — the kind fallback is less distinctive than a unique per-account color.
Mitigated by the color picker encouraging users to set a color on account creation.

**Ruled out of scope:**

- Color wheel — theme safety risk
- Transaction row color accents — no cross-account list view exists yet
- AccountDetailPage color accent — decoration without orientation value
- Badge refactor — different data contract, unnecessary coupling
