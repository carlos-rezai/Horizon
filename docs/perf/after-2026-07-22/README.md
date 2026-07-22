# After performance traces — 2026-07-22

Raw chrome-devtools traces captured for issue #206 (Performance + UX Polish,
Phase 8). These are the **after** artifacts; the before half lives in
`docs/perf/baseline-2026-07-21/`, and the reasoning about what changed between
them is in `docs/dev-journal.md` under the 2026-07-22 entry.

## Capture environment

|             |                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Build       | production (`npx vite build --sourcemap`), served by `vite preview` on `:4173`                                                            |
| Browser     | Edge 150.0.4078.83 (Chromium), throwaway profile, `--remote-debugging-port=9222` — matches the baseline build exactly                     |
| API         | `tsx server/src/server.ts` on `:3001`, `VITE_API_BASE_URL=http://127.0.0.1:3001`                                                          |
| Dataset     | `fixtures/horizon-seed.db` via `npm run db:reset` — 4 accounts (3 liquid + 1 Mortgage), Variable Spending in June 2026, none in July 2026 |
| Throttling  | none (CPU 1x, network unthrottled)                                                                                                        |
| Node / Vite | v24.14.0 / 8.0.3                                                                                                                          |

**Captured in Edge, deliberately.** The baseline README notes that Brave is the
project's browser for CDP work, and that Phase 8 should pick one browser for
both halves of a before/after rather than mixing. It picked Edge, to match the
five baseline traces build-for-build.

## Warm the browser before capturing — this bit is new, and it matters

Page-load numbers are **not comparable across Edge process restarts**. A freshly
started browser has no V8 code cache for the 1.7 MB bundle, and the same build
measured 325 ms LCP in a long-running instance and 615 ms in a newly launched
one. Two rules, both learned by getting this wrong first:

1. **Warm each origin with three reloads before the capture**, so the code cache
   is populated and the numbers settle.
2. **Never compare a number from one browser instance against a number from
   another.** Every comparison in the journal entry was re-measured inside a
   single instance, back to back, after this was discovered.

Changing the bundle also changes its hash, so the first load after a rebuild is
an uncached fetch — warm again after every `vite build`.

## Sanitization — read before adding traces here

Same two rules as the baseline, unchanged, and both were followed here:

1. **Always `npm run db:reset` before capturing.** Traces embed a screenshot
   filmstrip, so whatever is on screen is committed as images. Every figure in
   these five comes from the committed `fixtures/horizon-seed.db`.
2. **Run the sanitizer, and gate on it:**

   ```bash
   node scripts/sanitize-trace.mjs docs/perf/<dir>/*.json.gz          # strip
   node scripts/sanitize-trace.mjs --check docs/perf/<dir>/*.json.gz  # verify
   ```

## The five traces

| #   | File                                             | Interaction                                            | Headline                           | Baseline                        |
| --- | ------------------------------------------------ | ------------------------------------------------------ | ---------------------------------- | ------------------------------- |
| 01  | `01-dashboard-cold-load.json.gz`                 | Cold load of `#/`                                      | LCP 167–181 ms · CLS 0.05          | LCP 232 ms · CLS 0              |
| 02  | `02-plan-cold-load.json.gz`                      | Cold load of `#/plan`                                  | LCP 164 ms · CLS 0                 | LCP 185 ms · CLS 0              |
| 03  | `03-month-cold-load.json.gz`                     | Cold load of `#/months/2026-07`                        | LCP 176 ms · CLS 0.01 · no reflow  | LCP 180 ms · CLS 0              |
| 04  | `04-cold-first-click-dashboard-to-month.json.gz` | Settled Dashboard → first click on Month nav           | INP 7 ms · **no forced reflow**    | INP 6 ms · 45 ms forced reflow  |
| 05  | `05-cold-first-click-month-switch.json.gz`       | Freshly loaded Month → first click on "Previous month" | INP 5 ms · **55 ms forced reflow** | INP 10 ms · 64 ms forced reflow |

The load LCPs improved against baseline, but only after the skeleton→content
fade was removed; with it in place the Dashboard measured 615–772 ms. The
Dashboard's CLS of 0.05 is the one number that got worse and stayed worse —
it is the skeleton/content height mismatch, and it is unfinished business
rather than a fixed problem. See the journal entry.

## Attribution

Trace 05's surviving forced reflow, resolved against
`dist/assets/index-DlREkRGd.js.map`:

| Minified frame             | Resolves to                              | Share of 55 ms |
| -------------------------- | ---------------------------------------- | -------------- |
| `(anonymous) @ 2588:190`   | `src/primitives/Tabs/Tabs.tsx:36`        | **52 ms**      |
| `(anonymous) @ 720:106215` | `recharts/es6/util/useReportScale.js:14` | 3 ms           |

Same recipe as the baseline:

```bash
npx vite build --sourcemap
node -e "
const {SourceMap} = require('node:module');
const map = JSON.parse(require('fs').readFileSync('dist/assets/index-<hash>.js.map','utf8'));
const sm = new SourceMap(map);
console.log(sm.findEntry(2588, 190));
"
```

Tabs still owns the frame, and that is expected: it is the first code to read
layout after React commits the new month's DOM, so it pays for a layout the
browser has to do anyway. What changed is how often — see the measurement
counts in the journal entry, taken by wrapping the `scrollWidth` getter in the
live page rather than inferred from the trace.

## Caveats

- **Chromium-over-HTTP, not Electron**, unchanged from the baseline. Horizon
  ships as an Electron renderer loading `file://`, where asset and font latency
  is near zero. Treat the load numbers as directional and the ranking between
  variants as the durable part.
- **No throttling**, captured at 1x CPU on the dev machine.
- **Production build, so no component-level React Profiler attribution.**
- **LCP is a harsh judge of progressive reveal.** With sections revealing
  independently, the "largest contentful paint" is whichever section lands
  last, so LCP measures the whole reveal rather than first paint. That is what
  made the fade look catastrophic; it is worth keeping in mind before treating
  a single LCP number as the verdict on perceived speed.
