# Design Log 04 — Meridian Design System

## Background

The account and transaction UI (phase 3) is fully built and tested but
renders completely unstyled HTML. All `.styles.ts` files are empty stubs.
`styled-components` is not yet installed. `src/tokens/`, `src/primitives/`,
`src/components/`, `src/styles/`, and `src/assets/` are all empty.

Horizon is a portfolio project. Visual quality and design system architecture
are both part of what it demonstrates. The design system needs to be designed
deliberately before any styled-components code is written.

## Problem

Design the Meridian design system: its visual language, token set, primitive
and component scope, layout approach, styling infrastructure, and build order.

## Questions and Answers

**Q1: What is Meridian?**
A custom design system built specifically for Horizon. Named to give the
project a distinct identity and demonstrate design system architecture.

**Q2: What is the visual mood?**
Calm and considered — clean sans-serif type, generous whitespace, muted
palette with a single accent colour. Suits a long-term personal finance
tool; not a trading terminal.

**Q3: Light mode, dark mode, or both?**
Dark mode only. Light mode and a theme toggle are deferred as a future
feature. A dark UI reads as considered and modern for this use case.

**Q4: What is the colour palette?**

- `color-bg-base`: `#0F1117` — page background
- `color-bg-surface`: `#1A1D27` — card / modal surfaces
- `color-bg-elevated`: `#252836` — elevated surfaces, dropdowns
- `color-border`: `#2E3247` — borders, dividers
- `color-text-primary`: `#F0F2F8` — primary text
- `color-text-muted`: `#8B90A7` — secondary / muted text
- `color-accent`: `#4A9EFF` — interactive elements, focus rings, links
- `color-positive`: `#4CAF7D` — income, assets, positive values
- `color-negative`: `#E05C5C` — liabilities, outflows, negative values

**Q5: What typeface and scale?**
Inter, loaded via `<link>` in `index.html`. Six-step scale:
12 / 14 / 16 / 20 / 24 / 32px. Tabular figures
(`font-variant-numeric: tabular-nums`) on all balance and amount displays
so columns align.

**Q6: What is the spacing system?**
4px base grid. Tokens named by multiplier: `space1` = 4px through
`space16` = 64px. Common steps in practice: `space2` (8px), `space4`
(16px), `space6` (24px).

**Q7: What are the breakpoints and responsive strategy?**
Three breakpoints: `sm` = 480px, `md` = 768px, `lg` = 1024px.
Target viewport is a minimised browser window (tablet / mobile scale).
Single-column layout on mobile. Modals remain centred overlays — no
bottom sheet in this phase.

**Q8: What primitives are in scope?**
Button (primary / secondary / danger variants), Input, Select, Badge,
Text/Heading, Spinner. Nothing else — no Checkbox, Radio, Tooltip, etc.

**Q9: What components are in scope?**
FormField (label + input/select + error), Modal (overlay + dialog
container), Card (elevated surface container). `BalanceCard` from
CLAUDE.md examples is folded into the generic Card — balance display
logic belongs in features, not in components.

**Q10: What does the layout look like?**
Single `AppLayout` — slim top bar with the Horizon wordmark. Back arrow
appears on `/accounts/:id` and navigates to `/`. Page content constrained
to `960px` max-width, centred, horizontally padded with spacing tokens.
No sidebar.

**Q11: How is styled-components wired up?**
ThemeProvider at root in `main.tsx`. GlobalStyle (via `createGlobalStyle`)
handles CSS reset, `box-sizing: border-box`, body background, and base
font. `DefaultTheme` interface declared in `src/styles/theme.d.ts` for
full TypeScript autocomplete on `props.theme` everywhere.

**Q12: What is the build order?**
Top-down: tokens → primitives → components → layout → apply to features.
Dashboard styled first, then AccountDetail. Each layer is independently
demonstrable before the next begins.

**Q13: How are primitive/component tests structured?**
Each test file uses nested `describe` blocks. The outer block names the
component. Inside: a `"unit"` describe (no user events — static rendering,
props, aria attributes) followed by an `"interaction"` describe (at least
one user event per test). Unit block always comes first.

**Q14: What icon library is used?**
`lucide-react` — lightweight, tree-shakeable, stroke-based style consistent
with the Meridian aesthetic. Minimum icons needed: back arrow, edit pencil,
trash/delete. Installed as a runtime dependency.

## Design

### Token structure

```
src/tokens/
  colors.ts       — all colour values as named constants
  spacing.ts      — space1–space16 (4px–64px)
  typography.ts   — font family, size scale, line heights, weights
  breakpoints.ts  — sm / md / lg px values + media query helpers
  index.ts        — re-exports everything; assembles the theme object
```

```typescript
// src/tokens/index.ts (shape)
export const theme = {
  colors: { ... },
  spacing: { ... },
  typography: { ... },
  breakpoints: { ... },
};

export type MeridianTheme = typeof theme;
```

```typescript
// src/styles/theme.d.ts
import type { MeridianTheme } from "../tokens";
declare module "styled-components" {
  export interface DefaultTheme extends MeridianTheme {}
}
```

### Primitives

```
src/primitives/
  Button/
    Button.tsx          — variant prop: "primary" | "secondary" | "danger"
    Button.styles.ts
    Button.test.tsx
  Input/
    Input.tsx           — thin wrapper; passes all HTMLInputElement props
    Input.styles.ts
    Input.test.tsx
  Select/
    Select.tsx          — thin wrapper; passes all HTMLSelectElement props
    Select.styles.ts
    Select.test.tsx
  Badge/
    Badge.tsx           — renders account kind label
    Badge.styles.ts
    Badge.test.tsx      — presentational only; no interaction tests needed
  Text/
    Text.tsx            — size prop aligns to type scale; as prop for element
    Text.styles.ts
  Heading/
    Heading.tsx         — level prop: 1–4; as prop for element override
    Heading.styles.ts
  Spinner/
    Spinner.tsx         — aria-label="Loading"
    Spinner.styles.ts
    Spinner.test.tsx
```

Note: Text and Heading are pure presentational wrappers — no behaviour to
test, no test files needed.

### Components

```
src/components/
  FormField/
    FormField.tsx       — label, children (Input/Select), optional error
    FormField.styles.ts
    FormField.test.tsx
  Modal/
    Modal.tsx           — overlay + dialog; onClose on overlay click
    Modal.styles.ts
    Modal.test.tsx
  Card/
    Card.tsx            — surface container; optional padding/radius props
    Card.styles.ts
    Card.test.tsx       — unit only; no interaction needed
```

### Layout

```
src/layouts/
  AppLayout/
    AppLayout.tsx       — ThemeProvider + GlobalStyle + top bar + content
    AppLayout.styles.ts
```

### Styling infrastructure

```
src/styles/
  GlobalStyle.ts        — createGlobalStyle: reset, box-sizing, body bg, font
  theme.d.ts            — DefaultTheme declaration
```

Inter loaded in `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
```

### Chosen approaches

- ✅ Custom design system — demonstrates architecture, full control over tokens
- ❌ Existing component library (MUI, Chakra) — hides the design work, wrong for a portfolio

- ✅ Dark mode only — focused, appropriate for the tool, keeps scope tight
- ❌ Both themes — doubles visual design work, no functional benefit at this stage

- ✅ ThemeProvider with typed DefaultTheme — standard production pattern, full autocomplete
- ❌ CSS custom properties only — would bypass styled-components theme system

- ✅ Top-down build order — clean commits, each layer demonstrable independently
- ❌ Feature-by-feature — risks inconsistency mid-build

- ✅ lucide-react — lightweight, consistent stroke style, MIT licensed
- ❌ Inline SVGs — verbose, harder to maintain

- ✅ Centred modal overlays on mobile — simpler, acceptable at this scale
- ❌ Bottom sheets on mobile — Meridian v2 concern, not warranted now

## Implementation Plan

### Phase 1 — Tokens + styled-components infrastructure

- Install `styled-components` and `@types/styled-components` and `lucide-react`
- Build all token files (`colors.ts`, `spacing.ts`, `typography.ts`,
  `breakpoints.ts`, `index.ts`)
- Write `src/styles/GlobalStyle.ts` and `src/styles/theme.d.ts`
- Add Inter `<link>` tags to `index.html`
- Mount `ThemeProvider` and `GlobalStyle` in `main.tsx`
- No visual change yet — infrastructure only

### Phase 2 — Primitives

- Build Button, Input, Select, Badge, Text, Heading, Spinner in order
- Each gets its own `.tsx`, `.styles.ts`, and `.test.tsx` (where applicable)
- Tests follow the unit / interaction nested describe structure

### Phase 3 — Components

- Build FormField, Modal, Card
- Each gets `.tsx`, `.styles.ts`, `.test.tsx`

### Phase 4 — Layout

- Build `AppLayout` with top bar, wordmark, conditional back arrow, and
  960px content wrapper
- Wire into `App.tsx` wrapping both routes

### Phase 5 — Apply to Dashboard

- Replace bare HTML in `DashboardPage`, `AccountOverview`,
  `MortgageCountdown`, `MilestoneTracker`, `AccountCreateModal` with
  Meridian primitives and components
- Fill in all `.styles.ts` stubs in `src/features/accounts/`,
  `src/features/mortgage/`, `src/features/milestones/`

### Phase 6 — Apply to AccountDetail

- Replace bare HTML in `AccountDetailPage`, `AccountDetailHeader`,
  `TransactionList`, `TransactionCreateModal`, `TransactionEditModal`,
  `TransferCreateModal`, `RecurringTransactionList`,
  `RecurringTransactionModal`, `CategorySelect`
- Fill in all remaining `.styles.ts` stubs

## Trade-offs

**Easier:**

- Token-based styling means colour and spacing changes are global and instant
- Typed theme gives autocomplete — no magic strings in styled components
- Top-down build means each primitive is reusable before features touch it

**Harder:**

- styled-components adds a build-time dependency and slightly increases
  bundle size vs plain CSS
- Applying Meridian to features (phases 5–6) touches many files — risk
  of regressions in existing tests if aria attributes or roles change

**Out of scope:**

- Light mode / theme toggle
- Animation and transition tokens
- Bottom sheet modals on mobile
- Icon system beyond the three minimum icons
- Storybook or any component documentation tool
