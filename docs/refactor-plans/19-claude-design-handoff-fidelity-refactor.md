# 19 — Claude Design Handoff: Visual-Fidelity Refactor

## Problem Statement

The Claude Design Handover (`docs/handoff/`, issues #122–#137) was built
**bottom-up but not finished top-down**. Phase 1 (gold/ink token re-palette,
self-hosted fonts, new primitives, the `notify` provider, sidebar/nav/branding)
and the Phase-2 _backend/data_ pieces (the four migrations, KPI derivation,
category colour, Account-Detail derivation) all landed. But the **per-screen
visual recomposition to match the canonical prototype 1:1 was only partially
done, and unevenly** — so what renders today is not the prototype.

A live comparison (real app seeded with the prototype's accounts/recurring,
screenshotted against `docs/handoff/screens/*.png`) shows:

- **Settings** and **Import** were built fresh and are faithful (minor gaps).
- **Account Detail** has its real-data stat strip but the hero card and
  recurring rows were never reskinned.
- **Dashboard**, **Outlook**, and **Month Overview** still render largely the
  **pre-handoff composition** — they just inherited the new tokens, so they
  _look_ gold/ink but are structurally the old screens.

The shared symptom: **`PageHeader` (with overline/subtitle/actions) and the new
primitives (`Avatar`, `Money`, `Delta`, `StatBlock`, `Tabs`) all exist**, but
three screens don't compose them; two net-new visual pieces the prototype needs
(a **category breakdown donut** and **sparklines**) were never built; and a
**projection-engine sign bug** means the mortgage never pays off, so the
payoff-dependent UI (To-Payoff KPI, chart payoff marker, Freedom Phase) can
never light up.

### Per-screen gap summary (acceptance target in parentheses)

| Screen                | State | Missing vs prototype                                                                                                                                                                                                                                                                                                                       |
| --------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboard (`01`)      | 🔴    | PageHeader overline/subtitle/actions (Backup, Add account); 4th **To Payoff** KPI tile; KPI **sparklines**; `Money`/`Delta` in tiles + delta placement; Trajectory card header (overline/title/"N of M series"); payoff marker + Freedom Phase + gradient; account **avatars** in the Accounts card                                        |
| Outlook (`02`)        | 🔴    | Title still "Financial Plan", no PageHeader overline/subtitle/Recalculate; **3-card summary strip** (final-year liquid / debt-free / total ST); still shows an embedded Trajectory chart; accordion uses **per-account columns** instead of Total Liquid / Restschuld / Net Cashflow / **Sondertilgung**; "Payoff year highlighted" legend |
| Month Overview (`03`) | 🔴    | Essentially un-reskinned (old ledger). PageHeader + month stepper; **4-card stat strip**; category badges + day-number rows + per-row account dots; account **Tabs** with count badges + "All accounts"; **Breakdown donut**; **Year-Comparison "Planned"** card                                                                           |
| Account Detail (`04`) | 🟡    | Hero **Avatar**, kind Badge, subtitle, status dot, Edit/Delete buttons, CURRENT BALANCE + **sparkline**; recurring rows' transfer "→ account" indicator + FREQUENCY badge; "Back to Dashboard" label                                                                                                                                       |
| Settings (`06`)       | 🟢    | Preferences rows (Automatic-updates toggle, Appearance, Privacy); full About content                                                                                                                                                                                                                                                       |
| Import (`05`)         | 🟢    | History accordion renders collapsed vs expanded-by-default                                                                                                                                                                                                                                                                                 |
| Modals (`07`,`08`)    | ❓    | Import Wizard 3-step and Transaction Edit fidelity pass; Mortgage + Account-Create toggle polish                                                                                                                                                                                                                                           |

## Solution

**Finish the top-down pass.** No re-architecture and no new domain concepts —
recompose each screen out of the primitives/components that already exist,
build the two genuinely-missing shared visual pieces (donut + sparkline), and
fix the one engine bug that blocks payoff visuals. Every commit is verified by
rendering the screen and comparing against the matching `screens/*.png`, exactly
as the handoff prescribes.

Scope was confirmed with the developer: **all five screens to full parity, the
Outlook accordion matches the prototype exactly (summary columns, drop the
embedded chart), modals are included, and the engine Sondertilgung sign fix is
in scope.**

## Commits

Tiny, each leaving the app working and tests green. Grouped by phase; later
phases depend on earlier shared pieces. Every "UI" commit ends with an
acceptance comparison against the matching screenshot.

### Phase 0 — Unblock + shared building blocks

1. **RED: engine reduces Restschuld for a negative-amount Sondertilgung
   transfer.** Add a failing projection test: an annual transfer into a Mortgage
   stored with the domain's _negative_ outflow sign reduces the mortgage
   balance (and is capped at the remaining debt). Keep the existing
   positive-amount mortgage test alongside it to pin the reconciled convention.
2. **Engine: normalise mortgage-linked transfer sign.** Make the mortgage
   paydown branch operate on the magnitude of the transfer so the sign
   convention matches every other transfer (outflow = negative). Both tests
   green. This is what lets payoff visuals ever render.
3. **RED: `Sparkline` primitive.** Failing test: renders an SVG path for a
   numeric series; renders nothing for an empty/one-point series; no axes/labels.
4. **Build `Sparkline` primitive** (small area/line; no business logic; takes
   `number[]` + a colour role). Co-located styles + test green.
5. **RED: `Donut` component.** Failing test: one arc per slice, a centre total
   label, and a legend row per slice (label + colour + amount).
6. **Build `Donut` component** (Recharts `PieChart`, centre label, legend).
   Composed from primitives, no domain logic. Test green.

### Phase 1 — Dashboard (`01`)

7. **RED: extend KPI derivation with a forward sparkline series.** Each KPI
   gains a `series` (the forward-12-month slice already implied by the points).
8. **Implement the series** in the KPI derivation util. No UI change yet.
9. **RED: add the To-Payoff KPI** to the derivation — months-to-payoff from the
   current month and a debt-free month label, `null` when no payoff in horizon.
10. **Implement the To-Payoff KPI** derivation. Test green.
11. **KpiStrip UI: swap to `Money` + `Delta` primitives** and move the delta to
    the top-right of each tile (per prototype). Existing tiles only.
12. **KpiStrip UI: add the To-Payoff tile** (4th, gold panel, Years/Months +
    "debt-free in <month>", honest empty when `null`).
13. **KpiStrip UI: add a sparkline** under each KPI value via the new
    `Sparkline`. Acceptance vs `01` KPI strip.
14. **Dashboard PageHeader**: pass overline "Overview", subtitle "Your financial
    horizon at a glance", and actions (Backup + Add account); remove the ad-hoc
    accounts-card "Add account" button.
15. **Trajectory card header**: give the chart the prototype header — overline
    "Trajectory Horizon", title "10-Year Projection", and the "N of M series ·
    click to toggle" affordance text.
16. **Trajectory payoff visuals**: ensure the payoff `ReferenceLine` + flag, the
    shaded Freedom Phase region, and the gradient area under the liquid line
    render (now reachable after Phase 0). Restschuld terminates at payoff.
    Acceptance vs `01` chart.
17. **Accounts card**: rename to "Accounts", render each row through `Avatar`
    (kind icon in account colour) + kind `Badge` + `Money` balance via
    `DataRow`. Acceptance vs `01` accounts card.

### Phase 2 — Outlook / `PlanPage` (`02`)

18. **Remove the embedded Trajectory chart** from the Outlook page and set its
    PageHeader: overline "Outlook", title "Financial Plan", subtitle "240-month
    projection · Recurring-Only Engine", Recalculate action.
19. **RED: Outlook summary derivation** — final-year Total Liquid, debt-free
    month (first month with Restschuld 0), and total Sondertilgung (sum of ST
    payments fired) with a payment count.
20. **Implement the summary derivation** util. Test green.
21. **Outlook summary strip**: three `StatBlock` cards wired to the derivation.
22. **RED: accordion year-summary aggregation** — per-year Total Liquid,
    Restschuld, Net Cashflow, and Sondertilgung values for the collapsed year row.
23. **ProjectionAccordion: replace per-account columns** with PERIOD | TOTAL
    LIQUID | RESTSCHULD | NET CASHFLOW | SONDERTILGUNG; promote ST from the
    in-cell badge to its own column; align the year row and month sub-rows on the
    same grid.
24. **Accordion section head + payoff highlight**: add the "● Payoff year
    highlighted" legend; keep the payoff-month row highlight. Acceptance vs `02`.

### Phase 3 — Month Overview (`03`)

25. **RED: month stat derivation** — Variable Spending total, "of which Cat"
    (the `Cat` category total, per the prototype), entry count, average/day.
26. **Implement the stat derivation** util. Test green.
27. **RED: breakdown derivation** — group the month's variable spending by
    category into `{ label, colour, amount }` slices + total, colours from the
    category `color` column.
28. **Implement the breakdown derivation** util. Test green.
29. **MonthPage PageHeader**: overline "<MONTH YEAR>", title "Month Overview",
    subtitle "Variable spending · Recurring-Only Model", month-stepper actions.
30. **Month stat strip**: four `StatBlock` cards wired to the derivation.
31. **Spending list reskin**: day-number rows, description + per-row account dot,
    category `Badge`, `Money` amount; account `Tabs` with count badges + an "All
    accounts" tab; "Add expense" button.
32. **Breakdown donut card**: "Breakdown / By category" using the new `Donut` +
    breakdown derivation.
33. **Year-Comparison card**: honest "Planned" placeholder (badge + muted "coming
    soon", **no fabricated bars**) per design-log decision #6. Acceptance vs `03`.

### Phase 4 — Account Detail (`04`)

34. **Hero card**: `Avatar` (kind icon, account colour), kind `Badge`, subtitle,
    status dot, Edit/Delete as ghost/danger buttons, CURRENT BALANCE label +
    `Money` value + balance `Sparkline`.
35. **Recurring section + rows**: "Back to Dashboard" label; overline "Recurring"
    - title; rows show the transfer "→ account" indicator with colour dot and a
      FREQUENCY `Badge`; `Money` amounts. Acceptance vs `04`.

### Phase 5 — Settings (`06`)

36. **Preferences card rows**: Automatic-updates `Toggle` (wire the existing
    auto-update toggle), Appearance (DARK badge), Privacy (LOCAL badge).
37. **About card content**: app description + version + Check-for-updates.
    Acceptance vs `06`.

### Phase 6 — Modals (`07`, `08`)

38. **Transaction Edit modal** to `08`: header/body/footer slots, transfer-leg
    read-only state.
39. **Import Wizard** to `07`: 3 steps (Account & file → Map columns → Review &
    categorize) styled to the screenshot.
40. **Mortgage + Account-Create modals**: origination fields with live %
    preview; the "Display in Trajectory Horizon" toggle (hidden for Mortgage).

### Phase 7 — Loose ends

41. **Import history** accordion defaults to expanded (matches `05`).
42. **Full acceptance sweep**: render all eight targets, diff against
    `screens/*.png`, fix residual spacing/typography drift.

## Decision Document

- **No re-architecture.** The `primitives/ → components/ → features/ → pages/`
  layering is intact and correct; this is a composition/wiring refactor, not a
  structural one.
- **`PageHeader` is reused as-is** — it already exposes overline / subtitle /
  actions; the broken screens simply weren't passing them.
- **Two net-new shared visual pieces**: a `Sparkline` primitive (KPI tiles +
  Account-Detail hero) and a `Donut` component (Month breakdown). Both are
  dumb/reusable and carry no domain logic, per the layer rules.
- **Outlook matches the prototype exactly**: the accordion's per-account month
  columns are **replaced** by the four summary columns + a dedicated
  Sondertilgung column, and the embedded Trajectory chart is removed from the
  Outlook page (it remains on the Dashboard). This is an intentional reduction of
  on-screen information in favour of 1:1 fidelity.
- **Engine sign fix in scope.** The mortgage paydown branch is reconciled so the
  domain's negative-outflow transfer sign reduces Restschuld; this is the
  prerequisite for the To-Payoff KPI, chart payoff marker, and Freedom Phase. The
  fix is additive to the existing engine contract — no API/route change, no
  schema change.
- **Year-Comparison stays an honest placeholder** (design-log decision #6); the
  Settings snackbar-preview card stays dropped.
- **No new endpoints or migrations.** All four handoff migrations already
  shipped; this refactor consumes their data.
- **Derivations live in `utils/` (pure, tested); composition lives in
  `features/`/`pages/` (untested-but-thin).** KPI series, To-Payoff, Outlook
  summary, month stats, and breakdown grouping are all pure functions.

## Testing Decisions

- **A good test asserts external behaviour, not implementation.** For this
  refactor that means the **pure derivations** (KPI series + To-Payoff, Outlook
  summary, month stats, breakdown grouping, accordion year aggregation) get
  unit tests with hand-computed expected values, and the **engine fix** gets a
  projection test asserting the mortgage balance steps down and reaches zero.
- **Visual fidelity is verified by the acceptance comparison**, not unit tests —
  rendering each screen and diffing against `screens/*.png` is the handoff's
  prescribed acceptance step. We do not snapshot-test styled-component output.
- **Component tests stay behavioural**: e.g. the To-Payoff tile renders empty
  when there is no payoff; the accordion renders the Sondertilgung column only
  when a mortgage exists; tabs filter rows by account; the donut renders one arc
  per slice. We assert visible text/roles, not class names or style props.
- **Prior art** to mirror: `utils/kpi` and `utils/projection` tests (pure
  derivations), the existing `ProjectionAccordion` and `KpiStrip` tests
  (behavioural component tests), and the projection engine's existing
  Sondertilgung tests (the new negative-sign test sits beside them).
- **Every commit keeps the suite green**; RED commits precede their
  implementation per the project's TDD workflow.

## Out of Scope

- **The CSV / Bank-Statement Import backend** — real parsing, bank-preset
  memory, duplicate/recurring detection, persisted history. The Import _UI_ is in
  scope (fidelity only); its engine remains a separate epic.
- **A real Year-over-Year engine** — the YoY card stays a "Planned" placeholder.
- **Account-delete Undo / cascade restore** — its own epic.
- **A category-management / colour-picker UI** — colours stay auto-seeded.
- **The Native Application Menu** roadmap item.
- **Any token / font / palette changes** — Phase 1 of the handoff is accepted
  as-is; this refactor changes composition, not the design tokens.
- **New endpoints, routes, or migrations** — none are required.

## Further Notes

- **The engine sign bug is the highest-leverage fix** and is sequenced first:
  until the mortgage pays off, the To-Payoff KPI, the chart payoff marker, and
  the Freedom Phase have nothing to render, so several Phase-1/2 acceptance
  comparisons can't pass without it.
- **Comparison harness used while scoping** (and recommended for the build): run
  the Express dev server and Vite, seed the prototype's accounts + recurring +
  current-month variable spending via the API, then drive screenshots with the
  chrome-devtools MCP and diff against `screens/*.png`. Note the CSP allows
  `http://127.0.0.1:*` only, so the API base must be `127.0.0.1`, not
  `localhost`. Also note `better-sqlite3` must be rebuilt for system Node to run
  the dev server (`npm rebuild better-sqlite3`) and rebuilt for Electron
  (`npm run electron:rebuild`) before packaging.
- **Phasing is shippable**: each phase is an independently demoable screen, so
  the refactor can land screen-by-screen rather than as one large PR.
