# 17 — Dashboard Clock

## Background

Horizon's sidebar (`AppLayout`) is the persistent app chrome shared across all
pages. It already contains the wordmark, nav links, a spacer, and a Settings
link. The next build item is a live date/time widget — initially described as a
"dashboard clock" but resolved during grill-me to live in the sidebar rather
than on a single page, so it is visible everywhere.

The app uses German locale conventions throughout (DD.MM.YYYY dates, German
account terms), which informs the time format choice.

## Problem

Where should a live date/time display live, in what format, and how should it
be architecturally placed to minimise coupling and duplication?

## Questions and Answers

**Q: Where on the dashboard should the clock live?**
A: The user initially suggested "all headers" as a variant. Evaluated three
options — dashboard header only, all page headers, sidebar. Sidebar wins:
one implementation, always visible, no awkwardness on contextually irrelevant
pages (e.g. editing a transaction).

**Q: Dashboard-only header vs. sidebar?**
A: Sidebar (AppLayout). Global, persistent, one component.

**Q: Where in the sidebar?**
A: Above the Settings link, below the spacer — grouped with the only other
bottom-pinned element.

**Q: What should the clock display?**
A: HH:MM (24-hour) as the primary line; "Day, DD Month" (e.g. "Tuesday,
26 May") as the secondary line. No seconds, no year.

**Q: 24-hour or 12-hour?**
A: 24-hour — consistent with the German locale used throughout the app.

## Design

### Ubiquitous language

The feature slug remains `dashboard-clock` to match the build status entry.
The term in ubiquitous language is **Sidebar Clock** — more accurate to its
actual location.

### Component architecture

```
src/components/Clock/
  Clock.tsx          ← stateful UI block, manages own interval
  Clock.styles.ts    ← styled-components
  Clock.test.tsx     ← unit tests
```

✅ `src/components/Clock/` — stateful UI block with no domain or financial
logic; fits the `components/` layer (composed UI, no business logic beyond
local state management).

❌ `src/features/dashboard/DashboardClock/` — rejected; the widget is no
longer scoped to the dashboard, and clock state is not domain/financial logic.

❌ `src/hooks/useClock.ts` + separate presentational component — rejected;
over-engineered for a self-contained widget with a single consumer.

### State and behaviour

```ts
// Internal to Clock.tsx
const [now, setNow] = useState(() => new Date());

useEffect(() => {
  const id = setInterval(() => setNow(new Date()), 60_000);
  return () => clearInterval(id);
}, []);
```

- Ticks every 60 000 ms (no seconds displayed → per-minute is sufficient)
- Initialised to `new Date()` at mount so the display is immediate
- No props — fully self-contained

### Display format

| Line      | Format                      | Example           |
| --------- | --------------------------- | ----------------- |
| Primary   | HH:MM, 24-hour, zero-padded | `14:30`           |
| Secondary | Weekday, DD Month (no year) | `Tuesday, 26 May` |

Formatting via `Date` methods or `Intl.DateTimeFormat` — locale `'en-GB'`
matches the rest of the app's date conventions.

### Integration

`AppLayout.tsx` renders `<Clock />` between `<StyledSpacer />` and the
Settings `<StyledNavLink>`:

```tsx
<StyledSpacer />
<Clock />
<StyledNavLink as={NavLink} to="/settings/storage">
  <Settings size={16} />
  Settings
</StyledNavLink>
```

No prop threading required — `Clock` is fully self-contained.

## Implementation Plan

**Phase 1 — Static clock component**

- Create `src/components/Clock/Clock.tsx` rendering a fixed time and date
- Create `Clock.styles.ts` with sidebar-appropriate styling
- Create `Clock.test.tsx` with a snapshot / structure test
- Render in `AppLayout` in the correct position

**Phase 2 — Live interval**

- Wire up `useState` + `setInterval` in `Clock.tsx`
- Update tests to mock `Date` and `setInterval`

## Trade-offs

**Easier:** One component, one location, always visible. No routing logic.
No API dependency. Trivially testable by mocking `Date`.

**Harder:** Nothing significant — the widget is intentionally minimal.

**Out of scope:**

- Timezone selection — Electron desktop reads the OS clock; the user's local
  timezone is always correct
- Seconds display — rejected for visual noise; HH:MM is sufficient
- Year in date — omitted; implied context
- Any click/interaction behaviour — display only
