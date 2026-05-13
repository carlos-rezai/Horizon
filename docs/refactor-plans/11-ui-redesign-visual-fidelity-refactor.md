## Problem Statement

After completing the UI redesign (issues #80–#84), several visual fidelity
gaps remain between the Stitch reference design (`src/assets/screen.png`)
and the running app:

- The Dashboard renders as a single stacked column instead of the designed
  two-column grid.
- The page "Dashboard" heading is nested inside the Accounts card instead of
  spanning the full page width.
- `MortgageCountdown` and `AccountOverview` each render inside an outer
  `<Card>` wrapper on top of their own internal card borders, producing a
  double-border "container-in-container" appearance absent from the reference.
- The Accounts section header — heading, Total Liquid label, and Add Account
  button — has no layout, no margin separation between the button and label,
  and is not structured as a header row above the account list.
- The Plan Summary table shows a `border-bottom` under every data row; the
  reference shows borderless rows with only a header underline.
- Total Liquid and Restschuld values in the Plan Summary are rendered in
  neutral text color; the reference uses green (`secondary`) for Total Liquid
  and red (`error`) for Restschuld.
- Account rows show a gray square fallback avatar instead of the colored
  circle keyed to the account's stored color.
- `src/pages/` uses a flat file layout (all `.tsx`, `.styles.ts`, `.test.tsx`
  files in a single folder root) while all other layers — `components/`,
  `primitives/`, `features/` — co-locate files in per-component subfolders.
- Sidebar nav items have no icons; the reference shows an icon + label for
  each nav item.
- MortgageCountdown shows no section label above the card; the reference
  shows "MORTGAGE COUNTDOWN" as a small all-caps label.
- MortgageCountdown displays the Restschuld at `sizes.lg`; the reference
  shows it at a large hero size (≈36–40px JetBrains Mono).
- MortgageCountdown shows no house icon next to the account name inside the
  card; the reference shows a home icon.
- MortgageCountdown shows time remaining as a single gray sentence; the
  reference shows a "Time Remaining" label line followed by the duration in
  `tertiary` (orange) color.
- Plan Summary has no header row with subtitle and "View full plan →" link;
  the reference shows "Plan Overview" + "Scheduled Projection Summary"
  subtitle + a link aligned right.
- Plan Summary table column header reads "ST"; the reference reads
  "Savings Rate".
- Plan Summary shows no payoff year treatment; the reference highlights the
  payoff year row with a green tint and a "PAYOFF" badge.

## Solution

Close the full visual gap and align the pages folder with the project's
co-location convention:

1. Restructure `src/pages/` into per-page subfolders with `index.ts`
   re-exports, matching the `src/components/` pattern. Add barrel `index.ts`
   files to all other `src/` layer folders.
2. Extract the Dashboard heading to a full-width page header above the grid.
3. Replace the single-column flex layout with a two-column CSS grid whose
   named areas match the Stitch reference.
4. Remove the outer `<Card>` wrappers from `DashboardPage` for sections whose
   feature components already own their card surface.
5. Extract the Accounts section header (heading + Total Liquid + Add Account
   button) into a dedicated styled row separate from the account list card.
6. Remove `border-bottom` from Plan Summary rows; color Total Liquid values
   green, Restschuld values red; rename the "ST" column header to "Savings
   Rate"; add the header row with subtitle and "View full plan →" link; add
   the payoff year row highlight and "PAYOFF" badge.
7. Replace the gray square avatar fallback in `AccountOverview` with a colored
   circle avatar driven by the account's stored color.
8. Add "MORTGAGE COUNTDOWN" all-caps section label above the card; display the
   Restschuld at hero size; add the house icon next to the account name; split
   the time remaining into a label line and a `tertiary`-colored duration line.
9. Add icons to sidebar nav items.

## Commits

### Commit 1 — Restructure `src/pages/` into per-page folders; add barrel index files

Move each page's three co-located files (`.tsx`, `.styles.ts`, `.test.tsx`)
into a subfolder named after the page component:

```
src/pages/
  DashboardPage/
    DashboardPage.tsx
    DashboardPage.styles.ts
    DashboardPage.test.tsx
    index.ts
  AccountDetailPage/ …
  PlanPage/ …
  SettingsStoragePage/ …
  index.ts            ← pages root barrel
```

Each page's `index.ts` re-exports only the default page component. Add an
`index.ts` barrel at the root of `src/pages/`, `src/components/`,
`src/primitives/`, `src/layouts/`, `src/utils/`, and one per feature domain
in `src/features/`. Update all import sites (router, test files) to
reference the new paths. No logic changes — this commit is a pure file
restructure.

### Commit 2 — Extract Dashboard heading to full-width page header

Move `<Heading level={1}>Dashboard</Heading>` out of the Accounts `<Card>`
and into a standalone `StyledPageHeader` rendered above the grid area in
`DashboardPage`. The Accounts card no longer opens with a page-level heading;
it opens with the section-level "Accounts Summary" heading only.

### Commit 3 — Replace DashboardPage column layout with two-column CSS grid

Update `DashboardPage.styles.ts` to use CSS grid with two equal columns
(`1fr 1fr`) and four named grid areas:

```
"mortgage-countdown  trajectory"
"accounts            plan"
```

Assign the grid areas to the four `StyledSection` wrappers in
`DashboardPage.tsx`. No responsive breakpoints — desktop-only app.

### Commit 4 — Remove outer `<Card>` wrappers from MortgageCountdown and AccountOverview sections

In `DashboardPage.tsx`, remove the `<Card>` wrapper from the
`MortgageCountdown` section and from the `AccountOverview` section.
`MortgageCountdown` already renders its own `StyledCard` per mortgage
account. `AccountOverview` renders bordered `StyledAccountLink` rows. The
outer `<Card>` is redundant and causes the double-border appearance.
`TrajectoryHorizon` and `PlanSummary` retain their outer `<Card>` wrappers
because their internals do not provide a card surface of their own.

Update `DashboardPage.test.tsx`: the "at least 4 card surfaces" assertion
changes to "at least 2" because only PlanSummary and TrajectoryHorizon now
use the `<Card>` component wrapper.

### Commit 5 — Extract Accounts section header row above the account list

Add `StyledAccountsHeader` to `DashboardPage.styles.ts`:
`display: flex; justify-content: space-between; align-items: center` with
appropriate bottom margin. Move the "Accounts Summary" `<Heading>`, Total
Liquid `<span>`, and Add Account `<Button>` into this header row — button
on the left (green, primary variant), Total Liquid label on the right.
The `AccountOverview` account list renders below the header row outside any
card wrapper.

### Commit 6 — Plan Summary: borders, colors, column header, header row, payoff year

In `PlanSummary.styles.ts`:

- Remove `border-bottom` from `StyledRow` (keep it on `StyledTh` only).
- Add `StyledTotalLiquidAmount` with `color: theme.colors.secondary`.
- Add `StyledRestschuldAmount` with `color: theme.colors.error`.
- Add `StyledPlanHeader` (flex row, space-between) for the section header.
- Add `StyledPlanSubtitle` for the "Scheduled Projection Summary" subtitle.
- Add `StyledViewFullPlan` for the "View full plan →" link (right-aligned,
  secondary color, navigates to `/plan`).
- Add `StyledPayoffRow` extending `StyledRow` with a green tint background
  (`theme.colors.secondaryTint`).
- Add `StyledPayoffBadge` (pill badge, `secondary` color) for the "PAYOFF"
  label.

In `PlanSummary.tsx`:

- Wrap the section header area in `StyledPlanHeader` containing the heading,
  `StyledPlanSubtitle`, and `StyledViewFullPlan`.
- Rename the `<StyledTh>` column from "ST" to "Savings Rate".
- Wrap Total Liquid and Restschuld cell values in their semantic span.
- Detect the payoff year (first year where `row.restschuld === 0`) and render
  that row using `StyledPayoffRow` with `<StyledPayoffBadge>PAYOFF</StyledPayoffBadge>`
  in place of the ST amount.

### Commit 7 — Replace gray square avatar with colored circle in AccountOverview

In `AccountOverview.styles.ts`, update `StyledIconFallback` (rename to
`StyledAccountAvatar`) to accept a `$color` prop. Set
`background-color: ${$color}26` (10% alpha tint) and `border-radius: 50%`
(circle). In `AccountOverview.tsx`, pass
`account.color ?? theme.colors.chartColors[account.kind]` as the `$color`
prop.

### Commit 8 — MortgageCountdown: section label, hero number, house icon, time remaining layout

In `MortgageCountdown.styles.ts`:

- Add `StyledSectionLabel`: small (`sizes.xs`), uppercase, letter-spacing,
  `onSurfaceVariant` color — used above the card as a category label.
- Add `StyledHeroAmount`: large hero size (`sizes.xxl` or equivalent ≈36px),
  JetBrains Mono, `error` color.
- Add `StyledAccountNameRow`: flex row with `gap`, for the icon + account
  name line.
- Add `StyledTimeLabel`: `onSurfaceVariant`, `sizes.xs` — the "Time
  Remaining" label line above the duration.
- Update `StyledCountdownText` to `color: theme.colors.tertiary` for the
  duration value (currently gray, should be orange).

In `MortgageCountdown.tsx`:

- Render `<StyledSectionLabel>Mortgage Countdown</StyledSectionLabel>` above
  the `StyledCard` (outside the card border).
- Inside `StyledCard`, render a `StyledAccountNameRow` containing a `<Home>`
  icon (lucide-react) and the account name.
- Replace `StyledRestschuld` with `StyledHeroAmount` for the balance display.
- Replace the single `StyledCountdownText` with: `<StyledTimeLabel>Time
Remaining</StyledTimeLabel>` followed by `<StyledCountdownText>` containing
  the duration string in `tertiary` color.

### Commit 9 — Add icons to sidebar nav items

In `AppLayout.tsx`, add lucide-react icons to each nav item:

- Dashboard → `<LayoutDashboard>` icon
- Outlook (Plan) → `<TrendingUp>` icon
- Settings → `<Settings>` icon

In `AppLayout.styles.ts`, update `StyledNavLink` to render as
`display: flex; align-items: center; gap: space2` to accommodate the icon
alongside the label.

## Decision Document

- **Pages folder pattern:** Each page gets its own subfolder containing its
  `.tsx`, `.styles.ts`, `.test.tsx`, and `index.ts`. The `index.ts` re-exports
  only the default page component. Matches `src/components/Card/` exactly.
  Barrel `index.ts` files at each layer root provide an optional single-import
  surface but do not replace existing deep imports.

- **Dashboard grid:** Two equal columns (`1fr 1fr`). Named grid areas match
  the Stitch mockup. No responsive breakpoints; desktop-only app.

- **Outer Card removal:** Only removed where the wrapped feature already owns
  its card surface. `TrajectoryHorizon` and `PlanSummary` retain their outer
  `<Card>`. The `DashboardPage.test.tsx` "card surfaces" assertion is updated
  from ≥4 to ≥2 to reflect this.

- **Accounts header row:** Extracted row outside the account list (user
  confirmed). Page-composition logic only, not a reusable shared component.

- **PlanSummary payoff year detection:** First row where `row.restschuld === 0`
  is the payoff year. This is a display-layer calculation using existing
  `deriveYearSummaries` output — no new utility function needed.

- **PlanSummary column header:** "ST" → "Savings Rate" to match the reference.
  The underlying data field and domain term (Sondertilgung) are unchanged.

- **MortgageCountdown section label:** "MORTGAGE COUNTDOWN" rendered as an
  all-caps styled label above the card's border, not as a `<Heading>` inside
  it. This is a presentational distinction only.

- **MortgageCountdown hero size:** Uses a new `xxl` (or equivalent ≈36px)
  typography size. Check `src/tokens/typography.ts` — if no `xxl` size exists,
  add one as a raw pixel value before implementing this commit.

- **Sidebar icons:** `<LayoutDashboard>`, `<TrendingUp>`, `<Settings>` from
  lucide-react. The icon set is already a dependency (used in AccountCreateModal).
  `StyledNavLink` receives flex layout; icon size is 16px.

- **No new shared components:** All changes are within existing feature and
  layout files. No new primitives or components are introduced.

## Testing Decisions

Good tests verify rendered output and user-visible behaviour, not
styled-component class names or internal CSS values.

- **Commit 1 (restructure):** All existing page tests move into the new
  subfolders with updated relative import paths. No new assertions. Prior art:
  `DashboardPage.test.tsx`, `PlanPage.test.tsx`, `AccountDetailPage.test.tsx`,
  `SettingsStoragePage.test.tsx`.

- **Commit 4 (outer Card removal):** `DashboardPage.test.tsx` "card surfaces"
  assertion changes from `>= 4` to `>= 2`. All other assertions are unchanged.

- **Commit 6 (PlanSummary):** Existing tests verify rows render with correct
  year and values. New assertions: the payoff year row renders a "PAYOFF" badge;
  the column header reads "Savings Rate". Prior art: `PlanSummary.test.tsx`.

- **Commit 7 (AccountOverview):** Avatar rename from `StyledIconFallback` to
  `StyledAccountAvatar` may require updating test queries. Prior art:
  `AccountOverview.test.tsx`.

- **Commit 8 (MortgageCountdown):** Existing tests verify the countdown
  renders. New assertion: a "Mortgage Countdown" section label is present in
  the output. Prior art: `MortgageCountdown.test.tsx`.

- **Commit 9 (nav icons):** Existing `AppLayout.test.tsx` assertions remain
  valid. No new icon-specific assertions needed.

## Out of Scope

- Account icon/color editing after creation
- Responsive layout / breakpoints
- Light mode
- Trajectory Horizon "Enter rate" button and legend (existing implementation
  to be reviewed separately)

## Further Notes

Commit 1 (folder restructure + barrels) must land before any layout commits
so git history cleanly separates the rename. Each subsequent commit must leave
the app in a fully working, visually coherent state.

The `typography.ts` token file should be checked for an `xxl` size before
implementing Commit 8. If absent, add `xxl: 36` (px) to the type scale as
part of that commit.
