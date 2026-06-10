# Horizon — Design Handoff

**This prototype is the canonical visual & interaction spec — the single source of truth.**
Rebuild it **1:1 in the real stack** (Electron + React 19 + styled-components + Recharts, on the Meridian design system). **Translate, don't redesign.**

- The prototype's token-driven **inline styles → `styled-components` `.styles.ts`**.
- Its components map onto the existing **`primitives/` → `components/` → `features/`** layers — reuse what exists, add the few new primitives noted below.
- Any screen/component/behaviour the prototype shows that we don't have yet must be **built out in our architecture**, following Meridian tokens and `docs/ubiquitous-language.md` domain terms.
- Match structure and behaviour exactly; express it in our stack's idioms.

> **How to use the screenshots:** `handoff/screens/*.png` are the visual target. After implementing each screen, render it and compare against the matching screenshot — they're the acceptance reference.

> **The prototype source is included** under `handoff/prototype/` (`Horizon.html` + `styles.css` + `src/`). Open `Horizon.html` in a browser to run it live, and read the source as the canonical reference for layout, props, and behaviour.

---

## 1. Source files (prototype)

| Layer              | File(s)                                   | Maps to (real repo)                                                  |
| ------------------ | ----------------------------------------- | -------------------------------------------------------------------- |
| Tokens             | `src/tokens.js`, `styles.css`             | Meridian tokens / MD3 token set                                      |
| Primitives         | `src/primitives.jsx`, `src/icons.jsx`     | `src/primitives/*`                                                   |
| Components         | `src/components.jsx`                      | `src/components/*`                                                   |
| Charts             | `src/charts.jsx`                          | `features/projection` (Recharts)                                     |
| Modals             | `src/modals.jsx`, `src/import-wizard.jsx` | `features/transactions`, `features/accounts`, `features/mortgage`    |
| Shell              | `src/shell.jsx`                           | app shell / `Sidebar`                                                |
| Screens            | `src/screens/*.jsx`                       | `features/*` pages                                                   |
| Data/engine (mock) | `src/data.js`                             | **mock only** — real data comes from the Projection Engine + Storage |

`src/data.js` is a stand-in (mock accounts + a 240-month projection generator) purely to make the prototype interactive. **Do not port it** — wire the real screens to the existing Projection Engine / API.

---

## 2. Component mapping

### Primitives (`src/primitives.jsx`) → `src/primitives/*`

| Prototype                        | Target              | Notes                                                                              |
| -------------------------------- | ------------------- | ---------------------------------------------------------------------------------- |
| `Button`                         | `primitives/Button` | variants: primary / secondary / ghost / danger; sizes sm/md/lg; `icon`/`iconRight` |
| `Input`                          | `primitives/Input`  | supports `prefix` (€), `disabled`                                                  |
| `Chip`                           | `primitives/Chip`   | **already exists** — color identity dot                                            |
| `Badge`                          | `primitives/Badge`  | tones: neutral/accent/pos/neg + arbitrary `color`                                  |
| `Avatar`                         | `primitives/Avatar` | account icon in account color                                                      |
| `ProgressBar`, `Spinner`, `Icon` | `primitives/*`      | `Icon` set lives in `src/icons.jsx` (lucide-equivalent paths)                      |
| **`Money`** ⭐                   | **new primitive**   | tabular mono, de-DE, cents→€, sign-coloring. Used everywhere — add it.             |
| **`Delta`** ⭐                   | **new primitive**   | ▲/▼ % pill                                                                         |
| `Label`                          | small caps label    | could be a typography token instead                                                |

### Components (`src/components.jsx`) → `src/components/*`

| Prototype                                | Target                  | Notes                                       |
| ---------------------------------------- | ----------------------- | ------------------------------------------- |
| `Card`                                   | `components/Card`       | Level-1 surface, hairline top-light         |
| `Modal`                                  | `components/Modal`      | **exists** — header/body/footer slots       |
| `Tabs`                                   | `components/Tabs`       | underline tabs w/ count + color dot         |
| `PageHeader`, `SectionHead`, `StatBlock` | `components/*`          | layout headers                              |
| **`DataRow`** ⭐                         | **new component**       | grid table row w/ hover; used in every list |
| `EmptyState`                             | `components/EmptyState` | icon + title + hint + action                |

### Features

| Prototype                                    | Target                                                 | Notes                                                                                 |
| -------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `TrajectoryChart` (`src/charts.jsx`)         | `features/projection/TrajectoryHorizon` (**Recharts**) | hand-built SVG in prototype → rebuild with Recharts `ComposedChart` + `Line`. See §4. |
| `Donut`, `Sparkline`                         | `features/months`, dashboard KPIs                      | Recharts `PieChart` / small area lines                                                |
| `AccountCreateModal`                         | `features/accounts/AccountCreateModal`                 | + new "Display in Trajectory Horizon" toggle (§4)                                     |
| `RecurringModal`                             | `features/transactions/RecurringTransactionModal`      | field-for-field match                                                                 |
| `TransactionEditModal`                       | `features/transactions/TransactionEditModal`           | incl. transfer-leg read-only state                                                    |
| `MortgageModal`                              | `features/mortgage/*`                                  | **new** — edit origination date/principal (§4)                                        |
| `ImportWizard`, `ImportPreview`, Import page | **new** `features/import`                              | 3-step wizard + history (§4)                                                          |
| `Sidebar`, `SidebarClock`                    | app shell                                              | adds **Import** nav item                                                              |

---

## 3. Screens (acceptance screenshots)

| #   | Screen                                                                                               | Screenshot                              |
| --- | ---------------------------------------------------------------------------------------------------- | --------------------------------------- |
| 1   | Dashboard — KPI strip, Trajectory Horizon, Accounts (drag-reorder), Mortgage Countdown, Plan Summary | `screens/01-dashboard.png`              |
| 2   | Outlook — Projection Accordion (aligned columns, year→month)                                         | `screens/02-outlook.png`                |
| 3   | Month Overview — account tabs, variable spending, breakdown donut, year comparison                   | `screens/03-month-overview.png`         |
| 4   | Account Detail — recurring transactions focus                                                        | `screens/04-account-detail.png`         |
| 5   | Import — dropzone + account tabs + year accordion of statements                                      | `screens/05-import.png`                 |
| 6   | Settings — storage/backup, preferences, about                                                        | `screens/06-settings.png`               |
| 7   | Import Wizard — 3 steps (Account → Map columns → Review)                                             | `screens/07-import-wizard.png`          |
| 8   | Transaction Edit modal                                                                               | `screens/08-transaction-edit-modal.png` |

---

## 4. Deltas — new things the prototype introduces (build these)

1. **Trajectory Horizon: per-account show/hide.** Default shows one `<Line>` per non-mortgage account + Restschuld (dashed); Total Liquid is the gold "SUM" line. A **custom interactive legend** (toggle chips) shows/hides series; hidden series drop from the Y-axis domain (auto-rescale). Implement with Recharts `hide` prop on each `<Line>` + custom `<Legend content>` (the built-in legend can't style into toggle chips). Restschuld line **terminates at the Payoff Month** (set `restschuld = null` after payoff so `connectNulls={false}` ends it — no flat zero-axis line). Double-click a chip = isolate; "Show all" resets.

2. **`showInTrajectory` flag on Account.** New boolean (default `true`) set via a toggle in the account modal (hidden for Mortgage). Drives each account line's **default** visibility on the chart. **Total Liquid defaults to hidden** (lives in tooltip, per original intent).

3. **Mortgage origination edit.** Edit modal on the Mortgage Countdown card to set **start date + original principal**, so "% paid off" reflects payments made before Horizon was adopted (never a false 0%).

4. **CSV / bank Import feature** (entirely new): sidebar **Import** page (dropzone + account tabs + year-grouped accordion of imported statements with Preview / Re-categorize / Re-download / Delete), and a **3-step wizard**: Account & file → **Map columns** (remembered per-bank preset) → **Review & categorize** (auto-category per row, **duplicate** + **recurring** detection, pre-unchecked to avoid double-counting). Imported rows land in **Variable Spending**.

5. **Snackbars** for save/delete/import confirmations (success/info/warning/error + optional Undo action).

6. **Plan Summary → Outlook deep-link.** Clicking a year in the dashboard Plan Summary opens Outlook with that year's accordion section expanded **and scrolled into view**.

7. **Accounts drag-to-reorder** on the dashboard Accounts card (persisted order).

---

## 5. Naming — follow `ubiquitous-language.md` exactly

- **Payoff** = the milestone/date/marker (KPI "To Payoff", chart "Payoff Marker"). **Not** "Freedom".
- **Freedom Phase** = _only_ the shaded post-payoff region of the chart.
- Keep: **Restschuld**, **Sondertilgung (ST)**, **Total Liquid** (Girokonto + Tagesgeld only), **Tagesgeld**, account kinds — verbatim per the doc.

---

## 6. Known gotchas (carry into the real build)

- **Icon-only buttons need `padding: 0`** (and `line-height: 0`) — the UA default padding decenters glyphs. Bake into the icon-button primitive.
- **Tabular figures:** all money uses `font-variant-numeric: tabular-nums` + the mono face so columns align.
- **Grid overflow:** money/list grids use `minmax(0, …)` columns so long values don't blow out the track.
- Internal prototype vars named `freedom`/`freedomNow` → rename to `postPayoff` in real code.

---

## 7. Brand, Icons & Typography (`handoff/brand/`)

**App / installer icon** — `horizon-icon.svg` (vector master) + `horizon-icon-1024/512/256.png`.

- electron-builder (`package.json` → `build.icon`) wants **`icon.ico`** (Windows) and ideally **`icon.icns`** (mac). Convert from the 1024 PNG/SVG — e.g. `icon.ico` should embed 256/128/64/48/32/16. (Tools: `png-to-ico`, ImageMagick, or electron-icon-builder.) Drop the result at `src/assets/icon.ico`.
- The mark is the Horizon "rising sun over the horizon" arc in gold `#E6B559` on a dark tile — same mark as the sidebar wordmark.

**Typography** — two Google Fonts:
| Role | Family | Weights used |
|---|---|---|
| UI / headings | **Space Grotesk** | 400, 500, 600, 700 |
| All figures (tabular) | **IBM Plex Mono** | 400, 500, 600 |

> ⚠️ **Offline bundling required.** The prototype loads these from the Google Fonts CDN (`@import` in `styles.css`). Horizon is **offline-first Electron** — do **not** ship a CDN dependency. Download both families (woff2) and self-host via `@font-face` bundled in the app. All numeric values use `font-variant-numeric: tabular-nums` + IBM Plex Mono so columns align.

**Type scale** — defined in `src/tokens.js` (`T.type`): `displayLg/display/h1/h2/body/bodyMd/label` (Space Grotesk) and `monoLg/monoMd/monoSm` (IBM Plex Mono). See the live specimen.

**Icon set** — `src/icons.jsx`, 37 stroke icons on a 24-grid (lucide-equivalent; your repo already uses `lucide-react`, so map each name to its lucide counterpart where possible). `dot` and `grip` render filled; all others stroked. Account-kind mapping in `HZ_KIND_ICON`.

**Visual references** (open / view):

- `brand/brand-sheet.html` — live specimen (logo, type scale, color tokens, full icon grid)
- `brand/brand-sheet-preview.png`, `brand/brand-sheet-icons.png` — rendered snapshots
