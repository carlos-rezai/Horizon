# Category Manager — Redesign Handoff (delta)

**Scope: visual/interaction restyle only. No new logic, no new API calls, no prop changes.**
This is a drop-in replacement for the existing `CategoryManagerModal.tsx` — it consumes the exact same `useCategoryManager()` hook and calls the same functions (`recolor`, `create`, `rename`, `setHidden`, `remove`). Nothing about the data model, category shape, or server contract changes. Swap the JSX/styles; keep the hook wiring.

Reference source: `handoff/prototype/src/category-manager.jsx` (open `handoff/prototype/Horizon.html` → Settings → Preferences → Categories → **Manage** to interact with it live).

**Where this lives in the repo:** alongside the existing `docs/handoff/` (which already has `HANDOFF.md` + `brand/` + `prototype/` + `screens/`), add this as a sibling folder: `docs/handoff/categories-redesign/`, keeping the same internal shape (`DELTA.md` + `screens/`). The touched prototype file (`category-manager.jsx`, plus the `eye`/`eye-off` icon addition in `icons.jsx`) is already folded into the shared `docs/handoff/prototype/src/` — no separate prototype copy needed for this addendum.

---

## Why

The current implementation is functionally solid but the layout has real friction — see the 7 issues logged in the design conversation (competing `margin-left: auto` buttons that wrap unpredictably, an always-open 20-swatch color grid on every row, name+edit-input shown simultaneously, no visual hierarchy for hidden rows, delete-then-maybe-reassign as a surprise, add-category buried at the same weight as everything else). The redesign fixes all of these without touching behavior.

## What changed, row by row

| Before (`CategoryManagerModal.tsx` today)                                                                                                     | After (this redesign)                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Swatch grid always expanded inline in the row                                                                                                 | **Swatch is a single dot** — click opens a small popover palette (`SwatchPopover`), closes on select or outside-click                           |
| `RowName` shown _and_ a separate `NameInput` shown while editing                                                                              | **Click-to-edit rename**: name becomes an inline input with inline Save (✓) / Cancel (✕) icon buttons — one representation at a time            |
| `RenameButton`, `HideButton`, `DeleteButton` always visible as text buttons, both using `margin-left: auto` (wraps/collides on narrow widths) | **Icon-only actions, hover-revealed** (pencil / eye / trash), fixed to the row's trailing edge — no wrap, no competing auto-margins             |
| Hidden state: only the name + swatch dim (`opacity: 0.45`)                                                                                    | Whole row dims **and** carries an explicit **"Hidden" badge** — unambiguous at a glance                                                         |
| No indication a category is a default                                                                                                         | Default rows now carry a **"Default" badge**                                                                                                    |
| `CategoryAddRow` is a plain row, same visual weight as every other row, sitting at the bottom                                                 | **Dashed, accent-colored "+ Add category" affordance** that expands into a small inline form on click — clearly primary, not buried             |
| Delete → attempt → (maybe) reassign prompt, a surprise on failure                                                                             | Same two-step flow, kept as-is (it's the right model) — just restyled: clear warning banner + target dropdown + properly weighted danger button |
| Hide icon used a shield/checkmark glyph (misread as "protect/verify")                                                                         | Swapped to a plain **eye / eye-with-slash** — unambiguous show/hide                                                                             |

## Screens (`screens/`)

1. `screens/01-list-view.png` — Default + Custom sections, badges, dashed Add-category row
2. `screens/02-swatch-popover.png` — clicking a swatch dot opens the color popover (same `categoryColorPalette`)
3. `screens/03-reassign-before-delete.png` — the existing reassign-before-delete flow, restyled

## Implementation notes for the real component

- Keep `CategoryRow` split into **default** (recolor + hide, no rename/delete) and **custom** (recolor + rename + hide + delete) — same as today's two `.map()` calls over `defaults`/`customs`.
- `SwatchPopover` replaces `SwatchPicker`'s always-open grid — same `palette={categoryColorPalette}` prop, just gated behind an open/close state and an outside-click listener.
- The reassign modal (`ReassignPrompt`) is functionally identical to today's — same `targets` filtering (`[...defaults, ...customs].filter(c => c.id !== reassignFor.id)`), same default-to-Miscellaneous behavior via `useState`.
- New icon needed: `eye` / `eye-off` (swap in wherever the repo currently renders the hide/un-hide glyph).
- Icon-only buttons: remember the `padding: 0` gotcha from the main handoff (§6) so glyphs stay centered.
