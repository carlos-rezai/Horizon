# UI Audit Findings

The findings register for the **UI Consistency Audit** (PRD #266, design log
34). Each **Audit Finding** is one inconsistency, numbered and traced to the
primitive, component or token that owns the fix. A fix goes into that owner,
never into a one-off override in a feature.

**Status: FROZEN 2026-10-18** at the end of Phase 1 (issue #267). Anything
found later goes to `docs/live-use-defects.md` under Round 2, not here.

## Evidence

- `before-2026-10-18/` — a screenshot (`.png`) and a measurement file
  (`.json`) for every surface. Pages are `01`–`10`; modals are `m01`–`m11`.
  The `b`/`c` files are extra states: the month switch sweep, the open month
  picker, the expanded import history, the History archive column edges, the
  calendar pop-up and the Categories inline fields.
- `harness/` — how to repeat the runtime pass for the after audit (Phase 8):
  - `seed.mjs` seeds a throwaway database through the REST API.
  - `init.js` stubs the Electron bridge (`window.horizon`), so the menu-only
    surfaces (alert, confirm, User Manual) can be opened from a plain browser
    through `window.__menu`.
  - `measure.js` records computed size, font, radius, background, border,
    alignment and text offset for every interactive element on the page, or
    inside the open dialog.

**Setup:** the API ran with `HORIZON_DB_PATH` set to a scratchpad
`audit.db`, and `/storage/status` reported that path. The real database was
never opened. Vite ran with `VITE_API_BASE_URL=http://127.0.0.1:3001`.
Brave 150 was driven over CDP on port 9222 at a 1440×900 viewport.

**Method caveat:** `measure.js` focuses each control with `el.focus()`, which
does not match `:focus-visible` in Chromium. Its `focus` field therefore
records the unfocused or `:focus` outline, not the keyboard ring. Focus rings
in this register come from the static pass, which reads each module's
`:focus-visible` rule.

**Fields:**

- **Screen** — where it shows.
- **Element** — the control and the module that styles it.
- **Measured** — the value taken from the running app or the source.
- **Expected** — the value, and the primitive, component or token that owns
  it.
- **Cause** — one of _re-styled_, _re-implemented_, _missing primitive_ or
  _token gap_.
- **Status** — `Open` until a commit closes it (`Closed <sha>`), or
  `Rejected — <reason>`.

**Recorded deviation from the Prototype:** Button md stays at 40px, not the
Prototype's 38px, and every field is 40px to match it (PRD → Implementation
Decisions).

---

## Control height

### 1. Fields are 1px shorter than the buttons beside them

- **Screen:** every form. Create/Edit account (m03, m07), Savings goal (m04),
  Mortgage (m05), Add recurring (m06), Add expense (m08), Edit transaction
  (m09), Import step 2 (08b).
- **Element:** `Input`, `Select` and `DatePicker` (`StyledDateInput`), with
  `Button` md in the same footer or row.
- **Measured:** every field is 39px high: 8px padding + 21px line-height +
  2px border. `Button` md is 40px.
- **Expected:** fields md = 40px, read from **Control Height**
  `control.md`. `sm` = 32 and `lg` = 44 likewise.
- **Cause:** token gap. The height lives only in a local `sizeHeights` map in
  `Button.styles.ts`. The fields have no height and fall out of padding plus
  line-height.
- **Status:** Closed — issue #268.

### 2. Button holds its height table locally

- **Screen:** all.
- **Element:** `primitives/Button/Button.styles.ts`, `sizeHeights`.
- **Measured:** `{ sm: 32, md: 40, lg: 44 }` is declared inside the
  primitive. No token exists.
- **Expected:** Button reads **Control Height** from the theme.
- **Cause:** token gap.
- **Status:** Closed — issue #268.

### 3. Stepper is a 30px box with 20px buttons

- **Screen:** Add recurring, "Day of month" (m06).
- **Element:** `primitives/Stepper`, `Wrapper` and `StepButton`.
- **Measured:** the wrapper is 30px high (4px padding + 20px buttons + 2px
  border). Each step button is 20×20 with a 16px "−"/"+" glyph. The fields
  stacked above and below it are 39px.
- **Expected:** the wrapper at Control Height md (40px), with the field look
  (**Field Chrome**).
- **Cause:** token gap.
- **Status:** Open.

### 4. Segmented and toggle chips come in four heights

- **Screen:**
  - History: range 1Y/3Y/All, and Saved/Spent (04).
  - Import step 1: the account chips (08a).
  - Savings goal: Mode (m04).
  - Edit transaction: Direction and Category (m09).
  - Trajectory and History legends (01, 04).
- **Element:**
  - `HistoryChart.StyledRangeChip`
  - `ChoiceChip`
  - `ImportWizard.StyledChip`
  - `SeriesLegend.StyledChip` and `StyledShowAllButton`
- **Measured:**
  - Range chip 33.5px (13px, 7px 14px padding, r7px).
  - ChoiceChip 35.5px (13px, 7px 12px).
  - Wizard account chip 37.5px (13px, 8px 13px).
  - Legend chip 31px (14px, 4px 12px).
- **Expected:** the wizard account chip is a `ChoiceChip`, and so are Saved/
  Spent and Mode. The History range is one segmented control sized at Control
  Height sm (32px). The legend chip stays its own component, at sm height.
- **Cause:** re-implemented (wizard chip, range chip) and re-styled (legend).
- **Status:** Open.

### 5. "View history" is a bare text button with no control height

- **Screen:** Dashboard, Trajectory Horizon header (01).
- **Element:** `TrajectoryHorizon.StyledViewHistoryLink`.
- **Measured:** 111×18.8px, 12.5px text, radius 0, browser-default focus.
- **Expected:** `Button` ghost sm, with `iconRight`.
- **Cause:** re-implemented.
- **Status:** Open.

## Field chrome

### 6. Select has a different background from Input and DatePicker

- **Screen:** every form with a dropdown (m03, m06, m08, 08b, 08c).
- **Element:** `primitives/Select/Select.styles.ts`.
- **Measured:** Select uses `surfaceContainerHigh`, rgb(28, 33, 42). Input
  and the DatePicker input use `surfaceContainerLowest`, rgb(12, 14, 18).
  The difference is visible in one column on Create account (m03).
- **Expected:** one **Field Chrome**: lowest-ink background,
  outline-variant border, radius md (8px), Control Height.
- **Cause:** re-styled.
- **Status:** Open.

### 7. Three different focus rings on the three field primitives

- **Screen:** all forms.
- **Element:** the `:focus-visible` rules of Input, DatePicker and Select.
- **Measured:**
  - Input and DatePicker: gold border + `box-shadow: 0 0 0 2px` gold.
  - Select: gold border + `outline: 2px solid` gold, offset 2px.
  - None has the Prototype's 3px gold-wash ring.
- **Expected:** gold border + a 3px gold-wash ring from **Field Chrome**, on
  all three.
- **Cause:** re-styled.
- **Status:** Open.

### 8. DatePicker copies the Input styles instead of composing Input

- **Screen:** every date field (m03, m05, m08, m09).
- **Element:** `primitives/DatePicker/DatePicker.styles.ts`,
  `StyledDateInput`.
- **Measured:** a hand-copied input: the same padding, background and border
  as Input, plus a literal `32px` right padding for the calendar icon. It
  drifts independently of Input; it has no `:disabled` rule.
- **Expected:** the DatePicker's custom input is `Input`, with a
  trailing-icon slot.
- **Cause:** re-implemented.
- **Status:** Open.

### 9. Calendar pop-up renders in Helvetica Neue

- **Screen:** the calendar from any date field (m08b).
- **Element:** `DatePicker.styles.ts`, `.react-datepicker { font-family }`.
- **Measured:** the computed font is `"Helvetica Neue", helvetica, arial`.
  The rule interpolates `theme.typography.fontFamily`, which is the
  `{ ui, mono }` object, so the declaration is invalid and the library
  default wins.
- **Expected:** `theme.typography.fontFamily.ui` (Space Grotesk).
- **Cause:** token gap (the wrong token path).
- **Status:** Open.

### 10. Calendar shows no month navigation, and today in pale blue

- **Screen:** calendar pop-up (m08b).
- **Element:** `DatePicker.styles.ts`, the react-datepicker overrides.
- **Measured:**
  - No previous/next month arrows are visible in the header. Only the
    `::before` border colour is overridden.
  - Today's cell (18) has react-datepicker's default pale-blue
    keyboard-selected fill, not a theme colour.
  - Day cells are 27×27, r8px.
- **Expected:** the nav arrows are visible in `onSurfaceVariant`; today and
  keyboard-selected use the gold tokens; the header reads in the UI font
  (see 9).
- **Cause:** re-styled (partial override of a third-party theme).
- **Status:** Open.

### 11. Input prefix sits outside the field box

- **Screen:** Edit transaction, Amount "€" (m09).
- **Element:** `primitives/Input`, `StyledInputWrapper` and `StyledPrefix`.
- **Measured:** the "€" renders as a sibling to the left of the bordered
  input. The Amount box is 540.6px against the Date box at 558.2px in the
  same two-column row, so the two field edges disagree by 17.6px.
- **Expected:** the prefix sits inside the field chrome, as the leading
  counterpart of the trailing-icon slot, so field boxes in one grid share
  edges.
- **Cause:** re-implemented (inside the primitive).
- **Status:** Open.

### 12. CategorySelect draws its own label, unlike every other field

- **Screen:** Add recurring (m06), Add expense (m08), Import review rows
  (08c).
- **Element:** `features/categories/CategorySelect`, `StyledLabel`.
- **Measured:** "Category" is sentence-case 14px, weight 500. Every other
  field label (`FormField`) is the 11px uppercase overline. The Select inside
  the label inherits weight 500; sibling Selects are 400.
- **Expected:** the `FormField` label, or no visible label where a table
  column header already names it (see 13).
- **Cause:** re-implemented.
- **Status:** Open.

### 13. Import review repeats a visible "Category" label in every table row

- **Screen:** Import step 3, Review (08c).
- **Element:** `ReviewTable` → `CategorySelect`.
- **Measured:** each row shows "Category" above its 190×39px select. This
  repeats the CATEGORY column header, and pushes the select ~14px below the
  row's centre line, so date, description and amount sit above the select's
  middle.
- **Expected:** in a table the select carries its accessible name (already
  `aria-label="Category"`) without a visible label. It renders at sm height
  and is vertically centred with the row.
- **Cause:** re-implemented (inherits finding 12).
- **Status:** Open.

## Icon buttons and modal close

### 14. Icon buttons come in six sizes

- **Screen:** across the app.
- **Element:**
  - 30×30: `SavingsStreakCard.StyledEditButton` and `StyledToggle`,
    `MortgageCountdown.StyledEditButton`, `CategoryManagerModal.ActionButton`
    (Hide, Rename, Delete), `Modal.StyledClose`.
  - 32×32: `ImportHistory.StyledActionBtn` (Preview, Delete import),
    `MonthOverview.StyledStepButton`.
  - 26×26: `CategoryManagerModal.EditActionButton` (rename Save, Cancel).
  - 28×28: `MonthYearPicker.StyledYearButton`.
  - 34×34: `ManualDrawer.StyledClose`.
  - 20×20: `Stepper.StepButton` (see 3).
- **Measured:** as listed. Radii are 8px (30, 32, 34), 7px (26) and 6px
  (28, month stepper 32). Hover backgrounds and colours differ per module.
- **Expected:** one icon button. `Button` ghost, size sm (32×32),
  icon-only, with an `aria-label`. Delete-style actions use the new
  `ghostDanger` variant.
- **Cause:** re-implemented.
- **Status:** Open.

### 15. Most icon buttons have no keyboard focus ring

- **Screen:** Dashboard, Import History, Categories, User Manual, every
  titled modal.
- **Element:** the local icon buttons with no `:focus-visible` rule:
  `SavingsStreakCard` edit and expand, `MortgageCountdown` edit,
  `ImportHistory.StyledActionBtn`, `ManualDrawer.StyledClose`,
  `Modal.StyledClose`.
- **Measured:** browser default (`auto 1px`, dark rgb(16, 16, 16) on the
  dark surface), effectively invisible.
- **Expected:** the Button ring: gold 2px outline, offset 2px.
- **Cause:** re-implemented.
- **Status:** Open.

### 16. Delete-style icons turn red on hover in some places only

- **Screen:** Categories Delete, Import History Delete import.
- **Element:** `CategoryManagerModal.ActionButton $danger`,
  `ImportHistory.StyledActionBtn $danger`.
- **Measured:** each module carries its own `$danger` hover. There is no
  shared variant, so other destructive icon actions (when added) won't
  match.
- **Expected:** `Button` variant `ghostDanger`: ghost at rest, error colour
  on hover.
- **Cause:** missing primitive (a variant).
- **Status:** Open.

### 17. Modal close is a "×" text glyph; the drawer close is a lucide icon

- **Screen:** every titled modal (m01, m02, m04, m09, m10, m11, 08a–c);
  User Manual drawer (10).
- **Element:** `components/Modal`, `StyledClose`;
  `features/manual/ManualDrawer`, `StyledClose`.
- **Measured:** the Modal close is 30×30 with a 20px "×" character. The
  drawer close is 34×34 with a lucide `X`. Neither has a focus ring.
- **Expected:** both are the same `Button` ghost sm icon-only (`X`), labelled
  "Close" or "Close manual", in the same header position.
- **Cause:** re-implemented.
- **Status:** Open.

## Month switch and changing labels

### 18. Month switch resizes with the month name and moves the arrows

- **Screen:** Month Overview header (02, 02b).
- **Element:** `MonthYearPicker.StyledTrigger` in the stepper beside
  `MonthOverview.StyledStepButton`.
- **Measured:** sweeping January → December 2026, the trigger width runs from
  104.4px ("May 2026") to 151.2px ("September 2026"). The stepper is
  right-aligned, so Next stays at x=1378 while **Previous moves between
  x=1186.8 and x=1233.6 (46.8px)**. The label is centred in its box, but the
  box itself changes.
- **Expected:** **Stable Label Width**. The trigger's `min-width` in `ch` is
  the longest month-year label (a named constant from the month-name list),
  with the label centred, so all three controls hold their position. The step
  buttons become `Button` ghost sm icon-only.
- **Cause:** missing primitive (no stable-width rule).
- **Status:** Open.

### 19. Month picker pop-up overflows the window's right edge

- **Screen:** Month Overview with the picker open (02c).
- **Element:** `MonthYearPicker` popover positioning (`left: rect.left`).
- **Measured:** the popover is 244px wide, anchored at x=1238.4. Its right
  edge is 1482.4 in a 1440px viewport, **overflowing by 42.4px**. The third
  month column is cut off.
- **Expected:** the popover aligns its right edge to the trigger's right
  edge (the trigger is at the right of the page header), staying inside the
  viewport.
- **Cause:** re-implemented (local popover placement).
- **Status:** Open.

### 20. Month picker cells and year buttons use off-scale radii

- **Screen:** month picker (02c).
- **Element:** `MonthYearPicker.StyledMonthCell` and `StyledYearButton`;
  `MonthOverview.StyledStepButton`.
- **Measured:** month cells are 67.3×34.8px with r7px. The year buttons are
  28×28 r6px, and the month step buttons 32×32 r6px.
- **Expected:** the radius token (`radius.md` 8px) where a finding already
  touches the file; the year and step buttons become `Button` (14).
- **Cause:** re-styled.
- **Status:** Open.

## Alignment

### 21. History Year Archive: header, year rows and month rows use three column grids

- **Screen:** History, Year Archive (04, 04b).
- **Element:** `YearArchive.styles.ts`:
  - `StyledColumnHeader` is `ARCHIVE_COLS 120px`.
  - `StyledYearRow` is `1fr 120px`, wrapping `StyledYearHeader` at
    `ARCHIVE_COLS`.
  - `StyledMonthRow` is `ARCHIVE_COLS` only.
- **Measured:** right edges of TOTAL LIQUID / RESTSCHULD / NET CASHFLOW:
  - header: 663 / 961 / 1259
  - 2026 year row: 657 / 949 / 1241
  - October month row: 708 / 1052 / 1395
    The month row's Net Cashflow figure lands under the STATEMENTS heading.
    Year figures are Space Grotesk 16px; month figures are IBM Plex Mono 16px.
- **Expected:** header, year rows and month rows read one shared column
  definition (the `TableHeader`/`DataRow` alignment owner). Figures
  right-align through `Money` in one face.
- **Cause:** re-implemented.
- **Status:** Open.

### 22. Import History: year header counts and statement-row counts misalign

- **Screen:** Import, Import history expanded (07b).
- **Element:** `ImportHistory.StyledYearHeader` against the statement row
  grid.
- **Measured:** the year row's "3 tx" ends at x=1395. The statement row's
  "3 tx" ends at about x=1229, because the statement row reserves trailing
  space for the two action buttons and the year row does not.
- **Expected:** the year header and statement rows share one column
  definition, so the tx counts stack.
- **Cause:** re-implemented.
- **Status:** Open.

### 23. Money's typeface depends on whatever wraps it

- **Screen:**
  - Space Grotesk: Month spending list (02), Account Detail recurring list
    (05, 06), Import preview (m01), History year rows (04), Plan Summary (01).
  - IBM Plex Mono: Dashboard accounts (01), Financial Plan (03), History
    month rows (04).
- **Element:** `primitives/Money`. `StyledMoney` sets only
  `font-variant-numeric`, so the face comes from the parent's local styles.
- **Measured:** the same amount renders in two faces across lists, and
  within one table on History (21).
- **Expected:** Money owns its figure face, so all money figures in lists
  read the same. Context sets size and tone, not the font.
- **Cause:** re-styled (the face is set per feature).
- **Status:** Open.

### 24. Import step 2 hint wraps as three flex columns

- **Screen:** Import wizard, Map columns (08b).
- **Element:** `ImportWizard.StyledMapHint` (`display: flex`).
- **Measured:** the text nodes and the `<strong>` become separate flex items.
  "Mapping remembered from your last" wraps in its own narrow column,
  "PostbankGiro" sits in a second, and "import — adjust if the columns
  changed." in a third.
- **Expected:** the icon is a flex item and the sentence is one inline text
  run (wrap the text in one span), wrapping as a paragraph.
- **Cause:** re-styled.
- **Status:** Open.

### 25. Settings page is inset 32px more than every other page

- **Screen:** Settings (09) against every other page (01–08).
- **Element:** `pages/SettingsStoragePage/SettingsStoragePage.styles.ts`
  (`padding: space8`).
- **Measured:** the Settings title sits at x=268, y=63, and the cards end at
  x=1381. Every other page title is at x=236, y=31, ending at x=1413. The
  page adds its own 32px padding inside the layout's.
- **Expected:** page gutters come from `AppLayout` only. Pages compose and do
  not style.
- **Cause:** re-styled.
- **Status:** Open.

## Inputs built locally

### 26. Categories inline rename and add fields are hand-built inputs

- **Screen:** Manage categories (m02b).
- **Element:** `CategoryManagerModal.NameInput` and `AddInput`.
- **Measured:**
  - Rename is 190×32.3px, r6px, 13.5px, padding 5px 9px, with no
    `:focus-visible` rule.
  - Add is 122.2×38.3px, r6px, 13.5px, padding 8px 10px. Its placeholder is
    truncated to "New category r".
  - The add row's Cancel and Add buttons are 32px high beside the 38.3px add
    field.
- **Expected:** `Input` size sm (32px) for both, with Field Chrome. The add
  field fills the row so its placeholder fits.
- **Cause:** re-implemented.
- **Status:** Open.

### 27. Import review description field is a hand-built input

- **Screen:** Import review (08c).
- **Element:** `ReviewTable.StyledReviewDesc`.
- **Measured:** 190×28.8px, transparent background and border at rest, r6px,
  12.5px.
- **Expected:** a compact `Input` at size sm with Field Chrome, so it reads
  as editable.
- **Cause:** re-implemented.
- **Status:** Open.

### 28. Categories rename Save/Cancel are bespoke 26px buttons

- **Screen:** Manage categories, rename row (m02b).
- **Element:** `CategoryManagerModal.EditActionButton`.
- **Measured:** 26×26px, r7px. Save has a green tint (`$tone: "pos"`).
- **Expected:** `Button` ghost sm icon-only (Cancel). Save keeps its
  confirming tone through a Button variant, not a local box.
- **Cause:** re-implemented.
- **Status:** Open.

## Modal chrome

### 29. Modals come in three header and footer patterns

- **Screen:**
  - (a) Titled header bar + × + divider, Cancel-then-primary footer: Import
    wizard, Savings goal, Manage categories, Import preview, Edit
    transaction, Alert, Confirm.
  - (b) Bare 24px heading inside the body, no ×, primary-then-Cancel footer:
    Create/Edit account (m03, m07), Mortgage details (m05).
  - (c) No heading at all, primary-then-Cancel: Add recurring (m06), Add
    expense (m08).
- **Element:** `components/Modal` renders its header only when `title` is
  passed. The (b) and (c) features omit it and either draw their own heading
  or none.
- **Measured:** three heading treatments (18px header bar / 24px body
  heading / none), the close control present or absent, and the footer order
  reversed between (a) and (b, c).
- **Expected:** every modal passes `title` and gets the one Modal header,
  with the shared close (17) and one footer order (Cancel, then primary).
- **Cause:** re-implemented.
- **Status:** Open.

### 30. Modal panel shows a white outline when it opens

- **Screen:** every Modal on open (m01, m03, m07).
- **Element:** `components/Modal`, the dialog surface (`tabIndex=-1`) that
  `useDialogKeyboard` focuses.
- **Measured:** on open, the browser's default light focus ring is drawn
  around the whole panel (visible in m01, m03, m07) until focus moves into it.
- **Expected:** the dialog surface, focused programmatically for
  containment, shows no ring (`outline: none` on the surface). Rings belong
  to controls.
- **Cause:** re-styled (missing rule).
- **Status:** Open.

### 31. Manage categories footer is clipped at a 900px window

- **Screen:** Manage categories with the add row open (m02b).
- **Element:** `components/Modal` body and footer layout.
- **Measured:** at 1440×900 the "Done" footer button is cut off at the panel's bottom edge, because the body scrolls with
  the footer inside it instead of above a fixed footer.
- **Expected:** the Modal body scrolls and the footer stays visible.
- **Cause:** re-implemented.
- **Status:** Open.

## Focus and disabled states

### 32. Focus rings differ by control family

- **Screen:** all.
- **Element:**
  - `Button`, `Select`, `Stepper`, `Tabs`, `MonthYearPicker`: gold 2px
    outline.
  - `Input`, `DatePicker`: 2px gold box-shadow.
  - No `:focus-visible` rule at all (browser default, effectively invisible
    on the dark surface): `Toggle`, `ChoiceChip`, `SeriesLegend` chips,
    `HistoryChart.StyledRangeChip`, `ImportWizard.StyledChip` and its pills,
    `ReviewTable.StyledCheck`, the accordion headers
    (`ProjectionAccordion`, `YearArchive`, `ImportHistory`,
    `SavingsStreakCard.StyledTitleGroup`, `ManualDetailRow`),
    `ManualRail.StyledRailEntry`, `AppLayout.StyledManualTrigger` (Help &
    manual), `AccountCreateModal.StyledIconButton`,
    `CategoryManagerModal.SwatchDot` and `AddButton`.
- **Measured:** as listed (static pass).
- **Expected:** buttons and chips use the Button ring (gold 2px, offset 2px).
  Fields use the Field Chrome ring (7). A control that stays local after the
  fixes still carries the same gold ring.
- **Cause:** re-implemented.
- **Status:** Open.

### 33. Toggle has no focus ring

- **Screen:** Settings, Automatic updates (09); Create/Edit account, Display
  in Trajectory Horizon (m03).
- **Element:** `primitives/Toggle`.
- **Measured:** no `:focus-visible` rule. Browser default `auto 1px`.
- **Expected:** the gold 2px ring, offset 2px.
- **Cause:** re-styled (missing rule in the primitive).
- **Status:** Open.

## Swatches

### 34. Two colour-swatch pickers in two sizes

- **Screen:** Create/Edit account (m03), Manage categories (m02).
- **Element:** `AccountCreateModal.StyledColorSwatch` (a local copy) against
  `CategoryManagerModal.SwatchDot` + `primitives/SwatchPicker`.
- **Measured:** account swatches are 28×28px with a 2px gold selected
  border. Category dots are 22×22px with a 2px surface border.
- **Expected:** both features use `SwatchPicker`, at one swatch size.
- **Cause:** re-implemented.
- **Status:** Open.

## Primitives index

### 35. Toggle and SwatchPicker are missing from the primitives index

- **Screen:** n/a (source).
- **Element:** `src/primitives/index.ts`; deep imports in
  `AccountCreateModal.tsx`, `AutoUpdateToggle.tsx` and
  `CategoryManagerModal.tsx`.
- **Measured:** 18 primitives are exported. `Toggle` and `SwatchPicker` are
  not, so three features deep-import them.
- **Expected:** every primitive is exported from the index, and features
  import through it.
- **Cause:** re-styled (filing gap).
- **Status:** Open.

---

## Static pass — every hand-built control

Every raw `styled.button` / `styled.input` / `styled.select` /
`styled.textarea` export in `src/features`, `src/components` and
`src/layouts` (38 exports). Each is either a finding above or a justified
exception for the future **Conformance Allowlist**. An exception still gets
the shared focus ring (32).

| Module                                   | Export                  | Disposition                                        |
| ---------------------------------------- | ----------------------- | -------------------------------------------------- |
| components/Modal                         | `StyledClose`           | Finding 14, 17                                     |
| components/SeriesLegend                  | `StyledChip`            | Exception — legend series toggle chip (sized by 4) |
| components/SeriesLegend                  | `StyledShowAllButton`   | Exception — legend reset chip (sized by 4)         |
| components/Snackbar                      | `StyledActionButton`    | Exception — inline text action inside the snackbar |
| components/Snackbar                      | `StyledCloseButton`     | Finding 14 (becomes the shared icon button)        |
| layouts/AppLayout                        | `StyledManualTrigger`   | Exception — sidebar nav item (32)                  |
| features/accounts/AccountCreateModal     | `StyledIconButton`      | Exception — icon picker cell (32)                  |
| features/accounts/AccountCreateModal     | `StyledColorSwatch`     | Finding 34                                         |
| features/categories/CategoryManagerModal | `NameInput`             | Finding 26                                         |
| features/categories/CategoryManagerModal | `AddInput`              | Finding 26                                         |
| features/categories/CategoryManagerModal | `EditActionButton`      | Finding 28                                         |
| features/categories/CategoryManagerModal | `ActionButton`          | Finding 14, 16                                     |
| features/categories/CategoryManagerModal | `SwatchDot`             | Exception — colour swatch (34, 32)                 |
| features/categories/CategoryManagerModal | `AddButton`             | Exception — dashed add-row affordance (32)         |
| features/history/HistoryChart            | `StyledRangeChip`       | Finding 4                                          |
| features/history/YearArchive             | `StyledYearHeader`      | Exception — disclosure header (21, 32)             |
| features/import/ImportHistory            | `StyledYearHeader`      | Exception — disclosure header (22, 32)             |
| features/import/ImportHistory            | `StyledActionBtn`       | Finding 14, 15, 16                                 |
| features/import/ImportWizard             | `StyledChip`            | Finding 4                                          |
| features/import/ImportWizard             | `StyledBlockedPill`     | Exception — error-toned call-to-action pill (32)   |
| features/import/ImportWizard             | `StyledAttentionToggle` | Exception — table filter pill, `aria-pressed` (32) |
| features/import/ImportWizard/ReviewTable | `StyledCheck`           | Exception — table row checkbox (32)                |
| features/import/ImportWizard/ReviewTable | `StyledReviewDesc`      | Finding 27                                         |
| features/manual/ManualDetailRow          | `StyledToggle`          | Exception — disclosure header (32)                 |
| features/manual/ManualDrawer             | `StyledClose`           | Finding 14, 15, 17                                 |
| features/manual/ManualRail               | `StyledRailEntry`       | Exception — table-of-contents nav item (32)        |
| features/months/MonthOverview            | `StyledStepButton`      | Finding 14, 18                                     |
| features/months/MonthYearPicker          | `StyledTrigger`         | Finding 18 (stays local: one feature)              |
| features/months/MonthYearPicker          | `StyledYearButton`      | Finding 14, 20                                     |
| features/months/MonthYearPicker          | `StyledMonthCell`       | Exception — calendar cell (20)                     |
| features/mortgage/MortgageCountdown      | `StyledEditButton`      | Finding 14, 15                                     |
| features/projection/ProjectionAccordion  | `StyledYearHeader`      | Exception — disclosure header (32)                 |
| features/projection/TrajectoryHorizon    | `StyledViewHistoryLink` | Finding 5                                          |
| features/savings/SavingsStreakCard       | `StyledTitleGroup`      | Exception — disclosure header (32)                 |
| features/savings/SavingsStreakCard       | `StyledEditButton`      | Finding 14, 15                                     |
| features/savings/SavingsStreakCard       | `StyledToggle`          | Finding 14, 15                                     |
| features/settings/StorageCard            | `HiddenFileInput`       | Exception — hidden file input                      |
| features/settings/StorageStatus          | `HiddenFileInput`       | Exception — hidden file input                      |

No feature re-styles a primitive through `styled(Button)`, `styled(Input)`,
`styled(Select)` or the like.

## Checked and consistent

These were measured and need no finding:

- `Button` sm/md/lg render at 32/40/44px everywhere they are used. Text-only
  buttons centre their label (equal left and right text gaps, for example
  Cancel L17/R17 and Done L17/R17).
- `Tabs` are 43px with a gold focus outline, the same in Month Overview and
  Import History.
- Financial Plan headings and figures share right edges.
- Account Detail recurring column headers align with their values.
- Empty states centre through `EmptyState` (Import History empty, 07c).

## Not driven at runtime

- **Dashboard → Backup.** It writes a file through the Electron dialog, which
  is unavailable in the browser harness.
- **Snackbar close button.** Seen in 07c. Covered by the static pass.
