# 08 — SQLite Driver Refactor

## Problem Statement

The SQLite Driver shipped across issues #62–#64 and now passes parity,
exposes `Storage.backup`/`restore`/`status`, and powers a Settings →
Storage page. The seam works — but a handful of leaks, asymmetries, and
half-built pieces remain that I want closed before the Electron shell
(design log 10) lands on top of this:

1. **Wire-prefix inconsistency.** `storageStatus.ts` and
   `storageBackup.ts` mount under `/api/storage/*`. Every other router
   in the app mounts under `/<domain>/*` with no `/api` prefix. One
   convention should win.
2. **Two routers for one storage domain.** Each domain elsewhere is one
   router file (`accounts.ts`, `milestones.ts`, …). Storage shipped as
   `storageStatus.ts` + `storageBackup.ts` — twice the imports in
   `app.ts`, twice the prefix declarations, no good reason once the
   Mongo-shaped 501 path is fixed (see point 4).
3. **`SettingsStoragePage` violates project patterns.** It uses raw
   `<div>` / `<dl>` / `<dt>` / `<dd>` with no styled-components, no
   co-located `.styles.ts`, no Meridian theme tokens. The page also
   carries the loading / error / data branches and the download-button
   logic itself, instead of composing a feature component.
4. **`sanitize5xx` swallows the Mongo "not supported" body in the
   Cloud Build.** The middleware blanket-replaces every 5xx body with
   `{"error":"Internal server error"}`. The Mongo path of
   `POST /api/storage/backup` deliberately returns 501 with
   `{"error":"not supported"}` — but in production that body is
   silently rewritten. Worse, the route returns 501 for _any_ throw,
   not just the typed "not supported" sentinel, so a real I/O failure
   would land as 501 with an internal SQLite error message. Two
   distinct conditions need two distinct response codes.
5. **`createStorage("sqlite")` silently defaults `path` to `:memory:`.**
   If a future entrypoint forgets to pass a path, the desktop install
   silently runs against an in-memory database that vanishes on
   process exit. Defaults are fine in tests; in `createStorage` they
   are a foot-gun.
6. **`Storage.restore` is shipped at the driver layer and parity-tested,
   but there is no HTTP route and no UI button.** A backup is only as
   useful as the restore path. The Desktop Build cannot ship safely
   with a one-way export.
7. **Integrity / user_version checks are scattered.** `connection.ts`,
   `SqliteStorage.ts:validateRestoreSource`, and `migrate.ts` each run
   `PRAGMA integrity_check` or compare `user_version`, with three
   slightly different error message shapes. One module, one pair of
   helpers, three call sites.
8. **Two hand-rolled `mongoStub: Storage` literals in the test suite.**
   `storageStatus.route.test.ts` and `storageBackup.route.test.ts`
   each construct a Mongo-shaped Storage stub with `accounts: {} as
Storage["accounts"]`. Adding a method to `Storage` requires editing
   both files. The test for the route's 501 path already had to be
   skipped in the Cloud Build because of issue #4.
9. **`SettingsStoragePage.test.tsx` mixes four concerns.** Loading
   state, error state, status rendering, and the download-button flow
   are all in one file. The hook (`useStorageStatus`) and helper
   (`downloadBackup`) are not tested in isolation. As more storage
   actions land (restore, vacuum, …) the file gets unmaintainable.

## Solution

A single bundled refactor that fixes the eight issues above, plus the
restore endpoint + UI as the missing-other-half of the backup feature.
Each commit leaves the codebase in a working state and is small enough
to review on its own.

The end state:

- All routes mount under `/<domain>/*` — storage routes drop the
  `/api/` prefix.
- One `storage.ts` router file owns `/storage/status`,
  `/storage/backup`, and `/storage/restore`. The router is mounted on
  every Build Target, but `backup` and `restore` are wired to
  driver-aware sub-handlers that return a clean 4xx on Mongo (no more
  501 + sanitize5xx collision).
- `SettingsStoragePage` becomes a thin composition page. The status
  display + action buttons live in a `features/settings/StorageStatus/`
  feature component with its own `.tsx`, `.styles.ts`, `.test.tsx`.
  The page has its own `.styles.ts` for chrome.
- Meridian theme tokens cover all storage UI; no raw HTML semantic
  elements unstyled.
- `createStorage("sqlite")` requires `path`. Tests pass `":memory:"`
  explicitly (most already do).
- Restore: a `POST /storage/restore` multipart-upload endpoint that
  writes the upload to a temp path, calls `storage.restore(tempPath)`,
  and returns 204 on success / 4xx on validation failure. UI: a
  "Restore from backup" button with a file picker, a confirm dialog,
  and a clear post-restore success/failure message.
- `sqlite/integrity.ts` exposes `assertIntegrity(db)` and
  `assertSchemaNotAhead(db, max)`. `connection.ts`,
  `SqliteStorage.ts`, and `migrate.ts` call into it.
- `__tests__/helpers/mongoStorageStub.ts` exports a single
  `createMongoStorageStub()` helper that the two route tests share.
- Storage UI tests split into `useStorageStatus.test.ts`,
  `downloadBackup.test.ts`, `uploadRestore.test.ts`,
  `StorageStatus.test.tsx`, plus a small smoke test on the page.

The Desktop Build slice (Electron shell, packaging, daily auto-backup
snapshots) remains explicitly out of scope. This is the prerequisite
cleanup, not the next feature.

## Commits

Each step is a single small commit. They land in order; every step
keeps the test suite green.

### Wire-prefix cleanup

1. **`test: sqlite-driver-refactor wire-prefix failing tests`** —
   Update `storageStatus.route.test.ts`, `storageBackup.route.test.ts`,
   and the SPA tests for `useStorageStatus` / `downloadBackup` to hit
   `/storage/...` instead of `/api/storage/...`. RED stop point.

2. **`feat: sqlite-driver-refactor wire-prefix /storage`** — In
   `app.ts`, change the two `app.use("/api/storage", ...)` mounts to a
   single `app.use("/storage", storageRouter)` (combining is in step
   3; this commit can mount both routers under `/storage` if commit
   ordering matters). In `useStorageStatus.ts` and `downloadBackup.ts`,
   drop the `/api` segment. Tests from step 1 go green. Verify in
   browser.

### One router per domain

3. **`refactor: sqlite-driver-refactor consolidate storage router`** —
   Combine `routes/storageStatus.ts` and `routes/storageBackup.ts`
   into a single `routes/storage.ts` exporting one router with
   `GET /status` and `POST /backup`. `app.ts` mounts it once at
   `/storage`. Delete the two old files. No behaviour change; tests
   still pass at the new paths.

### Driver-aware response for unsupported actions

4. **`test: sqlite-driver-refactor unsupported-action returns 4xx failing tests`**
   — Update the Mongo-stubbed test in the storage route test file:
   when `POST /storage/backup` runs against a Mongo Storage, the
   response should be **400** with body
   `{ error: "Storage driver does not support backup" }` (or 405 — see
   Decisions). Add the same expectation for `POST /storage/restore`.
   Add a test that a _non_-"not supported" throw from `backup` (e.g.
   simulated I/O failure) bubbles up as 500 with the sanitised body.
   RED stop point.

5. **`feat: sqlite-driver-refactor distinguish unsupported from failure`**
   — In `routes/storage.ts`, define a small predicate
   `isUnsupportedDriverError(err)` that matches the literal message
   `"not supported"` (the exact string both Mongo-driver methods
   throw). Map it to **400** with the friendly body; let any other
   throw propagate to Express's error middleware (becomes 500,
   sanitised by `sanitize5xx`). Drop the broad 501-on-any-throw
   handler. Tests from step 4 go green. The Cloud Build no longer
   leaks an internal-server-error body for the legitimate
   "this driver doesn't support backup" case.

### Required `path` for SQLite

6. **`test: sqlite-driver-refactor sqlite path is required failing tests`**
   — Add a test in `createStorage.test.ts` asserting that
   `createStorage("sqlite", {})` (no `path`) throws a clear
   `Error("SQLite storage driver requires a 'path' option")`. RED stop
   point.

7. **`feat: sqlite-driver-refactor require sqlite path`** — In
   `storage/index.ts`, drop the `?? ":memory:"` default. Throw if
   `options?.path` is missing. Update any test that relied on the
   default to pass `":memory:"` explicitly (the parity spec, the
   `sqliteApp.ts` helper, and any storage-only suites already do).
   Tests go green.

### Integrity helpers

8. **`refactor: sqlite-driver-refactor extract integrity helpers`** —
   Create `storage/sqlite/integrity.ts` exporting
   `assertIntegrity(db)` and `assertSchemaNotAhead(db, maxVersion)`.
   `connection.ts:assertIntegrity` becomes a thin call. `migrate.ts`'s
   "user_version is ahead of latest migration" check uses
   `assertSchemaNotAhead`. `SqliteStorage.ts:validateRestoreSource`
   uses both. Error message shape is unified. No behaviour change;
   parity + connection + migrate tests stay green.

### Mongo Storage stub helper

9. **`refactor: sqlite-driver-refactor share mongo storage stub`** —
   Create `__tests__/helpers/mongoStorageStub.ts` exporting
   `createMongoStorageStub(overrides?)` that returns a `Storage`
   shaped like the Mongo driver: empty repos, `close()`/`backup()`/
   `restore()` throwing `not supported` (where appropriate),
   `status()` returning the canonical Mongo payload. Update the two
   route test files to import the helper. No behaviour change.

### Restore endpoint

10. **`test: sqlite-driver-refactor restore endpoint failing tests`**
    — In `__tests__/storage.route.test.ts` (the consolidated file from
    step 3), add cases against the SQLite app handle:
    - `POST /storage/restore` with a multipart `file` field
      containing a valid backup → 204; subsequent `GET /accounts`
      returns the snapshot's contents.
    - `POST /storage/restore` with no file → 400.
    - `POST /storage/restore` with a deliberately corrupt file → 400
      with body `{ error: "Backup file failed integrity check" }`;
      pre-restore data is untouched.
    - `POST /storage/restore` with a future-schema source → 400 with
      body `{ error: "Backup was written by a newer version of Horizon" }`.
    - Mongo-stubbed: `POST /storage/restore` → 400 with body
      `{ error: "Storage driver does not support restore" }`.
      RED stop point.

11. **`feat: sqlite-driver-refactor restore endpoint`** — Add
    `POST /storage/restore` to `routes/storage.ts`, accepting a
    multipart upload (use the existing dependency or `multer` if not
    present — confirm before adding). Write the upload to a unique
    temp path under `os.tmpdir()`, call `storage.restore(tempPath)`,
    delete the temp file in a `finally`. On `StorageIntegrityError`,
    map to 400 with the message variants from step 10. Tests go green.

### Restore UI

12. **`test: sqlite-driver-refactor uploadRestore helper failing tests`**
    — Add `src/features/settings/uploadRestore.test.ts` covering: a
    valid `File` is POSTed to `/storage/restore` as multipart; the
    helper resolves on 204; rejects with the response body's `error`
    string on 4xx. RED stop point.

13. **`feat: sqlite-driver-refactor uploadRestore helper`** — Add
    `src/features/settings/uploadRestore.ts` mirroring the shape of
    `downloadBackup.ts`. Tests go green.

14. **`test: sqlite-driver-refactor StorageStatus restore button failing tests`**
    — In the new `StorageStatus.test.tsx` (step 18 will move tests
    over), add cases: a "Restore from backup" button renders only
    under SQLite; clicking it opens a hidden file input; selecting a
    file shows a confirm dialog; confirm calls `uploadRestore` with
    the file; on success, refetches `useStorageStatus` and shows a
    success indicator; on failure, surfaces the error. RED stop point.

15. **`feat: sqlite-driver-refactor StorageStatus restore button`** —
    Implement the restore button + confirm dialog inside the new
    `StorageStatus` component (which lands in step 17). Tests go
    green.

### Settings UI realignment

16. **`refactor: sqlite-driver-refactor SettingsStoragePage styles colocation`**
    — Add `pages/SettingsStoragePage.styles.ts` with the page-chrome
    `Container` / `Header` styled-components built from theme tokens.
    Update the page to use them. Lint clean.

17. **`refactor: sqlite-driver-refactor extract StorageStatus feature component`**
    — Create `src/features/settings/StorageStatus/StorageStatus.tsx`,
    `StorageStatus.styles.ts`, `StorageStatus.test.tsx`. Move the
    status `<dl>` content into themed styled-components
    (`StatusList`, `StatusRow`, `StatusLabel`, `StatusValue`). Move
    the Download-backup button and the new Restore button into this
    component. The page becomes composition-only: heading +
    `<StorageStatus />`. The page test reduces to a smoke test.

18. **`refactor: sqlite-driver-refactor split settings tests`** —
    Split `SettingsStoragePage.test.tsx` into:
    - `features/settings/useStorageStatus.test.ts` (loading, error,
      status payloads).
    - `features/settings/downloadBackup.test.ts` (POST + anchor +
      revoke).
    - `features/settings/uploadRestore.test.ts` (already created in
      step 13 — leave as-is).
    - `features/settings/StorageStatus/StorageStatus.test.tsx` (the
      composed component, including the buttons under SQLite vs.
      hidden under Mongo).
    - `pages/SettingsStoragePage.test.tsx` (smoke: renders the
      heading + the StorageStatus component).
      Each test file targets one unit's behaviour. Total assertions
      unchanged or expanded.

### Wrap-up

19. **`docs: sqlite-driver-refactor close-out`** — Update
    `docs/dev-journal.md` with one entry summarising:
    - the wire-prefix rename,
    - the unsupported-action 400 (rather than 501),
    - the required `path` for SQLite,
    - the restore endpoint + UI,
    - the integrity-helpers extraction.

    Update `docs/ubiquitous-language.md` _only if_ a term shifts (e.g.
    add an entry for "Unsupported Action 400" if it isn't covered by
    Storage Driver / Use-case Method).

## Decision Document

- **One wire convention.** Routes mount at `/<domain>/*`. The
  `/api/storage/*` prefix introduced in #62/#63 is harmonised away by
  dropping `/api`, not by retrofitting it onto every other domain.
  Cheaper, lower-risk, and matches the pre-existing convention.
- **One router per storage-domain file.** The same way each
  business domain has one router file. New storage actions (vacuum,
  integrity-recheck, …) become routes inside `storage.ts`, not new
  files.
- **Unsupported-driver action → 400, not 501.** 501 is a server-side
  signal (and gets blanket-rewritten by `sanitize5xx`). The condition
  here is "this Build Target's Storage Driver does not implement this
  action" — a request-vs-resource mismatch, expressible as a 4xx with
  a stable, user-readable body. 400 over 405 because the route /
  method combination is itself valid; the _driver_ lacks the
  capability. The HTTP status doesn't carry that distinction
  precisely, so we choose the one that survives middleware unchanged.
- **`createStorage("sqlite")` requires `path`.** Defaults belong in
  test helpers, not the production factory. Removing the default
  surfaces wiring bugs at boot rather than as data loss after the
  process exits.
- **Restore via multipart upload.** The Desktop Build's Electron shell
  will hand the renderer a `File` from the OS file picker; multipart
  is the standard shape. The server writes the upload to a unique
  temp path under `os.tmpdir()`, calls `storage.restore(tempPath)`,
  and deletes the temp file in a `finally`. The driver's existing
  validate-then-swap flow (integrity check + user_version check
  before any file mutation) is the safety guarantee — the route adds
  no new validation logic.
- **Restore UI requires explicit confirmation.** A restore replaces
  the live database. The button opens a file picker, then a confirm
  dialog naming the file and warning that the live data will be
  replaced. No silent restores.
- **Integrity helpers live in `sqlite/integrity.ts`.** Both
  `connection.ts` (open path) and `SqliteStorage.ts` (restore-source
  validation) need the same two checks; bundling them keeps error
  message shape consistent and makes future tightening (e.g. adding
  `quick_check` for a fast-path startup) a single edit.
- **Mongo Storage stub is a shared helper, not a per-test literal.**
  Adding a method to `Storage` already costs four edits today; one
  helper compresses that to one. The helper takes overrides so a
  single test can stub a single method without rebuilding the rest.
- **`StorageStatus` is a feature component, not a primitive or a
  page-internal block.** It owns the `useStorageStatus` hook, the
  download / restore actions, and the Meridian-themed presentation.
  This matches the `features/<domain>/<Component>/` pattern used by
  every other domain in the SPA.
- **`SettingsStoragePage` becomes composition-only.** Heading +
  `<StorageStatus />` — that is the page's entire job once the
  feature component lands.
- **Test split mirrors the production split.** One test file per
  unit-of-behaviour: hook, download helper, restore helper, status
  component, page. The combined `SettingsStoragePage.test.tsx` is
  retired.
- **No new `DeleteResult` reasons, no new error types.** All new
  failure paths reuse `StorageIntegrityError` (driver) and standard
  HTTP 4xx with a stable English `error` body (route).
- **No `/api/v1/...` versioning.** Single-tenant, single-client app;
  versioning is premature.

## Testing Decisions

- A good test asserts external behaviour through the public Storage
  facade, the HTTP boundary, or the rendered DOM — never the
  internals of a specific driver, route, or hook.
- Driver-level behaviour stays in `storage.parity.ts` (already covers
  `backup`/`restore`/`status` for both drivers) — this refactor adds
  no new parity-spec cases.
- New / changed coverage:
  - **Routes**: a single consolidated `storage.route.test.ts` (after
    step 3) covering `/status`, `/backup`, `/restore` against both
    SQLite (real) and Mongo (stubbed via the new helper).
  - **Hook**: `useStorageStatus.test.ts` covering loading, error,
    SQLite payload, Mongo payload.
  - **Helpers**: `downloadBackup.test.ts` and `uploadRestore.test.ts`
    covering POST shape, success, and error mapping.
  - **Component**: `StorageStatus.test.tsx` covering the rendered
    fields per driver, the Download button under SQLite only, and
    the Restore flow (file pick → confirm → upload → refetch).
  - **Page**: `SettingsStoragePage.test.tsx` reduced to a smoke test
    asserting heading + that the StorageStatus component is rendered.
  - **Integrity**: no new tests — the extraction is pure refactoring
    and is covered by existing connection / migrate / parity tests.
- Prior art:
  - `useAccounts.ts` / `useAccounts.test.ts` is the model for the
    hook test.
  - `BalanceCard` is the model for `features/<domain>/<Component>/`
    layout (`.tsx`/`.styles.ts`/`.test.tsx`).
  - `routes/transfers.ts` is the model for a single-router-per-domain
    file with multiple HTTP methods.
  - `connection.test.ts` "throws StorageIntegrityError on a future
    user_version" is the model for the future-schema restore test.

## Out of Scope

- Anything from the Desktop Build slice: Electron main, packaging,
  Windows installer, OS auto-update, daily auto-backup snapshots.
- Adding `/api/...` to non-storage routes for top-down consistency.
  Storage's `/api/storage` prefix was the local anomaly; the rest of
  the app is fine. A unified versioned API is a separate design.
- A shared `types/` package between server and client. The
  duplicated `StorageStatus` interface in `useStorageStatus.ts` is a
  symptom; the cure (a shared types boundary) is its own design log.
- Pruning the Mongo-only repo tests in `server/src/storage/__tests__/`
  (already deferred in #54).
- Down-migrations / schema rollback. Rejected in design log 09.
- SQLCipher / at-rest encryption. Deferred in design logs 08 and 09.
- Aggressive index sprawl, automatic VACUUM. Deferred in design log 09.
- A "Vacuum / Optimise database" action surfaced in the UI. Reserve
  for after real-world file-size pressure shows up.
- Refactoring `sanitize5xx` itself. The middleware is correct _for
  unhandled_ 5xx errors; the bug was that the storage route was
  emitting an _intentional_ 5xx the middleware couldn't distinguish.
  The fix is at the route layer.

## Further Notes

- Step 4–5 (the unsupported-action 400) is the most impactful single
  change: it removes a real Cloud Build bug today (`{"error":"Internal server error"}`
  for legitimate "Mongo doesn't back up" calls) and is invisible to
  the SQLite path.
- Step 11 (restore endpoint) is the only step with a multipart-upload
  dependency. If `multer` is not already in `server/package.json`,
  prefer it over hand-rolled multipart parsing — it is the standard
  Express choice and is small.
- The restore confirm dialog wording should match the existing
  Meridian dialog patterns. If no Dialog primitive exists yet, ship
  a simple themed inline confirmation rather than introducing a new
  primitive in this refactor; defer the Dialog primitive to a Meridian
  pass.
- After step 11 lands, the Storage Architecture section of
  `ubiquitous-language.md` may want a one-line entry for the restore
  HTTP route shape (`POST /storage/restore` accepts a multipart
  upload) — already implied by `Storage.restore`, but worth being
  explicit so future contributors don't reinvent it.
- Consider, as a follow-up, surfacing `StorageIntegrityError` from
  the _open_ path with the same friendly 400-style envelope on the
  Settings page (today the Express child would crash at boot — the
  Electron shell will need to handle that). That belongs to design
  log 10, not this refactor.
