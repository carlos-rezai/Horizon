# 18 — Claude Design Handover

## Background

A complete, runnable design prototype was delivered under `docs/handoff/`
(`HANDOFF.md`, `prototype/` source, `screens/*.png` acceptance shots,
`brand/`). It is declared the **canonical visual & interaction spec — the
single source of truth**. The prototype is a self-contained React app using
token-driven inline styles, hand-built SVG charts, and a mock data layer
(`data.js`): mock accounts plus a 240-month projection generator that exists
only to make the prototype interactive.

The current shipping UI is the Stitch/MD3 "UI Redesign" (log 12): a blue
theme (`primary #adc6ff`) on MD3 token names (`surface`, `onSurface`,
`primaryContainer`…), Hanken Grotesk + JetBrains Mono. The prototype is a
different visual system — a gold-on-ink "Meridian, refined" theme
(`accent #E6B559`, `ink0–5`), Space Grotesk + IBM Plex Mono — with an
entirely different token _vocabulary_ that every component references.

This is the design log for rebuilding the prototype 1:1 in the real stack.

## Problem

How do we translate the prototype into Electron + React 19 +
styled-components on the Meridian design system **without redesigning** —
mapping its components onto our `primitives/ → components/ → features/`
layers, reusing what exists, building the few new things it introduces, and
replacing its mock data with real Projection Engine / Storage data — while
keeping the work shippable and honest?

### Global translation rule

The prototype is **mock end-to-end**. Every fabricated number and hardcoded
label (e.g. `netMonthly = 145000`, `Δ6.8%`, `"Oct 2031"`, `a.balance * 0.7`)
is wired to real engine/storage output. The **only** sanctioned placeholder
is the explicitly-"Planned" Year-comparison (YoY) card, rendered as honest
empty — never fabricated. Match structure and behaviour exactly; express it
in our stack's idioms.

## Questions and Answers

1. **Reconcile the prototype's token vocabulary with the repo's MD3 names?**
   → **Keep the MD3 vocabulary, remap values + extend (B).** MD3 token names
   are _semantic/role_ names (`primary`, `surface`, `onSurface`), not hue
   names — re-paletting them to the prototype's gold/ink values is the token
   layer's intended use, not a hack. Swap font values to Space Grotesk / IBM
   Plex Mono. Where the prototype needs gradations MD3 lacks (a third line
   tone, third/fourth muted-text tones, accent variants, data-viz line
   roles), **add** named keys rather than cram into approximate slots. Port
   the prototype's `.styles.ts` via a documented ink↔MD3 mapping table.
   Rejected: full vocabulary rewrite (A) — high churn across every reused
   primitive/component + their tests for a cosmetic "honesty" gain, since
   semantic names don't lie when the palette changes underneath.

   _(Decision revised from A → B later in the same grill session, before any
   implementation — the original A rationale wrongly treated role-named
   tokens as hue-named.)_

2. **Scope of the Import feature?** → **UI now, backend epic later (B).**
   Build Import page + 3-step wizard + preview modal in full fidelity against
   a thin `features/import` seam; the real CSV parse, bank-preset memory,
   duplicate/recurring detection, and persisted history are a separate
   backend epic (recorded in `CLAUDE.md` + `README.md`). Rejected: full
   backend now (A, multi-week creep into a "design handover"); fully deferred
   (C, leaves an empty nav item).

3. **Where do the three small net-new state additions live?** → **Real
   columns, forward-only migrations (A).** `showInTrajectory` (account),
   mortgage origination fields, and account `sortOrder` are all DB-backed.
   Rejected: client-only localStorage — a backup/restore would lose a
   mortgage's true principal and the user's account order, unacceptable for
   finance data whose backup story is "the `.db` file is the truth."

4. **Where do category colors come from?** → **Real auto-seeded `color`
   column (A).** Nullable `color` on categories, auto-seeded from
   `accountColorPalette` (deterministic), per-name fallback; no new picker UI
   this phase. Mirrors Account Color Identity (log 16) and unblocks the
   breakdown donut + category badges. Rejected: client-side hash (B, unstable
   on rename, no path to user control); full category-management UI with
   picker (C, prototype shows no such screen).

5. **Basis for the KPI deltas/sparklines?** → **Forward 12-month projected
   (A).** Sparklines sliced from real projection; each delta = % change from
   now to +12 months; Net Cashflow = current month's real value per
   `ubiquitous-language`. Rejected: trailing replayed history (B, only as deep
   as the account's age); drop deltas entirely (C).

6. **The two demo-only affordances?** → **Keep YoY as honest placeholder,
   drop the Settings snackbar-preview card.** YoY keeps its layout + "Planned"
   badge but shows muted "coming soon", not computed euro bars. The
   snackbar-states card is internal plumbing demo, not a user feature.

7. **Undo semantics on delete snackbars?** → **Capture-and-recreate for cheap
   deletes (A).** Transaction / one-off transfer / recurring deletes hold the
   payload and re-POST on Undo; **account delete shows a plain confirmation,
   no Undo** (cascade restore is its own epic). No fake Undo buttons ship.
   Rejected: real Undo everywhere incl. account cascade (B); defer all Undo
   (C).

8. **Delivery structure?** → **One design-log + one PRD, phased internally
   (A).** Phase 1 Foundation → Phase 2 Screen reskins + migrations → Phase 3
   Import UI. Rejected: three separate PRDs now (B, three grill→PRD cycles for
   one conceptual handover).

## Design

### Token system (Phase 1 foundation)

**Keep the existing MD3 vocabulary in `src/tokens/`; remap all values to the
prototype's gold/ink palette + fonts, and extend with the few roles MD3
lacks.** No consumer renames — re-paletting role-named tokens propagates the
reskin through everything already themed.

- **`colors.ts`** (values remapped) —
  - Surfaces: the existing 6-rung ladder `surfaceContainerLowest …
surfaceContainerHighest` ← prototype `ink0 #0C0E12 … ink5 #2B333F`.
  - Accent/primary: `primary` / `primaryContainer` / `onPrimary` ← gold
    `accent #E6B559` / `accentDim` / `onAccent`. **Add** `accentBright`,
    `accentLine` (roles MD3 lacks).
  - Text: `onSurface` ← `text`, `onSurfaceVariant` ← `textMuted`. **Add**
    `onSurfaceDim` ← `textDim`, `onSurfaceFaint` ← `textFaint`.
  - Lines: `outlineVariant` ← `line`, `outline` ← `lineStrong`. **Add**
    `lineFaint`.
  - Semantics: `secondary`/`error` re-tinted to `pos`/`neg`; **add**
    `info`/`warn` (+ `*Tint`/`*Dim`).
  - Data-viz: keep existing `chartColors` (per-kind) + `restschuldStrokeColor`;
    **add** `liquid`/`debt`/`flow` line roles. Keep `accountColorPalette`
    re-tinted to the prototype's 10-swatch muted set.
- **`typography.ts`** (values remapped) — `fontFamily.ui` = Space Grotesk,
  `fontFamily.mono` = IBM Plex Mono; align the scale to the prototype
  (`displayLg/display/h1/h2/body/bodyMd/label` + `monoLg/monoMd/monoSm`). All
  figures use `font-variant-numeric: tabular-nums`.
- **`radius.ts`** / `space()` — `sm 6 / md 8 / lg 10 / xl 14 / pill 999`;
  `space(n) = n*4px`.
- **Fonts self-hosted offline** (woff2 in `src/assets/`, `@font-face`) — ❌ no
  Google Fonts CDN (offline-first Electron).
- **ink↔MD3 mapping table** — documented alongside the tokens so porting the
  prototype's `.styles.ts` is a mechanical lookup (`T.color.ink2 →
theme.colors.surfaceContainer`, `T.color.textDim → onSurfaceDim`, etc.).

### New primitives → `src/primitives/*`

- ✅ **`Money`** ⭐ — tabular mono, de-DE, cents→€, sign-colouring; replaces
  ad-hoc `formatBalance` rendering. Used everywhere.
- ✅ **`Delta`** ⭐ — ▲/▼ % pill.
- ✅ **`Avatar`** — account-kind icon in account colour.
- ✅ **`ProgressBar`** — thin track.
- ✅ **`Tabs`** — underline tabs w/ count + colour dot.
- Reuse existing: `Button` (add variants primary/secondary/ghost/danger,
  sizes, `icon`/`iconRight`), `Input` (add `prefix`), `Chip`, `Badge`,
  `Spinner`, `Stepper`, `DatePicker`, `Select`, `Text`, `Heading`.
- **Icon-only buttons:** bake `padding: 0` + `line-height: 0` into the
  icon-button path (UA default padding decenters glyphs).

### New / updated components → `src/components/*`

- ✅ **`DataRow`** ⭐ — grid table row w/ hover; used in every list. Grids use
  `minmax(0, …)` columns so long money values don't blow out the track.
- ✅ **`StatBlock`**, **`SectionHead`**, **`EmptyState`**.
- Update `Card` (Level-1 surface, hairline top-light, optional accent rail),
  `Modal` (header/body/footer slots), `PageHeader` (overline/title/subtitle/
  actions).

### Global notification system (Phase 1)

`Snackbar` exists but is rendered ad-hoc by three consumers; there is **no**
app-wide `notify()`. Build a **Snackbar provider + `useSnackbar`/`notify`
hook** owned by `AppLayout`: variants `info`/`success`/`warning`/`error`,
optional action button, auto-dismiss, queue. `notify({ variant, action })`
is the prototype's `ui.notify` contract.

Undo action wiring (capture-and-recreate):

```
delete(tx)  → notify('"X" deleted', { action: { label:'Undo', onClick: () => recreate(payload) }})
delete(account) → notify('"X" deleted', {})   // no Undo
```

### Data-model migrations (Phase 2, forward-only)

| Migration                      | Table        | Column(s)                                                             | Notes                                                               |
| ------------------------------ | ------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| accounts: trajectory flag      | `accounts`   | `show_in_trajectory INTEGER DEFAULT 1`                                | default visible; ignored for Mortgage                               |
| accounts: ordering             | `accounts`   | `sort_order INTEGER`                                                  | drag-reorder; new reorder endpoint                                  |
| accounts: mortgage origination | `accounts`   | `original_principal INTEGER`, `start_date TEXT`, `term_years INTEGER` | mortgage-only; `original_principal ≥ current Restschuld`            |
| categories: colour             | `categories` | `color TEXT`                                                          | auto-seeded from `accountColorPalette` on insert; per-name fallback |

Each lands through the storage repos + routes (both drivers / parity), with
the matching modal field.

### Trajectory Horizon (enhancement, not re-plumb)

The existing `features/projection/TrajectoryHorizon` already renders one
Recharts `<Line>` per non-mortgage account from `MonthlySnapshot.accounts`,
dashed Restschuld with `connectNulls={false}`, a payoff `ReferenceLine`, and a
per-account tooltip. Add:

- Gold **Total Liquid "SUM"** hero line (`liquid` colour, width 3), **default
  hidden** (lives in tooltip per original intent).
- **Custom interactive legend** = toggle chips (Recharts built-in `<Legend>`
  can't style into chips → `<Legend content={…}>`); per-series `hide` prop;
  hidden series drop from the Y-axis domain (auto-rescale). Double-click =
  isolate; "Show all" resets; visibility persisted (localStorage v2).
- Default visibility: each account follows its `showInTrajectory`; Restschuld
  on; Total Liquid off.
- **Freedom Phase** shaded region + gradient area under liquid from the Payoff
  Marker; **TODAY** marker line. Restschuld terminates at the Payoff Month
  (`null` after payoff). Internal `freedom`/`freedomNow` → rename `postPayoff`.

### Screens (Phase 2) — map to acceptance shots

| Screen         | Target                                    | Real-data wiring                                                                                                                                                                                    |
| -------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard      | `pages/DashboardPage`                     | KPI strip (forward deltas/sparklines), Trajectory, Accounts (drag-reorder + `sortOrder`), Mortgage Countdown (+ origination edit), Plan Summary (→ Outlook deep-link with year expanded + scrolled) |
| Outlook        | `pages/PlanPage`                          | Projection Accordion (aligned cols, year→month), real year/month summaries                                                                                                                          |
| Month Overview | `pages/MonthPage`                         | account tabs, Variable Spending, breakdown **donut** (category colour), YoY = honest "Planned" placeholder                                                                                          |
| Account Detail | `pages/AccountDetailPage`                 | recurring list, real opening balance/date, real recurring net/mo                                                                                                                                    |
| Settings       | `pages/SettingsStoragePage` → `/settings` | storage/backup/restore + preferences + about (real); ❌ drop snackbar-preview card                                                                                                                  |

New modals: **`MortgageModal`** (origination: principal/start/term, live %
preview) on the Mortgage Countdown card. Update `AccountCreateModal` with the
"Display in Trajectory Horizon" toggle (hidden for Mortgage).

### Shell / nav (Phase 1–2)

`AppLayout` sidebar: add the sun-arc **wordmark** mark, nav items **Outlook**
(was "Financial Plan"), **Month**, **Import**; keep Clock + Settings. App /
installer icon: convert `brand/horizon-icon-1024.png` → `src/assets/icon.ico`
(embed 256/128/64/48/32/16) for electron-builder `build.icon`.

### Import UI (Phase 3) — `features/import` (new)

- **Import page** — dropzone + account tabs + year-grouped accordion of
  imported statements (Preview / Re-categorize / Re-download / Delete).
- **3-step wizard** — Account & file → Map columns (remembered per-bank preset)
  → Review & categorize (auto-category per row, duplicate + recurring
  detection, pre-unchecked to avoid double-counting). Imported rows land in
  **Variable Spending**.
- **`ImportPreview`** — read-only view of an already-imported file.
- Wired to a thin `features/import` hook + API surface; the real engine is the
  **CSV / Bank Statement Import (backend)** epic.

## Implementation Plan

**Phase 1 — Foundation (thinnest end-to-end slice).**
Token rewrite (colours + typography + radius/space) and self-hosted fonts →
one screen (Dashboard shell) renders on the new tokens. Then new primitives
(`Money`, `Delta`, `Avatar`, `ProgressBar`, `Tabs`), components (`DataRow`,
`StatBlock`, `SectionHead`, `EmptyState`, `Card`/`Modal`/`PageHeader`
updates), the global **Snackbar provider + `notify`**, the sidebar wordmark +
nav additions, and `icon.ico`.

**Phase 2 — Screen reskins + their migrations.**
Per screen, vertical slice = migration → storage/route → feature/hook → UI
wired to real data → acceptance compare vs `screens/*.png`:
Dashboard (incl. Trajectory enhancements, drag-reorder, Mortgage origination),
Outlook, Month Overview (category colour + donut), Account Detail, Settings.

**Phase 3 — Import UI.**
Import page + 3-step wizard + preview modal against the thin `features/import`
seam; Import nav active.

## Trade-offs

**Easier:** the reskin propagates through everything already themed by
remapping role-named tokens — no consumer renames, small token-file diff,
low risk; every visible number traceable to engine output (no fabricated
metrics); the Trajectory work is an enhancement of an existing Recharts chart,
not a re-plumb; one PRD keeps the handover coherent.

**Harder:** porting the prototype's `.styles.ts` needs the ink↔MD3 mapping
table (a translation layer between the design artifact's `ink3`/`accent` names
and our `surfaceContainerHigh`/`primary` names — the accepted cost of keeping
the vocabulary); four migrations must pass driver parity; a global Snackbar
provider is new app-wide plumbing; forward-projected KPI deltas need a defined
+12-month basis rather than a trivially "real" trailing number.

**Out of scope (deliberate):** the **Import backend** (CSV parsing, bank-preset
memory, duplicate/recurring detection, persisted history) — its own epic; a
real **YoY** engine — placeholder only; **account-delete Undo** (cascade
restore) — its own epic; a **category-management/colour-picker** UI — colours
are auto-seeded; the **Native Application Menu** roadmap item — untouched here.
