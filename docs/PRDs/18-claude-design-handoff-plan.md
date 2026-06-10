# Plan: Claude Design Handover

> Source PRD: GitHub issue #122 (`docs/PRDs/18-claude-design-handoff.md`)
> Source design log: `docs/design-logs/18-claude-design-handoff.md`

A 1:1 rebuild of the canonical prototype (`docs/handoff/`) on the real stack —
**translate, don't redesign**. The prototype is mock end-to-end; every
fabricated number is wired to real Projection Engine / Storage output. The
only sanctioned placeholder is the explicitly-"Planned" YoY card.

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes** (unchanged patterns; nav labels re-mapped): `/` Dashboard,
  `/plan` Outlook (nav label "Outlook", was "Financial Plan"), `/months/:month`
  Month, `/accounts/:id` Account Detail, `/settings/storage` Settings, **new**
  `/import` Import. Sidebar nav order: Dashboard, Outlook, Month, Import, Clock,
  Settings.
- **Token strategy**: keep the existing MD3 token _vocabulary_ in `src/tokens/`
  (`primary`, `surface`, `onSurface`, …) — re-palette the _values_ to the
  prototype's gold/ink set and **add** named keys where MD3 lacks a gradation.
  No consumer renames. A documented **ink↔MD3 mapping table** lives alongside
  the tokens and is the lookup that makes every `.styles.ts` port mechanical.
- **Fonts**: self-hosted woff2 in `src/assets/` via `@font-face` — Space
  Grotesk (`fontFamily.ui`) + IBM Plex Mono (`fontFamily.mono`). No Google
  Fonts CDN (offline-first Electron).
- **Migrations**: forward-only, the next four numbered files after `006`
  (`007`–`010`), delivered on **both** storage drivers with parity and added to
  the storage Parity Spec. Rollback path is Restore-from-backup, per SQLite
  Driver policy.
  - `accounts.show_in_trajectory INTEGER DEFAULT 1`
  - `accounts.sort_order INTEGER`
  - `accounts.original_principal INTEGER`, `start_date TEXT`, `term_years INTEGER`
  - `categories.color TEXT`
- **Money rendering**: one `Money` primitive (tabular mono, de-DE, cents→€,
  sign-coloured) is the single rendering path for all monetary figures —
  replaces ad-hoc `formatBalance`.
- **Notifications**: one app-wide `Snackbar` provider + `notify({ variant,
action })` owned by `AppLayout`. Undo is capture-and-recreate (re-POST the
  held payload) for transaction / one-off transfer / recurring deletes;
  account delete is a plain confirm with **no** Undo. No fake Undo buttons ship.
- **KPI basis**: forward 12-month projected. Each delta = % change now→+12mo
  from the real projection array; Net Cashflow = current month's real value.
- **Layer placement** (per CLAUDE.md): tokens → primitives → components →
  features (domain UI + hooks) → pages (composition only). `src/` never talks
  to SQLite; all new state goes through `server/src/` repos + routes.
- **Acceptance**: each Arc-B/C screen is "done" only when it reads as a 1:1
  match against its `docs/handoff/screens/*.png` shot. Testable seams are
  unit-tested per the PRD's Testing Decisions; pure reskin is verified visually.

---

# Arc A — Foundation

Prerequisite infrastructure. Largely horizontal; the thin end-to-end proof for
Arc A is "the Dashboard shell renders on the new tokens with the new shell."

## Phase 1: Token & font re-palette

**User stories**: 1, 3, 41

### What to build

Re-palette `colors.ts`, `typography.ts`, and `radius.ts`/`space()` to the
prototype's gold/ink values, adding the named keys MD3 lacks (accent variants,
extra text/line tones, `liquid`/`debt`/`flow` line roles, re-tinted
`pos`/`neg`/`info`/`warn`, re-tinted `accountColorPalette`). Self-host Space
Grotesk + IBM Plex Mono as woff2 with `@font-face`. Author the ink↔MD3 mapping
table next to the tokens. Prove it through by rendering the existing Dashboard
shell on the remapped tokens.

### Acceptance criteria

- [ ] `colors.ts` values are the prototype palette; new keys added, no consumer
      renames; `tokens.test.ts` extended for the new keys
- [ ] `typography.ts` uses Space Grotesk / IBM Plex Mono; scale aligned to the
      prototype; figures use `tabular-nums`
- [ ] `radius`/`space()` match the prototype (`sm6/md8/lg10/xl14/pill999`,
      `space(n)=n*4px`)
- [ ] Fonts load from local woff2 — no network/CDN request for fonts
- [ ] ink↔MD3 mapping table is committed alongside the tokens
- [ ] App still builds and renders on the new tokens (no broken consumers)

---

## Phase 2: Core primitives

**User stories**: 4, 5, 39

### What to build

New primitives `Money`, `Delta`, `Avatar`, `ProgressBar`, `Tabs`; extend
`Button` (variants primary/secondary/ghost/danger, sizes, `icon`/`iconRight`)
and `Input` (`prefix`). Bake `padding: 0` + `line-height: 0` into the icon-only
button path so glyphs centre.

### Acceptance criteria

- [ ] `Money` renders cents→€ de-DE grouped, sign-coloured (gain/loss), with
      tabular mono; co-located tests cover zero/negative/large values
- [ ] `Delta` renders ▲/▼ % pill; tests cover direction, % computation, zero,
      and sign-flip edges
- [ ] `Avatar`, `ProgressBar`, `Tabs` (underline + count + colour dot) exist
      with `.styles.ts` and tests
- [ ] `Button`/`Input` gain the new variants/props without breaking existing
      callers
- [ ] Icon-only buttons render with visually centred glyphs

---

## Phase 3: Layout components

**User stories**: 38, 40

### What to build

New components `DataRow` (grid row with hover; `minmax(0, …)` columns so long
money values never overflow), `StatBlock`, `SectionHead`, `EmptyState`. Update
`Card` (Level-1 surface, hairline top-light, optional accent rail), `Modal`
(header/body/footer slots), `PageHeader` (overline/title/subtitle/actions).

### Acceptance criteria

- [ ] `DataRow` keeps columns aligned with long money values (no track blowout)
- [ ] `EmptyState` renders icon + title + hint + action
- [ ] `StatBlock`, `SectionHead` exist with co-located styles/tests
- [ ] `Card`/`Modal`/`PageHeader` updated; existing consumers still render

---

## Phase 4: Global notification system

**User stories**: 27, 28, 29

### What to build

A `Snackbar` provider + `useSnackbar`/`notify` hook owned by `AppLayout`:
variants info/success/warning/error, optional action button, auto-dismiss,
queue. Wire capture-and-recreate Undo for transaction / one-off transfer /
recurring deletes; account delete shows a plain confirmation with no Undo.
Migrate the three existing ad-hoc Snackbar consumers onto the provider.

### Acceptance criteria

- [ ] `notify({ variant, action })` is callable app-wide; queueing,
      auto-dismiss, and variant rendering covered by tests
- [ ] Deleting a transaction / one-off transfer / recurring shows an Undo that
      re-POSTs the captured payload and restores it (tested)
- [ ] Deleting an account shows a plain confirm with no Undo button
- [ ] No fake/no-op Undo buttons anywhere

---

## Phase 5: Shell, nav & branding

**User stories**: 30, 31

### What to build

`AppLayout` sidebar gains the sun-arc wordmark and nav items Outlook (relabel),
Month, Import (keep Clock + Settings). Convert
`docs/handoff/brand/horizon-icon-1024.png` → `src/assets/icon.ico` (embed
256/128/64/48/32/16) and point electron-builder `build.icon` at it. Add the
`/import` route (target page can be a stub until Arc C).

### Acceptance criteria

- [ ] Sidebar shows the sun-arc wordmark and the six nav items in order
- [ ] `/import` route resolves; nav highlights correctly per route
- [ ] `AppLayout` test updated for the new nav set
- [ ] App + installer icon is the Horizon sun-arc mark

---

# Arc B — Screen reskins + migrations

Each phase is a vertical slice: migration (where applicable) → storage/route →
feature/hook → UI wired to real data → acceptance compare vs `screens/*.png`.

## Phase 6: Trajectory Horizon + `show_in_trajectory`

**User stories**: 8, 9, 10, 11, 12, 13, 14, 25, 42

### What to build

Migration `accounts.show_in_trajectory` (both drivers + Parity Spec + route).
Enhance the existing Recharts `TrajectoryHorizon`: gold Total Liquid "SUM" hero
line (`liquid`, width 3, default hidden, in tooltip); custom interactive legend
of toggle chips via `<Legend content={…}>` with per-series `hide`; hidden
series drop from the Y-axis domain (auto-rescale); double-click isolates,
"Show all" resets; visibility persisted to localStorage (v2). Default
visibility: each account follows `show_in_trajectory`, Restschuld on, Total
Liquid off. Add Freedom Phase shaded region + gradient under liquid from the
Payoff Marker, and a TODAY marker; Restschuld terminates (`null`) after Payoff
Month. Rename internal `freedom`/`freedomNow` → `postPayoff`. Add the "Display
in Trajectory Horizon" toggle to `AccountCreateModal` (hidden for Mortgage).

### Acceptance criteria

- [ ] `show_in_trajectory` round-trips through both drivers (Parity Spec)
- [ ] Pure visibility-and-domain helper tested: toggle updates rendered set +
      recomputes Y-domain from visible-only; isolate/show-all; default
      visibility derivation
- [ ] SUM line, legend chips, Freedom Phase, TODAY marker, Restschuld
      termination all render; visibility persists across reload
- [ ] AccountCreateModal toggle present (hidden for Mortgage)
- [ ] Matches the Dashboard Trajectory acceptance shot

---

## Phase 7: Account drag-reorder + `sort_order`

**User stories**: 16, 42

### What to build

Migration `accounts.sort_order` + a reorder endpoint (both drivers + Parity
Spec). Drag-to-reorder accounts on the Dashboard; persisted order is reflected
everywhere accounts appear (charts, month tabs, balance cards, lists).

### Acceptance criteria

- [ ] `sort_order` + reorder endpoint round-trip through both drivers (Parity)
- [ ] Dragging reorders accounts and the new order persists across reload
- [ ] Order is consistent across every account-listing surface

---

## Phase 8: Mortgage origination + `MortgageModal`

**User stories**: 23, 24, 42

### What to build

Migration `accounts.original_principal / start_date / term_years` (mortgage-only;
both drivers + Parity Spec + route). New `MortgageModal` on the Mortgage
Countdown card: principal / start date / term inputs with a live percentage
preview. Constrain `original_principal ≥ current Restschuld`.

### Acceptance criteria

- [ ] Origination fields round-trip through both drivers and survive a
      backup/restore (Parity)
- [ ] `original_principal ≥ current Restschuld` constraint enforced (tested,
      both drivers)
- [ ] `MortgageModal` shows a live % preview; saved values drive the card

---

## Phase 9: KPI strip

**User stories**: 6, 7

### What to build

The pure derivation that slices a 12-month sparkline window from the real
projection array and computes each KPI's now→+12-month % change; Net Cashflow
falls back to the current month's real value. Render the KPI tiles (value +
`Delta` + sparkline) on the Dashboard.

### Acceptance criteria

- [ ] Pure derivation tested: forward 12-month %-change per KPI; Net Cashflow =
      current-month value; short-projection / divide-by-zero edges
- [ ] KPI tiles show real value, forward delta, and sparkline — no invented
      numbers
- [ ] Matches the Dashboard KPI strip acceptance shot

---

## Phase 10: Dashboard composition + Plan Summary deep-link

**User stories**: 15, 17

### What to build

Assemble the Dashboard in the prototype's layout (KPI strip, Trajectory,
Accounts list, Mortgage Countdown, Plan Summary). Plan Summary rows deep-link
into the Outlook page (`/plan`) with that year expanded and scrolled into view.

### Acceptance criteria

- [ ] Dashboard composes all sections in the prototype layout (page is
      composition only — no logic)
- [ ] Clicking a Plan Summary year navigates to Outlook with that year expanded
      and scrolled into view
- [ ] Matches the Dashboard acceptance shot

---

## Phase 11: Outlook page

**User stories**: 18

### What to build

Reskin `PlanPage`'s Projection Accordion: aligned columns and real year→month
summaries. Accept the deep-link target (expand + scroll) from Phase 10.

### Acceptance criteria

- [ ] Projection Accordion shows aligned columns and real year/month summaries
- [ ] Deep-linked year opens expanded and scrolled into view
- [ ] Matches the Outlook acceptance shot

---

## Phase 12: Category colour + Month Overview donut

**User stories**: 19, 20, 21, 42

### What to build

Migration `categories.color`, auto-seeded deterministically from
`accountColorPalette` on insert with a per-name fallback (both drivers + Parity
Spec). Reskin `MonthPage`: account tabs, Variable Spending list, a spending
breakdown donut coloured by category, and the Year-comparison card as an honest
"Planned / coming soon" empty state (no fabricated bars).

### Acceptance criteria

- [ ] `categories.color` round-trips through both drivers; auto-seed is
      deterministic and stable across reads (same name → same colour); per-name
      fallback tested (Parity)
- [ ] Month Overview shows account tabs, Variable Spending, and a
      category-coloured breakdown donut
- [ ] YoY card is an honest "Planned" placeholder — never computed euros
- [ ] Matches the Month Overview acceptance shot

---

## Phase 13: Account Detail page

**User stories**: 22

### What to build

Reskin `AccountDetailPage`: recurring transaction list, real opening balance +
opening date, and real recurring net/month — all from storage/engine, no mock
figures.

### Acceptance criteria

- [ ] Page shows the real recurring list, opening balance/date, recurring net/mo
- [ ] No fabricated figures remain
- [ ] Matches the Account Detail acceptance shot

---

## Phase 14: Settings page

**User stories**: 26

### What to build

Reskin `SettingsStoragePage` (`/settings/storage`): storage info,
backup/restore, preferences, and about — all with real data. Drop the
prototype's demo snackbar-preview card.

### Acceptance criteria

- [ ] Storage/backup/restore, preferences, and about show real data and work
- [ ] No snackbar-preview demo card
- [ ] Matches the Settings acceptance shot

---

# Arc C — Import UI

## Phase 15: Import UI shell + wizard

**User stories**: 32, 33, 34, 35, 36, 37

### What to build

New `features/import` thin seam + API surface (the real CSV engine is the
separate **CSV / Bank Statement Import (backend)** epic). Build the Import page
(dropzone + account tabs + year-grouped accordion of imported statements with
Preview / Re-categorize / Re-download / Delete); the 3-step wizard (Account &
file → Map columns, remembered per-bank preset → Review & categorize, auto
category per row, duplicate + recurring detection pre-unchecked); and the
read-only `ImportPreview`. Imported rows land in Variable Spending. The UI must
read honestly as a shell over a thin seam — no fake parsing results presented
as real.

### Acceptance criteria

- [ ] Import page renders dropzone, account tabs, and year-grouped accordion
      with the four per-statement actions
- [ ] 3-step wizard works end-to-end against the seam; per-bank column-mapping
      preset memory tested
- [ ] Duplicate/recurring detection pre-unchecks rows in review (tested against
      the seam)
- [ ] Imported rows land in Variable Spending; `ImportPreview` is read-only
- [ ] No fabricated parsing results presented as real
- [ ] Matches the Import acceptance shot
