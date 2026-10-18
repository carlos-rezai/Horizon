import { describe, it, expect } from "vitest";

// Issue #274 — alignment has one owner. Empty states centre through
// EmptyState (or hold their place through SectionState), figures right-align
// through Money inside DataRow columns, and headings take their alignment from
// the shared column definition. A style module that centres its own empty
// state, or right-aligns its own figures in a file an alignment finding
// touches, duplicates an owner. The sources are read raw, as the font-faces
// test reads main.tsx, so the guard sees what the author wrote.

const styleModules = import.meta.glob(
  [
    "../features/**/*.styles.ts",
    "../layouts/**/*.styles.ts",
    "../pages/**/*.styles.ts",
  ],
  { query: "?raw", import: "default", eager: true }
) as Record<string, string>;

/** Each `export const Name = styled…` block, by export name. */
function styledBlocks(source: string): Array<{ name: string; body: string }> {
  const starts = [...source.matchAll(/export const (\w+)\s*=\s*styled/g)];
  return starts.map((match, i) => ({
    name: match[1],
    body: source.slice(match.index, starts[i + 1]?.index ?? source.length),
  }));
}

describe("Alignment owner — empty states centre through EmptyState", () => {
  it("no style module centres an empty state of its own", () => {
    expect(Object.keys(styleModules).length).toBeGreaterThan(20);
    const offenders = Object.entries(styleModules).flatMap(([path, source]) =>
      styledBlocks(source)
        .filter(
          ({ name, body }) =>
            /Empty/.test(name) && /text-align:\s*center/.test(body)
        )
        .map(({ name }) => `${path} ${name}`)
    );

    expect(offenders).toEqual([]);
  });
});

// The files Audit Findings 21 (History Year Archive) and 22 (Import History)
// touch. Their figures and counts take their alignment from the shared column
// definition; a local right or centre alignment there duplicates it. A
// `text-align: left` reset on a button is not alignment of a figure and stays.
const findingFiles = [
  "../features/history/YearArchive/YearArchive.styles.ts",
  "../features/import/ImportHistory/ImportHistory.styles.ts",
];

describe("Alignment owner — no local alignment where the findings touch", () => {
  findingFiles.forEach((file) => {
    it(`${file} declares no right, end or centre text-align`, () => {
      const source = styleModules[file];
      expect(source).toBeDefined();
      expect(source.match(/text-align:\s*(right|end|center)/g) ?? []).toEqual(
        []
      );
    });
  });
});

// The alignment findings (21–25) close in the register with the commit that
// fixes them.
const register = Object.values(
  import.meta.glob("../../docs/ui-audit/findings.md", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>
)[0];

describe("Alignment owner — the findings register", () => {
  [21, 22, 23, 24, 25].forEach((n) => {
    it(`closes Audit Finding ${n} with issue #274`, () => {
      expect(register).toBeDefined();
      const entry = register
        .split(/^### /m)
        .find((s) => s.startsWith(`${n}. `));
      expect(entry).toBeDefined();
      expect(entry).toMatch(/\*\*Status:\*\* Closed — issue #274/);
    });
  });
});
