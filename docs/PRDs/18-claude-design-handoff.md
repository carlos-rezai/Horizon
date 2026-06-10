## Problem Statement

A complete, runnable design prototype now lives under `docs/handoff/`
(`HANDOFF.md`, `prototype/`, `screens/*.png`, `brand/`) and has been declared
the **canonical visual & interaction spec — the single source of truth**.

The shipping UI is something else: the Stitch/MD3 "UI Redesign" (a blue theme
on MD3 token names, Hanken Grotesk + JetBrains Mono). The prototype is a
different visual system entirely — a gold-on-ink "Meridian, refined" theme
(`accent #E6B559`, `ink0–5`), Space Grotesk + IBM Plex Mono — built on a token
_vocabulary_ its own components reference, with hand-built SVG charts and an
end-to-end **mock** data layer.

As the owner I want the app to look and behave exactly like that prototype, but
running on the real stack (Electron + React 19 + styled-components + Recharts,
on the Meridian design system) and wired to real Projection Engine / Storage
data — not redesigned, not re-imagined, and with no fabricated numbers left
behind. The prototype also shows a few screens and affordances we don't have
yet (an Import flow, a mortgage-origination editor, drag-to-reorder accounts, a
category breakdown donut), and those need to be built out honestly in our
architecture rather than faked.

## Solution

Rebuild the prototype 1:1 in the real stack, **translating, not redesigning**.

- **Re-palette the token layer.** Keep the existing MD3 token _vocabulary_
  (`primary`, `surface`, `onSurface`, …) — those are semantic/role names, not
  hue names, so re-paletting their values to the prototype's gold/ink palette
  propagates the reskin through everything already themed, with no consumer
  renames. Swap fonts to self-hosted Space Grotesk / IBM Plex Mono. Where the
  prototype needs gradations MD3 lacks, **add** named keys rather than abuse
  approximate slots. A documented ink↔MD3 mapping table makes porting the
  prototype's styles a mechanical lookup.
- **Build the few new primitives and components** the prototype introduces
  (`Money`, `Delta`, `Avatar`, `ProgressBar`, `Tabs`, `DataRow`, `StatBlock`,
  `SectionHead`, `EmptyState`) and extend the ones that exist (`Button`,
  `Input`, `Card`, `Modal`, `PageHeader`).
- **Stand up a global notification system** (`Snackbar` provider + `notify`)
  owned by `AppLayout`, with capture-and-recreate Undo for cheap deletes.
- **Reskin five screens** against the acceptance shots, each wired to real
  data, and add the four small DB-backed state additions the prototype assumes
  (account `show_in_trajectory`, account `sort_order`, mortgage origination
  fields, category `color`).
- **Ship the Import UI** (page + 3-step wizard + preview) in full fidelity
  against a thin `features/import` seam — the real CSV engine is a separately
  recorded backend epic.

Every fabricated number and hardcoded label in the prototype is replaced by
real engine/storage output. The **only** sanctioned placeholder is the
explicitly-"Planned" Year-comparison (YoY) card, rendered as an honest empty
state — never fabricated.

## User Stories

1. As the owner, I want the entire app re-skinned to the gold-on-ink prototype
   theme, so that what I use matches the canonical design.
2. As the owner, I want every screen to read as a 1:1 match against its
   `screens/*.png` acceptance shot, so that "done" is objectively checkable.
3. As the owner, I want Space Grotesk + IBM Plex Mono loaded from self-hosted
   font files, so that the app renders correctly fully offline with no Google
   Fonts CDN call.
4. As the owner, I want all monetary figures rendered through one `Money`
   primitive (tabular mono, de-DE, cents→€, sign-coloured), so that money looks
   identical everywhere and never drifts.
5. As the owner, I want positive and negative figures coloured consistently
   (gains vs. losses), so that I can read financial direction at a glance.
6. As the owner, I want KPI tiles to show a forward-looking delta and a
   sparkline, so that I can see where each metric is heading over the next year.
7. As the owner, I want each KPI delta to be the real % change from now to +12
   months (and Net Cashflow to be the current month's real value), so that no
   tile shows an invented number.
8. As the owner, I want the Trajectory Horizon chart re-skinned with a gold
   Total Liquid "SUM" hero line, so that my total liquid arc is the visual
   centrepiece — while defaulting hidden, living in the tooltip, per the
   original intent.
9. As the owner, I want an interactive legend of toggle chips on the
   Trajectory, so that I can show/hide individual series.
10. As the owner, I want hidden series to drop out of the Y-axis domain, so that
    the remaining lines auto-rescale and stay readable.
11. As the owner, I want to double-click a legend chip to isolate that series,
    and a "Show all" to reset, so that I can focus on one line quickly.
12. As the owner, I want my Trajectory series visibility remembered between
    sessions, so that the chart opens the way I left it.
13. As the owner, I want each account's default Trajectory visibility to follow
    its own "show in trajectory" setting, Restschuld on, Total Liquid off, so
    that the chart's default state is sensible.
14. As the owner, I want a shaded Freedom Phase region and a TODAY marker on the
    Trajectory, with Restschuld terminating at the Payoff Month, so that the
    two-act arc of the 20-year story is legible.
15. As the owner, I want the Dashboard to show the KPI strip, Trajectory,
    Accounts list, Mortgage Countdown, and Plan Summary in the prototype's
    layout, so that my home screen matches the design.
16. As the owner, I want to drag-reorder my accounts on the Dashboard and have
    that order persist, so that my most important accounts sit where I want
    them across every surface.
17. As the owner, I want the Plan Summary rows to deep-link into the Outlook
    page with that year expanded and scrolled into view, so that I can jump from
    a year summary straight to its detail.
18. As the owner, I want the Outlook page's Projection Accordion to show aligned
    columns and real year/month summaries, so that the projection reads cleanly.
19. As the owner, I want the Month Overview to show account tabs, Variable
    Spending, and a spending breakdown donut coloured by category, so that I can
    see where a month's one-off money went.
20. As the owner, I want each category to have a stable colour without me
    configuring anything, so that the donut and category badges are colour-coded
    out of the box.
21. As the owner, I want the Month Overview's Year-comparison card to show an
    honest "Planned / coming soon" placeholder, so that I'm never shown a
    fabricated comparison.
22. As the owner, I want the Account Detail page to show the recurring list, the
    real opening balance and date, and the real recurring net/month, so that the
    page reflects true data.
23. As the owner, I want to set a mortgage's origination details (original
    principal, start date, term) via a Mortgage modal with a live percentage
    preview, so that my mortgage's true principal is captured and survives a
    backup/restore.
24. As the owner, I want the original principal constrained to be at least the
    current Restschuld, so that I can't enter an impossible origination figure.
25. As the owner creating an account, I want a "Display in Trajectory Horizon"
    toggle (hidden for Mortgage accounts), so that I control which accounts
    appear on the chart by default.
26. As the owner, I want the Settings page to show storage/backup/restore,
    preferences, and about with real data, so that it's a working settings
    screen — and I do **not** want the demo snackbar-preview card.
27. As the owner, I want a single app-wide way to get a toast notification
    (`notify`) with info/success/warning/error variants, an optional action
    button, auto-dismiss, and queueing, so that feedback is consistent
    everywhere.
28. As the owner, when I delete a transaction, one-off transfer, or recurring
    transaction, I want an "Undo" action on the toast that actually restores it,
    so that an accidental delete is cheaply reversible.
29. As the owner, when I delete an account, I want a plain confirmation with no
    Undo button, so that I'm not offered a reversal the app can't honestly
    deliver.
30. As the owner, I want the sidebar to show the sun-arc wordmark and the nav
    items Dashboard, Outlook, Month, Import, Clock, and Settings, so that
    navigation matches the prototype shell.
31. As the owner, I want the app and installer icon to be the Horizon sun-arc
    mark, so that the desktop app is branded correctly.
32. As the owner, I want an Import page with a dropzone, account tabs, and a
    year-grouped accordion of imported statements (Preview / Re-categorize /
    Re-download / Delete), so that the import experience exists end-to-end in the
    UI.
33. As the owner, I want a 3-step import wizard (account & file → map columns →
    review & categorize) that remembers my per-bank column mapping, so that
    repeat imports from the same bank are fast.
34. As the owner importing a statement, I want duplicates and recurring entries
    detected and pre-unchecked in the review step, so that I don't double-count
    transactions already tracked.
35. As the owner, I want imported rows to land in Variable Spending, so that
    they fit the Recurring-Only Projection Model.
36. As the owner, I want a read-only preview of an already-imported file, so
    that I can inspect a past import without re-running it.
37. As the owner, I want the Import UI to clearly be a shell over a thin seam
    (no fake parsing results presented as real), so that the deferred backend is
    honest about its state.
38. As the owner with no accounts/transactions yet, I want empty states (icon +
    title + hint + action) on every list and chart, so that a fresh install
    looks intentional rather than broken.
39. As the owner, I want icon-only buttons to have their glyphs visually
    centred, so that the toolbar buttons don't look misaligned.
40. As the owner, I want long money values in table rows to never blow out the
    column track, so that lists stay aligned regardless of amount size.
41. As a developer, I want the prototype's styles ported via a documented
    ink↔MD3 mapping table, so that the translation is mechanical and auditable
    rather than guesswork.
42. As a developer, I want the four new columns delivered through the storage
    repos and routes on both drivers with parity, so that the Desktop and Cloud
    builds never diverge.

## Implementation Decisions

**Token system (Phase 1 foundation)** — Keep the existing MD3 vocabulary in
`src/tokens/`; remap values to the prototype's gold/ink palette and extend with
the roles MD3 lacks. No consumer renames.

- `colors.ts` (values remapped): the 6-rung surface ladder
  `surfaceContainerLowest…Highest` ← `ink0 #0C0E12 … ink5 #2B333F`;
  `primary`/`primaryContainer`/`onPrimary` ← gold `accent #E6B559`/`accentDim`/
  `onAccent`, **adding** `accentBright`, `accentLine`; `onSurface` ← `text`,
  `onSurfaceVariant` ← `textMuted`, **adding** `onSurfaceDim` ← `textDim`,
  `onSurfaceFaint` ← `textFaint`; `outlineVariant` ← `line`, `outline` ←
  `lineStrong`, **adding** `lineFaint`; `secondary`/`error` re-tinted to
  `pos`/`neg`, **adding** `info`/`warn` (+ `*Tint`/`*Dim`); keep existing
  `chartColors` + `restschuldStrokeColor`, **add** `liquid`/`debt`/`flow` line
  roles; keep `accountColorPalette` re-tinted to the prototype's 10-swatch muted
  set.
- `typography.ts` (values remapped): `fontFamily.ui` = Space Grotesk,
  `fontFamily.mono` = IBM Plex Mono; scale aligned to the prototype
  (`displayLg/display/h1/h2/body/bodyMd/label` + `monoLg/monoMd/monoSm`); all
  figures `font-variant-numeric: tabular-nums`.
- `radius.ts` / `space()`: `sm 6 / md 8 / lg 10 / xl 14 / pill 999`;
  `space(n) = n*4px`.
- Fonts self-hosted offline (woff2 in `src/assets/`, `@font-face`) — no Google
  Fonts CDN.
- A documented **ink↔MD3 mapping table** lives alongside the tokens.

**New primitives** (`src/primitives/*`): `Money` (tabular mono, de-DE, cents→€,
sign-colouring — replaces ad-hoc `formatBalance` rendering), `Delta` (▲/▼ %
pill), `Avatar` (account-kind icon in account colour), `ProgressBar` (thin
track), `Tabs` (underline tabs with count + colour dot). Reuse/extend: `Button`
(variants primary/secondary/ghost/danger, sizes, `icon`/`iconRight`), `Input`
(`prefix`), `Chip`, `Badge`, `Spinner`, `Stepper`, `DatePicker`, `Select`,
`Text`, `Heading`. Icon-only buttons bake `padding: 0` + `line-height: 0` into
the icon-button path.

**New / updated components** (`src/components/*`): new `DataRow` (grid table row
with hover; `minmax(0, …)` columns so long money values don't overflow),
`StatBlock`, `SectionHead`, `EmptyState`. Update `Card` (Level-1 surface,
hairline top-light, optional accent rail), `Modal` (header/body/footer slots),
`PageHeader` (overline/title/subtitle/actions).

**Global notification system** (Phase 1): a `Snackbar` provider +
`useSnackbar`/`notify` hook owned by `AppLayout` — variants
`info`/`success`/`warning`/`error`, optional action button, auto-dismiss,
queue. `notify({ variant, action })` is the prototype's `ui.notify` contract.
Undo wiring is capture-and-recreate: transaction / one-off transfer / recurring
deletes hold the payload and re-POST on Undo; account delete shows a plain
confirmation with no Undo. No fake Undo buttons ship.

**Data-model migrations** (Phase 2, forward-only — these land as the next four
numbered migrations after `006`, on both drivers with parity):

| Table        | Column(s)                                                             | Notes                                                               |
| ------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `accounts`   | `show_in_trajectory INTEGER DEFAULT 1`                                | default visible; ignored for Mortgage                               |
| `accounts`   | `sort_order INTEGER`                                                  | drag-reorder; new reorder endpoint                                  |
| `accounts`   | `original_principal INTEGER`, `start_date TEXT`, `term_years INTEGER` | mortgage-only; `original_principal ≥ current Restschuld`            |
| `categories` | `color TEXT`                                                          | auto-seeded from `accountColorPalette` on insert; per-name fallback |

**Trajectory Horizon** (enhancement of the existing Recharts chart, not a
re-plumb): add the gold Total Liquid "SUM" hero line (`liquid` colour, width 3,
default hidden, lives in the tooltip); a custom interactive legend of toggle
chips via `<Legend content={…}>` with per-series `hide`; hidden series drop from
the Y-axis domain (auto-rescale); double-click isolates, "Show all" resets;
visibility persisted to localStorage (v2). Default visibility: each account
follows its `show_in_trajectory`, Restschuld on, Total Liquid off. Add a Freedom
Phase shaded region + gradient area under liquid from the Payoff Marker, and a
TODAY marker; Restschuld terminates (`null`) after the Payoff Month. Rename
internal `freedom`/`freedomNow` → `postPayoff`.

**Screens** (Phase 2, mapped to acceptance shots):

| Screen         | Target page                         | Real-data wiring                                                                                                                                                                                 |
| -------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard      | `DashboardPage`                     | KPI strip (forward deltas/sparklines), Trajectory, Accounts (drag-reorder + `sort_order`), Mortgage Countdown (+ origination edit), Plan Summary (→ Outlook deep-link, year expanded + scrolled) |
| Outlook        | `PlanPage`                          | Projection Accordion (aligned cols, year→month), real year/month summaries                                                                                                                       |
| Month Overview | `MonthPage`                         | account tabs, Variable Spending, breakdown **donut** (category colour), YoY = honest "Planned" placeholder                                                                                       |
| Account Detail | `AccountDetailPage`                 | recurring list, real opening balance/date, real recurring net/mo                                                                                                                                 |
| Settings       | `SettingsStoragePage` (`/settings`) | storage/backup/restore + preferences + about (real); drop the snackbar-preview card                                                                                                              |

New modal `MortgageModal` (origination: principal/start/term, live % preview) on
the Mortgage Countdown card. Update `AccountCreateModal` with the "Display in
Trajectory Horizon" toggle (hidden for Mortgage).

**Shell / nav** (Phase 1–2): `AppLayout` sidebar gains the sun-arc wordmark mark
and nav items **Outlook** (was "Financial Plan"), **Month**, **Import**; keep
Clock + Settings. Convert `brand/horizon-icon-1024.png` → `src/assets/icon.ico`
(embed 256/128/64/48/32/16) for electron-builder `build.icon`.

**Import UI** (Phase 3): new `features/import`. Import page (dropzone + account
tabs + year-grouped accordion of imported statements with Preview /
Re-categorize / Re-download / Delete); 3-step wizard (Account & file → Map
columns, remembered per-bank preset → Review & categorize, auto-category per
row, duplicate + recurring detection pre-unchecked); `ImportPreview` read-only
view. Imported rows land in Variable Spending. Wired to a thin `features/import`
hook + API surface; the real engine is the separate **CSV / Bank Statement
Import (backend)** epic, recorded in `CLAUDE.md` + `README.md`.

**Category colours**: nullable `color` on categories, auto-seeded
deterministically from `accountColorPalette` on insert with a per-name
fallback; no new picker UI this phase.

**KPI deltas/sparklines**: forward 12-month projected. Sparklines sliced from
the real projection; each delta = % change from now to +12 months; Net Cashflow
= current month's real value per `ubiquitous-language`.

**Delivery**: one design-log + this one PRD, phased internally — Phase 1
Foundation → Phase 2 Screen reskins + migrations → Phase 3 Import UI. Each
Phase-2 screen is a vertical slice: migration → storage/route → feature/hook →
UI wired to real data → acceptance compare vs `screens/*.png`.

## Testing Decisions

A good test asserts **external behaviour through the module's public interface**,
not its internals — given inputs (cents, projection arrays, account rows,
delete payloads) it pins the observable outputs (formatted strings, derived
percentages, persisted rows, restored entities, rescaled domains). It must
survive a refactor that keeps behaviour constant. Prior art:
`src/tokens/tokens.test.ts`, the projection hook tests
(`useProjection.test.ts`, `useAllRecurringTransactions.test.ts`), co-located
primitive/component `.test.tsx` files, and the storage **Parity Spec**
(`storage.parity.ts`) that runs once per driver.

Per the owner's decision, **every testable seam this handover introduces is
covered**. Concretely:

- **`Money` and `Delta`** — pure rendering/formatting: cents→€ de-DE grouping,
  sign-colouring, zero/negative/large values; ▲/▼ direction and % computation
  including the zero and sign-flip edges. Co-located `.test.tsx`.
- **KPI forward-12-month derivation** — the pure function that slices a
  sparkline window from the projection array and computes the now→+12-month
  %-change for each KPI; covers Net Cashflow falling back to the current
  month's real value, and short-projection / divide-by-zero edges.
- **The four migrations + repo methods** — driver-parity tests through the
  storage repos and routes for `show_in_trajectory`, `sort_order` (including the
  reorder endpoint), mortgage origination (including the
  `original_principal ≥ current Restschuld` constraint), and category `color`.
  Added to the Parity Spec so both drivers are asserted identically.
- **Category colour auto-seed** — deterministic seeding from
  `accountColorPalette` on insert, the per-name fallback, and stability across
  reads (same category name → same colour).
- **Snackbar provider + `notify`** — queueing, variant rendering, auto-dismiss,
  and the capture-and-recreate Undo path (delete → notify with action →
  re-POST restores the captured payload; account delete carries no action).
- **Trajectory legend/domain logic** — the pure visibility-and-domain helper:
  toggling a series updates the rendered set and recomputes the Y-axis domain
  from only-visible series; isolate / show-all transitions; default visibility
  derived from `show_in_trajectory` + Restschuld-on + Total-Liquid-off.
- **Import wizard seam** — the thin `features/import` logic that the UI depends
  on: per-bank column-mapping preset memory and the duplicate/recurring
  detection that pre-unchecks rows. Tested against the seam, not the (deferred)
  real parser.

Pure styling/reskin of existing primitives and components is **not**
unit-tested — visual fidelity is verified by rendering each screen and
comparing against the matching `screens/*.png` acceptance shot.

## Out of Scope

Deliberately deferred or excluded:

- **Import backend** — real CSV parsing, persisted bank-preset memory across
  sessions, real duplicate/recurring detection, and persisted import history.
  Its own epic (**CSV / Bank Statement Import (backend)**); this PRD ships only
  the UI over a thin seam.
- **A real Year-comparison (YoY) engine** — placeholder only, honest "Planned /
  coming soon" empty state.
- **Account-delete Undo** (cascade restore) — its own epic; account delete is a
  plain confirmation here.
- **Category-management / colour-picker UI** — colours are auto-seeded; no
  picker this phase.
- **Native Application Menu** — separate roadmap item, untouched here.
- **The prototype's mock `data.js`** — not ported; real screens wire to the
  Projection Engine / Storage.
- **The demo snackbar-preview card** from the prototype Settings screen — it is
  internal plumbing demo, not a user feature.

## Further Notes

- The prototype under `docs/handoff/` is the **single source of truth** for
  layout, props, and behaviour; `screens/*.png` are the acceptance reference.
  Translate, don't redesign.
- The token decision (keep MD3 vocabulary, remap values + extend) was revised
  A → B within the same grill session before any implementation — role-named
  tokens don't lie when the palette changes underneath, so a full vocabulary
  rewrite would be high churn for a cosmetic honesty gain.
- The four migrations are forward-only; the rollback path is Restore from
  backup, consistent with the SQLite Driver policy.
- Source design log: `docs/design-logs/18-claude-design-handoff.md`.
