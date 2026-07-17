# 26 — Import Review Repair

## Background

Log 19 ("Bank Statement Import") shipped the real parse/detect/commit engine
behind the Import UI shell from log 18. Log 21 hardened the parser against real
bank exports. The wizard's three steps (Account → Map columns → Review) and the
review table are live and importing real statements.

The review step is where it breaks down. Relevant existing pieces:

- `server/src/lib/csvImport/detectStatement.ts` — `mapStatementRows` drops
  dateless records silently, counts date/amount parse failures as `rejected`,
  and emits `description` verbatim **including empty string**.
- `server/src/routes/imports/import.ts` — `ImportRowSchema` requires
  `description.min(1)`.
- `src/features/import/reviewRows.ts` — `buildReviewRows` pre-unchecks
  `duplicate || recurring || pending`; `summarizeReview` counts all three.
- `src/features/import/ImportWizard/ImportWizard.tsx` — the Flag column is a
  `duplicate ? … : recurring ? … : null` ternary; category is editable via
  `CategorySelect`, description is a read-only `<span>`.
- `src/features/import/useImport.ts` — `commit` reads `data.error`.

## Problem

Preview accepts rows the commit schema rejects. A statement with one blank
description previews cleanly, then fails the whole import — and the route
answers `{ issues }` while the client reads `{ error }`, so the only feedback is
"Failed to import statement". The user's reported pain: after importing a full
year, the import could not be submitted and there was **no way to find which
rows were at fault**.

Three failures compound:

1. **No explanation** — the row-level reason never reaches the UI.
2. **No repair** — description is not editable, so there is no way forward.
3. **No navigation** — in a ~1,200-row year, a handful of bad rows are
   unfindable.

Plus two silent losses: `summary.rejected` is computed end-to-end and never
rendered, and step 2's mapping edits are remembered but never applied.

## Questions and Answers

1. **Is "needs a description" a named boolean, or are blockers an open set?**
   → ✅ **Open set (B).** `blockers: RowBlocker[]`, today one member
   (`"description"`). Colour rule, pill, and commit gate only ask
   `blockers.length > 0`. Rationale: not future-proofing — the row already
   carries three orthogonal soft flags rendered by a hand-maintained ternary
   that **silently never renders `pending`**. A flat boolean recreates exactly
   that drift on the hard side. ❌ named boolean (A) — same code size today,
   worse shape.

2. **Server-stamped or client-derived blockers?**
   → ✅ **Client-derived (B)**, in `reviewRows.ts`, pure over the row's current
   values. Description becomes editable, so a server stamp is stale from the
   first keystroke and the client must recompute anyway — (A) yields two
   mechanisms racing to describe one row. ❌ server stamps (A).
   **Accepted drift:** the rule now lives in both `blockersFor` (client) and
   `ImportRowSchema` (server). Not resolved by moving the rule — resolved by
   making the server's rejection legible (Q7). The client rule is a fast local
   guess keeping the user out of dead ends; the schema stays sole authority on
   what commits.

3. **Are blocked rows checked or unchecked by default? Can they be unchecked?**
   → ✅ **Pre-checked; the Import button gates on "no _included_ row has
   blockers" (B).** A blank description is a real transaction with real money —
   pre-unchecking (A) trades today's loud failure for a silent one where the
   ledger is quietly short. ❌ un-uncheckable (C) — a junk footer row with no
   meaningful text would force an invented placeholder (ruled out) or make the
   file unimportable: a new dead end. Two honest exits: fill it in, or
   explicitly uncheck. Gating on _included_ rows is what makes uncheck a real
   escape hatch.

4. **What distinguishes a soft exclusion from a hard blocker visually?**
   → ✅ **The signal lives on the description cell, not the row** (user's
   redirect). Colour **categorises without explaining**; the feature's mandate
   is to _explain_. The blocker is a property of one field, and that field is
   now an input — so it renders error-bordered with placeholder
   `Add a description`: it says what is wrong, which field, and **is the fix**.
   ❌ full-row error tint — explains nothing, needs a legend, fails
   colour-blindness. ❌ info icon + tooltip — hides the explanation behind a
   hover; a dead end wearing a friendlier hat.
   **Dim means excluded and only that:** soft exclusions keep `opacity: 0.55`;
   a blocked row looks normal but for one unfilled cell. Those read as
   different _kinds_ of thing, not shades of one. A thin `error` left accent
   aids landing after a jump — nothing more.

5. **When a row has multiple soft flags, what does the Flag column show?**
   → ✅ **All applicable flags (B)**, from `flags: RowFlag[]` derived in
   `buildReviewRows`, with `included = flags.length === 0`. Under Q3 the user is
   asked to _opt back in_; a row saying "Dupe" while withholding "also
   recurring" gives half the evidence. (Both fire together on an
   already-imported recurring rent payment.) ❌ priority-ordered single badge
   (A) — preserves the ternary that caused the missing `pending` badge.
   Badges and the exclusion decision read from **one array**, so
   counted-but-not-rendered becomes structurally impossible.
   **Cost:** Flag column widens 72px → ~110px, badges wrap, absorbed from the
   description column's `minmax(0, 1fr)`. If tight at 774px, fall back to
   icon+count — never to hiding flags.

6. **How is `summary.rejected` surfaced?**
   → ✅ **Count + capped samples (B).** `MappedRows.rejected` becomes
   `{ count, samples }` (first **5** raw date/amount strings; a fully-wrong
   mapping rejects all 10,000 and none of that belongs in the payload).
   Key reframe: **a rejected row is usually a bad _mapping_, not bad data** —
   1-of-200 is junk, 200-of-200 is a wrong date column or `dateFmt`. So it is a
   diagnostic of step 2, one Back button away: a signpost, not an apology.
   ❌ count only (A) — invites "which three?" and has no answer.
   Rejected rows are **not editable and never enter the table** (no parsed date
   or amount to show; fabricating one is the ruled-out placeholder). They render
   as a note under the review summary.
   The two summary messages stay distinct: _"2 rows need a description"_
   (fixable here, blocks) vs _"3 rows couldn't be read — check your column
   mapping"_ (fixable at step 2, does not block).

7. **How do the server's validation errors reach the UI?**
   → ✅ **`{ error, issues }`, client attributes per-row (C).** Zod's
   `path: ["rows", 3, "description"]` identifies the row; the client attaches
   the issue as a blocker so the backstop lands in the **same repair UI** as the
   client-derived case — cell error state, pill count, gate, jump. ❌ flattened
   string only (A) — shrinks the dead end without closing it; the user still
   cannot locate the row. ❌ issues only (B) — no home for non-row issues.
   **Critical subtlety:** the index is into the **filtered payload**, not `rows`
   state. `confirm` sends `rows.filter(r => r.included)`, so payload index 3 may
   be row 40 on screen — `rows[3]` would blame an innocent row, worse than
   today's bug because it is confidently wrong. `confirm` holds the filtered
   array and maps index → `id` through it.
   `error` remains the floor: issues whose path is not `["rows", n, field]`
   (bad `accountId`, malformed `mapping`) have no row to attach to.

8. **Is description editable on every row or only blank ones?**
   → ✅ **Every row.** Category is already always-editable; conditional editing
   makes two identical-looking rows behave differently on invisible data. Bank
   descriptions are frequently cryptic (`KARTENZAHLUNG//NR4417`) and cleaning
   one up is legitimate. Only blank rows carry the error state.

9. **How does the user find blocked rows in a year-long import?**
   → ✅ **A "Needs attention" filter toggle, plus the pill's jump.** The pill
   alone cycles you through 3 rows in a haystack of 1,200; the filter collapses
   the table to those 3, every one an input, with Tab walking straight through.
   The filter is **view-only** — `rows` state and the commit gate untouched, so
   filtering can never change what commits.

10. **Auto-recategorize when a description is edited?**
    → ❌ **No.** Tempting (type `REWE` → Food), but silently mutating a second
    field while typing in the first is the magic that erodes trust in an
    importer. Category stays explicit and editable.

11. **Button copy when blocked?**
    → ✅ Keep `Import N transactions`, disabled; the adjacent pill explains and
    is the actionable element. Composes with the existing
    `summary.included === 0` disable — same button, one more reason it is off.

12. **Are date and amount editable?**
    → ❌ **No.** They cannot be blank by construction (dateless records dropped,
    unparseable ones rejected before review). Editing invites re-typing what the
    parser read — data invention.

13. **Step-2 mapping edits are never applied — fold the fix in?**
    → ✅ **Fold in.** `updateMap` writes local `map` state only; the rows were
    mapped server-side at preview time and `POST /imports/preview` accepts no
    mapping override. So changing the mapping changes nothing, then `confirm`
    commits old-mapping rows while `importPresets.upsert` saves the **new**
    mapping — a preset remembered but never applied.
    This collides with Q6: telling the user to go back and fix the mapping when
    fixing it does nothing is a **signpost pointing at a wall**.
    **Not new scope:** log 19's own sequence diagram already reads
    `POST /imports/preview (multipart: file bytes + accountId + mapping?)`. The
    override was designed there and never implemented. This completes it.

## Design

### Row model (`src/features/import/reviewRows.ts`)

```ts
/** A soft reason a row is pre-excluded; the user may opt back in. */
export type RowFlag = "duplicate" | "recurring" | "pending";

/** A hard reason a row cannot commit; must be fixed or the row unchecked. */
export type RowBlocker = "description";

export interface ReviewRow extends ParsedImportRow {
  included: boolean;
  /** Drives BOTH the pre-uncheck and the badges — one source, no drift. */
  flags: RowFlag[];
  /** Recomputed live on edit; also the landing site for server issues (Q7). */
  blockers: RowBlocker[];
}

export function flagsFor(row: ParsedImportRow): RowFlag[];
export function blockersFor(row: { description: string }): RowBlocker[];
export function buildReviewRows(rows: ParsedImportRow[]): ReviewRow[];

/** True when nothing included is blocked — the commit gate. */
export function canCommit(rows: ReviewRow[]): boolean;
```

`included = flagsFor(row).length === 0`. The gate is
`rows.every(r => !r.included || r.blockers.length === 0)` — **included** rows
only, so unchecking is a real exit (Q3).

### Two orthogonal channels (Q4)

| Row state            | Opacity | Description cell                                 |
| -------------------- | ------- | ------------------------------------------------ |
| included, valid      | `1`     | plain input                                      |
| included, blocked ✅ | `1`     | error border + `Add a description` + left accent |
| excluded (soft/user) | `0.55`  | plain input                                      |

They compose without special-casing: uncheck a blocked row → it dims **and**
the error state drops, because an excluded row cannot block. Type a description
→ the error drops for the other reason. Both Q3 exits are visibly self-resolving.

### Rejected samples (`server/src/lib/csvImport/detectStatement.ts`)

```ts
export interface RejectedSample {
  /** Raw cell text as it appeared — never parsed, never fabricated. */
  date: string;
  amount: string;
}

export interface MappedRows {
  rows: MappedRow[];
  rejected: { count: number; samples: RejectedSample[] }; // was: number
}

export const MAX_REJECTED_SAMPLES = 5;
```

`mapStatementRows` already holds the record at the moment it rejects — retaining
the first 5 is a couple of lines, not a new pass. `PreviewSummary.rejected`
changes shape in lockstep (`buildPreview.ts` + `src/features/import/importTypes.ts`).

### Mapping override (Q13 — completes log 19)

```ts
// server/src/lib/csvImport/buildPreview.ts
export interface BuildPreviewInput {
  // …existing…
  /** Wins over remembered-then-detected. Set when the user edits step 2. */
  mappingOverride?: ColumnMapping;
}
```

Precedence becomes `override ?? remembered ?? detected`.
`POST /imports/preview` reads an optional `mapping` field off the multipart
body; `useImportWizard` refetches (debounced ~300ms) when `map` changes.

### Error contract (Q7)

```ts
// server/src/routes/imports/imports.ts
res.status(400).json({
  error: "Some rows are missing required values.", // floor — never the ceiling
  issues: parsed.error.issues, // structured detail
});
```

```ts
// src/features/import/importErrors.ts (new)
/** Map Zod issues onto row ids via the FILTERED payload array (never `rows`). */
export function attributeIssues(
  issues: ZodIssue[],
  committedRowIds: string[]
): { byRowId: Map<string, RowBlocker[]>; unattributed: string[] };
```

### Files touched

| Path                                                      | Change                                            |
| --------------------------------------------------------- | ------------------------------------------------- |
| `server/src/lib/csvImport/detectStatement.ts`             | `rejected` → `{count, samples}`                   |
| `server/src/lib/csvImport/buildPreview.ts`                | `mappingOverride`; summary shape                  |
| `server/src/routes/imports/imports.ts`                    | `{error, issues}`; preview `mapping` field        |
| `src/features/import/reviewRows.ts`                       | `flags` / `blockers` / `canCommit`                |
| `src/features/import/importErrors.ts`                     | **new** — issue → row-id attribution              |
| `src/features/import/importTypes.ts`                      | summary shape; commit error type                  |
| `src/features/import/useImport.ts`                        | read `issues`; preview takes `mapping`            |
| `src/features/import/useImportWizard.ts`                  | `setDescription`, filter, debounced refetch, gate |
| `src/features/import/ImportWizard/ImportWizard.tsx`       | desc input, all badges, pill, filter toggle       |
| `src/features/import/ImportWizard/ImportWizard.styles.ts` | error cell, `$tone="error"`, grid widths          |

## Implementation Plan

**Phase 1 — Repair the dead end (thinnest end-to-end).**
`blockersFor` + `blockers` on the row; description as an editable input with the
error state; `canCommit` gating the button. A blank-description statement now
imports after the user types one. No pill, no filter, no server change yet —
proves explain-and-fix in place.

**Phase 2 — Tell the truth on failure.**
`{ error, issues }` from the route; `attributeIssues` mapping through the
filtered payload; server-detected problems land as blockers in Phase 1's UI.
Unit-test the filtered-index trap explicitly (payload index ≠ row index).

**Phase 3 — Navigation at year scale.**
Summary pill with count + jump; "Needs attention" filter toggle. This is the
reported pain; it lands once there is something to navigate _to_.

**Phase 4 — Flags array + all badges.**
`flagsFor` → `flags`; render every applicable badge; `pending` gets its badge at
last. Grid widths.

**Phase 5 — Honesty about dropped rows + mapping override.**
`rejected` → `{count, samples}` with the step-2 note; `mappingOverride` through
route + engine + debounced refetch. Shipped together because the note's advice
("check your column mapping") is only true once the override works.

## Trade-offs

**Easier:** every reason a row needs attention — client-derived or
server-detected, soft or hard — funnels into one array per row and one rendering
path; the flags array kills a live bug (`pending` counted, never shown) by
construction; the two-channel visual model composes without special cases;
`rejected` samples turn a mystery into a step-2 diagnostic; the mapping override
makes step 2 mean what it says.

**Harder:** the validity rule is knowingly duplicated (`blockersFor` vs
`ImportRowSchema`) — mitigated, not removed, by Q7's legibility; the filtered
payload → row-id mapping is a sharp edge that must stay tested; the debounced
re-preview re-uploads the file on every mapping edit (acceptable on loopback at
≤5MB, but it is a new request path); the Flag column's width is genuinely tight
at 774px.

**Out of scope (deliberate):** editable date/amount (Q12); auto-recategorize
(Q10); relaxing `ImportRowSchema` or inventing placeholder descriptions
(the roadmap's explicit constraint); rejected rows as editable table entries
(Q6); **row virtualization** — a 1,200-row table rendering an input +
`CategorySelect` per row is already heavy today and this adds a second input;
the "Needs attention" filter blunts it in practice, and virtualization belongs
to **Performance + UX Polish** (1.2.0), the next roadmap item.
