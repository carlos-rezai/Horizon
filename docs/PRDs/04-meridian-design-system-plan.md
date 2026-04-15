# Plan: Meridian Design System

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/22

## Architectural decisions

- **Routes**: no new routes — existing `/` and `/accounts/:id` are unchanged
- **Schema**: no schema changes — this is a pure frontend build
- **ThemeProvider**: wraps the router in `main.tsx`; all styled components access tokens via `props.theme`
- **Styling rule**: all visual values (colours, spacing, typography) come from theme tokens — no hardcoded values anywhere in styled components
- **Theme**: dark mode only; no light mode or theme switching in this phase
- **Typed theme**: `DefaultTheme` declared once in the styles directory; all styled components get full TypeScript autocomplete on `props.theme`
- **Test structure**: every primitive and component test file uses nested `describe` blocks — outer names the component, inner has `"unit"` (no user events) then `"interaction"` (at least one user event). Unit block always comes first

---

## Phase 1: Infrastructure + tokens

**User stories**: 1, 21, 22, 27, 28

### What to build

Install `styled-components`, `@types/styled-components`, and `lucide-react`. Build the complete token layer — colours, spacing, typography, and breakpoints — as plain TypeScript objects with no React dependency. Declare the `DefaultTheme` interface so every future styled component has full autocomplete. Write `GlobalStyle` to apply the CSS reset, dark body background, and Inter base font. Add Inter `<link>` tags to `index.html`. Mount `ThemeProvider` and `GlobalStyle` in `main.tsx` wrapping the existing router.

At the end of this phase the app is still functionally identical but visually different: the dark background and Inter font appear in the browser for the first time.

### Acceptance criteria

- [ ] `styled-components` and `lucide-react` are installed and TypeScript types resolve without errors
- [ ] Token files exist for colours, spacing, typography, and breakpoints
- [ ] The theme object is fully typed — accessing a non-existent token key is a TypeScript error
- [ ] `GlobalStyle` applies `box-sizing: border-box`, the dark base background colour, and Inter as the body font
- [ ] Inter loads in the browser via `index.html`
- [ ] `ThemeProvider` wraps the entire app in `main.tsx`
- [ ] All existing tests continue to pass

---

## Phase 2: Interactive primitives

**User stories**: 9, 10, 20

### What to build

Build `Button`, `Input`, and `Select` in `src/primitives/`. Each is a thin styled wrapper that forwards all native HTML attributes and derives every visual value from the theme. `Button` exposes a `variant` prop (`"primary"` | `"secondary"` | `"danger"`). All three have visible focus rings using the accent colour token. Each primitive has a co-located `.styles.ts` and `.test.tsx` using the nested unit / interaction describe structure.

These primitives are not yet used anywhere in the app — they exist as independently testable, importable units.

### Acceptance criteria

- [ ] `Button` renders in all three variants with visually distinct styles driven by theme tokens
- [ ] `Button` forwards `type`, `disabled`, `onClick`, and all other button attributes
- [ ] `Button` does not fire `onClick` when `disabled` is true
- [ ] `Input` and `Select` are visually consistent with each other
- [ ] `Input` and `Select` forward all native attributes including `aria-label` and `disabled`
- [ ] All three primitives show a visible focus ring on keyboard focus using the accent colour
- [ ] Unit and interaction tests pass for all three primitives

---

## Phase 3: Presentational primitives

**User stories**: 2, 3, 14, 15

### What to build

Build `Badge`, `Text`, `Heading`, and `Spinner` in `src/primitives/`. `Badge` accepts an `AccountKind` prop and renders a compact pill with a colour tint per kind. `Text` accepts a `size` prop mapped to the type scale and a `tabular` boolean for `font-variant-numeric: tabular-nums` on financial values. `Heading` accepts a `level` prop (1–4) that sets the default element and visual size. `Spinner` is an animated ring with `aria-label="Loading"` and a `size` prop.

`Badge` and `Spinner` get tests. `Text` and `Heading` are pure presentational wrappers with no logic — no tests needed.

### Acceptance criteria

- [ ] `Badge` renders the correct AccountKind label text
- [ ] `Badge` applies a distinct colour tint for each AccountKind
- [ ] `Text` with `tabular` prop applies `font-variant-numeric: tabular-nums`
- [ ] `Heading` renders the correct HTML element for each level
- [ ] `Spinner` renders with `aria-label="Loading"`
- [ ] Unit tests pass for `Badge` and `Spinner`
- [ ] All existing tests continue to pass

---

## Phase 4: Components

**User stories**: 11, 12, 13

### What to build

Build `FormField`, `Modal`, and `Card` in `src/components/`. `FormField` wraps a label (always visible above the input), a child input or select, and an optional `error` string rendered as an inline error message. `Modal` renders a dimmed full-screen overlay and a centred dialog container with `role="dialog"` and `aria-modal="true"`; clicking the overlay fires `onClose`. `Card` provides an elevated surface container using `color-bg-surface` with border-radius and spacing-token padding; an `elevated` prop switches to `color-bg-elevated`.

Each component has a co-located `.styles.ts` and `.test.tsx`.

### Acceptance criteria

- [ ] `FormField` renders the label above the input
- [ ] `FormField` renders the error message when the `error` prop is provided
- [ ] `FormField` renders no error slot when `error` is absent
- [ ] `Modal` renders with `role="dialog"` and `aria-modal="true"`
- [ ] `Modal` renders its children as content
- [ ] `Modal` calls `onClose` when the overlay is clicked
- [ ] `Modal` does not call `onClose` when the dialog content area is clicked
- [ ] `Card` renders children inside a styled surface container
- [ ] Unit and interaction tests pass for all three components

---

## Phase 5: AppLayout

**User stories**: 6, 7, 8

### What to build

Build `AppLayout` in `src/layouts/`. It renders a slim top bar containing the Horizon wordmark left-aligned. On any route other than `/`, a back arrow button (using `lucide-react`'s `ArrowLeft` icon) appears in the top bar and navigates to `/` on click. Below the top bar, page content is wrapped in a centred container constrained to 960px max-width with horizontal padding from spacing tokens. Wire `AppLayout` into `App.tsx` wrapping both routes.

### Acceptance criteria

- [ ] The Horizon wordmark appears in the top bar on both the dashboard and account detail routes
- [ ] The back arrow appears on `/accounts/:id` and is absent on `/`
- [ ] Clicking the back arrow navigates to `/`
- [ ] Page content is centred and does not exceed 960px on wide viewports
- [ ] The layout is usable at tablet and mobile viewport widths
- [ ] All existing tests continue to pass

---

## Phase 6: Apply Meridian to Dashboard

**User stories**: 4, 5, 16

### What to build

Apply Meridian to all components rendered on the dashboard route: `DashboardPage`, `AccountOverview`, `MortgageCountdown`, `MilestoneTracker`, and `AccountCreateModal`. Replace bare HTML elements with Meridian primitives (`Button`, `Heading`, `Text`, `Badge`, `Spinner`, `Card`, `Modal`, `FormField`). Fill all empty `.styles.ts` stubs for these components. Replace the bare `<p>Loading…</p>` and `<p>Error: …</p>` states with `Spinner` and a styled error message. Positive account balances use `color-positive`; negative balances (Mortgage, CreditCard) use `color-negative`.

No logic changes — only HTML elements and styles are updated.

### Acceptance criteria

- [ ] Dashboard renders with a fully styled layout using Meridian tokens
- [ ] Account balances use `color-positive` for assets and `color-negative` for liabilities
- [ ] Account kind labels render as `Badge` components
- [ ] Loading state shows `Spinner` instead of plain text
- [ ] `AccountCreateModal` uses the `Modal` component for its overlay and dialog
- [ ] `AccountCreateModal` form fields use `FormField`, `Input`, `Select`, and `Button`
- [ ] Dashboard is usable at tablet and mobile viewport widths
- [ ] All existing tests continue to pass (fix any that break due to semantic HTML changes in the same commit)

---

## Phase 7: Apply Meridian to AccountDetail

**User stories**: 17, 18, 19

### What to build

Apply Meridian to all components rendered on the account detail route: `AccountDetailPage`, `AccountDetailHeader`, `TransactionList`, `TransactionCreateModal`, `TransactionEditModal`, `TransferCreateModal`, `RecurringTransactionList`, `RecurringTransactionModal`, and `CategorySelect`. Replace bare HTML with Meridian primitives. Fill all remaining empty `.styles.ts` stubs. Inactive RecurringTransactions in the list are rendered with reduced opacity using the `color-text-muted` token. All amount displays use `Text` with `tabular` prop. The edit icon in `AccountDetailHeader` uses `lucide-react`'s `Pencil` icon; the delete button uses `Trash2`.

No logic changes — only HTML elements and styles are updated.

### Acceptance criteria

- [ ] Account detail page renders with a fully styled layout using Meridian tokens
- [ ] `AccountDetailHeader` shows the account name, an edit icon, and a guarded delete button
- [ ] Transaction list rows are visually separated and amounts use tabular figures
- [ ] Inactive RecurringTransactions appear visually dimmed relative to active ones
- [ ] All modals (`TransactionCreateModal`, `TransactionEditModal`, `TransferCreateModal`, `RecurringTransactionModal`) use the `Modal` component and Meridian form primitives
- [ ] `CategorySelect` uses `Select` and `Button` primitives
- [ ] Account detail page is usable at tablet and mobile viewport widths
- [ ] All existing tests continue to pass (fix any that break due to semantic HTML changes in the same commit)
- [ ] All `.styles.ts` stubs across the entire codebase are filled — no empty stub files remain
