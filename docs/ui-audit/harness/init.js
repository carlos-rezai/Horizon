(() => {
  const subs = { navigate: [], notify: [], confirm: [], openManual: [] };
  const on = (k) => (cb) => {
    subs[k].push(cb);
    return () => {
      subs[k] = subs[k].filter((c) => c !== cb);
    };
  };
  window.__menu = subs;
  window.horizon = {
    apiBaseUrl: "http://127.0.0.1:3001",
    platform: "win32",
    electronVersion: "audit-stub",
    updates: {
      onUpdateDownloaded: () => () => {},
      onUpdateAvailable: () => () => {},
      onManualResult: () => () => {},
      quitAndInstall: () => {},
      downloadUpdate: () => {},
      getAppVersion: async () => "1.4.0",
      getAutoDownload: async () => true,
      setAutoDownload: async () => {},
    },
    menu: {
      onNavigate: on("navigate"),
      onNotify: on("notify"),
      onConfirm: on("confirm"),
      respondConfirm: () => {},
      onOpenManual: on("openManual"),
    },
  };
})();
