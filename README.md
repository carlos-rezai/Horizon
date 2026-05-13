# Horizon

> Personal finance tracker for long-term thinkers — built with a structured Claude Code workflow

Horizon tracks income, spending, and mortgage payoff across multiple accounts. It's not a budgeting app — it's a long-game tool. Built around the idea that some financial goals take a decade, and your software should reflect that.

---

## Why This Project Exists

This project has two purposes:

1. **A genuinely useful personal tool** — manually log transactions, track balances across accounts, monitor a mortgage paydown trajectory, and run financial projections years into the future.

2. **A portfolio demonstrating AI-assisted engineering** — every feature was built using a structured Claude Code workflow: grill-me sessions, PRDs, TDD, and a living ubiquitous language document. The methodology is as much the point as the product.

---

## Desktop App

Horizon is an offline-first desktop application for Windows. There is no cloud version, no authentication, and no network dependency. All data lives in a single SQLite file on your machine.

- **Shell:** Electron, wrapping the React frontend and bundling the Express server as a utility process
- **Storage:** SQLite via `better-sqlite3` — single-file database, trivially backed up
- **No auth** — single-user, local-only by design
- **Packaging:** NSIS installer via `electron-builder`, installs per-user with no UAC prompt

---

## Development Methodology

This project was built using a structured Claude Code skill workflow. Every feature follows the same sequence before a line of code is written:

grill-me → design-log → ubiquitous-language → write-a-prd → prd-to-plan → prd-to-issues → tdd → build → request-refactor-plan → refactor → ui-meridian

**What this means in practice:**

- Every feature starts with a grill-me session — Claude interrogates the design until every assumption is resolved
- A PRD is written and filed as a GitHub issue before implementation begins
- Tests are written before code (TDD, stopping at RED)
- All domain terminology is locked in docs/ubiquitous-language.md
- Design decisions are recorded in docs/design-logs/

The `.claude/` folder contains all skill definitions. The `docs/` folder contains the full paper trail — PRDs, design logs, and the ubiquitous language dictionary — so the reasoning behind every decision is readable alongside the code.

---

## Tech Stack

| Layer    | Choice                       | Why                                              |
| -------- | ---------------------------- | ------------------------------------------------ |
| Frontend | React + TypeScript + Vite    | Production-standard, full TypeScript coverage    |
| UI       | styled-components + Meridian | Custom design system, precision over convenience |
| Backend  | Node.js + Express            | Lightweight, consistent with JS ecosystem        |
| Database | SQLite via better-sqlite3    | Offline-first, single-file, zero config          |
| Desktop  | Electron + electron-builder  | Wraps the existing app for offline personal use  |
| Testing  | Vitest + Testing Library     | Fast, Vite-native, great DX                      |

---

## Project Structure

```
horizon/
├── .claude/            # Claude Code skills and CLAUDE.md
├── electron/           # Main process, preload, server lifecycle
├── server/             # Express backend
│   └── src/
│       ├── routes/     # /accounts, /transactions, /storage, …
│       ├── storage/    # SQLite driver + repository abstraction
│       └── lib/        # projection, utilities
├── src/                # React frontend
│   ├── assets/         # Static images, fonts, icons
│   ├── styles/         # Global CSS reset, themes
│   ├── tokens/         # Colors, spacing, typography, breakpoints
│   ├── primitives/     # Atomic UI elements (Button, Input, Text)
│   ├── components/     # Composed UI blocks (Card, FormField, Modal)
│   ├── features/       # Domain UI + logic co-located
│   │   ├── accounts/
│   │   ├── transactions/
│   │   ├── mortgage/
│   │   └── settings/
│   ├── layouts/        # Page chrome
│   ├── pages/          # Route-level views, composition only
│   ├── hooks/          # Global shared hooks
│   ├── types/          # Shared TypeScript interfaces
│   └── utils/          # Pure helper functions
└── docs/
    ├── design-logs/    # Immutable feature design snapshots
    ├── PRDs/           # Product requirements and implementation plans
    ├── refactor-plans/ # Refactor RFCs filed as work items
    ├── ubiquitous-language.md
    └── dev-journal.md
```

---

## Installing the Desktop App

Download `Horizon-Setup-x.x.x.exe` from the [Releases](https://github.com/carlos-rezai/Horizon/releases) page and double-click the installer.

### SmartScreen Warning

Windows will show a SmartScreen security dialog when you run the installer because it is unsigned. Code signing certificates carry a recurring cost that is outside the scope of this project — the warning is expected, not a sign of malware.

To proceed:

1. Click **More info**
2. Click **Run anyway**

The installer requires no administrator rights (no UAC prompt) and installs Horizon to `%AppData%\Local\Horizon\`. Your financial data lives in `%AppData%\Roaming\Horizon\` and survives both reinstallation and uninstall.

---

## Running from Source

### Prerequisites

- Node.js 20+

### Install

```
git clone https://github.com/carlos-rezai/Horizon.git
cd Horizon
npm install
```

### Dev (browser + hot reload)

```
npm run electron:dev
```

### Smoke-test (compiled, production renderer)

```
npm run electron:start
```

### Build installer

```
npm run release
```

Output: `release/Horizon-Setup-x.x.x.exe`

---

## Build Status

| Feature                                   | Status      |
| ----------------------------------------- | ----------- |
| Account + transaction core (manual entry) | ✅ Complete |
| Dashboard + milestone tracker             | ✅ Complete |
| Account + transaction UI                  | ✅ Complete |
| Meridian design system                    | ✅ Complete |
| Financial Projection Dashboard            | ✅ Complete |
| Restschuld Trajectory Chart               | ✅ Complete |
| Projection Engine Audit                   | ✅ Complete |
| Repository abstraction (storage driver)   | ✅ Complete |
| SQLite driver (offline storage)           | ✅ Complete |
| Electron desktop shell                    | ✅ Complete |
| Desktop packaging (Windows installer)     | ✅ Complete |
| UI Redesign                               | ✅ Complete |
| Monthly digest (AI)                       | ⏸ Deferred  |
| Anomaly detection + Q&A (AI)              | ⏸ Deferred  |
| Sondertilgung advisor (AI)                | ⏸ Deferred  |

---

## Docs

- [Ubiquitous Language](./docs/ubiquitous-language.md)
- [Design Logs](./docs/design-logs/)
- [PRDs](./docs/PRDs/)
- [Refactor Plans](./docs/refactor-plans/)
- [Dev Journal](./docs/dev-journal.md)

---

## Author

**Carlos Rezai** — Senior Software Engineer, Berlin
Transitioning from frontend specialist to agentic AI engineering — building structured human-AI workflows and fullstack AI-powered products.

[GitHub](https://github.com/carlos-rezai)
[LinkedIn](https://www.linkedin.com/in/aryan-carlos-r-0ba21017b/)
