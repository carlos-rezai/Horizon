import { app, utilityProcess, type UtilityProcess } from "electron";
import { awaitExitOrKill } from "./awaitExitOrKill.js";
import { resolveDbPath } from "./paths.js";
import { resolveServerEntry } from "./resolveServerEntry.js";

const READY_TIMEOUT_MS = 10_000;

export type FatalKind = "integrity" | "unknown";
export type FatalHandler = (kind: FatalKind, message: string) => void;

export interface ServerHandleOptions {
  isDev: boolean;
}

export interface ServerHandle {
  start(): Promise<{ port: number }>;
  shutdown(timeoutMs: number): Promise<void>;
  onFatal(handler: FatalHandler): void;
}

interface ReadyMessage {
  type: "ready";
  port: number;
}

interface FatalMessage {
  type: "fatal";
  kind: FatalKind;
  message: string;
}

type ServerMessage = ReadyMessage | FatalMessage;

function isServerMessage(value: unknown): value is ServerMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const type = (value as { type?: unknown }).type;
  return type === "ready" || type === "fatal";
}

function tagLines(prefix: string, chunk: Buffer | string): string {
  const text = typeof chunk === "string" ? chunk : chunk.toString();
  return text
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => `${prefix} ${line}\n`)
    .join("");
}

export function createServerHandle(options: ServerHandleOptions): ServerHandle {
  let child: UtilityProcess | null = null;
  let fatalHandler: FatalHandler = () => {};

  return {
    onFatal(handler) {
      fatalHandler = handler;
    },

    async start(): Promise<{ port: number }> {
      const { entry, execArgv } = resolveServerEntry(
        app.isPackaged,
        options.isDev,
        process.env as Record<string, string | undefined>,
        app.getAppPath(),
        process.cwd()
      );

      child = utilityProcess.fork(entry, [], {
        execArgv,
        stdio: "pipe",
        env: {
          ...process.env,
          PORT: "0",
          HORIZON_DB_PATH: resolveDbPath(),
        },
      });

      child.stdout?.on("data", (chunk: Buffer) => {
        process.stdout.write(tagLines("[server]", chunk));
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        process.stderr.write(tagLines("[server]", chunk));
      });

      return new Promise<{ port: number }>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(
            new Error(
              `Server did not become ready within ${READY_TIMEOUT_MS}ms`
            )
          );
        }, READY_TIMEOUT_MS);

        child!.on("message", (raw: unknown) => {
          if (!isServerMessage(raw)) {
            return;
          }
          if (raw.type === "ready") {
            clearTimeout(timer);
            resolve({ port: raw.port });
            return;
          }
          clearTimeout(timer);
          fatalHandler(raw.kind, raw.message);
          reject(new Error(raw.message));
        });
      });
    },

    async shutdown(timeoutMs: number): Promise<void> {
      if (!child) {
        return;
      }
      const current = child;
      child = null;
      current.postMessage({ type: "shutdown" });
      await awaitExitOrKill(current, timeoutMs);
    },
  };
}
