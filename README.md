# Horizon

> Personal finance tracker for long-term thinkers — built with a structured Claude Code workflow

Horizon tracks income, spending, and mortgage payoff across multiple accounts. It's not a budgeting app — it's a long-game tool. Built around the idea that some financial goals take a decade, and your software should reflect that.

---

## Why This Project Exists

This project has two purposes:

1. **A genuinely useful personal tool** — manually log transactions, track balances across accounts, monitor a mortgage paydown trajectory, and let AI surface patterns, flag anomalies, and advise on annual lump-sum decisions.

2. **A portfolio demonstrating AI-assisted engineering** — every feature was built using a structured Claude Code workflow: grill-me sessions, PRDs, TDD, and a living ubiquitous language document. The methodology is as much the point as the product.

---

## AI Features

Three distinct AI interaction patterns — each with a different shape and purpose.

### Monthly Digest

A structured financial report, generated on demand or monthly. The AI analyses all account activity for the period and returns a clear summary: what changed, where you stand against the plan, and what needs attention. Not a chatbot — a CFO report for one.

### Anomaly Detection + Q&A

The AI monitors your cashflow for unusual months and surfaces them unprompted. You can then ask follow-up questions in plain English:

> "Why was March so tight?"
> "Am I on track for October?"
> "How does this month compare to the last six?"

It answers against your actual data, not generic financial advice.

### Sondertilgung Advisor

Once a year — ideally in September — the AI analyses your savings balance, monthly cashflow, and mortgage trajectory to answer one question: can you make the full Sondertilgung payment in October, or do you need to adjust?

Deterministic scoring + AI-generated reasoning, built specifically for the German mortgage context. It's a niche feature, and that's the point.

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

The .claude/ folder contains all skill definitions. The docs/ folder contains the full paper trail — PRDs, design logs, and the ubiquitous language dictionary — so the reasoning behind every decision is readable alongside the code.

---

## Tech Stack

| Layer    | Choice                        | Why                                                |
| -------- | ----------------------------- | -------------------------------------------------- |
| Frontend | React + TypeScript + Vite     | Production-standard, full TypeScript coverage      |
| UI       | styled-components + Meridian  | Custom design system, precision over convenience   |
| Backend  | Node.js + Express             | Lightweight, consistent with JS ecosystem          |
| Database | MongoDB Atlas                 | Flexible document model for financial records      |
| AI       | Google Gemini API             | Multi-step reasoning, streaming, structured output |
| Testing  | Vitest + Testing Library      | Fast, Vite-native, great DX                        |
| Auth     | Google Auth (production only) | Demo runs without auth on mock data                |

---

## Project Structure

horizon/
├── .claude/ # Claude Code skills and CLAUDE.md
├── ai/
│ ├── pipelines/ # Multi-step AI orchestration
│ ├── prompts/ # Typed prompt functions
│ └── types/ # AI-specific TypeScript types
├── server/ # Express backend
│ └── src/
│ ├── routes/ # /api/accounts, /api/transactions, /api/ai
│ ├── services/ # MongoDB + AI pipeline execution
│ └── lib/ # db.ts, utils
├── src/ # React frontend
│ ├── assets/ # Static images, fonts, icons
│ ├── styles/ # Global CSS reset, themes
│ ├── tokens/ # Colors, spacing, typography, breakpoints
│ ├── primitives/ # Atomic UI elements (Button, Input, Text)
│ ├── components/ # Composed UI blocks (Card, FormField, Modal)
│ ├── features/ # Domain UI + logic co-located
│ │ ├── accounts/
│ │ ├── transactions/
│ │ ├── mortgage/
│ │ ├── digest/
│ │ └── advisor/
│ ├── layouts/ # Page chrome (DashboardLayout, AuthLayout)
│ ├── pages/ # Route-level views, composition only
│ ├── hooks/ # Global shared hooks
│ ├── types/ # Shared TypeScript interfaces
│ └── utils/ # Pure helper functions
└── docs/
├── design-logs/ # Immutable feature design snapshots
├── PRDs/ # Product requirements and implementation plans
├── refactor-plans/ # Refactor RFCs filed as work items
├── ubiquitous-language.md
└── dev-journal.md

---

## Getting Started

### Prerequisites

- Node.js 20+
- MongoDB Atlas account — [free tier](https://www.mongodb.com/cloud/atlas)
- Gemini API key — [free, no billing](https://aistudio.google.com)

### Installation

git clone https://github.com/carlos-rezai/Horizon.git
cd Horizon
npm install
cd server && npm install && cd ..

### Environment Variables

Create a .env file in the project root:

VITE_API_BASE_URL=http://localhost:3001

Create a .env file in server/:

MONGODB_URI=your_mongodb_atlas_uri
GEMINI_API_KEY=your_gemini_api_key
PORT=3001

### Run

Terminal 1 — Frontend:
npm run dev

Terminal 2 — Backend:
cd server && npm run dev

Then open http://localhost:5173 in your browser.

---

## Build Status

| Feature                                    | Status         |
| ------------------------------------------ | -------------- |
| Account + transaction core (manual entry)  | ✅ Complete    |
| Dashboard + milestone tracker              | ✅ Complete    |
| Account + transaction UI                   | 🔲 In progress |
| Meridian design system                     | 🔲 In progress |
| Monthly digest (AI)                        | 🔲 In progress |
| Anomaly detection + Q&A (AI)               | 🔲 In progress |
| Sondertilgung advisor (AI)                 | 🔲 In progress |
| Google Auth (production)                   | 🔲 In progress |
| Deployed — Vercel + Render + MongoDB Atlas | 🔲 In progress |

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

---

> Demo: Live demo with mock data coming soon.
