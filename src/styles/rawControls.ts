import type { ConformanceAllowlistEntry } from "./conformanceAllowlist";

export type RawControlTag = "button" | "input" | "select" | "textarea";

export interface RawControl {
  exportName: string;
  tag: RawControlTag;
}

export interface ConformanceViolation extends RawControl {
  file: string;
}

/**
 * An exported styled element built straight on a control tag: the member form
 * `styled.button`, with or without a generic or `.attrs(...)`, and the call
 * form `styled("button")`. `styled(Button)` composes a primitive and is not
 * matched.
 */
const RAW_CONTROL =
  /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*styled\s*(?:\.\s*(button|input|select|textarea)\b|\(\s*["'`](button|input|select|textarea)["'`]\s*\))/g;

export function findRawControls(source: string): RawControl[] {
  const found: RawControl[] = [];
  for (const match of source.matchAll(RAW_CONTROL)) {
    const tag = (match[2] ?? match[3]) as RawControlTag;
    found.push({ exportName: match[1], tag });
  }
  return found;
}

function isListed(
  allowlist: readonly ConformanceAllowlistEntry[],
  file: string,
  exportName: string
): boolean {
  return allowlist.some((e) => e.file === file && e.exportName === exportName);
}

export function findConformanceViolations(
  modules: Record<string, string>,
  allowlist: readonly ConformanceAllowlistEntry[]
): ConformanceViolation[] {
  return Object.entries(modules).flatMap(([file, source]) =>
    findRawControls(source)
      .filter((control) => !isListed(allowlist, file, control.exportName))
      .map((control) => ({ file, ...control }))
  );
}

export function findStaleAllowlistEntries(
  modules: Record<string, string>,
  allowlist: readonly ConformanceAllowlistEntry[]
): ConformanceAllowlistEntry[] {
  return allowlist.filter((entry) => {
    const source = modules[entry.file];
    if (source === undefined) return true;
    return !findRawControls(source).some(
      (control) => control.exportName === entry.exportName
    );
  });
}
