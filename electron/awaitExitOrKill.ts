export interface ExitableChild {
  once(event: "exit", listener: () => void): void;
  kill(): void;
}

export function awaitExitOrKill(
  child: ExitableChild,
  timeoutMs: number
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill();
      resolve();
    }, timeoutMs);

    child.once("exit", () => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      resolve();
    });
  });
}
