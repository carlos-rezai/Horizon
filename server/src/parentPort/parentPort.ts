export type FatalKind = "integrity" | "unknown";

interface ParentPortLike {
  postMessage(message: unknown): void;
  on(event: "message", listener: (message: unknown) => void): void;
}

function getParentPort(): ParentPortLike | undefined {
  const port = (process as { parentPort?: ParentPortLike }).parentPort;
  return port ?? undefined;
}

export function postReady(port: number): void {
  getParentPort()?.postMessage({ type: "ready", port });
}

export function postFatal(kind: FatalKind, message: string): void {
  getParentPort()?.postMessage({ type: "fatal", kind, message });
}

export function onShutdown(handler: () => Promise<void>): void {
  const parentPort = getParentPort();
  if (!parentPort) {
    return;
  }
  parentPort.on("message", (message: unknown) => {
    if (
      typeof message === "object" &&
      message !== null &&
      (message as { type?: unknown }).type === "shutdown"
    ) {
      void handler();
    }
  });
}
