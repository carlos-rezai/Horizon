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
    // utilityProcess.fork() is a native spawn — it cannot read from inside an
    // asar archive. The server bundle is declared in asarUnpack so it lands in
    // app.asar.unpacked/ at the same relative path.
    const unpackedRoot = path.join(path.dirname(appPath), "app.asar.unpacked");
    return {
      entry: path.join(unpackedRoot, "server", "dist", "server.bundle.js"),
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
