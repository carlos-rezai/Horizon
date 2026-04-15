## Problem Statement

Horizon is fully functional — all backend logic, data models, and frontend features are built and tested — but the app renders completely unstyled HTML. Every component outputs bare `<div>`, `<ul>`, `<input>`, and `<button>` elements with no visual treatment. There are no colours, no typography, no spacing, no layout chrome. The `.styles.ts` files are all empty stubs. `styled-components` is not installed.

As a result, the app is not presentable as a portfolio project, and the UI layer defined in CLAUDE.md (`src/tokens/`, `src/primitives/`, `src/components/`, `src/layouts/`) does not yet exist.

## Solution

Build Meridian — a custom dark-mode design system for Horizon — from tokens up, then apply it to every existing feature. The system establishes a typed theme (colours, spacing, typography, breakpoints), a set of six atomic primitives, three composed components, and a shared page layout. Once the system exists, every feature component is updated to use it, replacing bare HTML with Meridian primitives and filling all empty `.styles.ts` stubs.

The result is a visually complete, responsive app that demonstrates both design system architecture and applied UI engineering.

## User Stories

1. As a user, I want the app to have a dark background and light text so that it is comfortable to read in low-light conditions.
2. As a user, I want all financial balances and amounts to be displayed in a consistent number format so that figures are easy to scan and compare.
3. As a user, I want all monetary values to use tabular figures so that numbers in lists and tables align in columns.
4. As a user, I want positive values (income, assets) and negative values (liabilities, outflows) to be visually distinct so that I can identify financial polarity at a glance.
5. As a user, I want the app to be usable on a tablet or mobile-sized browser window so that I can check balances and record transactions on any device.
6. As a user, I want a consistent top bar on every page showing the Horizon wordmark so that I always know which app I am in.
7. As a user, I want a back arrow in the top bar on the account detail page so that I can return to the dashboard without using the browser back button.
8. As a user, I want page content to be centred and width-constrained so that the layout does not stretch uncomfortably on wide screens.
9. As a user, I want all buttons to have clear visual hierarchy — primary actions stand out, secondary actions are subdued, danger actions are visually distinct — so that I understand what each button does before clicking.
10. As a user, I want all form inputs to have a consistent visual style so that forms feel cohesive and professional.
11. As a user, I want form fields to display their label and any validation error in a consistent layout so that errors are easy to spot.
12. As a user, I want modals to appear over a dimmed overlay so that the background context is clear while I focus on the modal task.
13. As a user, I want to be able to close a modal by clicking the overlay so that dismissal is intuitive.
14. As a user, I want account kind labels (Girokonto, Tagesgeld, Mortgage, etc.) to be displayed as styled badges so that account types are visually scannable in the account list.
15. As a user, I want loading states to show a spinner rather than plain text so that the app feels responsive while data is fetching.
16. As a user, I want the dashboard to use a card-based layout for the account overview, Mortgage Countdown, and Milestone Tracker so that each section is visually contained.
17. As a user, I want the account detail page to have a clear header with the account name and actions so that I can identify which account I am viewing.
18. As a user, I want the transaction list to have clear visual separation between rows so that individual transactions are easy to distinguish.
19. As a user, I want Inactive RecurringTransactions to appear visually dimmed in the recurring transaction list so that I can distinguish Active from Inactive entries.
20. As a user, I want interactive elements (buttons, links, inputs) to have visible focus rings so that keyboard navigation is accessible.
21. As a developer, I want a typed theme object injected via ThemeProvider so that I can access any design token in a styled component via props.theme with full TypeScript autocomplete.
22. As a developer, I want all colour, spacing, and typography values to come from named tokens so that visual changes are made in one place and propagate everywhere.
23. As a developer, I want a set of primitive components (Button, Input, Select, Badge, Text, Heading, Spinner) so that I never write inline styles or hardcode design values in feature components.
24. As a developer, I want a FormField component that composes a label, input, and error message so that every form field is consistent without duplicating structure.
25. As a developer, I want a Modal component that handles overlay, centering, and dialog semantics so that feature modals only need to provide their content.
26. As a developer, I want a Card component that provides an elevated surface container so that feature components do not hardcode background colours or border-radius.
27. As a developer, I want breakpoint tokens and media query helpers so that responsive styles are written consistently across the codebase.
28. As a developer, I want Inter loaded via index.html so that the font is available globally without per-component imports.

## Implementation Decisions

**Styling infrastructure**

- `styled-components` and `@types/styled-components` installed as dependencies
- `lucide-react` installed for icons (back arrow, edit pencil, trash/delete)
- A `DefaultTheme` interface declared once in the styles directory, extending the shape of the token object — all styled components get full autocomplete on `props.theme`
- `ThemeProvider` mounted at the root, wrapping the entire app
- `GlobalStyle` (via `createGlobalStyle`) handles CSS reset, `box-sizing: border-box`, body background colour, and base font family. Mounted inside `ThemeProvider`
- Inter loaded via `<link>` tags in `index.html`

**Token layer**

- `colors.ts` — all named colour constants matching the Meridian palette
- `spacing.ts` — `space1` (4px) through `space16` (64px), 4px base grid
- `typography.ts` — Inter family, six-step size scale (12/14/16/20/24/32px), line heights, weights (400/500/600)
- `breakpoints.ts` — `sm` (480px), `md` (768px), `lg` (1024px) plus media query helper functions
- `index.ts` — assembles and re-exports the complete theme object and `MeridianTheme` type
- Token layer has no React dependency — plain TypeScript objects usable in tests and non-React contexts

**Primitives**

- `Button` — `variant` prop: `"primary"` (accent fill) | `"secondary"` (ghost/outline) | `"danger"` (muted red). Forwards all standard button HTML attributes
- `Input` — thin styled wrapper; forwards all HTMLInputElement props. Visually consistent across `type="text"`, `type="number"`, `type="date"`
- `Select` — thin styled wrapper; forwards all HTMLSelectElement props; visually matches Input
- `Badge` — renders an AccountKind label in a compact pill; applies a colour tint per kind
- `Text` — `size` prop maps to the type scale; `as` prop for element override; `tabular` boolean prop for `font-variant-numeric: tabular-nums` on financial values
- `Heading` — `level` prop (1–4) sets default element and visual size; `as` prop for override
- `Spinner` — centred animated ring with `aria-label="Loading"`; `size` prop (small / medium / large)

**Components**

- `FormField` — wraps a label, a child input or select, and an optional `error` string. Label always visible above the input
- `Modal` — renders a dimmed full-screen overlay and a centred dialog container. `onClose` fired on overlay click. Applies `role="dialog"` and `aria-modal="true"`. Renders children as content
- `Card` — surface container with `color-bg-surface` background, border-radius, and spacing-token padding. Optional `elevated` prop for `color-bg-elevated` background

**Layout**

- Single `AppLayout` wrapping both routes. Mounts `ThemeProvider` and `GlobalStyle`. Renders a slim top bar with the Horizon wordmark and a conditional back arrow (using `lucide-react ArrowLeft`) on non-dashboard routes. Page content constrained to 960px max-width, centred, padded with spacing tokens

**Applying to features**

- All feature `.styles.ts` stubs filled in using Meridian primitives and tokens
- Feature component logic, props, and existing test assertions are not changed unless a test breaks due to a semantic HTML change — in which case the fix lands in the same commit
- Dashboard loading/error states replace bare `<p>` text with `Spinner` and a styled error message

**Build order**
Top-down: tokens → primitives → components → layout → apply to Dashboard → apply to AccountDetail

## Testing Decisions

**What makes a good test:** assert on observable external behaviour — what renders, what aria attributes are present, what callbacks fire. Never assert on CSS class names, styled-components internals, or implementation details.

**Test structure:** every primitive and component test file uses nested `describe` blocks. Outer block names the component. Inner blocks: `"unit"` (static rendering, no user events) followed by `"interaction"` (at least one `fireEvent` or `userEvent` per test). Unit block always comes first.

**Primitives with tests:**

- `Button` — unit: renders children, correct `type`, `disabled` attribute when prop set; interaction: `onClick` fires on click, `onClick` does not fire when disabled
- `Input` — unit: renders with `aria-label`, `disabled` when prop set; interaction: `onChange` fires with new value
- `Select` — unit: renders with `aria-label`, `disabled` when prop set; interaction: `onChange` fires on selection change
- `Badge` — unit only: renders the AccountKind label text
- `Spinner` — unit: renders with `aria-label="Loading"`

**Primitives without tests:** `Text` and `Heading` are pure presentational wrappers with no logic to assert on.

**Components with tests:**

- `FormField` — unit: renders label text, renders error when `error` prop provided, no error slot when `error` absent
- `Modal` — unit: renders with `role="dialog"` and `aria-modal="true"`, renders children; interaction: calls `onClose` on overlay click, does not call `onClose` on dialog content click
- `Card` — unit only: renders children

**Prior art:** `AccountCreateModal.test.tsx`, `CategorySelect.test.tsx` — same Vitest + `@testing-library/react` pattern, `vi.spyOn(globalThis, 'fetch')` for API mocking

## Out of Scope

- Light mode and theme toggle
- Animation and transition tokens
- Bottom sheet modals on mobile
- Icons beyond back arrow, edit pencil, and trash/delete
- Storybook or any component documentation tooling
- Visual regression testing
- Any changes to backend, API contracts, or data models
- New features or behaviour changes in any existing feature component

## Further Notes

When applying Meridian to feature components, the rule is: replace HTML elements with Meridian primitives, fill `.styles.ts` stubs, do not change component logic or props. If an existing test breaks because a semantic HTML change altered an aria attribute or role, fix the test in the same commit.

The token layer is framework-agnostic — it exports plain TypeScript constants that can be imported anywhere without React.
