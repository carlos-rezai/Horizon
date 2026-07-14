export {};

/** Tone of a menu-action notification pushed from the main process. */
export type MenuNotificationTone = "success" | "info" | "error";

/**
 * A menu-action outcome the main process pushes to the renderer over
 * `menu:notify`. `success`/`info` render as a snackbar; `error` raises the
 * acknowledge modal, which is why the payload always carries a title.
 */
export interface MenuNotification {
  tone: MenuNotificationTone;
  title: string;
  message: string;
  detail?: string;
}

/**
 * A yes/no question the main process asks the renderer over `menu:confirm`.
 * The renderer answers with `respondConfirm(id, confirmed)`; the `id`
 * correlates the answer to this request.
 */
export interface MenuConfirmRequest {
  id: number;
  title: string;
  message: string;
  detail?: string;
  tone?: "default" | "danger";
  confirmLabel?: string;
  cancelLabel?: string;
}

/** Phase of a manual "Check for Updates" run, surfaced in the update UI. */
export type ManualUpdateState =
  | "checking"
  | "uptodate"
  | "error"
  | "dev-unavailable";

/** Outcome of a manual update check, pushed over `update-manual-result`. */
export interface ManualUpdateResult {
  state: ManualUpdateState;
  message?: string;
}

declare global {
  interface Window {
    horizon?: {
      apiBaseUrl: string;
      platform: string;
      electronVersion: string;
      updates: {
        onUpdateDownloaded: (cb: () => void) => () => void;
        onUpdateAvailable: (cb: () => void) => () => void;
        onManualResult: (
          cb: (result: ManualUpdateResult) => void
        ) => () => void;
        quitAndInstall: () => void;
        downloadUpdate: () => void;
        getAppVersion: () => Promise<string>;
        getAutoDownload: () => Promise<boolean>;
        setAutoDownload: (enabled: boolean) => Promise<void>;
      };
      menu: {
        onNavigate: (cb: (route: string) => void) => () => void;
        onNotify: (cb: (notification: MenuNotification) => void) => () => void;
        onConfirm: (cb: (request: MenuConfirmRequest) => void) => () => void;
        respondConfirm: (id: number, confirmed: boolean) => void;
      };
    };
  }
}
