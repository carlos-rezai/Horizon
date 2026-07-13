export {};

declare global {
  interface Window {
    horizon?: {
      apiBaseUrl: string;
      platform: string;
      electronVersion: string;
      updates: {
        onUpdateDownloaded: (cb: () => void) => () => void;
        onUpdateAvailable: (cb: () => void) => () => void;
        quitAndInstall: () => void;
        downloadUpdate: () => void;
        getAppVersion: () => Promise<string>;
        getAutoDownload: () => Promise<boolean>;
        setAutoDownload: (enabled: boolean) => Promise<void>;
      };
      menu: {
        onNavigate: (cb: (route: string) => void) => () => void;
      };
    };
  }
}
