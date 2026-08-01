# Quick Start Guide (In-App User Manual) — Handoff (delta)

**Scope: one new sidebar trigger + one new slide-over drawer. No changes to any existing screen's data contract, projection model, or routing.**

A self-contained reference drawer that documents every Horizon feature, opened from the sidebar. No search — browse via a grouped table of contents. Standalone destination only (no contextual `?` links from individual screens).

Reference source: `handoff/prototype/src/manual.jsx` (open `handoff/prototype/Horizon.html` → **Help & manual** at the bottom of the sidebar to interact with it live).

**Where this lives in the repo:** add as a sibling folder next to the existing `docs/handoff/`: `docs/handoff/quick-start-guide/`, same shape as `categories-redesign/` and `history-navigation/` (`DELTA.md` + `screens/`). The touched/added prototype files (`src/manual.jsx` new, `src/icons.jsx` +`book` icon, `src/shell.jsx` sidebar trigger, `src/app.jsx` drawer mount) are already folded into the shared `docs/handoff/prototype/src/`. The manual's own screenshot assets live at `docs/handoff/prototype/src/manual-assets/*.png` and are loaded by `<img>` tags inside `manual.jsx` — carry that folder over as-is, or re-point the `img` paths at wherever your repo serves static assets from.

---

## Why

Horizon has grown a lot of feature depth (recurring-only projection engine, milestone/manual savings goals, multi-step CSV import, category management) with no in-product explanation of any of it. Support docs living outside the app go stale and aren't discoverable at the moment someone needs them. We scoped this as **reference documentation you browse, not a guided tour or tooltip system** — no spotlighting, no forced sequence, no "don't show again" onboarding modal. It should feel like flipping open a manual, not being interrupted.

## What's new

### Sidebar trigger (`ManualLink`, in `shell.jsx`)

A slim text link below **Settings**, separated by a full-width divider. Deliberately **not** styled like the primary `NavItem`s above it (Dashboard/Outlook/Month/History/Import/Settings) even though it shares their icon size (18px) and left-alignment — it never gets bold/active/accent treatment, only a hover state, because clicking it doesn't navigate the app (it opens an overlay on top of whatever screen you're on). Two different interaction models should not share one visual weight.

### Manual drawer (`ManualDrawer`, in `manual.jsx`)

A right-side slide-over, ~980px wide, over a dimmed/blurred backdrop. Chosen over a full routed page because the content is auxiliary reference material, not a destination you navigate to and stay on — and right-side avoids overlapping the sidebar, which already owns the left edge.

- **Enter/exit transition**: backdrop fades and the panel slides in from the right on open; on close it animates back out before unmounting (component stays mounted for the transition duration, see `MANUAL_TRANSITION_MS`) rather than popping away instantly.
- **Left rail (TOC)**: topics grouped under four labels — **Getting Started, Overview, Planning, Data, System**. Click a topic to smooth-scroll the content pane to that section (computed via `offsetTop` + `pane.scrollTo`, not `scrollIntoView` — the pane, not the whole page, owns the scroll).
- **Content pane**: one section per topic, each with a short overview blurb, a full-width screenshot of the real screen, and a list of **expandable detail rows** (chevron-to-expand, same interaction language as the Outlook/History year-accordion rows) for deeper how-tos. Some detail rows render a **definition list** (`item.list`: term + description pairs) instead of a paragraph — used for enumerating account kinds, etc.
- **Getting Started topic** (first in the TOC, no screenshot) is a 6-step first-run walkthrough: create accounts → configure the mortgage → add recurring transactions → set a savings goal → import history → read the Trajectory chart. Step 1 expands into a definition list of the five account kinds (Girokonto/Tagesgeld/Mortgage/CreditCard/Investment) and what each is for.
- **Esc key** and **backdrop click** both close the drawer.

## Data (mock only — do not port)

All manual copy (`MANUAL_GROUPS`, `MANUAL_TOPICS` in `manual.jsx`) is prototype placeholder text describing the mock's own feature set — accurate to this prototype, but **written for translation, not for verbatim porting.** Re-author the copy in the real build's voice/terminology once ubiquitous-language review is done; the section structure, grouping, and which topics get a definition-list vs. prose is the thing worth keeping.

## Screens (`screens/`)

1. `screens/01-drawer-toc.png` — drawer open, TOC fully visible, Getting Started section's 6 steps collapsed
2. `screens/02-getting-started-expanded.png` — Step 1 ("Create your accounts") expanded, showing the account-kinds definition list; sidebar shows the "Accounts" TOC item highlighted from scroll position
