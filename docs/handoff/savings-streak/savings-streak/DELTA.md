# Savings Streak (Motivation) — Handoff (delta)

**Scope: one new full-width Dashboard card (accordion) + one new modal. No changes to the Recurring-Only Projection Model, the Trajectory Horizon chart, or any other existing screen's data contract.**

A lightweight gamification layer to motivate saving: a streak of consecutive months where the household hit its savings targets, with a per-account breakdown behind an accordion, and a milestone-or-manual goal editor.

Reference source: `handoff/prototype/src/screens/Dashboard.jsx` (`SavingsGoalCard`) and `handoff/prototype/src/data.js` (`computeSavingsGoal`) — open `handoff/prototype/Horizon.html` → **Dashboard** to interact with it live.

**Where this lives in the repo:** add as a sibling folder next to the existing `docs/handoff/`: `docs/handoff/savings-streak/`, same shape as `categories-redesign/` and `history-navigation/` (`DELTA.md` + `screens/`). The touched prototype files (`src/data.js`, `src/icons.jsx`, `src/modals.jsx`, `src/app.jsx`, `src/shell.jsx`, `src/screens/Dashboard.jsx`) are already folded into the shared `docs/handoff/prototype/src/`.

---

## Why

Horizon is entirely diagnostic today — balances, projections, payoff countdown — with nothing that rewards the user for good saving behavior month to month. Several gamification directions were considered (streaks, category-trend badges, milestone markers on the trajectory chart, a monthly "score", no-spend-day tracking); we scoped to **savings streaks with per-account targets**, because it reuses data the app already reconstructs (monthly account balances) rather than inventing a new scoring model, and it stays in Horizon's restrained visual language (no points, no badges-with-borders, no confetti).

We explicitly **did not** fold this into the Trajectory Horizon chart (an option we discussed): Trajectory is a pure forward _projection_ from recurring transactions; a savings goal is a manual, aspirational target layered on actual history. Mixing the two would blur what a line on that chart means. They stay separate cards with a shared visual language instead.

## What's new

### Savings Streak card (`SavingsGoalCard`, in `Dashboard.jsx`)

Full-width card placed directly under Trajectory Horizon, above the Accounts/Mortgage/Outlook grid. Collapsed by default.

- **Collapsed state**: flame icon, current streak count + best streak, and a **calendar strip (Jan → Dec of the current year)** — one tile per month, filled accent = every tracked account hit its target that month, muted fill = missed, dashed outline = upcoming (future months not yet resolved). Matches the tick-strip/legend visual vocabulary already used in `TrajectoryChart`'s toggle legend.
- **Expanded state** (click the card or the chevron): the same header + strip, plus one row per **trackable account** (Main, Tagesgeld, Sparkasse, ETF Portfolio — the liquid + investment accounts; Mortgage/CreditCard are excluded, "save X/month" doesn't apply to them). Each row shows the account avatar, a progress bar (cumulative actual saved vs. cumulative target since the goal's start date), the amounts, and the monthly target. Accounts with no target set (0/mo) render dimmed with a **"Not tracked"** badge rather than being hidden — same treatment as any other disabled-state row in the app.
- **Edit icon** (pencil, top right — same affordance as Mortgage Countdown's edit) opens the goal modal.

### Edit Savings Goal modal (`SavingsGoalModal`, in `modals.jsx`)

Two modes, matching the existing `PickChip` mode-toggle pattern used elsewhere (e.g. Recurring's frequency chips):

- **Milestone** (default framing, though the seeded demo data below starts in Manual — see Data note): one target amount + one target month/year. Horizon auto-splits the required monthly savings across trackable accounts, weighted by each account's own trailing-12-month average positive balance gain — **not** by account balance (balance and monthly movement are unrelated; see Data note for why this mattered). The per-account split is shown live, read-only, in the same row list used by Manual mode.
- **Manual**: same row list, but each amount is a direct input. Editing any row while in Milestone mode silently converts the whole goal to Manual, pre-filled with the milestone's current derived split — so the user never loses their starting point when they decide to override one account.

## Data (mock only — do not port)

- `HZ.trackableAccountIds` — the fixed display list for the card's expanded rows (`a1` Main, `a2` Tagesgeld, `a3` Sparkasse, `a5` ETF). This is a reasonable real-world default (liquid + investment accounts), not something we needed to invent logic for.
- `HZ.savingsGoalConfig` — the seeded goal: **Manual mode**, Sparkasse €8/mo + ETF €500/mo (Main and Tagesgeld start untracked). This is deliberately hand-picked rather than milestone-derived: the mock's own historical/projection generator gives each account very different, and sometimes noisy or negative, monthly deltas (Main has a rate-cycle sine wave that goes negative some months; Tagesgeld's balance is periodically drained ~€18k/year by the Sondertilgung transfer). A balance-weighted milestone split ignored that and produced targets no account could ever consistently hit — worth flagging because **the real build should weight/validate any auto-derived target against the account's actual demonstrated cash-flow pattern, not its balance,** or the same "permanently red streak" failure mode will recur with real user data (e.g. a savings account that also auto-pays an annual insurance premium).
- `HZ.computeSavingsGoal(config)` — pure function: given a config (mode, target/date or manual amounts, start date), derives per-account monthly targets, cumulative actual-vs-target since the start date, and the streak (current/best + the Jan–Dec calendar strip). Takes `HZ.history.pts` (the reconstructed actuals from the History Navigation delta) as its data source — **this is the one piece of logic worth porting as-is**; the real build should feed it real reconciled monthly balances instead of the mock generator.
- "Today" anchor: while building this we also aligned the whole prototype's mock "today" to **July 2026** (`HZ.today`, `HZ.TODAY_INDEX`, the sidebar clock, mortgage countdown) so the calendar strip's Jan–Jul-resolved / Aug–Dec-upcoming split reads correctly against the current real date. This is a prototype-only convenience — the real app's "today" is just the actual current date, no anchor needed.

## Screens (`screens/`)

1. `screens/01-collapsed.png` — Savings Streak card collapsed: streak count, best streak, Jan–Dec calendar strip (Feb–Jul met, Jan missed, Aug–Dec upcoming)
2. `screens/02-expanded.png` — Card expanded: Sparkasse and ETF Portfolio rows with progress bars and amounts; Main and Tagesgeld shown dimmed with "Not tracked" badges
3. `screens/03-edit-modal.png` — Edit Savings Goal modal, Manual mode, showing the seeded per-account monthly targets
