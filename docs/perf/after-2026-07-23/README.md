# After performance traces — 2026-07-23 (issue #208)

Raw chrome-devtools traces captured for issue #208 — the Dashboard cold-load
CLS regression left open at the end of #206. These are the **after-the-fix**
artifacts. The regression they close was documented in
`docs/perf/after-2026-07-22/` and `docs/dev-journal.md` (2026-07-22 entry,
"Unfinished: the Dashboard's 0.05 CLS").

## What #208 fixed

The Dashboard's 0.05 CLS was a single ~0.047 jolt: the KPI strip's value slot
renders 30px numerals in a 45px line-box, but `KpiStripSkeleton` reserved only
34px for it, so the strip grew by ~11px when the numbers landed and pushed every
section below it down. The fix reserves the real line-box height
(`30px * 1.5 = 45px`) on `StyledValue`, shared by the loaded content and the
skeleton, so the slot is the same height whether or not data has landed.

## Capture environment

Same protocol as `docs/perf/after-2026-07-22/` — read that README first; only
the deltas are noted here.

|            |                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| Build      | production (`VITE_API_BASE_URL=http://127.0.0.1:3001 npx vite build --sourcemap`), `vite preview` :4173 |
| Browser    | **Brave** (Chrome/150), throwaway profile, `--remote-debugging-port=9222` — see caveat below            |
| API        | `tsx server/src/server.ts` on :3001                                                                     |
| Dataset    | `fixtures/horizon-seed.db` via `npm run db:reset`                                                       |
| Throttling | none (CPU 1x, network unthrottled)                                                                      |

Every origin was warmed with three reloads before each capture, and every
before/after comparison below was taken **inside one browser instance, back to
back** — the two rules the 2026-07-22 README established.

**Browser differs from the 2026-07-22 set (Brave, not Edge), so the absolute
load numbers here are not comparable to that set.** That is exactly why the
before/after was re-measured against the pre-fix build in this same Brave
instance rather than against the committed Edge numbers.

## The shift is intermittent — measure the distribution, not one load

The pre-fix jolt only appears when a slightly slower frame lets the skeleton
paint before the projection fetch resolves. On a fast reload the numbers land
on essentially the first frame and there is no jolt at all. So a single load
proves nothing; the defect is a spike in the distribution.

Same-instance A/B, Dashboard cold load, CLS across repeated warmed reloads:

| Build            | CLS samples                          | Value-slot jolt                    |
| ---------------- | ------------------------------------ | ---------------------------------- |
| Before (pre-fix) | 0.0088, 0.05, **0.0491**, **0.0496** | 0.0466–0.0471 when it paints       |
| After (this fix) | 0.0076, 0.0076, 0.0076, 0.0076       | never — impossible by construction |

The pre-fix spike reproduces the 0.0472 from the 2026-07-22 write-up almost
exactly. The after-fix residual is a flat 0.0076 in every sample: a 0.0051
font-swap shift plus a 0.0025 unattributed shift, no value-slot jolt. The
font-swap residual is near-zero in the shipping Electron `file://` target, where
fonts load off disk.

## The four traces

| #   | File                                        | Interaction                     | Headline (this instance) |
| --- | ------------------------------------------- | ------------------------------- | ------------------------ |
| 00  | `00-dashboard-cold-load-before-fix.json.gz` | Cold load of `#/`, pre-fix      | CLS 0.05 (jolt caught)   |
| 01  | `01-dashboard-cold-load.json.gz`            | Cold load of `#/`, fixed        | CLS 0.01 · LCP 322 ms    |
| 02  | `02-plan-cold-load.json.gz`                 | Cold load of `#/plan`           | CLS 0.00 · LCP 193 ms    |
| 03  | `03-month-cold-load.json.gz`                | Cold load of `#/months/2026-07` | CLS 0.01 · LCP 259 ms    |

## LCP did not regress

Dashboard LCP samples ran 116–271 ms pre-fix and 140–322 ms post-fix in this
instance — the distributions fully overlap. LCP here is dominated by JS
render-delay run-to-run noise, and a single `height: 45px` CSS declaration
cannot affect paint time. Plan (193 ms) and Month (259 ms) are unchanged from
their pre-fix behaviour.

## Sanitization

Same two rules as the earlier sets, both followed: captured on
`fixtures/horizon-seed.db` after `npm run db:reset`, then run through
`scripts/sanitize-trace.mjs` and gated with `--check`.

## Caveats

Unchanged from the 2026-07-22 set: Chromium-over-HTTP rather than Electron, no
throttling, production build (no React Profiler attribution), and LCP is a harsh
judge of progressive reveal. Treat the load numbers as directional and the
same-instance CLS A/B as the durable result.
