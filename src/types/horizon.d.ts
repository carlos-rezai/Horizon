export {};

declare global {
  interface Window {
    horizon?: { apiBaseUrl: string; platform: "electron" };
  }
}
