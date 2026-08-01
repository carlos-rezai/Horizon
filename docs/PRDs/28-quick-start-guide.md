## Problem Statement

I opened Horizon as my real finance tracker for the first time and got an
empty Dashboard with nothing on it — no accounts, no chart, no mortgage
card, and no hint about what to do first. Nothing in the app explains
that accounts have to exist before transactions, that categories have to
exist before an import is useful, or that the Mortgage Countdown card is
missing because I have not created a Mortgage account yet rather than
because the app is broken.

The app has also grown conventions that surprised me even though I built
it: a recurring transfer is entered as a positive amount on the account
the money leaves, and several surfaces render nothing at all when their
data is absent. There is no place in the product that states any of
this. Documentation on GitHub does not help — Horizon is an offline-first
desktop app, and the person who needs the explanation is sitting in front
of an empty window, not browsing a repository.

## Solution

An in-app **User Manual**: a right-side slide-over **Manual Drawer**,
opened from a `Help & manual` link below the sidebar nav or from the
Electron `Help` menu, closed with ESC or a backdrop click. It overlays
whatever screen the reader is on and never takes over the route, so
nobody loses their place to read it.

Its left rail is a grouped table of contents over ten **Manual Topics**,
clustered into five **Manual Groups** — Getting Started, Overview,
Planning, Data, System. The content pane renders every topic at once;
the rail scroll-jumps between them and highlights whichever topic the
pane is currently showing. Each topic carries a short blurb and a list of
collapsible **Detail Rows**; some rows expand into a term-and-definition
list rather than a paragraph.

The first topic, **Getting Started**, is the answer to the empty
Dashboard: six ordered steps from a blank database to a working
projection — create accounts, configure the mortgage, add recurring
transactions, set a savings goal, import history, read the Trajectory
chart — with step 1 expanding into what each of the five account kinds is
for.

Every claim in the manual is verified against shipped code before it
ships. Where the handoff copy and the app disagree, the app wins and the
copy is rewritten; behaviour the copy describes but the app lacks is
cut, not built. This epic changes no app behaviour whatsoever.

## User Stories

1. As a first-time user staring at an empty Dashboard, I want a visible
   `Help & manual` entry in the sidebar, so that I can find an
   explanation without leaving the app or searching the internet.
2. As a user, I want the manual to open as an overlay on top of the
   screen I am on, so that reading it does not cost me my place.
3. As a user, I want the manual to close with the ESC key, so that I can
   dismiss it without reaching for the mouse.
4. As a user, I want clicking the dimmed backdrop to close the manual, so
   that dismissing it matches every other overlay in the app.
5. As a user, I want an explicit close button in the drawer header, so
   that the exit is discoverable and not folded into a keyboard shortcut.
6. As a user, I want the drawer to slide in and out rather than snapping,
   so that it is obvious the manual is layered over my screen and not a
   navigation away from it.
7. As a user who has asked the OS to reduce motion, I want the drawer to
   appear without the slide animation, so that the app respects my
   accessibility preference the way the rest of Horizon already does.
8. As a user, I want a grouped table of contents on the left of the
   drawer, so that I can see the whole shape of what is documented before
   reading any of it.
9. As a user, I want clicking a table-of-contents entry to scroll the
   content pane to that topic, so that I can jump straight to what I
   need.
10. As a user, I want the table-of-contents entry for whatever topic I am
    reading to be highlighted as I scroll freely, so that the rail keeps
    telling me where I am and does not go stale.
11. As a user, I want each topic to open with a one-paragraph blurb, so
    that I can tell whether the topic is the one I want before expanding
    anything.
12. As a user, I want the how-to detail under each topic collapsed into
    expandable rows, so that a topic reads as a scannable list rather
    than a wall of prose.
13. As a user, I want the detail rows to expand with the same
    chevron interaction as the Outlook and History year accordions, so
    that the manual feels like part of Horizon rather than a bolted-on
    help system.
14. As a user, I want some detail rows to expand into a
    term-and-definition list, so that enumerations like the account kinds
    read as a reference table instead of a run-on sentence.
15. As a first-time user, I want a Getting Started topic that gives the
    setup steps in the order they must happen, so that I do not discover
    the ordering by hitting a dead end.
16. As a first-time user, I want Getting Started step 1 to explain what
    each of the five account kinds is for, so that I pick the right kind
    rather than guessing from its bank label.
17. As a first-time user, I want to be told that the Mortgage Countdown
    card and the mortgage KPI tiles do not appear until a Mortgage
    account exists, so that their absence reads as expected behaviour
    rather than a bug.
18. As a user, I want to be told that the projection is driven only by
    recurring transactions, so that I understand why an empty Outlook
    means I have not entered any, not that the engine failed.
19. As a user entering a savings transfer between two of my accounts, I
    want the manual to state the input rule — a positive amount on the
    account the money leaves, with the linked account deriving the
    direction — so that I enter it correctly the first time.
20. As a user, I want the manual to explain that a mortgage account's
    opening balance is the remaining Restschuld and not the original loan
    amount, so that my payoff percentage is not silently wrong.
21. As a user, I want the manual to explain what mortgage origination
    details are for, so that I know why "% paid off" needs the original
    principal, start date and term.
22. As a user, I want the Dashboard topic to explain each KPI tile, the
    Trajectory Horizon chart's toggle and solo behaviour, the accounts
    list reordering, and the Plan Summary, so that every element on my
    busiest screen has an explanation.
23. As a user, I want the Savings Streak topic to explain the two goal
    modes, the calendar strip's tile states, which accounts are tracked,
    and how the streak count is derived, so that I trust the number next
    to the flame.
24. As a user, I want the Outlook topic to explain the summary strip, the
    year accordion, jumping to a month, and Recalculate, so that I know
    what the 240-month projection is showing me.
25. As a user, I want the Month Overview topic to explain month
    navigation, the spending list and its account filters, adding a
    one-off expense, the breakdown donut, and the year comparison, so
    that I can read a month without guessing.
26. As a user, I want to be told the Month picker is bounded to the range
    of months I have imported statements for, so that a missing month
    reads as missing data rather than a broken control.
27. As a user, I want the History topic to explain the range chips, the
    Year Archive, and the chart series behaviour, so that I understand
    History shows reconstructed actuals rather than projections.
28. As a user, I want to be told the Year Archive lists only years with
    at least one imported statement, so that an empty archive is
    self-explanatory.
29. As a user, I want the Import topic to walk through the wizard step by
    step — account, column mapping, review and categorize — so that a
    multi-step flow does not require trial and error.
30. As a user, I want the Import topic to state that column mappings are
    remembered per bank, so that I do not re-map the same export every
    month.
31. As a user, I want the Import topic to explain why likely duplicates
    and recurring matches arrive unchecked, so that I do not blindly
    re-check them and double-count.
32. As a user, I want the Import topic to state that everything is parsed
    and stored locally, so that I know my bank statements do not leave
    the machine.
33. As a user, I want the Accounts topic to define all five account kinds
    and how each one feeds the projection, so that I understand the
    consequences of the kind I chose.
34. As a user, I want the Accounts topic to explain recurring
    transactions — amount, frequency, day, category, and linking — so
    that I can model salary, rent, savings and Sondertilgung correctly.
35. As a user, I want to be warned that deleting an account is permanent
    and takes its recurring transactions with it, so that I make a backup
    before I do something irreversible.
36. As a user, I want the Categories topic to explain adding, renaming,
    recoloring and removing categories, so that I can shape the category
    set before importing rather than after.
37. As a user, I want to be told what happens when I delete a category
    that transactions still reference, so that the reassignment prompt is
    expected rather than alarming.
38. As a user, I want the Settings topic to cover the database
    information, backup and restore, and the auto-update preference, so
    that I know where my data lives and how to protect it.
39. As a user, I want a detail row covering what only the native menu
    can do — Start Fresh, Show Data Folder, and the `Ctrl+,` / `Ctrl+S`
    accelerators — so that I do not hunt for them in the Settings screen.
40. As a user, I want `Start Fresh…` marked clearly as destructive, so
    that I do not wipe my database out of curiosity.
41. As a keyboard user, I want to open the manual from the Electron
    `Help` menu, so that it is reachable the same way the app's other
    system-level actions are.
42. As a keyboard user, I want focus moved into the drawer when it opens
    and returned to the trigger when it closes, so that opening the
    manual does not strand my keyboard position.
43. As a keyboard user, I want focus trapped inside the drawer while it
    is open, so that tabbing does not wander onto the screen behind the
    backdrop.
44. As a screen-reader user, I want the drawer announced as a dialog with
    a name, and the table-of-contents entries and detail rows exposed
    with their expanded state, so that the manual is navigable without
    sight.
45. As a user, I want the `Help & manual` link to look different from the
    navigation items above it, so that I can tell it opens an overlay
    rather than navigating somewhere.
46. As a user who opens the manual, scrolls, and closes it, I want it to
    reopen at the top the next time, so that reopening is predictable.
47. As a returning user, I want the manual to stay closed unless I ask
    for it, so that launching Horizon never puts an overlay in my way.
48. As a user, I want no fake demo accounts or transactions in a fresh
    install, so that I never have to identify and delete data I did not
    create.
49. As the maintainer, I want every claim in the manual to live in one
    typed content file, so that I can read everything the app says about
    itself in one place and assert on it in tests.
50. As the maintainer, I want a structural check that every topic appears
    in exactly one group, so that a topic can never be added to the
    content pane and silently missed from the table of contents.
51. As the maintainer, I want the manual to describe only shipped
    behaviour, so that it never becomes a specification for features
    nobody built.

## Implementation Decisions

### Scope boundary

- The epic ships **documentation only**. No existing screen's behaviour,
  data contract, projection maths, or routing changes.
- The **App-Wins Rule** governs all copy: where the handoff's
  `manual.jsx` copy and the shipped app disagree, the app is correct and
  the copy is rewritten. Behaviour the copy describes but the app lacks
  is **cut, not built**.
- The handoff's `MANUAL_GROUPS` / `MANUAL_TOPICS` are explicitly marked
  "mock only — do not port" by its own DELTA. What is kept is the
  **structure**: which topics exist, how they group, and which rows carry
  a definition list versus prose. The prose itself is re-authored in the
  app's terminology.

### Content model

- Content is **typed data, not prose embedded in TSX**. Components stay
  dumb; every claim is assertable.
- A types module declares `ManualTopicId` (a closed union of the ten
  topic ids), `ManualTerm` (term + definition), `ManualDetail` (heading,
  body, optional terms), `ManualTopic` (id, icon, title, blurb, details)
  and `ManualGroup` (label, ordered topic ids).
- `icon` holds the lucide component itself rather than a string name — no
  registry lookup, no `any`, and a nonexistent icon fails at compile
  time.
- The handoff's `{ h, b, list: [{ t, d }] }` shorthand becomes named
  fields. The handoff's `img` field is **absent entirely** — the manual
  is text-only.

### Deep module — the manual index

A pure module derives the flat, ordered topic list from the groups plus
the topic record, and is the single place that knows the relationship
between the table of contents and the content pane. It exposes the
ordered topic sequence for rendering, and it validates the invariant that
every `ManualTopicId` appears in exactly one group — no orphans, no
duplicates. It imports no React and touches no DOM, so it is fully
testable in isolation and cannot drift from the content it indexes.

### Deep module — the drawer lifecycle hook

A hook owns the whole open/close lifecycle behind a small interface:
whether the drawer is open, whether it is currently mounted, and the
open/close actions. It encapsulates the delayed unmount that lets the
exit transition finish before the drawer leaves the tree, the ESC
listener, and the reduced-motion path (via the existing
`useReducedMotion` hook, which collapses the delay so reduced-motion
users get no lingering mounted overlay). Components consume the state;
none of them reimplement the timing.

### Deep module — scroll-spy

The active-topic highlight follows the content pane's scroll position, so
free-scrolling keeps the rail truthful — this is the DELTA's described
behaviour, and it is a deliberate departure from `manual.jsx`, which only
sets the active topic on click. The mechanism is encapsulated behind a
hook that takes the set of section elements and the scrolling pane and
returns the active topic id, so the observation strategy is one module's
business and is replaceable without touching the drawer. Clicking a
table-of-contents entry sets the active topic immediately and scrolls;
the spy takes over once the scroll settles.

### Components

Three co-located components under a new `manual` feature, alongside the
existing app-concern features (`menu/`, `settings/`, `updates/`) — the
manual owns its content, its table-of-contents structure and its
open/close state, which is feature territory under the layer rules:

- **Manual drawer** — the overlay shell: backdrop, panel, header, the
  table-of-contents rail, and the scrolling content pane. Renders every
  topic at once; the rail is navigation, never a router.
- **Manual section** — one topic: icon, title, blurb, and its detail
  rows.
- **Manual detail row** — one collapsible heading-plus-body unit, with an
  optional term list, using the same chevron-to-expand interaction
  language as the existing Outlook and History year-accordion rows.

Scroll jumps compute the target's offset within the pane and scroll the
pane — explicitly not `scrollIntoView`, because the pane owns the scroll,
not the page.

### Entry points

Exactly two, both driving the same drawer state, and the drawer never
opens itself:

1. A `Help & manual` trigger pinned below the sidebar nav, beneath
   Settings and separated by a full-width divider. It shares the nav
   items' icon size and left alignment but **never** takes the
   bold/active/accent treatment — hover state only. It opens an overlay;
   it does not navigate, and two interaction models must not share one
   visual weight. It must not reuse the existing nav-link styling.
2. A new item in the Electron `Help` menu.

### Electron transport

The drawer owns no route, so the existing `menu:navigate` channel — which
carries a route string into the router — is the wrong transport. A
dedicated channel is added instead:

- The menu builder gains a `manual` handler alongside its existing
  handlers, and the `Help` submenu gains an item that invokes it.
- The main process sends a new `menu:open-manual` message on that
  handler.
- The preload bridge exposes a subscription for it on the existing `menu`
  namespace, returning an unsubscribe function like its siblings.
- A renderer hook mirrors the existing menu-navigation hook: it
  subscribes on mount, opens the drawer on message, unsubscribes on
  unmount, and is a no-op when the Electron bridge is absent (the browser
  dev server).

The bridge's ambient type declaration is extended with the new method.

### Copy corrections carried into the build

The following are already known to be wrong in the handoff copy and are
corrected during the copy phase. This is not the exhaustive list —
**every** detail row is verified against real code as it is written:

- The year comparison is described as "Marked Planned". It shipped; the
  placeholder is gone.
- The Outlook screen is called "Outlook" throughout. The sidebar says
  Outlook, but the page header reads "Financial Plan" with _Outlook_ as
  its overline. The copy uses what the user actually sees.
- Import is described as recognising "Sparkasse, DKB, ING and other
  common export formats". That predates Real Bank CSV Import replacing
  the guessed presets with ones built from real exports.
- Settings is described as having a "Notification previews" card that
  triggers each snackbar variant. The shipped Settings screen has three
  cards — Storage, Preferences and About. The row is cut.
- Settings → Preferences → Categories, and database backup/restore in
  Settings, are both accurate and stay.

### Content added beyond the handoff

- **Getting Started step 2** — the Mortgage Countdown card and the
  mortgage KPI tiles do not appear until a Mortgage account exists.
- **History / Month** — the Year Archive lists only years with imported
  statements, and the Month picker is bounded to imported months.
- **Accounts → recurring transactions** — the transfer input rule.
- **Settings → native menu** — a detail row covering `Start Fresh…` (the
  manual's one destructive warning), `Show Data Folder`, and the `Ctrl+,`
  / `Ctrl+S` accelerators. The native menu does **not** get its own
  topic: only those items are menu-exclusive — database info, backup,
  restore and the auto-update toggle all exist in the Settings screen —
  and a separate topic would split the backup story across two sections.

### Deliberate silence

The manual states the transfer **input** rule and stops there. It says
nothing about Account Detail's "recurring net per month", because the
recurring-net helper sums raw amounts with no link handling while the
projection engine subtracts them — the same transfer reads `+500` on one
surface and `−500` on the other, and no honest sentence covers both. A
caveat noting the discrepancy is also rejected: it would turn a manual
into a bug tracker and document an inconsistency into permanence. That is
a Live-Use Repair defect, not a manual entry.

### Phasing

1. **Thinnest end-to-end slice** — types, the content module holding one
   verified topic (Getting Started), a drawer that renders it, and the
   sidebar trigger. Open, scroll, close with ESC and backdrop.
2. **Structure** — the section and detail-row components, the grouped
   table-of-contents rail, scroll-jump, and the scroll-spy highlight.
   Still one topic; the shell is complete.
3. **Copy, verified** — all ten topics, each detail row checked against
   real code, the corrections above applied, and the four additions
   written. The bulk of the work and where the epic's value sits.
4. **Electron entry point** — the menu item and its channel end to end.
5. **Polish** — reduced-motion handling, focus trap and restore, and the
   accessibility pass on the table-of-contents buttons and detail rows.

## Testing Decisions

A good test here asserts what a reader or maintainer can observe: that a
topic appears in the table of contents, that a row expands, that ESC
closes the drawer, that the menu message opens it. It does not assert
that a particular hook was called, that state has a particular internal
shape, or that a styled-component received a given prop. Copy tests
assert **structural** invariants — every topic is reachable, no topic is
orphaned — not the wording of individual sentences, which would make
every edit a test failure for no safety gained.

All four modules below get tests.

**Manual index (pure).** The flat ordered topic list matches the group
order; every `ManualTopicId` appears in exactly one group; no id appears
twice; no group references an id that has no topic. This is the structural
guard that keeps the content pane and the table of contents in sync as
topics are added. Prior art: the pure-utility tests under `src/utils/`,
where every function is required to have a test.

**Drawer lifecycle hook.** Opens and closes; ESC closes it; the drawer
stays mounted for the transition duration after close and then unmounts;
under reduced motion the lingering mount collapses. Prior art:
`useReducedMotion` and the `FadeSwap` tests, which already establish the
`matchMedia` mocking pattern for reduced-motion branches in this repo.

**Drawer, section and detail row.** The rail renders every group label
and every topic title; the content pane renders every topic; clicking a
detail row expands it and clicking again collapses it; a row carrying a
term list renders each term with its definition; the close button and a
backdrop click both fire close; the dialog exposes an accessible name and
the expandable controls expose their expanded state. Prior art: the
existing modal and provider component tests, plus the `ImportWizard`
tests for multi-part interactive UI.

**Menu entry point.** The renderer hook subscribes on mount, opens the
drawer when the message arrives, unsubscribes on unmount, and no-ops when
the Electron bridge is absent — mirroring the existing menu-navigation
hook test almost line for line, including its `window.horizon` mock
shape. On the Electron side, the pure menu builder gains an assertion
that the `Help` submenu contains the manual item and that clicking it
invokes the supplied handler; prior art is the existing menu-builder test
covering the other handlers.

Scroll-spy behaviour is exercised through the drawer tests at the level
jsdom supports — clicking a table-of-contents entry marks that topic
active — rather than by simulating layout, which jsdom cannot do
faithfully. The observation mechanism sits behind its own hook so it can
be stubbed rather than faked.

## Out of Scope

- **Fixing either live-use defect.** The hidden Mortgage Countdown and
  the transfer sign, including the recurring-net contradiction, belong to
  Live-Use Repair. This epic documents; it does not repair.
- **Empty states on the surfaces that hide themselves.** This epic makes
  the manual _findable_, not _unmissable_ — a fresh Dashboard still shows
  nothing and says nothing. Whether it should is Live-Use Repair's call.
- **Demo-data seeding**, permanently. Seeding solves the empty-Dashboard
  problem by lying, and the user then has to identify and delete fake
  accounts — with no archive/restore, a mis-deleted account takes its
  recurring transactions with it. Seed fixtures would also have to
  survive every future migration. `File → Start Fresh…` already
  establishes an empty database as the intended baseline, and the Getting
  Started topic is the alternative to seeding.
- **Auto-opening the drawer on first run.** Deriving "fresh install" from
  an empty account list re-opens it on every launch until an account
  exists; making it fire genuinely once needs a persisted preference, a
  migration, and a flag that breaks under Start Fresh and
  restore-from-backup. An unrequested overlay on launch is also what
  people close reflexively.
- **Screenshots.** All nine embedded images from the handoff are dropped.
  They render the prototype with mock data, which contradicts the
  App-Wins Rule; capturing real ones against a seeded database is a
  recurring cost at every redesign; and the asset machinery — bundling,
  alt text, a capture recipe, staleness with no script to service it —
  costs the same for one image as for nine. The drawer will read more
  text-dense than the handoff's reference screens show.
- **A `docs/` copy of the manual.** Unreachable from the packaged app,
  and a second copy wins arguments it should not.
- **Search within the manual.** Ten topics do not need it.
- **Contextual deep-links** from individual screens into their manual
  topic. Plausible later; it would need every screen to know a topic id,
  which is coupling this epic has not earned. The handoff independently
  scopes the manual as a standalone destination.
- **Any change to the projection engine, storage, migrations, or the
  server.** This is a renderer-and-menu epic.

## Further Notes

The design handoff at `docs/handoff/quick-start-guide/` is a full re-drop
of the prototype; its genuinely new material is the manual module, its
screenshot assets, and the sidebar trigger. Its `HANDOFF.md` is
byte-different from the previous drop but content-identical — table
reflow only — and does not mention the manual at all. The manual's own
delta and its two reference screens carry the real specification.

The handoff's delta independently reached the same conclusions as the
grill-me session on the points that mattered: drawer over routed page,
right side because the sidebar owns the left edge, no search, grouped
table of contents, ESC and backdrop close, expandable detail rows,
definition lists for account kinds, a six-step Getting Started topic with
no screenshot, and standalone-destination-only with no contextual links.
It also states more strongly than the session did that the copy is "mock
only — do not port" and should be re-authored once ubiquitous-language
review is done, which is exactly the App-Wins Rule.

Two deliberate deviations from that delta, both decided knowingly: it
specifies a full-width screenshot of the real screen per topic and we
ship text-only; and it scopes the trigger to the sidebar alone while we
add the Electron `Help` menu as a second entry point.

The delta contains one erratum: it says the topics are "grouped under
four labels" and then lists five. Five is correct — Getting Started,
Overview, Planning, Data, System.

The honest cost of this approach is maintenance. Prose in a typed
module is less pleasant to edit than markdown, and it carries lint,
typecheck and test obligations a markdown file would not. More
importantly, every future feature has to remember to update the content
module, and nothing enforces that. The manual will drift unless keeping
it current is treated as part of the definition of done for every
subsequent epic. The structural test guards reachability, not truth —
truth stays a discipline.
