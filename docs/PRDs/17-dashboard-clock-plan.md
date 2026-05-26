# Plan: Dashboard Clock

> Source PRD: https://github.com/carlos-rezai/Horizon/issues/118

## Architectural decisions

- **Routes**: None — no new routes required
- **Schema**: None — no database involvement
- **Key models**: None — component-only feature
- **Placement**: `src/components/Clock/` — stateful UI block with no domain or financial logic; fits the `components/` layer contract
- **Interface**: No props — `Clock` is fully self-contained; callers render `<Clock />` with no configuration
- **Locale**: `en-GB` via `Intl.DateTimeFormat` — consistent with existing date conventions throughout the app
- **Integration point**: `AppLayout` sidebar, between `<StyledSpacer />` and the Settings `<StyledNavLink>`

---

## Phase 1: Static Clock component

**User stories**: 1, 2, 3, 4, 5, 6, 7, 8, 11, 12

### What to build

Create the `Clock` component in `src/components/Clock/` rendering a fixed time and date in the correct two-line format: `HH:MM` (24-hour, zero-padded) on the primary line and `Weekday, DD Month` (no year) on the secondary line. Wire `<Clock />` into `AppLayout` between the spacer and the Settings nav link. At this stage the display is static — it shows the time at mount but does not tick.

### Acceptance criteria

- [ ] `Clock` renders a primary line in `HH:MM` 24-hour zero-padded format
- [ ] `Clock` renders a secondary line in `Weekday, DD Month` format with no year
- [ ] Zero-padding is correct at midnight (`00:00`) and noon (`12:00`)
- [ ] `Clock` takes no props
- [ ] `Clock` is visible in the sidebar on every page (Dashboard, Financial Plan, Month Overview, Settings)
- [ ] `Clock` is positioned between the spacer and the Settings link in the sidebar
- [ ] Styles use Meridian theme tokens — no hardcoded colours or sizes
- [ ] `Clock.styles.ts` is co-located with `Clock.tsx` and `Clock.test.tsx`
- [ ] Tests verify the rendered text for both lines using a mocked fixed date

---

## Phase 2: Live interval

**User stories**: 9, 10

### What to build

Wire up `useState(() => new Date())` and a `setInterval` at 60 000ms inside `Clock`. The state is initialised to `new Date()` at mount so the correct time is displayed immediately — no one-minute delay. The interval fires every minute and updates the displayed time. The `useEffect` returns `clearInterval` to prevent memory leaks on unmount.

### Acceptance criteria

- [ ] Clock displays the correct time immediately on mount (no blank or stale initial state)
- [ ] Displayed time updates after 60 000ms without a page reload
- [ ] `setInterval` is called with a delay of exactly 60 000ms
- [ ] `clearInterval` is called when the component unmounts
- [ ] Tests use `vi.useFakeTimers()` to advance time and assert the updated display
- [ ] No `console.log` left in committed code
