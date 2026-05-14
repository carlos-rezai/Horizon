export {};

declare global {
  interface Window {
    horizon?: {
      apiBaseUrl: string;
      platform: string;
      updates: {
        onUpdateDownloaded: (cb: () => void) => () => void;
        quitAndInstall: () => void;
        downloadUpdate: () => void;
        getAppVersion: () => Promise<string>;
        getAutoDownload: () => Promise<boolean>;
        setAutoDownload: (enabled: boolean) => Promise<void>;
      };
    };
  }
}
