# Baseline performance traces — 2026-07-21

Raw chrome-devtools traces captured for issue #199 (Performance + UX Polish,
Phase 1). These are the **before** artifacts; Phase 8 (#206) re-captures the
same five under the same protocol and writes up the delta.

The protocol that produced them — and the reasoning about what they show —
lives in `docs/dev-journal.md` under the 2026-07-21 entry. This file is just
the index.

## Capture environment

|             |                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Build       | production (`npx vite build`), served by `vite preview` on `:4173`                                                                        |
| Browser     | Edge 150.0.4078.83 (Chromium), throwaway profile, `--remote-debugging-port=9222` — see note below                                         |
| API         | `tsx watch server/src/server.ts` on `:3001`, `VITE_API_BASE_URL=http://127.0.0.1:3001`                                                    |
| Dataset     | `fixtures/horizon-seed.db` via `npm run db:reset` — 4 accounts (3 liquid + 1 Mortgage), Variable Spending in June 2026, none in July 2026 |
| Throttling  | none (CPU 1x, network unthrottled)                                                                                                        |
| Node / Vite | v24.14.0 / 8.0.3                                                                                                                          |

Traces are `.json.gz`; open them with **Load profile** in the DevTools
Performance panel, or at <https://ui.perfetto.dev>.

**Browser note.** These five were captured in Edge. Brave is now the project's
browser for CDP work, so any future capture in `docs/perf/` should use Brave
(150.1.92.141 — the same Chromium 150 major as the Edge build above). Phase 8
should pick one browser for both halves of its before/after rather than
comparing an Edge baseline against Brave after-traces.

## Sanitization — read before adding traces here

These traces were passed through `scripts/sanitize-trace.mjs` before being
committed. A raw chrome-devtools trace carries a `metadata` block that
fingerprints the capturing machine: the full browser command line (which
embeds the local user profile path), motherboard model, GPU driver version,
CPU stepping, and antivirus state. That is published permanently the moment it
lands in a public repo, and none of it helps anyone read the trace. Those
fields now hold a `[stripped by scripts/sanitize-trace.mjs]` placeholder —
the key is kept so a reader can tell the value was removed deliberately rather
than never captured.

Kept on purpose, because a perf baseline is not reviewable without it: core
count, CPU vendor, physical memory, GPU model, OS version, user agent, locale.

**Two rules for anyone adding traces to `docs/perf/`:**

1. **Always `npm run db:reset` before capturing.** Traces embed a screenshot
   filmstrip, so whatever is on screen is committed as images. Every figure in
   these five is from the committed `fixtures/horizon-seed.db`, so nothing here
   discloses anything the repo did not already contain. Capturing against a
   real database would put real balances and real transaction descriptions into
   a public repo as pictures, where no text search would ever find them.
2. **Run the sanitizer, and gate on it:**

   ```bash
   node scripts/sanitize-trace.mjs docs/perf/<dir>/*.json.gz          # strip
   node scripts/sanitize-trace.mjs --check docs/perf/<dir>/*.json.gz  # verify, exit 1 if dirty
   ```

   It is idempotent, so re-running is safe.

## The five traces

| #   | File                                             | Interaction                                            | Headline                                  |
| --- | ------------------------------------------------ | ------------------------------------------------------ | ----------------------------------------- |
| 01  | `01-dashboard-cold-load.json.gz`                 | Cold load of `#/`                                      | LCP 232 ms · CLS 0 · critical path 563 ms |
| 02  | `02-plan-cold-load.json.gz`                      | Cold load of `#/plan`                                  | LCP 185 ms · CLS 0                        |
| 03  | `03-month-cold-load.json.gz`                     | Cold load of `#/months/2026-07`                        | LCP 180 ms · CLS 0                        |
| 04  | `04-cold-first-click-dashboard-to-month.json.gz` | Settled Dashboard → first click on Month nav           | INP 6 ms · **45 ms forced reflow**        |
| 05  | `05-cold-first-click-month-switch.json.gz`       | Freshly loaded Month → first click on "Previous month" | INP 10 ms · **64 ms forced reflow**       |

Traces 04 and 05 are the cold-first-click pair the PRD's stutter diagnosis
calls for. 05 is the sharper of the two because July 2026 is empty and June
2026 has seven Variable Spending rows, so the switch mounts the breakdown
donut and the populated spending list from nothing.

## Attribution

Traces 04 and 05 were attributed against `dist/assets/index-*.js.map`
(`npx vite build --sourcemap`; the sourcemap is external, so the bundle hash
and therefore the trace positions are unchanged). Resolving the forced-reflow
frames of trace 05:

| Minified frame             | Resolves to                                         | Share of 64 ms |
| -------------------------- | --------------------------------------------------- | -------------- |
| `(anonymous) @ 2608:190`   | `src/primitives/Tabs/Tabs.tsx:35`                   | **62 ms**      |
| `(anonymous) @ 766:106213` | `recharts/es6/util/useReportScale.js:13`            | 2 ms           |
| top frame `D @ 1:10233`    | `react-dom-client.production.js:334` (commit phase) | —              |

Reproduce with:

```bash
npx vite build --sourcemap
node -e "
const {SourceMap} = require('node:module');
const map = JSON.parse(require('fs').readFileSync('dist/assets/index-<hash>.js.map','utf8'));
const sm = new SourceMap(map);
console.log(sm.findEntry(2608, 190));
"
```

## Caveats

- **Chromium-over-HTTP, not Electron.** Horizon ships as an Electron renderer
  loading `file://`. These traces are a Chromium tab against `vite preview`.
  The React/Recharts/styled-components work is the same; the loader and font
  fetches are not. Treat the load numbers as directional and the interaction
  numbers as representative.
- **No throttling.** Captured on the dev machine at 1x CPU. The absolute
  milliseconds flatter a low-end machine; the _ratios_ between mechanisms are
  the durable part.
- **Production build, so no component-level React Profiler attribution.**
  React's profiling hooks are stripped from the production build. Component
  render counts need the dev-server companion pass described in the journal.
