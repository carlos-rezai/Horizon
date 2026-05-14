# Horizon — Personal Finance Tracker for Long-Term Thinkers

## Project Overview

Horizon is a personal finance tracker built around a single idea: some
financial goals take a decade, and you need a tool that thinks that way.
It tracks income, spending, and mortgage payoff across multiple accounts.

Portfolio project by Carlos Rezai demonstrating fullstack engineering,
desktop app development, and Claude Code workflow.

## Tech Stack

- **Frontend:** React + TypeScript, Vite
- **UI:** styled-components + Meridian design system
- **Backend:** Node.js + Express
- **Database:** SQLite via `better-sqlite3`
- **Shell:** Electron
- **Testing:** Vitest + @testing-library/react
- **Linting:** ESLint + Prettier + Husky

## Folder Structure

horizon/
├── .claude/
│ └── skills/
├── ai/
│ ├── pipelines/
│ ├── prompts/
│ └── types/
├── server/
│ └── src/
│ ├── routes/
│ ├── services/
│ └── lib/
├── src/
│ ├── assets/ ← images, fonts, icons (static)
│ ├── styles/ ← global CSS reset, themes
│ ├── tokens/ ← colors, spacing, typography, breakpoints
│ │ ├── colors.ts
│ │ ├── spacing.ts
│ │ ├── typography.ts
│ │ ├── breakpoints.ts
│ │ └── index.ts
│ ├── primitives/ ← dumb, reusable UI atoms (Button, Input, Text, Icon, Badge)
│ │ └── Button/
│ │ ├── Button.tsx
│ │ ├── Button.test.tsx
│ │ └── Button.styles.ts
│ ├── components/ ← composed primitives, no business logic (Card, FormField, Modal)
│ │ └── BalanceCard/
│ │ ├── BalanceCard.tsx
│ │ ├── BalanceCard.test.tsx
│ │ └── BalanceCard.styles.ts
│ ├── features/ ← business logic + UI co-located per domain
│ │ ├── accounts/
│ │ │ ├── AccountOverview/
│ │ │ │ ├── AccountOverview.tsx
│ │ │ │ ├── AccountOverview.test.tsx
│ │ │ │ └── AccountOverview.styles.ts
│ │ │ ├── useAccounts.ts
│ │ │ └── index.ts
│ │ ├── transactions/
│ │ ├── mortgage/
│ │ ├── digest/
│ │ └── advisor/
│ ├── layouts/ ← page chrome (DashboardLayout, AuthLayout)
│ ├── pages/ ← route-level views, composition only, no logic
│ ├── hooks/ ← global shared hooks only (useMediaQuery, useTheme)
│ ├── types/ ← shared TypeScript interfaces
│ └── utils/ ← pure helper functions
└── docs/
├── design-logs/
├── PRDs/
├── refactor-plans/
├── ubiquitous-language.md
└── dev-journal.md

## Layer Responsibilities

| Layer         | Purpose            | Rule                                        |
| ------------- | ------------------ | ------------------------------------------- |
| `tokens/`     | Design constants   | No React, no logic — pure values            |
| `primitives/` | Atomic UI elements | No business logic, no data fetching         |
| `components/` | Composed UI blocks | No business logic, composed from primitives |
| `features/`   | Domain UI + logic  | Owns its own components, hooks, and types   |
| `layouts/`    | Page chrome        | Structure only, no domain logic             |
| `pages/`      | Route views        | Composition only — no logic, no styling     |
| `hooks/`      | Global hooks       | Only hooks used across 2+ features          |
| `utils/`      | Pure helpers       | No side effects, fully testable             |

**The key principle:** `primitives/` and `components/` are reusable and
know nothing about the domain. `features/` owns its own UI, hooks, and
types and knows everything about its domain. `pages/` just composes
features into a route.

## Architectural Boundaries

- `ai/` — reserved for future AI features (permanently deferred — no pipeline code here)
- `src/utils/` — pure logic and utility functions
- `server/src/` — SQLite access and business logic
- `src/` never talks to SQLite directly

## Skills Location

All skills are in `.claude/skills/`. Read the relevant SKILL.md before
starting any task that matches its description.

## AI Features (permanently deferred)

The following AI features were designed but will not be built. The design
logs remain as documentation of intent.

- **Monthly Digest** — agentic summarisation over structured financial data
- **Anomaly Detection + Q&A** — conversational AI against transaction history
- **Sondertilgung Advisor** — annual scoring + recommendation pipeline

## Desktop Build

Horizon is an offline-first desktop app. This is the only target.

- **Shell:** Electron, wrapping the React frontend and bundling the
  Express server as a utility process
- **Storage:** SQLite via `better-sqlite3` — single-file database,
  no network, no cloud
- **No auth** — single-user, local-only
- **Packaging:** `electron-builder` for Windows installers; data lives in
  the OS user-data directory so backups are trivial

## Code Rules

- No `any` types — ever
- No business logic in components, primitives, or pages — extract to features or hooks
- All page components use default exports
- Every function in `src/utils/` must have a test
- No `console.log` in committed code
- All dates are ISO strings
- All monetary values stored in cents (integers) — never floats
- Co-locate tests and styles with the file they belong to:
  `BalanceCard.tsx` / `BalanceCard.test.tsx` / `BalanceCard.styles.ts`

## Ubiquitous Language

Single source of truth: `/docs/ubiquitous-language.md`
Read it before naming anything. Update it after every grill-me session.

## Data Model

Defined per feature through grill-me + write-a-prd.
Lives in `/docs/data-model.md` once established.

## Development Workflow

1. `grill-me` → shared understanding + design-log entry + ubiquitous-language update
2. `write-a-prd` → reads design-log → GitHub issue + docs/PRDs/
3. `prd-to-plan` → phased plan on issue
4. `prd-to-issues` → individual issues
5. `tdd` → failing tests (stops at RED)
6. `build` → implement
7. `request-refactor-plan` → create issue
8. `refactor` → clean up
9. `ui-meridian` → implement design theme

## Environment Variables

PORT=3001
VITE_API_BASE_URL=http://localhost:3001
HORIZON_DB_PATH= # entrypoint reads it and passes the path to createSqliteStorage; defaults to ./horizon.db. Electron main sets this to app.getPath('userData')/horizon.db.
DEBUG_SQL= # set to "1" to enable better-sqlite3 query tracing via console.info. Off by default; never on in packaged builds.

## Build Status

- [x] Account + transaction core
- [x] Dashboard + milestone tracker
- [x] Account + transaction UI
- [x] Meridian design system
- [x] Financial Projection Dashboard
- [x] Restschuld Trajectory Chart
- [x] Projection Engine Audit
- [x] Repository abstraction (storage driver interface)
- [x] SQLite driver (offline storage)
- [x] Electron desktop shell
- [x] Desktop packaging (Windows installer)
- [x] UI Redesign — visual refresh of all views based on Google Stitch mockups
- [ ] In-app auto-update — electron-updater + GitHub Releases, in-app banner on new version
- [ ] Monthly digest (AI) — permanently deferred
- [ ] Anomaly detection + Q&A (AI) — permanently deferred
- [ ] Sondertilgung advisor (AI) — permanently deferred
- [ ] Google Auth — permanently out of scope
- [ ] Cloud deployment (Vercel + Render + MongoDB Atlas) — permanently out of scope
