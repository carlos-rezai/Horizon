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
      };
    };
  }
}
