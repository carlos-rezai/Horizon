# Refactor Plan 25 — In-App Dialogs for Menu Actions

## Problem Statement

Horizon's native application menu (File / Help) drives its core data
operations — Create Backup, Restore from Backup, Start Fresh — plus Check for
Updates and About. Every one of these currently reports its outcome through a
**native Windows message box** (`dialog.showMessageBoxSync`): the "backup
created" confirmation, the "backup failed" / "restore failed" errors, the
destructive "erase everything?" and "overwrite all data?" warnings, and the
update "you're up to date" / "check failed" boxes.

These native boxes are OS chrome. They do not use the Meridian design system,
they don't look or feel like Horizon, and they sit oddly next to the parts of
the same flows that _are_ already in-app — most visibly the auto-update banner,
where an _available_ update surfaces as an on-brand snackbar while "you're up to
date" pops a grey Windows dialog. The result is a split personality: the same
feature speaks in two visual languages depending on the outcome.

We want the menu-driven flows to feel like one product — Horizon's own modals
and snackbars — while still respecting the handful of dialogs that genuinely
must stay native.

## Solution

Move the **notifications** (success/info/error result messages) and the
**destructive confirmations** (Start Fresh, Restore-overwrite) into in-app
Horizon UI, reusing the existing `Snackbar` stack and `Modal` component. Success
and informational outcomes become transient snackbars; failures become a
blocking acknowledge-modal; the two destructive prompts become confirm-modals.
Update outcomes fold into the existing update state machine so all update
messaging lives in one place.

Because the menu fires in the **main process** but our UI lives in the
**renderer**, each action's outcome routing is extracted into a pure,
dependency-injected orchestrator (the same seam already used for
`runManualUpdateCheck`), and `main.ts` gains thin IPC helpers to (a) push a
notification to the renderer and (b) ask the renderer a yes/no question and
await the answer. The orchestrators become unit-testable; `main.ts` stays thin
wiring.

A deliberate, recorded decision is being superseded here: design-log
`24-native-application-menu.md` chose native message boxes for the
up-to-date / error / dev-unpackaged update outcomes. Design-logs are immutable
snapshots, so that log is **not** edited; this plan is the record of the
reversal, and `docs/dev-journal.md` gets a dated note pointing here.

### What stays native (non-negotiable)

- **OS file pickers** — `showSaveDialog` (Create Backup target) and
  `showOpenDialog` (Restore source). These are the operating system's job and
  cannot be reproduced in a web modal.
- **Fatal startup dialog** — fires before the window/renderer may exist, or when
  the renderer is broken. Native is the only safe surface.
- **About Horizon** — left native this pass (out of scope; see below).

## Commits

Each commit leaves the app building and green. Renderer-first, wiring-last, so
every new piece is dormant and safe until the final wiring commits activate it.

### Phase A — Reusable renderer primitives (dormant, unused)

1. **`AlertModal` component.** A dumb, tone-aware acknowledge modal
   (title / message / detail / single OK button) built on the existing `Modal`.
   Co-located test covers render, tone variants, and OK/close. Not yet mounted
   anywhere.

2. **`AlertProvider` + `useAlert`.** Imperative single-host provider mirroring
   the existing `SnackbarProvider` / `useSnackbar` pattern: `useAlert()` returns
   an `alert(opts)` function that shows one `AlertModal` at a time. Test the
   provider contract (throws outside provider, shows/dismisses). Not yet mounted.

3. **`ConfirmModal` component.** A dumb, tone-aware confirm/cancel modal
   (danger tone for destructive actions, configurable confirm/cancel labels)
   built on `Modal`. Test render, tone, confirm vs cancel callbacks.

4. **`ConfirmProvider` + `useConfirm`.** Imperative provider whose `useConfirm()`
   returns `(opts) => Promise<boolean>`, resolving true on confirm / false on
   cancel or dismiss. Mirrors the snackbar-provider precedent. Test the promise
   resolution both ways.

### Phase B — IPC contract (additive, backward-compatible)

5. **Extend the preload bridge + types.** Add to `window.horizon.menu`:
   `onNotify(cb)`, `onConfirm(cb)`, `respondConfirm(id, confirmed)`; add to
   `window.horizon.updates`: `onManualResult(cb)`. Update `src/types/horizon.d.ts`
   to match. No main-process senders yet, so the channels are dormant. Preload
   has no unit tests today (consistent with the existing bridge); the type
   surface is the checked contract.

### Phase C — Renderer host wiring (dormant until main sends)

6. **Menu dialog host.** A `useMenuDialogs` hook (in `src/features/menu/`
   alongside `useMenuNavigation`) that subscribes to `menu:notify` — routing
   success/info to `useSnackbar().notify` and error to `useAlert().alert` — and
   to `menu:confirm` — calling `useConfirm()` and replying via
   `respondConfirm(id, …)`. Mount `AlertProvider` / `ConfirmProvider` and the
   host in `AppLayout`. Test the hook against a faked `window.horizon`. Dormant:
   main sends nothing yet.

7. **Fold update outcomes into the update machine.** Extend `useUpdateStatus`
   with `checking` / `uptodate` / `error` states, subscribing to
   `updates.onManualResult`. Update `UpdateBanner` so `uptodate` renders a
   transient success snackbar and `error` raises `useAlert().alert` (reusing the
   same AlertModal — no second modal implementation). Tests for the new states
   and the banner rendering. Dormant until main emits manual results.

### Phase D — Main-process helpers (thin wiring)

8. **`notifyRenderer` + `confirmViaRenderer` in `main.ts`.** `notifyRenderer`
   sends `menu:notify`. `confirmViaRenderer` allocates a request id, keeps a
   pending-promise map, sends `menu:confirm`, and resolves when the
   `menu:confirm-result` handler fires. Not yet used by any action. Thin, main-
   only wiring (untested, consistent with the rest of `main.ts`).

### Phase E — Extract one orchestrator per action, then wire

Each action follows the `runManualUpdateCheck` shape: a pure
`electron/<action>/<action>.ts` with an injected-deps interface and unit tests
covering every branch, then `main.ts` rebuilt to supply concrete deps.

9. **Create Backup.** Extract `createBackup` orchestrator. Deps: native
   save-picker (returns path or cancel), `backupTo(path)` (fetch), `notifySuccess`,
   `notifyError`. Tests: cancelled picker → nothing; success → success
   notification; failure → error notification. Wire `main.ts`: keep the native
   `showSaveDialog`, replace the two message boxes with `notifyRenderer`
   (success → snackbar, failure → alert modal).

10. **Restore from Backup.** Extract `restoreFromBackup` orchestrator. Deps:
    native open-picker, `confirm` (→ `confirmViaRenderer`), `restoreFrom(path)`
    (fetch), `reloadWindow`, `notifyError`. Tests: cancelled picker → nothing;
    declined confirm → no fetch, no reload; success → reload; failure → error
    notification, no reload. Wire `main.ts`: keep native `showOpenDialog`,
    replace the warning box with the confirm-modal round-trip and the error box
    with `notifyRenderer`.

11. **Start Fresh.** Extract `startFresh` orchestrator. Deps: `confirm`,
    `reset()` (fetch), `reloadWindow`, `notifyError`. Tests: declined confirm →
    no reset, no reload; success → reload; failure → error notification. Wire
    `main.ts` accordingly.

12. **Update outcomes through the machine.** Change `runManualUpdateCheck`'s
    injected sinks so `onUpToDate` / `onError` (and a new `onChecking`) emit
    through `updates.onManualResult` IPC instead of native boxes; update its
    unit tests for the adjusted deps. In `main.ts`, replace the native
    up-to-date / error message boxes with `webContents.send('update-manual-result', …)`;
    the dev-unpackaged notice also routes through the same manual-result channel
    (renderer shows it as an info snackbar or alert). The available/downloading
    path is untouched.

### Phase F — Cleanup + record

13. **Remove dead native code + journal.** Delete the now-unused
    `showMessageBoxSync` calls for the migrated dialogs from `main.ts` (leaving
    the file pickers, the fatal dialog, and About). Add a dated
    `docs/dev-journal.md` entry recording that this refactor supersedes the
    update-messaging decision in design-log 24, and why.

## Decision Document

- **Hybrid, not wholesale.** File pickers and the fatal startup dialog stay
  native by necessity; About stays native this pass by choice. Everything else
  moves in-app.
- **Notifications: snackbar for success/info, blocking modal for errors.**
  Failures demand acknowledgment and carry a message worth reading; successes
  are transient confirmations that match the existing update banner.
- **Destructive confirmations move to an in-app confirm-modal** (danger tone).
  The Start-Fresh and Restore-overwrite prompts are the two confirmations in
  scope.
- **Update messaging is unified in `useUpdateStatus` / `UpdateBanner`.** All
  outcomes — available, downloading/ready, up-to-date, error, dev-unpackaged —
  flow through the one update surface. This removes the split introduced when
  Check-for-Updates shipped with native up-to-date/error boxes.
- **Main↔renderer contract.** One-way `menu:notify` for notifications;
  request/response `menu:confirm` + `menu:confirm-result` (correlated by id) for
  confirmations; `update-manual-result` for update outcomes. All additive to the
  existing preload bridge; no existing channel changes shape.
- **DI orchestrator per action.** `createBackup`, `restoreFromBackup`,
  `startFresh`, and the existing `runManualUpdateCheck` each become a pure
  orchestrator under `electron/<action>/`; `main.ts` is reduced to supplying
  concrete Electron/fetch/IPC implementations. This is the established seam from
  issue #179.
- **Provider primitives mirror `SnackbarProvider`.** `AlertProvider`/`useAlert`
  and `ConfirmProvider`/`useConfirm` follow the existing imperative-provider
  precedent so the codebase keeps one notification idiom.
- **Reload interplay is safe.** Restore and Start Fresh reload the window only on
  _success_, and their only in-app dialogs are the pre-fetch confirm and the
  on-failure error modal — neither collides with a reload. Backup shows a success
  snackbar and does not reload. No success toast is ever wiped by a reload.

## Testing Decisions

- **Good tests here assert external behaviour, not implementation.** For an
  orchestrator: given injected deps, the right sink is called for each outcome
  (cancelled / confirmed-then-succeeded / confirmed-then-failed), and it never
  throws on rejection. For a renderer component: given props/context, the right
  visible affordance appears and the right callback fires — not which hook holds
  which state.
- **Prior art.** `electron/runManualUpdateCheck/runManualUpdateCheck.test.ts` is
  the template for the orchestrator tests (fake deps via `vi.fn()`, assert
  call counts and arguments). `src/components/Snackbar` /
  `SnackbarProvider` tests and the existing feature-modal tests
  (`AccountCreateModal`, `CategoryManagerModal`) are the template for the new
  `AlertModal` / `ConfirmModal` / provider tests. `UpdateBanner` already has a
  test to extend for the new states.
- **Modules under test:** `AlertModal`, `AlertProvider`, `ConfirmModal`,
  `ConfirmProvider`, `useMenuDialogs`, the extended `useUpdateStatus` /
  `UpdateBanner`, and the four orchestrators (`createBackup`,
  `restoreFromBackup`, `startFresh`, `runManualUpdateCheck`).
- **Not unit-tested (unchanged policy):** `main.ts` wiring, `preload.ts` bridge.
  Their correctness is expressed through the extracted orchestrators and the
  typed `window.horizon` contract. A manual smoke pass in the packaged app
  (backup, restore, start-fresh, offline update check) is the acceptance check
  for the wiring, since these paths only exist under Electron.

## Out of Scope

- **About Horizon** stays a native box. Moving it would duplicate the in-app
  settings AboutCard and buys little; revisit separately if desired.
- **File pickers** (Save/Open) remain native — no web equivalent.
- **Fatal startup dialog** remains native — must survive a dead renderer.
- **The in-app StorageCard backup/restore flow** (HTTP download/upload) is
  untouched; this refactor only changes the _menu-triggered_ native path.
- **Auto-backup-before-destroy**, surgical cache invalidation (we keep the full
  `webContents.reload()`), and any macOS menu conventions — all remain out of
  scope, consistent with design-log 24.
- **No new user-facing capability** — this is a presentation/consistency
  refactor. The set of actions and their effects is unchanged.

## Further Notes

- The available/downloading auto-update path, the automatic startup check, and
  the auto-download preference are explicitly unchanged.
- Because confirmations become an async main→renderer→main round-trip, the menu
  handlers that were synchronous (`showMessageBoxSync`) become promise-based.
  The window must be present and focused when a confirm is requested (it always
  is for a menu click); if the renderer is somehow gone, `confirmViaRenderer`
  should fail closed (treat as cancelled) so a destructive action never proceeds
  without an answer.
- Watch for double-mounted modals: `AlertProvider` is mounted once at the layout
  root and shared by both the menu host and the update banner via `useAlert`, so
  there is a single alert host, not one per caller.
