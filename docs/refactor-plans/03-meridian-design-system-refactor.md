## Problem Statement

The Meridian token layer was designed to be the single source of truth for all
visual values — the explicit goal being that a future theme swap requires no
manual search outside `src/tokens/`. In practice, the token layer is incomplete.
Several styled components contain hardcoded values that duplicate or approximate
theme constants: hex colors in Badge, magic numbers for border-radius across
primitives and components, layout dimensions in AppLayout and feature modal
styles, animation timing in Button and Spinner, and a modal overlay color in
Modal. A second issue is that Badge uses a `data-*` attribute pattern for
conditional styling while every other component uses `$`-prefixed transient
props — an inconsistency that is surprising in a design system context. The
Badge test file also deviates from the unit/interaction grouping structure
specified in the design log, and its second test group asserts on the
`data-kind` DOM attribute — an implementation detail that will need to be
removed as part of this refactor.

## Solution

Complete the token layer by adding three new token files (radius, layout,
transitions) and extending the color palette with an overlay color, a warning
color for CreditCard, and explicit tint color variants for all five account
kind badge backgrounds. Wire all additions into the theme index so they are
available via `props.theme.*` everywhere. Then work top-down through the
design system — Badge, Modal, primitives, Card, Spinner, AppLayout, feature
modal styles — replacing every hardcoded value with its corresponding token.
Standardise Badge to use `$kind` transient props in line with all other
components, and restructure its test file to the unit/interaction pattern.

## Commits

**Commit 1 — Extend the color token set**

Add `overlay`, `warning`, and five `*Tint` color entries to `colors.ts`:
`accentTint`, `positiveTint`, `negativeTint`, `warningTint`, and `mutedTint`.
Each tint is the explicit `rgba()` value (15% opacity of its base color) rather
than computed at runtime. No other files change in this commit. The token layer
compiles; nothing visual changes.

**Commit 2 — Add radius token file**

Create `src/tokens/radius.ts` with a three-tier named scale:
`sm: 4`, `md: 6`, `lg: 8`. Wire it into `src/tokens/index.ts` and re-export
it. No consumer changes yet.

**Commit 3 — Add layout token file**

Create `src/tokens/layout.ts` with `topBarHeight: 56`,
`contentMaxWidth: 960`, `modalWidth: 400`, and `narrowModalWidth: 360`.
Wire into index. No consumer changes yet.

**Commit 4 — Add transitions token file**

Create `src/tokens/transitions.ts` with `fast: "0.15s ease"`,
`normal: "0.3s ease"`, and `spinDuration: "0.7s"`. Wire into index.
No consumer changes yet.

**Commit 5 — Badge: switch to `$kind` transient prop and theme color tokens**

Rewrite `Badge.tsx` to pass `$kind={kind}` instead of `data-kind={kind}`.
Rewrite `Badge.styles.ts` to type the styled component with `{ $kind: AccountKind }`,
remove the static `kindColors` map, and use inline prop interpolation to return
the correct `theme.colors.*Tint` background and `theme.colors.*` text color for
each kind. Replace the hardcoded `4px` border-radius with `theme.radius.sm`.
Rewrite `Badge.test.tsx` to follow the unit/interaction nested describe structure:
one `"unit"` describe block containing one render-and-label test per account
kind. Remove the second describe block entirely — asserting on `data-kind` was
an implementation detail and the attribute no longer exists. No visible output
changes.

**Commit 6 — Modal: apply overlay color and modal width tokens**

In `Modal.styles.ts`, replace `rgba(0, 0, 0, 0.6)` with
`theme.colors.overlay` and replace the hardcoded `min-width: 400px` with
`${({ theme }) => theme.layout.modalWidth}px`. No other files change.

**Commit 7 — Apply radius and transition tokens to Button, Input, Select**

In `Button.styles.ts`, replace `border-radius: 6px` with `theme.radius.md`
and `transition: opacity 0.15s ease` with `theme.transitions.fast`.
In `Input.styles.ts` and `Select.styles.ts`, replace `border-radius: 6px`
with `theme.radius.md`. All three form controls now share the same radius
tier consistently.

**Commit 8 — Apply radius token to Card**

In `Card.styles.ts`, replace `border-radius: 8px` with `theme.radius.lg`.
One-line change.

**Commit 9 — Apply transition token to Spinner**

In `Spinner.styles.ts`, replace the hardcoded `0.7s` animation duration with
`theme.transitions.spinDuration`. One-line change.

**Commit 10 — Apply layout and radius tokens to AppLayout**

In `AppLayout.styles.ts`, replace `height: 56px` with `theme.layout.topBarHeight`,
`max-width: 960px` with `theme.layout.contentMaxWidth`, and `border-radius: 4px`
on the back button with `theme.radius.sm`. All layout magic numbers are now
gone from this file.

**Commit 11 — Apply layout token to feature modal styles**

In `AccountCreateModal.styles.ts`, `TransactionCreateModal.styles.ts`,
`TransactionEditModal.styles.ts`, and `TransferCreateModal.styles.ts`, replace
`min-width: 360px` with `theme.layout.narrowModalWidth`. In
`RecurringTransactionModal.styles.ts`, replace `min-width: 400px` with
`theme.layout.modalWidth`. Five files, one token each.

## Decision Document

**New token files added to `src/tokens/`**

- `radius.ts` — three-tier named scale: `sm` (4px), `md` (6px), `lg` (8px)
- `layout.ts` — `topBarHeight`, `contentMaxWidth`, `modalWidth`, `narrowModalWidth`
- `transitions.ts` — `fast`, `normal`, `spinDuration`

**Color token additions to `colors.ts`**

- `overlay` — modal backdrop color
- `warning` — amber, `#FFC107`, used for CreditCard badge; semantic name chosen because CreditCard debt carries a cautionary connotation
- `accentTint`, `positiveTint`, `negativeTint`, `warningTint`, `mutedTint` — explicit 15% opacity rgba values for badge backgrounds; stored as strings rather than computed at runtime

**Radius tier assignments**

- `radius.sm` (4px) — Badge, AppLayout back button
- `radius.md` (6px) — Button, Input, Select (all form controls share one tier)
- `radius.lg` (8px) — Card

**Badge styling approach**

- Switches from `data-kind` CSS attribute selectors to `$kind` transient prop interpolation, aligning with every other styled component in the system
- Color lookup happens inside the styled component via a `Record<AccountKind, string>` map referencing theme tokens

**Theme object shape after refactor**

```
theme = {
  colors,      // extended
  spacing,
  typography,
  breakpoints,
  radius,      // new
  layout,      // new
  transitions, // new
}
```

**`MeridianTheme` is derived from `typeof theme`** — no manual interface changes
needed; `DefaultTheme` in `theme.d.ts` continues to extend it automatically.

**What is not changing**

- `spacing.ts`, `typography.ts`, `breakpoints.ts` — untouched
- Grid template columns in `TransactionList` and `RecurringTransactionList` — these encode content structure, not design tokens; out of scope
- The `opacity: 0.45` magic number on inactive recurring transactions — a functional value, not a design token
- `padding: 2px` in Badge — sub-token granularity, intentional tight padding; the spacing scale starts at 4px

## Testing Decisions

**What makes a good test here:** tests verify observable DOM output and user
interactions, not implementation details like CSS class names, inline styles,
or transient prop values. A token swap should never break a test.

**Badge.test.tsx is the only test file that changes.** The second describe
block (`"Badge — colour tint contract"`) is deleted outright because it
asserts on `data-kind`, which is the mechanism being replaced. The first
describe block is restructured into a `"unit"` describe following the
design log pattern. No new assertions are added — label text rendering is
the complete observable behaviour of a presentational Badge. Colour logic
is enforced by TypeScript (the `Record<AccountKind, string>` map is fully
typed against the theme).

**All other test files are unaffected.** Token substitution in `.styles.ts`
files is invisible to `@testing-library/react` — no rendered HTML or ARIA
attributes change.

**Prior art:** `Button.test.tsx`, `Input.test.tsx`, `Select.test.tsx` for the
unit/interaction nested describe pattern. `Spinner.test.tsx` as precedent for
a unit-only describe when no interactions exist.

## Out of Scope

- Light mode or any second theme
- Animation and transition tokens beyond the three values already in use
- Grid template columns in transaction list styles
- The `opacity: 0.45` inactive state value in `RecurringTransactionList`
- Any changes to component APIs, props, or rendered HTML structure
- Any changes to business logic or data fetching
- Storybook or design token documentation tooling
- `RecurringTransactionModal` API call extraction (noted in audit, separate concern)

## Further Notes

The token layer after this refactor will be complete in the sense that no
styled component in the system contains a magic value that is not derivable
from the theme. A future theme swap — dark-to-light, or a second palette
entirely — requires only changes inside `src/tokens/`. That was the original
design intent; this refactor closes the gap between intent and implementation.
