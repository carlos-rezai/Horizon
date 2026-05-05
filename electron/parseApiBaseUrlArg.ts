const FLAG = "--api-base-url=";

export function parseApiBaseUrlArg(argv: readonly string[]): string | null {
  for (const arg of argv) {
    if (arg.startsWith(FLAG)) {
      return arg.slice(FLAG.length);
    }
  }
  return null;
}
