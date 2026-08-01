# 28 — Quick Start Guide

## Background

Horizon went into real personal use after 1.2.0. Two things immediately
felt wrong, and both turned out to be coded decisions rather than
regressions — they are logged as defects 1 and 2 in
`docs/live-use-defects.md`:

- The Mortgage Countdown card is absent on a fresh install.
  `MortgageCountdown.tsx:76` returns `null` when no Mortgage account
  exists; `KpiStrip.tsx:36` does the same for the mortgage KPI tiles.
- A Recurring Transfer displays as a positive amount on the account the
  money leaves. The model is "enter a positive amount, the link derives
  the direction" — `projection.ts:88-92` subtracts `r.amount` from the
  source and adds it to the destination — but
  `RecurringTransactionList.tsx:69` renders `<Money cents={rt.amount} sign />`,
  so the row reads `+500` for an outflow.

A fresh Horizon gives no guidance at all: no onboarding, no manual, no
empty-state hints. The roadmap item "Quick Start Guide" left delivery
surface, depth, and demo-data seeding open.

A design handoff for this arrived mid-session at
`docs/handoff/quick-start-guide/`. It is a full re-drop of the prototype
(now including History and the category manager) whose genuinely new
material is `prototype/src/manual.jsx`, `prototype/src/manual-assets/`
(nine PNGs), and a `Help & manual` entry below the sidebar nav
(`shell.jsx:53`). `HANDOFF.md` is byte-different but content-identical —
table reflow only — and does not mention the manual.

## Problem

Produce a manual that explains Horizon **as it behaves today**, reachable
from inside the app, that teaches the order of operations a fresh
install requires (accounts before transactions, categories before
import, mortgage origination before a trajectory) and states the
conventions that surprised a real user.

The manual must not become a vehicle for fixing the app, and must not
document behaviour the app does not have.

## Questions and Answers

1. **Where is the boundary between Quick Start Guide and Live-Use Repair?**
   The guide documents; Live-Use Repair fixes. This epic changes no
   behaviour. Raised as a concern that a manual can become an apology
   for inconsistencies; the decision was taken deliberately with that
   understood.

2. **Where does the manual live — `docs/`, in-app, or both?**
   ✅ In-app. Horizon is offline-first desktop and that is the only
   target; the reader is sitting in front of an empty Dashboard and will
   not go looking on GitHub. ❌ `docs/` copy — unreachable from the
   packaged app. ❌ Both — duplicate maintenance, and the `docs/` copy
   wins arguments it should not.

3. **Is the handoff's copy canonical, or a draft?**
   ✅ Draft. Every claim is verified against real code; where they
   disagree, **the app wins** and the copy is rewritten. Behaviour the
   manual describes but the app lacks is **cut, not built** — otherwise
   this epic grows a feature backlog. The prototype remains canonical
   for _visual and interaction_ spec, per `HANDOFF.md`.

4. **What happens to the nine embedded screenshots?**
   ✅ Text-only, all nine dropped. They render the prototype with mock
   data, which contradicts Q3. The asset machinery — bundling, alt text,
   a capture recipe, staleness with no script to service it — costs the
   same for one image as for nine, and only two were worth keeping.
   ❌ Capture all nine against a seeded database — recurring cost at
   every redesign. ❌ Reuse the prototype PNGs — documents an app that
   does not exist.

5. **Does a fresh install seed demo data?**
   ✅ No. Seeding solves the empty-Dashboard problem by lying, and the
   user must then identify and delete fake accounts — with no
   archive/restore, a mis-deleted account takes its recurring
   transactions with it. `File → Start Fresh…` (`buildMenu.ts:60`)
   already establishes an empty database as the intended baseline. Seed
   fixtures would also have to survive every future migration. The
   Getting Started topic is the alternative to seeding.

6. **Does the drawer open itself on first run?**
   ✅ No. Deriving "fresh install" from `accounts.length === 0` re-opens
   it on every launch until an account exists; making it fire genuinely
   once needs a persisted preference, a migration, and a flag that
   breaks under Start Fresh and restore-from-backup. An unrequested
   overlay on launch is also the thing people close reflexively.

7. **Are the two live-use behaviours documented?**
   ✅ Both, asymmetrically. Hiding-on-empty is stated plainly. Transfer
   direction is stated as the **input rule** only — enter a positive
   amount on the account the money leaves, the link derives direction.
   The manual stays **silent** on Account Detail's "recurring net per
   month", because `recurringNetPerMonth`
   (`src/utils/recurring/recurring.ts:30`) sums raw `r.amount` with no
   link handling while the engine subtracts it — the same transfer is
   `+500` on one surface and `−500` on the other, and no honest sentence
   covers both. ❌ A caveat noting the discrepancy — turns a manual into
   a bug tracker and documents an inconsistency into permanence. It is a
   Live-Use Repair defect, not a manual entry.

8. **Does the native menu get its own topic?**
   ✅ A detail row inside Settings. The roadmap assumed database info,
   backup/restore and updates were menu-exclusive; they are not —
   `StorageCard.tsx:122-138` has Backup and Restore, `PreferencesCard`
   has `AutoUpdateToggle`. Genuinely menu-only: `File → Start Fresh…`,
   `Help → Show Data Folder`, and the `Ctrl+,` / `Ctrl+S` accelerators.
   ❌ Its own topic — two exclusive items do not carry TOC weight equal
   to Dashboard, and it would split the backup story across two sections.

## Design

### Surface

A right-side slide-over drawer, per `manual.jsx`. Not a route, not a
page — it overlays whatever screen the user is on and closes with ESC.

```
┌─────────────────────────────────────────────────┐
│ [book] User Manual · How to use Horizon     [x] │
├──────────────┬──────────────────────────────────┤
│ GETTING…     │  ## Dashboard                    │
│  Getting St. │  blurb…                          │
│ OVERVIEW     │  ▸ KPI strip                     │
│  Dashboard ◀ │  ▾ Trajectory Horizon chart      │
│  Savings St. │     body copy…                   │
│ PLANNING     │  ▸ Accounts list                 │
│  Outlook     │  ▸ Mortgage Countdown            │
│  Month       │                                  │
│  History     │  ## Savings Streak               │
│ DATA         │  …                               │
│  Import      │                                  │
│  Accounts    │                                  │
│  Categories  │                                  │
│ SYSTEM       │                                  │
│  Settings    │                                  │
└──────────────┴──────────────────────────────────┘
   216px TOC          scrolling content pane
```

Width `min(980px, 94vw)`, 320ms transform transition, backdrop blur.
TOC entries scroll-jump to their section in the content pane. All
sections render at once; the TOC is navigation, not a router.

### Entry points

Two, both opening the same drawer:

- `Help & manual` button pinned below the sidebar nav in
  `src/layouts/AppLayout/AppLayout.tsx` (per `shell.jsx:53`)
- A new Help menu item in `electron/buildMenu/buildMenu.ts`, routed
  through the existing `useMenuNavigation` plumbing

### Content model

Content is typed data, never prose embedded in TSX — components stay
dumb and every claim is assertable in a test.

`src/features/manual/manualTypes.ts`:

```ts
import type { LucideIcon } from "lucide-react";

export type ManualTopicId =
  | "start"
  | "dashboard"
  | "streak"
  | "outlook"
  | "month"
  | "history"
  | "import"
  | "accounts"
  | "categories"
  | "settings";

export interface ManualTerm {
  term: string;
  definition: string;
}

export interface ManualDetail {
  heading: string;
  body: string;
  terms?: ManualTerm[];
}

export interface ManualTopic {
  id: ManualTopicId;
  icon: LucideIcon;
  title: string;
  blurb: string;
  details: ManualDetail[];
}

export interface ManualGroup {
  label: string;
  items: ManualTopicId[];
}
```

`icon` holds the lucide component itself rather than a string name — no
registry lookup, no `any`, and it fails at compile time if the icon does
not exist.

Note the deviation from `manual.jsx`: its `{ h, b, list: [{ t, d }] }`
shorthand becomes named fields, and `img` is **absent** entirely (Q4).

### File layout

```
src/features/manual/
├── ManualDrawer/
│   ├── ManualDrawer.tsx
│   ├── ManualDrawer.styles.ts
│   └── ManualDrawer.test.tsx
├── ManualSection/
│   ├── ManualSection.tsx
│   ├── ManualSection.styles.ts
│   └── ManualSection.test.tsx
├── ManualDetailRow/
│   ├── ManualDetailRow.tsx
│   ├── ManualDetailRow.styles.ts
│   └── ManualDetailRow.test.tsx
├── manualTopics.ts        ← the copy
├── manualTypes.ts
└── index.ts
```

`features/` rather than `components/`, alongside the existing
app-concern features `menu/`, `settings/`, `updates/`. The manual owns
its content, TOC structure, and open/close state — that is feature
territory under the layer rules in CLAUDE.md.

### Copy corrections already identified

Verification against code is per-row build work, but these are known:

| Claim in `manual.jsx`                     | Reality                                                                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Year comparison "Marked Planned"          | Shipped — no placeholder in `src/features/months/YearComparison/`                                                                                 |
| Screen called "Outlook" throughout        | Sidebar says Outlook (`AppLayout.tsx:88`), page says "Financial Plan" with _Outlook_ as overline (`PlanPage.tsx:42-43`) — pick what the user sees |
| Import "recognizes Sparkasse, DKB, ING …" | Predates Real Bank CSV Import replacing the guessed presets                                                                                       |
| Settings → Preferences → Categories       | ✅ Accurate (`PreferencesCard.tsx:53`)                                                                                                            |
| Database backup/restore in Settings       | ✅ Accurate (`StorageCard.tsx:122-138`)                                                                                                           |

### Content additions beyond the handoff

- **Getting Started step 2** — the Mortgage Countdown card and mortgage
  KPI tiles do not appear until a Mortgage account exists.
- **History / Month** — Year Archive lists only years with imported
  statements; the Month picker is bounded to imported months.
- **Accounts → Recurring transactions** — the transfer input rule.
- **Settings → Native menu** — `Start Fresh…` (the manual's one
  destructive warning), `Show Data Folder`, `Ctrl+,` / `Ctrl+S`.

## Implementation Plan

**Phase 1 — thinnest end-to-end slice.** `manualTypes.ts` plus
`manualTopics.ts` holding a single topic (Getting Started, verified
copy), a `ManualDrawer` that renders it, and the sidebar `Help & manual`
button. Open, scroll, close with ESC and backdrop. One real topic
visible in the running app.

**Phase 2 — structure.** `ManualSection` and `ManualDetailRow`
(collapsible), the grouped TOC rail, scroll-jump, and the active-topic
highlight. Still one topic; the shell is complete.

**Phase 3 — copy, verified.** All ten topics ported from `manual.jsx`,
each detail row checked against real code, corrections from the table
above applied, and the four content additions written. The bulk of the
work and the part that carries the epic's value.

**Phase 4 — Electron entry point.** Help menu item in `buildMenu.ts`,
wired through `useMenuNavigation` to the same drawer state.

**Phase 5 — polish.** `prefers-reduced-motion` handling for the
transform transition (consistent with the 1.2.0 cross-fade work), focus
trap and restore, and the accessibility pass on the TOC buttons.

## Trade-offs

**Easier.** Copy lives in one typed file, so a reviewer can read every
claim the app makes about itself in one place, and tests can assert on
it. No route means the manual is reachable from any screen without
losing the user's position. No images means no staleness debt.

**Harder.** Prose in a `.ts` file is less pleasant to edit than
markdown, and it is app code — it carries lint, typecheck and test
obligations a markdown file would not. Every future feature must
remember to update `manualTopics.ts`, and nothing enforces that; the
manual will drift unless it is treated as part of the definition of
done. Dropping the screenshots makes the drawer visibly more text-dense
than the handoff design.

**Ruled out of scope.**

- Fixing either live-use defect, including the `recurringNetPerMonth`
  sign contradiction — Live-Use Repair owns those.
- Empty states on the surfaces that hide themselves — the open question
  logged against defect 2. This epic makes the manual _findable_, not
  _unmissable_; a fresh Dashboard still shows nothing and says nothing.
- Demo data seeding, permanently.
- Search within the manual — ten topics do not need it.
- Contextual deep-links from screens into their manual topic. Plausible
  later; it would need every screen to know a `ManualTopicId`, which is
  coupling this epic has not earned.

## Addendum — `quick-start-guide/DELTA.md`

Found after the sections above were written. The handoff carries a
feature-specific delta at
`docs/handoff/quick-start-guide/quick-start-guide/DELTA.md` plus two
reference screens (`01-drawer-toc.png`, `02-getting-started-expanded.png`)
that the initial pass missed. It confirms the design independently and
adds constraints. Recorded here rather than edited into the sections
above.

**Confirms, without contradiction:** drawer over routed page (auxiliary
reference, not a destination); right side, because the sidebar owns the
left edge; no search; grouped TOC; ESC and backdrop close; expandable
detail rows; definition lists for account kinds; the six-step Getting
Started topic with no screenshot; and "standalone destination only — no
contextual `?` links from individual screens", which matches the
out-of-scope call above.

**Strengthens Q3.** DELTA §33-35 marks all of `MANUAL_GROUPS` /
`MANUAL_TOPICS` as **"mock only — do not port"**, and states the copy is
"written for translation, not for verbatim porting… re-author the copy
in the real build's voice/terminology once ubiquitous-language review is
done; the section structure, grouping, and which topics get a
definition-list vs. prose is the thing worth keeping." The App-Wins Rule
was argued from evidence of stale claims; the handoff independently
instructs the same thing, more strongly.

**Adds — sidebar trigger styling.** The `Help & manual` link is a slim
text link **below Settings**, separated by a full-width divider, sharing
the nav items' 18px icon and left alignment but **never** taking
bold/active/accent treatment — hover state only. Rationale, verbatim:
"two different interaction models should not share one visual weight."
It opens an overlay; it does not navigate. Phase 1 must not reuse the
`NavItem` styling.

**Adds — implementation notes.** Detail rows use the same
chevron-to-expand interaction language as the existing Outlook/History
year-accordion rows. TOC jumps compute `offsetTop` + `pane.scrollTo` —
explicitly not `scrollIntoView`, because the pane owns the scroll, not
the page. The drawer stays mounted for `MANUAL_TRANSITION_MS` on close
so the exit animation completes before unmount.

**Deliberate deviations from DELTA, both decided with the user:**

1. DELTA §29 specifies "a full-width screenshot of the real screen" per
   topic. We ship **text-only** (Q4). The drawer will read more
   text-dense than `01-drawer-toc.png` shows.
2. DELTA scopes the trigger to the sidebar alone. We add a **second
   entry point** in the Electron Help menu (Q2/Q6), which the handoff
   does not mention.

**Handoff errata.** DELTA §28 says "grouped under four labels" and then
lists five — Getting Started, Overview, Planning, Data, System. Five is
correct, per `manual.jsx:7-13` and `01-drawer-toc.png`.
