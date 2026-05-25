## Problem Statement

The account-color-identity feature introduced a color resolution pattern —
`account.color ?? chartColors[account.kind]` — that now appears independently
in three places with slightly different implementations. Two callers reach
`chartColors` via `useTheme()` (an unnecessary hook dependency for a static
token value); one imports it directly from tokens. The `accountColor()` helper
inside `TrajectoryHorizon` is defined after a `useTheme()` call, making it
untestable without a full component render. The ubiquitous language entry for
Account Color Palette still says "10 MD3-derived hex values" after the palette
was expanded to 20 entries.

## Solution

Extract the resolution logic into a single pure utility function
`resolveAccountColor` in `src/utils/color/`. Update all three callers to use
it. Correct the ubiquitous language. No visual or behavioural changes.

## Commits

1. **Add `src/utils/color/color.ts` with `resolveAccountColor`** — pure
   function that takes an object with `color: string | null | undefined` and
   `kind: AccountKind` and returns `account.color ?? chartColors[account.kind]`.
   Imports `chartColors` directly from tokens. Add `src/utils/color/color.test.ts`
   covering: explicit color is returned as-is; null color falls back to the
   correct kind color for each AccountKind; undefined color also falls back.
   Export from `src/utils/index.ts`.

2. **Update `TrajectoryHorizon` to use `resolveAccountColor`** — replace the
   inline `accountColor()` function and its `useTheme()` dependency on
   `chartColors`. The `useTheme()` call remains for other theme values; only
   the `chartColors` lookup is removed. Pass `resolveAccountColor` as the
   `getColor` prop to `ChartTooltip` (or call it directly — match whatever the
   cleanest shape is). Remove the now-unused `chartColors` theme reference.

3. **Update `MonthOverview` to use `resolveAccountColor`** — replace the
   inline `account.color ?? chartColors[account.kind]` expression on the
   `<Chip>` color prop. Remove the `chartColors` import from tokens (it will
   no longer be used directly).

4. **Update `AccountOverview` to use `resolveAccountColor`** — replace
   `color ?? theme.colors.chartColors[kind]` in the `AccountIcon` subcomponent.
   No change to the `useTheme()` call if it is still used elsewhere in the
   component; remove only the `chartColors` reference from the theme.

5. **Fix ubiquitous language** — update the Account Color Palette entry from
   "10 MD3-derived hex values" to "20 MD3-derived hex values".

## Decision Document

- `resolveAccountColor` lives in `src/utils/color/` following the existing
  subdirectory-per-domain convention (`format/`, `currency/`, `accounts/`, etc.)
- The function takes a minimal structural type (`{ color?: string | null; kind: AccountKind }`)
  so it works with `AccountWithBalance` and any future shape that carries the
  same two fields — no import of the full account type is required
- `chartColors` is imported directly from tokens inside the utility, not from
  the theme — tokens are pure values; theme access via hook is unnecessary for
  static data and creates an untestable coupling
- All three callers stop importing `chartColors` directly; the resolution logic
  has one home
- No changes to the `Chip` primitive, `Badge`, `AccountCreateModal` color
  picker, or any data model — this is purely a code organisation change

## Testing Decisions

A good test for `resolveAccountColor` tests only its external behaviour:
given an account shape, what hex string comes out? It does not test that
`chartColors` was imported from a specific path.

- Test: explicit `color` is returned unchanged
- Test: `color: null` returns the `chartColors` entry for each `AccountKind`
- Test: `color: undefined` also falls back (same as null)
- Prior art: `src/utils/accounts/accounts.test.ts` and
  `src/utils/currency/currency.test.ts` for the test file shape

Existing component tests for `TrajectoryHorizon`, `MonthOverview`, and
`AccountOverview` do not need to change — they already verify the correct
color reaches the DOM via `data-color` attributes.

## Out of Scope

- The local `formatBalance` function in `AccountOverview.tsx` (pre-existing
  duplication of the util — separate concern)
- Any visual or layout changes
- `accountColorPalette` token — value is correct, only the docs entry needed
  updating
- New color surfaces or additional callers
