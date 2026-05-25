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

### Commit message convention

```
<type>: <feature-slug> <description> issue #<n>
```

Examples:

```
feat: accounts add balance recalculation on delete issue #47
fix: transactions correct negative amount display issue #51
chore: bump version to 1.0.1
refactor: mortgage extract amortisation helper issue #58
```

Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`

---

### Releasing a new version

```
npm version patch   # bugfix:      1.0.0 → 1.0.1
npm version minor   # new feature: 1.0.0 → 1.1.0
npm version major   # breaking:    1.0.0 → 2.0.0
```

Each command runs tests, typecheck, and lint first — if any fail the version bump is aborted. On success it updates `package.json`, commits, tags, and pushes. Then:

```
npm run release
```

Builds the installer and publishes it to GitHub Releases automatically.

### Developer setup — self-signed code-signing certificate

To build a locally-installable update that does not trigger a SmartScreen warning, generate a self-signed certificate and import it into the Windows Trusted Root store once per machine.

**1. Generate and import the certificate (run once as Administrator)**

```powershell
# Generate the certificate
$cert = New-SelfSignedCertificate `
  -Subject "CN=Horizon Dev" `
  -Type CodeSigningCert `
  -CertStoreLocation Cert:\CurrentUser\My `
  -NotAfter (Get-Date).AddYears(5)

# Export as .pfx (set your own password)
$pwd = ConvertTo-SecureString -String "YOUR_PASSWORD" -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath horizon-dev.pfx -Password $pwd

# Import into Trusted Root so Windows trusts your own certificate
Import-PfxCertificate `
  -FilePath horizon-dev.pfx `
  -CertStoreLocation Cert:\LocalMachine\Root `
  -Password $pwd
```

**2. Set local environment variables**

Create a `.env.local` file (never committed) or set them in your shell session:

```
WIN_CERTIFICATE_FILE=C:\full\path\to\horizon-dev.pfx
WIN_CERTIFICATE_PASSWORD=YOUR_PASSWORD
```

`electron-builder.config.js` reads these at build time and passes them to the Windows code-signing step.

**3. Build**

```
npm run release
```

The generated installer will be signed with your local certificate and will install without a SmartScreen warning on the same machine.

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
| In-app auto-update (electron-updater)     | ✅ Complete |
| Monthly Ledger                            | ✅ Complete |
| Credit Card Auto-Settlement               | ✅ Complete |
| Account Color Identity                    | ✅ Complete |
| Dashboard Clock                           | 🔜 Planned  |
| Native Application Menu                   | 🔜 Planned  |
| Monthly Spending Breakdown Chart          | 🔜 Planned  |
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
