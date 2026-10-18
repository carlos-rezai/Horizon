## Problem Statement

I use Horizon every month as my real finance tracker, and since 1.4.0 it has
started to look assembled rather than designed. A text field and the button
beside it are different heights. Text that should sit in the middle of its
box sits off to one side. On the Month Overview, clicking through months
with the arrows is fiddly: the month name in the middle gets wider for
"September" than for "May", so the next-arrow moves out from under my cursor
and I click the wrong thing.

None of these is a bug in what Horizon calculates. They are all the same
problem: screens have quietly stopped using the shared building blocks. A
dozen screens draw their own small icon buttons, in six different sizes. The
text field, the dropdown and the date field each draw their own box, and the
three no longer match each other. Nothing stops a new screen from drifting
the same way.

## Solution

**Every control of one size is one height.** Buttons, text fields, dropdowns
and date fields share a single **Control Height** per size (small 32px,
medium 40px, large 44px). A field and a button side by side line up
everywhere, because they read the same value rather than happening to match.

**Every field looks the same.** Text fields, dropdowns and date fields share
one **Field Chrome**: the same background, border, corner radius and gold
focus ring. The date field is a text field with a calendar icon, not a
look-alike copy. The calendar pop-up gets its proper font back.

**Every icon button is the same button.** The small edit, delete, close and
step buttons across the app become the shared button in its icon-only form:
one size, one hover, one focus ring. Delete-style icons turn red on hover the
same way everywhere. Every modal and the User Manual drawer close with the
same control.

**The month switch stays put.** Its label reserves the width of the longest
month name, so the arrows never move while I click through months. The same
**Stable Label Width** rule applies anywhere a label changes when pressed.

**Alignment comes from the layout, not from each cell.** Table headers and
their rows share one column definition, so a heading and its figures cannot
disagree. Empty and loading states centre the same way on every screen.

**Found by measurement, kept by a test.** Every screen is measured in the
running app, and each inconsistency is logged as an **Audit Finding** with
what was measured, what it should be, and which shared piece owns it. Each
fix goes into that shared piece, never into a one-off override. After the
fixes, a **Primitive Conformance** test fails the build when a screen draws
its own button or field again, unless it is on a short, justified
**Conformance Allowlist** that can only shrink.

Nothing changes in how Horizon behaves, what it calculates, or what it says.

## User Stories

1. As a user filling in a form, I want a text field and the button beside it to be exactly the same height, so that the form looks deliberate.
2. As a user, I want a dropdown, a date field and a text field in one row to line up, so that a row of inputs reads as one row.
3. As a user, I want every text field, dropdown and date field to have the same background, border and corners, so that I recognise an editable field at a glance.
4. As a keyboard user, I want every field to show the same gold focus ring, so that I always know where the focus is.
5. As a keyboard user, I want every button, including icon buttons, to show the same focus ring, so that tabbing through a screen is predictable.
6. As a user, I want disabled fields and buttons to look disabled in the same way everywhere, so that I never try to use something inactive.
7. As a user picking a date, I want the calendar pop-up to use Horizon's typeface, so that it does not look like a browser default.
8. As a user on the Month Overview, I want the previous and next arrows to stay in the same place while I click through months, so that I never click the wrong arrow.
9. As a user on the Month Overview, I want the month name centred in the switch, so that short and long month names look equally placed.
10. As a user, I want any control whose label changes on click to keep its width, so that nothing beside it shifts under my cursor.
11. As a user, I want every small icon button (edit, delete, close, step) to be the same size, so that the app feels consistent.
12. As a user, I want delete-style icon buttons to turn red on hover the same way on every screen, so that destructive actions are recognisable.
13. As a user, I want every modal's close button to look and sit the same, so that I always find it.
14. As a user of the User Manual drawer, I want its close button to match the modals' close button, so that dismissing anything works the same.
15. As a user managing categories, I want the inline rename and add fields to look like every other text field, so that the Categories modal is not a special case.
16. As a user reviewing an import, I want the inline description field to look like a compact version of the standard text field, so that I recognise it as editable.
17. As a user reading any table, I want column headings aligned with the figures under them, so that I can read across a row without guessing.
18. As a user, I want money figures right-aligned in every list, so that amounts compare at a glance.
19. As a user, I want empty and loading states centred the same way on every screen, so that an empty card never looks broken.
20. As a user on the Dashboard, I want its cards, controls and icon buttons to follow the shared sizes, so that the first screen I see is the most consistent.
21. As a user on Accounts and Account Detail, I want account forms and actions to follow the shared sizes and field look.
22. As a user on the Financial Plan, I want its accordion headers and controls aligned and sized consistently.
23. As a user on History, I want the range selector and year headers to keep their size and alignment.
24. As a user going through the Import wizard, I want every step's controls to follow the shared sizes, so that the wizard feels like part of Horizon.
25. As a user on Import History, I want its row actions to be the standard icon buttons.
26. As a user in Settings, I want its controls to follow the shared sizes and field look.
27. As a user, I want the Savings Streak and Mortgage Countdown edit buttons to match every other edit button.
28. As a user, I want none of these visual fixes to change what any button does, what any screen calculates, or any wording, so that a polish release cannot break my data.
29. As a user, I want every control I could reach by keyboard or screen reader before the change to still be reachable, with the same accessible name.
30. As the developer, I want each control size defined once as a token, so that changing it changes every control.
31. As the developer, I want one shared field style used by the text field, dropdown and date field, so that they cannot drift apart again.
32. As the developer, I want a list of every measured inconsistency with its screen, element, measured value, expected value and owner, so that the work is traceable.
33. As the developer, I want before-and-after measurements and screenshots kept in the repo, so that "consistent" is evidence rather than opinion.
34. As the developer, I want a test that fails when feature code draws its own button or field, so that the drift cannot return unnoticed.
35. As the developer, I want each remaining local control to carry its reason in an allowlist that can only shrink, so that exceptions stay justified and visible.
36. As the developer, I want a pattern to become a new shared piece only once two or more features use it, so that the shared layers do not fill with one-offs.
37. As the developer, I want every primitive exported from the primitives index, so that features never deep-import a primitive.
38. As the developer, I want the audit run against a throwaway database with anonymised data, so that my real finances never touch dev tooling.
39. As the developer, I want behaviour, data or copy problems spotted during the audit logged as live-use defects, not fixed here, so that this epic stays visual only.

## Implementation Decisions

- **Two-pass audit first.** A runtime pass drives the dev app through the
  chrome-devtools MCP in Brave over every surface (Dashboard, Accounts and
  Account Detail, Month Overview, Financial Plan, History, every Import wizard
  step, Import History, Categories, Settings, the User Manual drawer, every
  modal including the alert and confirm modals), measuring computed size,
  alignment, font, radius, background and focus style, and screenshotting
  each surface. A static pass sweeps feature, component and layout style
  modules for hand-built controls, hand-sized boxes and literal sizes, each
  traced to the shared piece it duplicates. The app runs against a throwaway
  database in the scratchpad with anonymised fixture data.
- **Findings register.** One numbered Audit Finding per inconsistency in a
  findings register under a dedicated UI-audit docs folder, shaped like the
  live-use defects file: Screen, Element, Measured, Expected (value and owning
  primitive, component or token), Cause (re-styled / re-implemented / missing
  primitive / token gap), Status. Dated before and after evidence folders
  (screenshots + measurement JSON) sit beside it, as the perf evidence does.
  The list freezes at the end of the audit phase; later finds go to live-use
  defects Round 2.
- **Control Height token.** A new sizing token module holds
  `control: { sm: 32, md: 40, lg: 44 }`, exported through the tokens index
  and added to the theme next to radius and spacing. The Button drops its
  local height map and reads the token. The text field, dropdown and date
  field declare their height from the token (box-sizing is already
  border-box) and gain the Button's `size` prop (`sm | md | lg`, default
  `md`).
- **Recorded deviation from the Prototype.** The Prototype has Button md at
  38px but Input at 40px. Horizon keeps Button md at 40px and puts every
  field at 40px. Any further disagreement with the Prototype is a finding,
  never a silent choice.
- **Field Chrome.** One shared styled-components `css` fragment, filed in its
  own folder under the primitives layer by the Module Filing Rule (no
  barrel), gives the text field, dropdown and date field the Prototype Input
  look: lowest-ink background, outline-variant border, medium radius, Control
  Height, gold border plus a 3px gold-wash focus ring, 0.4 opacity when
  disabled. The dropdown's different background and outline-offset focus are
  removed by it.
- **Date field composes the text field.** The date picker's custom input
  becomes the Input primitive with a trailing-icon slot; its copy of the
  input styles is deleted. The calendar's font-family interpolation is fixed
  to the UI font.
- **Icon buttons are the Button.** Hand-sized icon buttons in features and
  components become the Button primitive in ghost, small, icon-only form with
  an accessible label. No new IconButton primitive. The Button gains one
  variant, `ghostDanger` (ghost at rest, error colour on hover), for
  delete-style icon actions. The modal close and the User Manual drawer close
  become the same Button.
- **Stable Label Width.** The month-year picker trigger renders in the mono
  face, so its `min-width` is set in `ch` from the longest label it can
  render, computed from the month-name list as a named constant, with the
  label centred. The Month Overview step buttons become ghost small Buttons;
  the stepper container stays local because only one feature uses it. Every
  other changing label (History range, year headers, tab counts) is checked
  against the same rule.
- **New shared pieces only at 2+ features.** A pattern used by one feature
  stays a local container composed of primitives. A pattern in two or more
  features becomes a primitive (atom) or component (composed), with its
  co-located styles and test, exported from its layer index. The Toggle and
  SwatchPicker primitives are added to the primitives index and their deep
  imports switched to it.
- **Alignment has one owner.** Figures right-align through Money inside
  DataRow columns; empty and loading states centre through EmptyState and
  SectionState; TableHeader and DataRow take alignment from one shared column
  definition so they cannot disagree. Local `text-align` that duplicates the
  owner is removed.
- **Literals only where a finding touches.** A literal font size, radius or
  padding is replaced by its token when its file is already changed for a
  finding and a token holds the same value. Off-scale values that render
  correctly stay; there is no blanket sweep.
- **Primitive Conformance guard.** A style-conformance test under the global
  styles folder reads every feature, component and layout style module raw
  through Vite's `import.meta.glob` and fails on a raw button, input, select
  or textarea styled element whose export is not on the Conformance
  Allowlist. Each allowlist entry names its reason (hidden file input,
  calendar cell, colour swatch, disclosure header). The allowlist is written
  from what remains after the fixes and may only shrink.
- **Visual only.** No behaviour, data, copy, routing or schema change. Event
  handlers, accessible names and roles of every replaced control are kept.

## Testing Decisions

- A good test pins what the user sees or can reach (a rendered height, a
  width that does not change, a control found by role and name), never the
  name of a styled component or a CSS string.
- **Sizes in jsdom.** Rendered sizes are asserted with `getComputedStyle`, as
  the KpiStrip value-slot height-parity test does for the #208 CLS fix:
  - the Button, Input, Select and DatePicker each render at the Control
    Height of each size;
  - one Button, Input, Select and DatePicker of the same size render the same
    height;
  - the month-year picker trigger has the same width for "May" and
    "September";
  - the Button `ghostDanger` variant renders and is reachable by role.
- **Tokens.** The tokens test pins the three Control Height values, as it
  pins the 4px spacing grid.
- **Field Chrome.** Covered through the three field primitives' tests (shared
  background, border and height), not tested as a fragment.
- **Behaviour-neutral swaps.** Every feature whose control moves onto a
  primitive keeps its existing tests green, finding controls by role and
  accessible label; a test that only passed by reaching into a local styled
  component is rewritten to role and label.
- **Primitive Conformance** is itself the guard test; it reads source through
  `import.meta.glob` with `?raw`, as the font-faces test does.
- **Acceptance evidence.** The runtime measurement pass is repeated after the
  build into the after-evidence folder; every finding closes with the commit
  that fixed it.
- TDD as usual: `tdd` writes the RED tests and stops; a RED test commit
  typechecks shipping code only.

## Out of Scope

- Behaviour, data, copy, routing and schema changes, even where the audit
  notices them; those go to live-use defects Round 2.
- A blanket literal-to-token sweep with no visible effect.
- A new IconButton primitive (the Button already is one).
- Responsive breakpoints (Horizon is desktop only) and a light theme
  (Horizon is dark only).
- Visual-regression screenshot tooling or any new dependency.
- An ESLint rule for the guard.
- Layout redesign or new surfaces.

## Further Notes

- Design log: `docs/design-logs/34-ui-consistency-audit.md` (13 questions).
  Glossary terms: UI Consistency Audit, Audit Finding, Control Height, Field
  Chrome, Stable Label Width, Primitive Conformance, Conformance Allowlist.
- Phases follow the log: audit before → Control Height → Field Chrome →
  month switch → icon buttons and local inputs → alignment and remaining
  findings → guard and audit after. Control Height is the thinnest slice that
  fixes field/button mismatches across every screen at once.
- The chrome-devtools MCP is driven with Brave on port 9222, which must be
  free first (MediaMonkey takes it).
