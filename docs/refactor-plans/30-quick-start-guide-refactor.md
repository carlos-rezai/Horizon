# 30 — Quick Start Guide Refactor

> Follows the Quick Start Guide epic (issue #210, phases #211–#218).
> Changes no manual copy and adds no manual behaviour.

## Problem Statement

The Quick Start Guide shipped clean, but it left four things behind that
are cheaper to fix now than to live with.

**The app's only working dialog keyboard is locked inside one feature.**
Issue #218 gave the manual drawer a focus trap, focus capture and
restore, and ESC-to-close. That machinery is hand-rolled inside
`ManualDrawer` — its own focusable-element selector, its own Tab
handler, its own restore effect — while the ESC listener sits separately
in `useManualDrawer`. Meanwhile the shared `Modal` component, which
**eleven** surfaces render through, declares `role="dialog"` and
`aria-modal="true"` and implements none of it: no trap, no restore, no
ESC. Tab out of any account, transaction, mortgage, savings, category or
import dialog and the keyboard walks onto the screen behind it, which is
exactly what `aria-modal` promises it will not do. The one correct
implementation in the codebase is in the one place that is not shared.

**The Electron bridge subscription is written four times.** `useMenuOpenManual`
was the third hook to spell out the same six lines — read the bridge off
`window`, subscribe, return the unsubscribe, no-op when the bridge is
absent — after `useMenuNavigation` and the two subscriptions inside
`useMenuDialogs`. Nothing is wrong with any of them individually; the
shape is just now established enough that the fourth copy is a decision
rather than an accident.

**The drawer composes its own table of contents inline.** `ManualSection`
and `ManualDetailRow` were extracted; the rail — the group loop, the
active-entry state, the jump wiring, its own styled entries — was not,
so it sits in the middle of `ManualDrawer` alongside the header markup
and the keyboard wiring. It is the one part of the drawer with real
logic and the only part without a test file of its own.

**The features layer has no filing rule.** `src/utils/` and
`server/src/services/` nest: every module gets a folder named after
itself holding `module.ts` and `module.test.ts` — the shape established
by refactors #15 and #17. `src/features/` does not. Thirty-five modules
across thirteen features sit flat at the feature root, mixed in with the
PascalCase component folders, so `import/` presents fourteen entries at
its top level and `months/` sixteen. Nothing is broken, but the codebase
now answers "where does a new hook go?" two different ways depending on
which layer you happen to be in, and the manual — the newest feature —
inherited the flat one.

A note on why the fourth item is framed as a rule and not as a
complaint about the manual folder: `src/features/manual/` already
matches every one of its thirteen siblings. It is not the odd one out.
It is the newest instance of a pattern that has never been written down,
which is why it is the thing that made the pattern visible.

## Solution

Four changes, in two halves, with the risky half first.

**The semantic half** extracts the manual's keyboard machinery into a
shared `useDialogKeyboard` hook and applies it to `Modal`, so all eleven
dialogs gain focus containment, focus restore and ESC-to-close; extracts
a menu-bridge subscription helper the three menu hooks consume; and
splits the table-of-contents rail out of the drawer into its own
component. These land on the current flat paths, in small diffs where a
behaviour change is visible.

**The structural half** then adopts the `src/utils/` filing rule across
`src/features/`: every non-component module moves into a folder named
after itself, carrying its co-located test. Thirteen features, one
commit each, no behaviour change and no logic touched — pure moves and
import updates. `src/hooks/` is deliberately exempt and the exemption is
written down.

Doing the semantic work first means the file-move noise cannot hide a
behaviour change, and every move lands on code that has already been
reviewed in its final shape.

The one behaviour change in this plan is deliberate and was decided
explicitly: wiring `Modal` to the keyboard hook changes how eleven
surfaces outside this epic respond to Tab and ESC. That is an
accessibility fix the manual paid for and the rest of the app should
inherit, not a refactor side effect, and it is the reason the plan has a
per-consumer verification step rather than a single "all green" claim.

## Commits

### Part A — the shared dialog keyboard

Each commit here leaves every dialog in the app working.

**A1. Failing tests for the shared dialog-keyboard hook.**
Add the test file for a new global hook that owns the three keyboard
concerns a modal surface has: moving focus into the surface when it
opens, cycling Tab and Shift+Tab within it, returning focus to whatever
held it when the surface closes, and closing on ESC. Tests cover the
happy path for each, plus the two cases the drawer already handles — a
restore target that has left the document by the time the surface
closes, and a surface opened when nothing in the page had focus, which
must not strand the keyboard on `body`. Red.

**A2. Create the hook.**
Lift the implementation out of the drawer essentially verbatim — the
focusable-element selector, the edge-detecting Tab handler, the
capture-and-restore effect, and the ESC listener — into the new hook.
No consumer yet; this commit only turns A1 green. The drawer and every
modal behave exactly as before.

**A3. The drawer consumes the hook for trap and restore.**
Delete the drawer's own selector constant, its Tab handler and its focus
effect, and call the hook instead. The existing drawer tests are not
touched in this commit, deliberately: they were written against the old
implementation, and their staying green without edit is the evidence the
lift was faithful. The `react-hooks/exhaustive-deps` suppression goes
with the code it was guarding — the deliberate read-the-fallback-in-
cleanup now lives inside the hook, where it is one module's documented
business rather than a suppression in a component.

**A4. Move ESC ownership out of the lifecycle hook.**
`useManualDrawer` keeps the open/mounted lifecycle, the delayed unmount
and the reduced-motion collapse, and loses its ESC listener — the shared
hook now owns it, from the component. Relocate the lifecycle hook's
ESC-closes tests down to drawer level, where the behaviour now lives.
Behaviour is unchanged: the listener is bound while the surface is open
either way.

**A5. Failing tests for Modal's keyboard behaviour.**
Against `Modal` directly: focus lands inside the dialog on open, Tab and
Shift+Tab cycle within it and never reach the page behind, ESC calls
`onClose`, and closing returns focus to the control that opened it. Red
— `Modal` implements none of this today.

**A6. Wire Modal to the hook.**
The smallest possible change to the component: hold a ref on the dialog
element, call the hook, pass `onClose`. No styling changes, no prop
changes, no consumer changes. Turns A5 green and gives all eleven
consumers containment in one line.

**A7. Per-consumer verification, one commit per consumer that needs it.**
Run the full suite. Any consumer whose tests assumed the old behaviour —
a test that tabs past the end of a form, or that presses ESC expecting
nothing — gets its own named commit rather than being swept into A6.
Consumers to walk deliberately, since a trap is only correct if the
dialog's first focusable element is the right place to land: the account
create dialog, the mortgage origination editor, the savings goal editor,
the category manager, the recurring-transaction editor, the two
transaction dialogs, the import wizard, the import preview, and the two
provider-driven dialogs. Expect most to need nothing.

**A8. Make the trap yield to the topmost dialog.**
Two dialogs can be on screen at once: the confirm and alert modals are
raised from the app-level providers, driven by the native menu bridge
and the update banner, and either can fire while a feature dialog is
already open — a `Ctrl+S` backup confirm over an open account form, for
instance. With A6 in place both would trap. Make the hook bind only for
the topmost surface, so the inner dialog owns the keyboard and hands it
back to the outer one when it closes. Tests drive two stacked dialogs
directly rather than through a provider.

**A9. Extract the menu-bridge subscription helper.**
One small module in the menu feature that takes a subscribe function off
the bridge and a callback, handles the absent-bridge no-op and the
unsubscribe on unmount, and returns nothing. The navigation hook, the
open-manual hook and both subscriptions inside the dialogs hook consume
it. Each hook keeps its own name, its own doc comment and its own test —
what is removed is the fourth and fifth copy of the same subscribe
ceremony, not the hooks themselves.

**A10. Extract the table-of-contents rail.**
A new component in the manual feature owning the rail: it takes the
groups, the topic lookup, the active topic id and a jump callback, and
renders the grouped entries with their icons and current state. Its
styled entries move with it into its own styles file, and its tests move
out of the drawer's test file into its own. The drawer is left as
composition — header, rail, pane — plus the keyboard wiring. The
drawer's own rail tests that are really about the rail move; the ones
about the drawer wiring the rail to the pane stay.

### Part B — the features filing rule

**B1. Write the rule down first.**
Record in the project instructions that every non-component module in a
feature lives in a folder named after itself, holding the module and its
co-located test, matching `src/utils/` and `server/src/services/`; that
components keep their existing PascalCase folders with their `.styles`
and `.test` files; and that `src/hooks/` is exempt and stays flat. The
rule lands before the moves so each move commit is executing a written
decision rather than establishing one by example.

**B2 through B14. One commit per feature, smallest first.**
Each commit moves that feature's loose modules into module-named
folders, carrying their tests, and updates the feature's internal
relative imports, its barrel where it has one, and any importer outside
the feature. Nothing inside any moved file changes except its own
relative import paths. Order, smallest first so the pattern is
established on trivial cases before the large ones:

1. `settlements` — one module
2. `accounts` — one module
3. `updates` — one module
4. `history` — two modules
5. `projection` — two modules
6. `savings` — two modules (no barrel)
7. `transactions` — two modules
8. `menu` — three modules, plus the helper A9 added (no barrel)
9. `settings` — three modules
10. `categories` — four modules
11. `import` — five modules
12. `manual` — five modules
13. `months` — five modules (no barrel)

Thirty-five modules and their tests in total; `mortgage` has none and is
untouched.

**B15. Sweep and verify.**
Confirm no loose module remains at any feature root, that no import path
still points at an old location, and that the barrels export the same
names they did before. Run the real typecheck — the root `tsconfig` has
an empty `files` array, so `npm run typecheck` verifies nothing; use the
project build or a `tsc -b` for a typecheck that actually reads these
files. Then the full test suite and lint.

## Decision Document

- **The keyboard machinery becomes a global hook**, not a Modal-internal
  detail and not a manual-feature export. It qualifies under the layer
  rule that `src/hooks/` holds hooks used across two or more features:
  its consumers are the shared Modal component and the manual feature.
  Putting it inside `components/Modal` was rejected because the drawer
  would then have to render through Modal, and a right-side slide-over
  with a navigation rail and its own scrolling pane would spend the rest
  of its life fighting a centred-dialog layout.
- **The hook owns all three concerns** — trap, restore and ESC — rather
  than trap and restore alone. Splitting ESC off would leave that
  listener written twice, once in `Modal` and once in the manual's
  lifecycle hook, which is the duplication this commit set exists to
  remove.
- **ESC-to-close is applied to Modal**, including the dialogs that hold
  half-filled forms. The confirm provider already resolves its promise
  as cancelled on dismiss, so ESC on a confirm is answered correctly by
  existing code and needs no special case.
- **The trap binds only for the topmost dialog.** Stacking is rare —
  today only a menu-driven confirm or an update alert can land over a
  feature dialog — but two simultaneous traps is a keyboard deadlock
  rather than a cosmetic bug, and the fix is cheaper than the caveat.
- **`useManualDrawer` keeps the lifecycle and loses the keyboard.** The
  delayed unmount, the reduced-motion collapse and the reopen-mid-exit
  guard are about the drawer's mount lifetime, which is genuinely the
  manual's own business; the keyboard is not.
- **The menu-bridge helper stays inside the menu feature.** It is
  Electron-bridge plumbing with three consumers, all in that feature —
  promoting it to `src/hooks/` would claim a generality it does not
  have.
- **The rail becomes a component; the header does not.** The rail carries
  the group iteration, the active-entry treatment and the jump wiring.
  The header is four static elements and a close button, and extracting
  it would buy a folder and a test file for markup with no decisions in
  it.
- **The filing rule is adopted across all thirteen features, not just
  the manual.** Nesting the manual alone would have made it the only
  feature in the app with that shape — one more pattern for a reader to
  reconcile, in the name of consistency. The rule is worth having only
  if it is the rule everywhere.
- **`src/hooks/` is explicitly exempt** and stays flat, and the exemption
  is recorded rather than left to be inferred from two files.
- **Nested folders get no per-folder barrel**, matching `src/utils/`
  exactly: the import path becomes the module name twice over, and the
  feature-level barrel remains the single public face of the feature.
- **The manual's copy module is not split.** At 426 lines it is the
  largest module being moved, and splitting it per group was considered
  and rejected: a reviewer being able to read every claim the app makes
  about itself in one file was a deliberate design decision of the epic,
  and the copy is data, not logic — length is not complexity here.
- **No manual copy is edited by this refactor.** Not a word. Any claim
  found to be wrong while working through these commits is a Live-Use
  Repair item or a follow-up copy issue, not a drive-by edit inside a
  structural commit.

## Testing Decisions

A good test here describes what a user or a caller can observe — where
the keyboard goes, what closes, what renders — and never how the module
arranges itself internally. Two specific applications of that in this
plan:

- **The drawer's existing focus tests are not rewritten in A3.** They
  assert observable keyboard behaviour, which is exactly what must
  survive the extraction. Editing them to match a new internal shape
  would destroy the only evidence the lift was faithful. If they need
  edits, the extraction changed behaviour and the commit is wrong.
- **The file moves add no tests and edit no assertions.** A move commit
  whose test diff is anything other than a path is not a move commit.

Modules under test:

- **The new dialog-keyboard hook** — focus lands inside on open, Tab and
  Shift+Tab cycle at both edges, ordinary traversal in the middle is
  left to the browser, ESC invokes the close callback, focus returns to
  the opener on close, a disconnected opener falls back rather than
  stranding focus on `body`, and a stacked dialog leaves the outer
  trap inert until it closes.
- **`Modal`** — the same observable behaviours, asserted at the shared
  component so all eleven consumers are covered by one contract.
- **The table-of-contents rail** — renders every group label and topic
  title in index order, marks the active entry, and calls back with the
  topic id on click.
- **The menu-bridge helper** — subscribes on mount, unsubscribes on
  unmount, and no-ops without the bridge; the three menu hooks keep
  their own tests unchanged.

Prior art to follow rather than invent:

- The drawer's own focus tests from #218 are the closest model for the
  hook's tests — they drive real Tab keydowns against a rendered tree
  rather than asserting on handlers.
- `Modal`'s existing tests already establish the unit/interaction/styles
  grouping and the overlay-click pattern the new cases sit beside.
- The menu hooks' existing tests establish the `window.horizon` mock
  shape the helper's tests should reuse.
- The reduced-motion tests in the manual's lifecycle hook establish the
  `matchMedia` mocking pattern, which A4 must not disturb.

Coverage gap worth stating plainly: eight of the thirty-five modules
being moved have no co-located test — four are pure type modules with no
runtime, and four are not (`categoriesApi`, `useCategoryManager`,
`useImport`, `useOptimisticCommit`). This plan does not add tests for
them. They are moved, not modified, so the move carries no risk their
missing tests would have caught; writing tests for four untested hooks
is a real piece of work that deserves its own issue rather than being
smuggled into a file-move commit.

## Out of Scope

- **Any change to manual copy.** The App-Wins Rule is a content rule and
  this refactor writes no content.
- **Splitting the manual's copy module per group.** Considered,
  rejected, reasoning recorded above.
- **The two live-use defects**, including the recurring-net sign
  contradiction the manual is deliberately silent about. Live-Use Repair
  owns them.
- **Tests for the four untested hooks** the structural pass moves.
- **Nesting `src/hooks/`**, `src/components/`, `src/primitives/` or
  `src/pages/`.
- **Any change to the projection engine, the server, the storage driver
  or the schema.** This refactor is renderer-only apart from nothing —
  it does not even reach the Electron main process, since A9 touches the
  renderer side of the bridge only.
- **Contextual deep-links from screens into manual topics**, and
  **search within the manual** — both ruled out by the epic and not
  reopened here.
- **A focus-visible or focus-ring pass.** Focus containment is in scope;
  restyling how focus looks is not.

## Further Notes

The eleven-consumer keyboard fix is the part of this plan most likely to
grow. If A7 turns up a dialog whose first focusable element is a
destructive action, or one that opens with no focusable element at all,
the honest response is a follow-up issue for that surface rather than
special-casing the shared hook — the hook's job is containment, not
deciding what each dialog's entry point should be.

The structural half is thirteen mechanical commits and will look like
the largest part of the diff while being the least interesting. It is
worth resisting the temptation to fold "while I'm in here" edits into
those commits: a move commit that also renames a symbol is a commit
nobody can review by reading the paths.

One thing this plan does not fix, and should be named so it is not
mistaken for an oversight: nothing enforces that a future feature
updates the manual. The epic recorded that drift risk, and it remains
open. A structural refactor cannot close it.
