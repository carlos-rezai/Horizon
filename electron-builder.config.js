// @ts-check

/** @param {Record<string, string | undefined>} env */
export function buildConfig(env) {
  /** @type {import('electron-builder').WindowsConfiguration} */
  const win = {
    target: [{ target: "nsis", arch: ["x64"] }],
  };

  if (env.WIN_CERTIFICATE_FILE) {
    win.certificateFile = env.WIN_CERTIFICATE_FILE;
    win.certificatePassword = env.WIN_CERTIFICATE_PASSWORD;
  }

  return {
    appId: "io.github.carlosrezai.horizon",
    productName: "Horizon",
    icon: "src/assets/icon.ico",
    files: ["dist/**", "electron/dist/**", "server/dist/**"],
    asarUnpack: ["**/*.node"],
    directories: { output: "release" },
    win,
    nsis: { oneClick: true, perMachine: false },
    publish: {
      provider: "github",
      owner: "carlos-rezai",
      repo: "horizon",
    },
  };
}

export default buildConfig(process.env);
