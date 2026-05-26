## Problem Statement

When tracking finances on Horizon, the user needs to know the current date and time at a glance. Today there is no time display in the app — the user must context-switch to an OS clock or taskbar, breaking focus.

## Solution

Add a **Sidebar Clock** to the persistent sidebar in `AppLayout` — visible on every page. It displays the current time in HH:MM (24-hour) format on the primary line and the weekday plus date ("Tuesday, 26 May") on the secondary line. The widget ticks once per minute and is fully self-contained; no user interaction is required or supported.

## User Stories

1. As a user, I want to see the current time displayed in the sidebar so that I always know the time without leaving the app.
2. As a user, I want the time shown in 24-hour format (HH:MM) so that it is consistent with the German locale conventions used throughout the app.
3. As a user, I want the current weekday and date shown below the time so that I can orient myself in the week without checking a separate calendar.
4. As a user, I want the date displayed as "Weekday, DD Month" (e.g. "Tuesday, 26 May") so that the format is unambiguous and requires no parsing.
5. As a user, I do not want the year shown in the date line because the current year is implied context.
6. As a user, I do not want seconds shown in the time because the second-level precision adds visual noise without practical value.
7. As a user, I want the clock to be visible on the Dashboard, Financial Plan, Month Overview, Account Detail, and Settings pages so that I never need to leave the app for time context.
8. As a user, I want the clock positioned above the Settings link in the sidebar so that it is grouped naturally with the other bottom-pinned sidebar elements.
9. As a user, I want the clock to show the correct time immediately when the app opens — not after a one-minute delay.
10. As a user, I want the clock to update automatically every minute so that the displayed time never falls more than one minute behind.
11. As a user, I do not need to click, hover, or interact with the clock in any way — it is display-only.
12. As a user, I do not need to configure a timezone because the Electron desktop app reads the OS clock and my local timezone is always correct.

## Implementation Decisions

### Module to create: `src/components/Clock/`

The Sidebar Clock is placed in `src/components/` — not `src/features/` — because it contains no financial domain logic and no business rules. Its state (the current time) is purely UI state with no relationship to accounts, projections, or transactions. It fits the `components/` contract: a composed UI block with no business logic, no data fetching, and no domain awareness.

Three files are created:

- `Clock.tsx` — stateful component managing its own interval
- `Clock.styles.ts` — styled-components for the two-line display
- `Clock.test.tsx` — unit tests

A `useClock` hook extraction was considered and rejected as over-engineering: the Clock component is the only consumer and the state logic is trivial. Keeping state inside the component is simpler and easier to test.

### Component interface

The `Clock` component takes no props. It is fully self-contained. Callers render `<Clock />` with no configuration.

### State and tick logic

- `useState(() => new Date())` — initialised at mount so the display is immediate.
- `setInterval(() => setNow(new Date()), 60_000)` in a `useEffect` — ticks every 60 seconds.
- Cleanup: the `useEffect` returns `clearInterval` to avoid memory leaks on unmount.
- No seconds are displayed, so a per-minute interval is sufficient.

### Display format

| Line      | Format                      | Example           |
| --------- | --------------------------- | ----------------- |
| Primary   | HH:MM, 24-hour, zero-padded | `14:30`           |
| Secondary | Weekday, DD Month (no year) | `Tuesday, 26 May` |

Formatting uses `Intl.DateTimeFormat` with locale `'en-GB'` — consistent with the rest of the app's date conventions.

### Integration point

`AppLayout.tsx` is the only consumer. `<Clock />` is rendered between `<StyledSpacer />` and the Settings `<StyledNavLink>`:

```tsx
<StyledSpacer />
<Clock />
<StyledNavLink as={NavLink} to="/settings/storage">
  <Settings size={16} />
  Settings
</StyledNavLink>
```

No prop threading is needed — `Clock` is self-contained.

### Styling

`Clock.styles.ts` defines the two-line display using tokens from the Meridian design system. No hardcoded colours or sizes — all values come from the theme token system.

## Testing Decisions

**What makes a good test for Clock:**  
Tests should verify observable output — the formatted strings rendered to the DOM — not implementation details like the interval ID or `useState` internals. Tests mock `Date` to control the displayed values precisely.

**Module under test:** `Clock.tsx`

**Tests to write:**

1. Renders the current time in HH:MM 24-hour format using a fixed mock date (e.g. 14:30 → `"14:30"`).
2. Renders the secondary line with the correct weekday and date (e.g. Tuesday, 26 May).
3. Midnight/noon boundary: verifies zero-padding (00:00, 12:00 render correctly).
4. Interval: asserts that `setInterval` is called with a 60 000ms delay.
5. Cleanup: asserts that `clearInterval` is called when the component unmounts — verifying no memory leak.
6. Tick update: advancing the mocked timer by 60 000ms updates the displayed time to the new value.

**Prior art:** `src/components/Snackbar/Snackbar.test.tsx` and `src/components/Card/Card.test.tsx` demonstrate the standard RTL + `render` / `screen.getByText` pattern used across this project.

## Out of Scope

- **Seconds display** — rejected; no use case, adds visual noise.
- **Year in date line** — omitted; implied context.
- **Timezone selection** — the Electron desktop shell reads the OS clock; the user's local timezone is always correct.
- **Click / hover / interaction** — the widget is display-only with no interactive behaviour.
- **Per-page vs. sidebar placement** — considered and rejected; the sidebar ensures consistent visibility across all pages with one implementation.

## Further Notes

The feature slug `dashboard-clock` is retained in commit messages and issue tracking to match the Build Status entry in CLAUDE.md. The canonical term in code identifiers, UX copy, and the ubiquitous language is **Sidebar Clock** — the widget lives in the sidebar, not on the Dashboard page. Never use "Dashboard Clock" in component names or displayed text.
