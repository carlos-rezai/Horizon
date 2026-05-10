import path from "node:path";

export interface ServerEntry {
  entry: string;
  execArgv: string[];
}

export function resolveServerEntry(
  isPackaged: boolean,
  isDev: boolean,
  env: Record<string, string | undefined>,
  appPath: string,
  cwd: string
): ServerEntry {
  if (isPackaged) {
    return {
      entry: path.join(appPath, "server", "dist", "server.bundle.js"),
      execArgv: [],
    };
  }

  const useCompiledServer = !isDev || env.HORIZON_FORCE_COMPILED_SERVER === "1";
  if (useCompiledServer) {
    return {
      entry: path.join(cwd, "server", "dist", "server.js"),
      execArgv: [],
    };
  }

  return {
    entry: path.join(cwd, "server", "src", "server.ts"),
    execArgv: ["--import", "tsx"],
  };
}
