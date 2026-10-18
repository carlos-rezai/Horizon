import type { ConformanceAllowlistEntry } from "../../styles/conformanceAllowlist";

export type RawControlTag = "button" | "input" | "select" | "textarea";

export interface RawControl {
  exportName: string;
  tag: RawControlTag;
}

export interface ConformanceViolation extends RawControl {
  file: string;
}

export interface StyledElement {
  exportName: string;
  /** The element tag (`button`, `div`), or empty for `styled(Component)`. */
  tag: string;
  /** The source from the export to where the next export starts. */
  body: string;
}

/**
 * An exported styled element: the member form `styled.button`, with or
 * without a generic or `.attrs(...)`, the call form `styled("button")`, and
 * `styled(Button)`, which composes a component and has no tag.
 */
const STYLED_ELEMENT =
  /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*styled\s*(?:\.\s*([a-z][\w]*)\b|\(\s*(?:["'`]([a-z][\w]*)["'`]|[A-Za-z_$][\w$.]*)\s*\))/g;

const EXPORT_START = /^export\b/gm;

export function findStyledElements(source: string): StyledElement[] {
  const exportStarts = [...source.matchAll(EXPORT_START)].map((m) => m.index);
  return [...source.matchAll(STYLED_ELEMENT)].map((match) => {
    const end =
      exportStarts.find((start) => start > match.index) ?? source.length;
    return {
      exportName: match[1],
      tag: match[2] ?? match[3] ?? "",
      body: source.slice(match.index, end),
    };
  });
}

const RAW_CONTROL_TAGS: readonly string[] = [
  "button",
  "input",
  "select",
  "textarea",
] satisfies readonly RawControlTag[];

function isRawControlTag(tag: string): tag is RawControlTag {
  return RAW_CONTROL_TAGS.includes(tag);
}

/** Every exported styled element built straight on a control tag.
 *  `styled(Button)` composes a primitive and is not one. */
export function findRawControls(source: string): RawControl[] {
  return findStyledElements(source).flatMap(({ exportName, tag }) =>
    isRawControlTag(tag) ? [{ exportName, tag }] : []
  );
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
