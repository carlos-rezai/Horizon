# Plan: Quick Start Guide (In-App User Manual)

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/210

## Architectural decisions

Durable decisions that apply across all phases:

- **Routes**: **none**. The manual is an overlay, not a destination — it
  owns no route, adds no router entry, and never changes `pathname`. A
  reader keeps their place on whatever screen they were on. This is the
  decision that rules out `menu:navigate` as the Electron transport
  (see below) and rules out contextual deep-links from screens.
- **Schema**: **none**. No table, no column, no migration, no server
  route, no storage-driver method. This epic is renderer + Electron main
  only, and touches neither the projection engine nor `server/`.
- **Feature home**: a new `src/features/manual/`, sibling to the existing
  app-concern features (`menu/`, `settings/`, `updates/`). The manual owns
  its content, its table-of-contents structure, and its open/close state
  — feature territory under the layer rules. Components are co-located
  with their `.test.tsx` and `.styles.ts` files.
- **Key models** (a types module inside the feature):
  - `ManualTopicId` — a **closed union of exactly ten ids**:
    `start`, `dashboard`, `streak`, `outlook`, `month`, `history`,
    `import`, `accounts`, `categories`, `settings`.
  - `ManualTerm` — `{ term, definition }`.
  - `ManualDetail` — `{ heading, body, terms? }`. `terms` present means
    the row expands into a definition list instead of a paragraph.
  - `ManualTopic` — `{ id, icon, title, blurb, details }`.
  - `ManualGroup` — `{ label, topicIds }`.
  - `icon` holds the **lucide component itself**, not a string name. No
    registry lookup, no `any`, and a nonexistent icon fails at compile
    time.
  - The handoff's `{ h, b, list: [{ t, d }] }` shorthand becomes these
    named fields. The handoff's `img` field is **absent entirely** — the
    manual is text-only.
- **Group structure** (fixed order, five groups):
  1. **Getting Started** — `start`
  2. **Overview** — `dashboard`, `streak`
  3. **Planning** — `outlook`, `month`, `history`
  4. **Data** — `import`, `accounts`, `categories`
  5. **System** — `settings`
     (The handoff delta's "four labels" is an erratum; five is correct.)
- **Content location**: all copy lives in **one typed content module** in
  the feature — typed data, not prose embedded in TSX. Components stay
  dumb; every claim is assertable.
- **Manual index**: a pure module derives the flat, ordered topic list
  from the groups plus the topic record, and is the single place that
  knows the relationship between the rail and the content pane. It
  imports no React and touches no DOM.
- **Electron transport**: a dedicated channel, **`menu:open-manual`**,
  carrying no payload — explicitly _not_ `menu:navigate`, which carries a
  route string into the router and would be a lie here. The preload
  bridge exposes it on the existing `menu` namespace as
  **`onOpenManual(cb) => unsubscribe`**, matching the shape of its
  siblings (`onNavigate`, `onNotify`, `onConfirm`). The renderer
  subscribes through a hook that mirrors `useMenuNavigation`.
- **Entry points**: exactly two — the sidebar `Help & manual` trigger and
  the Electron `Help` menu item — both driving the same drawer state.
  **The drawer never opens itself**: no auto-open on first run, no
  fresh-install detection, no persisted "seen" preference.
- **Scroll ownership**: the content **pane** owns the scroll, not the
  page. Jumps compute the target's offset within the pane and scroll the
  pane — never `scrollIntoView`.
- **The App-Wins Rule** (governs every phase that writes copy): where the
  handoff's `manual.jsx` copy and the shipped app disagree, **the app is
  correct and the copy is rewritten**. Behaviour the copy describes but
  the app lacks is **cut, not built**. This epic changes no app behaviour
  whatsoever — if a phase finds itself editing a screen, the phase is
  wrong.

---

## Phase 1: Tracer bullet — the drawer opens, renders one topic, and closes

**User stories**: 1, 2, 3, 4, 5, 6, 7, 11, 45, 46, 47, 48, 49

### What to build

The thinnest complete path from sidebar to readable content. The types
module, the content module holding **one verified topic** (Getting
Started, blurb plus its six step headings — full detail copy comes in
phase 3), the pure manual index with its structural invariant, the
lifecycle hook, the drawer shell, and the sidebar trigger.

The lifecycle hook owns the whole open/close story behind a small
interface — whether the drawer is open, whether it is currently mounted,
and the open/close actions. It encapsulates the delayed unmount that lets
the exit transition finish before the drawer leaves the tree, the ESC
listener, and the reduced-motion path via the existing
`useReducedMotion`, which collapses the delay so reduced-motion users get
no lingering mounted overlay. Reduced motion lands here rather than in
the accessibility phase because the hook owns the timing; adding it later
would mean writing that timing twice.

The trigger is pinned below the sidebar nav, beneath Settings, separated
by a full-width divider. It shares the nav items' icon size and left
alignment but **must not reuse `StyledNavLink`** and **never** takes the
bold/active/accent treatment — hover state only. It opens an overlay; it
does not navigate, and two interaction models must not share one visual
weight.

At the end of this phase the manual is findable, readable, and
dismissable. It is not yet navigable — that is phase 2.

### Acceptance criteria

- [ ] A `Help & manual` trigger appears below the sidebar nav, beneath
      Settings, separated by a full-width divider, with its own styling —
      visibly distinct from the nav links and never showing an
      active/current treatment.
- [ ] Clicking the trigger opens a right-side slide-over over a dimmed
      backdrop, on top of whatever screen the reader is on; the URL does
      not change and the screen behind is not unmounted.
- [ ] The drawer renders the Getting Started topic's icon, title and
      one-paragraph blurb.
- [ ] ESC closes the drawer.
- [ ] Clicking the backdrop closes the drawer; clicking inside the panel
      does not.
- [ ] An explicit close button in the drawer header closes the drawer.
- [ ] The panel slides in on open and animates back out on close, staying
      mounted for the transition duration before unmounting.
- [ ] Under `prefers-reduced-motion: reduce` the drawer appears and
      disappears without the slide, and the lingering mount collapses —
      no reduced-motion user is left with an invisible mounted overlay.
- [ ] The drawer is closed on app launch and stays closed until asked
      for; nothing opens it automatically.
- [ ] Reopening the drawer after scrolling and closing shows it scrolled
      to the top.
- [ ] All manual copy lives in one typed content module; no claim is
      embedded in a component.
- [ ] The manual index test asserts the flat ordered topic list matches
      group order, that every `ManualTopicId` appears in exactly one
      group, that no id appears twice, and that no group references an id
      with no topic.
- [ ] The lifecycle hook has tests for open, close, ESC-closes, the
      delayed unmount, and the reduced-motion collapse (using the
      established `matchMedia` mocking pattern).
- [ ] A fresh install still seeds no accounts, categories or
      transactions — this phase adds no demo data.
- [ ] No existing screen's behaviour, data contract or routing changed.

---

## Phase 2: Structure — table of contents, sections, detail rows

**User stories**: 8, 9, 10, 12, 13, 14

### What to build

The drawer's real shape, still on the single Getting Started topic. A
grouped table-of-contents rail on the left, driven entirely by the manual
index; a section component rendering one topic (icon, title, blurb, its
detail rows); and a collapsible detail-row component using the same
chevron-to-expand interaction language as the existing Outlook and
History year-accordion rows, with the optional term-and-definition list
rendering as a reference list rather than prose.

The content pane renders **every** topic at once — the rail is
navigation, never a router. Clicking a rail entry sets the active topic
immediately and scrolls the pane to that section's offset within the
pane. A scroll-spy, encapsulated behind its own hook that takes the
section elements and the scrolling pane and returns the active topic id,
takes over once the scroll settles, so free-scrolling keeps the rail
truthful. This is a deliberate departure from `manual.jsx`, which only
sets the active topic on click.

Getting Started's six steps become real detail rows here, with step 1
carrying the five-account-kind term list — enough to prove both row
shapes. Verifying the wording of all ten topics is phases 3 and 4.

After this phase the shell is complete and every later phase is content
or plumbing.

### Acceptance criteria

- [ ] The left rail renders all five group labels in fixed order, each
      with its topics in order, derived from the manual index rather than
      a hand-written list.
- [ ] The content pane renders every topic in the index, in order.
- [ ] Clicking a rail entry scrolls the content pane to that topic and
      marks it active immediately.
- [ ] The scroll jump scrolls the pane by computed offset — not
      `scrollIntoView` — so the page behind does not move.
- [ ] Scrolling the pane freely updates the highlighted rail entry to
      whichever topic is being shown; the observation mechanism sits
      behind its own hook and is stubbable.
- [ ] Each topic renders its blurb above its detail rows, so a reader can
      judge the topic without expanding anything.
- [ ] Detail rows start collapsed; clicking expands, clicking again
      collapses; the chevron interaction matches the year-accordion rows.
- [ ] A detail row carrying a term list renders each term with its
      definition as a definition list, not a paragraph.
- [ ] Getting Started's six steps render as detail rows, with step 1
      expanding into the five account kinds.
- [ ] Component tests cover: the rail renders every group label and topic
      title, the pane renders every topic, expand/collapse round-trips, a
      term list renders each term with its definition, and clicking a
      rail entry marks that topic active.

---

## Phase 3: Copy A — Getting Started, Overview, Planning

**User stories**: 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28,
51

### What to build

The first six topics, fully written and **verified against shipped code
row by row**: `start`, `dashboard`, `streak`, `outlook`, `month`,
`history`. Each detail row is checked against the real implementation as
it is written — the handoff copy is a structural reference, not a source
of truth.

Getting Started becomes the complete six-step answer to the empty
Dashboard, in the order the steps must happen. Dashboard covers the KPI
tiles, the Trajectory Horizon toggle and solo behaviour, accounts-list
reordering and the Plan Summary. Savings Streak covers the two goal
modes, the calendar strip's tile states, which accounts are tracked, and
how the streak count is derived. Outlook covers the summary strip, the
year accordion, jumping to a month, and Recalculate. Month covers
navigation, the spending list and its account filters, the one-off
expense, the breakdown donut, and the year comparison. History covers the
range chips, the Year Archive, and the chart series behaviour.

**Corrections carried in this phase**: the year comparison is _shipped_,
not "Marked Planned" — that row is rewritten. The screen the sidebar
calls Outlook has a page header reading "Financial Plan" with _Outlook_
as its overline; the copy uses what the user actually sees.

**Additions beyond the handoff**: the Mortgage Countdown card and
mortgage KPI tiles do not appear until a Mortgage account exists; the
Year Archive lists only years with at least one imported statement; the
Month picker is bounded to the range of imported months; a mortgage
account's opening balance is the remaining Restschuld, not the original
loan amount, and origination details are what "% paid off" needs.

**Deliberate silence**: nothing is written about Account Detail's
"recurring net per month". The recurring-net helper sums raw amounts with
no link handling while the projection engine subtracts them, so the same
transfer reads `+500` on one surface and `−500` on the other; no honest
sentence covers both, and a caveat would document an inconsistency into
permanence. That is a Live-Use Repair defect, not a manual entry.

### Acceptance criteria

- [ ] Six topics — `start`, `dashboard`, `streak`, `outlook`, `month`,
      `history` — carry a blurb and their full detail rows.
- [ ] Getting Started gives six ordered setup steps from blank database
      to working projection, with step 1 defining all five account kinds.
- [ ] The manual states that the Mortgage Countdown card and mortgage KPI
      tiles are absent until a Mortgage account exists.
- [ ] The manual states that the projection is driven only by recurring
      transactions.
- [ ] The manual states that a mortgage account's opening balance is the
      remaining Restschuld, and explains what origination details are
      for.
- [ ] The manual states that the Year Archive lists only years with an
      imported statement, and that the Month picker is bounded to
      imported months.
- [ ] The year-comparison row describes shipped behaviour; no "planned"
      or placeholder language survives.
- [ ] The Outlook topic's naming matches what the user actually sees on
      screen.
- [ ] Nothing in these six topics describes behaviour the app does not
      have; every row was checked against real code, and disagreements
      were resolved in the app's favour.
- [ ] No copy is written about Account Detail's recurring net per month.
- [ ] The structural index test still passes with six topics populated —
      no orphans, no duplicates.

---

## Phase 4: Copy B — Data, System

**User stories**: 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 51

### What to build

The remaining four topics, verified the same way: `import`, `accounts`,
`categories`, `settings`.

Import walks the wizard step by step — account, column mapping, review
and categorize — states that mappings are remembered per bank, explains
why likely duplicates and recurring matches arrive unchecked, and states
that everything is parsed and stored locally. Accounts defines all five
kinds and how each feeds the projection, explains recurring transactions
(amount, frequency, day, category, linking), and warns that deleting an
account is permanent and takes its recurring transactions with it.
Categories covers add, rename, recolor and remove, and what happens when
a category that transactions still reference is deleted. Settings covers
database information, backup and restore, and the auto-update
preference.

**Corrections carried in this phase**: the "Sparkasse, DKB, ING and other
common export formats" claim predates Real Bank CSV Import replacing the
guessed presets with ones built from real exports, and is rewritten. The
"Notification previews" Settings card does not exist — the shipped
Settings screen has Storage, Preferences and About — so that row is
**cut**, not built. Settings → Preferences → Categories and
backup/restore are accurate and stay.

**Additions beyond the handoff**: the transfer input rule under Accounts
— a positive amount on the account the money leaves, with the linked
account deriving the direction — and a Settings detail row covering what
only the native menu can do: `Start Fresh…` (the manual's one destructive
warning), `Show Data Folder`, and the `Ctrl+,` / `Ctrl+S` accelerators.
The native menu does **not** get its own topic: only those items are
menu-exclusive, and a separate topic would split the backup story across
two sections.

### Acceptance criteria

- [ ] Four topics — `import`, `accounts`, `categories`, `settings` —
      carry a blurb and their full detail rows.
- [ ] The Import topic walks the wizard step by step, states that column
      mappings are remembered per bank, explains the pre-unchecked
      duplicate and recurring rows, and states that parsing and storage
      are local.
- [ ] No bank-preset claim survives that Real Bank CSV Import invalidated.
- [ ] The Accounts topic defines all five kinds and how each feeds the
      projection, and explains recurring transactions including linking.
- [ ] The Accounts topic states the transfer input rule: a positive
      amount on the account the money leaves, with the linked account
      deriving the direction.
- [ ] The Accounts topic warns that deleting an account is permanent and
      takes its recurring transactions with it.
- [ ] The Categories topic covers add, rename, recolor, remove, and the
      reassignment prompt for a category transactions still reference.
- [ ] The Settings topic covers database information, backup and restore,
      and the auto-update preference — and contains no "Notification
      previews" row.
- [ ] A Settings detail row covers `Start Fresh…`, `Show Data Folder` and
      the `Ctrl+,` / `Ctrl+S` accelerators, with `Start Fresh…` clearly
      marked destructive.
- [ ] All ten topics are now populated, and the structural index test
      passes over the complete set.
- [ ] Nothing in these four topics describes behaviour the app does not
      have.

---

## Phase 5: Electron entry point

**User stories**: 41

### What to build

The second entry point, end to end: menu builder → main process → preload
bridge → renderer hook → the same drawer state phase 1 built. Nothing
here is a second implementation of anything; it is a second way to call
`open()`.

The menu builder gains a `manual` handler alongside its existing ones and
a `Help` submenu item that invokes it. The main process sends
`menu:open-manual` on that handler. The preload bridge exposes a
subscription for it on the existing `menu` namespace, returning an
unsubscribe function like its siblings, and the bridge's ambient type
declaration in the renderer is extended to match. A renderer hook mirrors
`useMenuNavigation`: subscribes on mount, opens the drawer on message,
unsubscribes on unmount, and no-ops when the Electron bridge is absent
(the browser dev server).

### Acceptance criteria

- [ ] The Electron `Help` menu contains an item that opens the manual.
- [ ] Choosing it opens the drawer on whatever screen is showing, without
      changing the route.
- [ ] The channel is `menu:open-manual`, distinct from `menu:navigate`;
      no route string is involved.
- [ ] The preload bridge exposes the subscription on the `menu` namespace
      and returns an unsubscribe function, matching its siblings.
- [ ] The ambient bridge type declares the new method; the renderer
      compiles with no `any` and no cast.
- [ ] The renderer hook subscribes on mount, opens the drawer on message,
      unsubscribes on unmount, and no-ops when `window.horizon` is
      absent — with tests mirroring the existing menu-navigation hook
      test, including its mock shape.
- [ ] The pure menu-builder test asserts the `Help` submenu contains the
      manual item and that clicking it invokes the supplied handler.
- [ ] Opening from the menu and opening from the sidebar drive the same
      drawer state — the drawer cannot end up open twice or in conflict.

---

## Phase 6: Accessibility polish

**User stories**: 42, 43, 44

### What to build

The keyboard and screen-reader pass over the finished drawer. Focus moves
into the drawer when it opens and returns to the trigger that opened it
when it closes, so opening the manual never strands a keyboard position.
Focus is trapped inside the drawer while it is open, so tabbing cannot
wander onto the screen behind the backdrop. The drawer is announced as a
dialog with a name, and the table-of-contents buttons and detail rows
expose their expanded state.

Reduced motion is **not** in this phase — it shipped with the lifecycle
hook in phase 1.

### Acceptance criteria

- [ ] Opening the drawer moves focus into it.
- [ ] Closing the drawer returns focus to the control that opened it
      (including when opened from the Electron menu, where there is no
      in-page trigger — focus must land somewhere sane rather than on
      `body`).
- [ ] Tab and Shift+Tab cycle within the drawer and never reach the
      screen behind the backdrop.
- [ ] The drawer exposes a dialog role with an accessible name.
- [ ] Table-of-contents entries expose their selected/current state, and
      detail rows expose `aria-expanded` reflecting whether they are
      open.
- [ ] Tests cover the accessible name and the expanded state of the
      expandable controls.
- [ ] The full epic is verifiable end to end: open from sidebar or menu,
      browse ten topics by rail or scroll, expand rows, close by ESC,
      backdrop or button — with no app behaviour changed anywhere else.
