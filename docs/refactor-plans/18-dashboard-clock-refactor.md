## Problem Statement

The `Clock` component's live-update behaviour is incorrect. The current
implementation starts a `setInterval` 60 000 ms after mount, not at the
next real-world minute boundary. If the component mounts at 14:30:45, the
first tick fires at 14:31:45 — 45 seconds after 14:31:00 became true. The
display can therefore show a stale time for up to 59 seconds, which is
visible on a HH:MM display with no seconds digit.

In addition, `AppLayout.test.tsx` has no test verifying that `<Clock />`
is actually rendered in the sidebar, leaving a gap between the Clock's
thorough unit tests and the layout integration.

## Solution

Replace the plain `setInterval` in `Clock.tsx` with a two-phase timer:

1. On mount, calculate the milliseconds remaining until the next minute
   boundary (`(60 - seconds) * 1 000 - milliseconds`).
2. Fire a `setTimeout` for that duration. When it fires, update state to
   the new time and start a regular 60 000 ms `setInterval`.
3. The cleanup function cancels both the timeout (if still pending) and the
   interval (if already started).

This guarantees that after the initial sync the display flips at exactly
the same instant the real clock minute turns over.

Add a single smoke test to `AppLayout.test.tsx` confirming the sidebar
clock is rendered.

## Commits

### Commit 1 — Rewrite Clock interval and cleanup tests (RED)

Update `Clock.test.tsx`:

- Replace the "live interval" describe block with tests that reflect the
  timeout-then-interval model:
  - Mount with system time at 15:30:30 (30 s into the minute).
  - Assert that advancing 29 999 ms does not update the display.
  - Assert that advancing 30 000 ms updates the display to 15:31.
  - Assert that advancing a further 60 000 ms after the initial sync
    updates the display to 15:32.
- Replace the "cleanup" describe block:
  - Assert that both `clearTimeout` and `clearInterval` are called on
    unmount (spy on `window.clearTimeout` and `window.clearInterval`).
- Leave all other describe blocks (primary line, secondary line,
  zero-padding) unchanged — they remain unaffected by this change.

Tests go RED because the implementation still uses plain `setInterval`.

### Commit 2 — Fix Clock interval alignment (GREEN)

Update `Clock.tsx`:

- Replace the `useEffect` body with the two-phase timeout+interval
  pattern.
- Declare `intervalId` as `ReturnType<typeof setInterval> | undefined`
  inside the effect so it is captured by the cleanup closure.
- Compute `msToNextMinute` from a `new Date()` at effect run time.
- The cleanup returns `clearTimeout(timeoutId); clearInterval(intervalId)`.
  Both calls are unconditional — passing `undefined` to `clearInterval`
  is a browser no-op.

No changes to props, rendered output, or styles. All tests go GREEN.

### Commit 3 — Add AppLayout smoke test for Clock

Add a new describe block to `AppLayout.test.tsx`:

- `describe("AppLayout — sidebar clock")` with one test.
- Use `vi.useFakeTimers()` + `vi.setSystemTime(new Date("2025-01-15T15:30:00"))`
  so the rendered time is deterministic.
- Assert `screen.getByText("15:30")` is in the document.
- Call `vi.useRealTimers()` in the test teardown (or rely on the existing
  `afterEach` cleanup).

## Decision Document

**Modules modified:**

- `src/components/Clock/Clock.tsx` — the only change is inside `useEffect`
- `src/components/Clock/Clock.test.tsx` — interval and cleanup tests rewritten
- `src/layouts/AppLayout/AppLayout.test.tsx` — one new describe block added

**Two-phase timer interface:**

```
mount
  → compute msToNextMinute = (60 - seconds) * 1_000 - milliseconds
  → setTimeout(msToNextMinute)
      → setNow(new Date())
      → setInterval(60_000)
unmount
  → clearTimeout (cancels pending sync if not yet fired)
  → clearInterval (no-op if timeout never fired; clears interval otherwise)
```

**Why not a 1-second interval?** A 1 000 ms interval would sidestep the
alignment problem without the two-phase complexity, but it calls `setNow`
60× more often per minute for a display that has no sub-minute granularity.
The two-phase approach is the correct solution at a small complexity cost.

**Why not extract to `useClock`?** The design log explicitly rejected this
as over-engineered for a single consumer. The logic stays inside `Clock.tsx`.

**Component placement unchanged:** `components/` is correct per the design
log. The Clock has no domain/financial logic; only local UI state.

**Intl.DateTimeFormat not adopted:** The hardcoded `WEEKDAYS`/`MONTHS`
arrays are deterministic across test environments; `Intl` output depends on
the Node.js locale and would add test fragility for no user-visible benefit
in a fixed-locale desktop app.

## Testing Decisions

**What makes a good test here:** Test the observable output (the rendered
time string) and the side-effect contract (timers are cleared on unmount).
Do not test implementation details like whether `setTimeout` or
`setInterval` is called — only that the display reflects the correct time
at the correct moment.

**Modules tested:**

- `Clock.tsx` — full unit coverage via `Clock.test.tsx`
- `AppLayout.tsx` — Clock presence via one smoke test in `AppLayout.test.tsx`

**Prior art:** The existing Clock tests already use `vi.useFakeTimers()` +
`vi.setSystemTime()` + `act(() => { vi.advanceTimersByTime(...) })`. The
updated tests follow exactly the same pattern.

## Out of Scope

- Timezone selection — Electron reads the OS clock; the user's local
  timezone is always correct.
- Seconds display — rejected during design; HH:MM is sufficient.
- Switching from WEEKDAYS/MONTHS arrays to `Intl.DateTimeFormat`.
- Moving Clock from `components/` to any other layer.
- Any visual or styling changes to the Clock widget.

## Further Notes

The `clearInterval(undefined)` call in the cleanup function is a deliberate
no-op guard rather than a conditional. Both `clearTimeout` and
`clearInterval` accept `undefined` in browser and Node.js environments, so
no runtime check is required. This keeps the cleanup function symmetrical
and avoids a conditional that could mask a missing assignment.
