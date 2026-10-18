import { describe, it, expect } from "vitest";
import {
  findStyledElements,
  findRawControls,
  findConformanceViolations,
  findStaleAllowlistEntries,
} from "./rawControls";
import type { ConformanceAllowlistEntry } from "../../styles/conformanceAllowlist";

/**
 * The one source scanner: every exported styled element, its tag, and its
 * body up to where the next export starts.
 */
describe("findStyledElements", () => {
  it("names a member element and its tag", () => {
    const source = "export const Row = styled.div`\n  display: flex;\n`;";
    expect(findStyledElements(source)).toEqual([
      { exportName: "Row", tag: "div", body: source },
    ]);
  });

  it("sees through a generic props parameter and attrs", () => {
    const source = [
      "export const Chip = styled.button<{ $on: boolean }>`color: red;`;",
      'export const File = styled.input.attrs({ type: "file" })`display: none;`;',
    ].join("\n");
    expect(
      findStyledElements(source).map(({ exportName, tag }) => ({
        exportName,
        tag,
      }))
    ).toEqual([
      { exportName: "Chip", tag: "button" },
      { exportName: "File", tag: "input" },
    ]);
  });

  it("gives styled(Button) an empty tag", () => {
    const source = "export const Wide = styled(Button)`width: 100%;`;";
    expect(findStyledElements(source)).toEqual([
      { exportName: "Wide", tag: "", body: source },
    ]);
  });

  it("ends each body where the next export starts", () => {
    const first = "export const A = styled.button`\n  color: red;\n`;\n\n";
    const between = "export const ring = css`outline: none;`;\n";
    const last = "export const B = styled.span`color: blue;`;\n";
    const [a, b] = findStyledElements(first + between + last);
    expect(a.body).toBe(first);
    expect(b.body).toBe(last);
  });
});

/**
 * The detector behind **Primitive Conformance**: it reads a style module's
 * source text and names every export that is a raw `button`, `input`,
 * `select` or `textarea` styled element.
 */
describe("findRawControls", () => {
  it("names a raw styled button export", () => {
    const source = "export const StyledGo = styled.button`\n  color: red;\n`;";
    expect(findRawControls(source)).toEqual([
      { exportName: "StyledGo", tag: "button" },
    ]);
  });

  it("names raw input, select and textarea exports", () => {
    const source = [
      "export const A = styled.input`display: none;`;",
      "export const B = styled.select`padding: 0;`;",
      "export const C = styled.textarea`resize: none;`;",
    ].join("\n");
    expect(findRawControls(source)).toEqual([
      { exportName: "A", tag: "input" },
      { exportName: "B", tag: "select" },
      { exportName: "C", tag: "textarea" },
    ]);
  });

  it("sees through a generic props parameter and attrs", () => {
    const source = [
      "export const Chip = styled.button<{ $on: boolean }>`",
      "  color: red;",
      "`;",
      'export const File = styled.input.attrs({ type: "file" })`',
      "  display: none;",
      "`;",
    ].join("\n");
    expect(findRawControls(source)).toEqual([
      { exportName: "Chip", tag: "button" },
      { exportName: "File", tag: "input" },
    ]);
  });

  it('names the call form styled("button")', () => {
    const source = 'export const Go = styled("button")`color: red;`;';
    expect(findRawControls(source)).toEqual([
      { exportName: "Go", tag: "button" },
    ]);
  });

  it("ignores non-control elements and composed primitives", () => {
    const source = [
      "export const Row = styled.div`display: flex;`;",
      "export const Label = styled.label`font-weight: 600;`;",
      "export const Wide = styled(Button)`width: 100%;`;",
      "export const Field = styled(Input)`flex: 1;`;",
    ].join("\n");
    expect(findRawControls(source)).toEqual([]);
  });
});

describe("findConformanceViolations", () => {
  const allowlist: readonly ConformanceAllowlistEntry[] = [
    {
      file: "features/settings/Thing/Thing.styles.ts",
      exportName: "HiddenFileInput",
      reason: "hidden file input",
    },
  ];

  it("flags an unlisted raw button", () => {
    const modules = {
      "features/foo/Foo/Foo.styles.ts":
        "export const StyledGo = styled.button`color: red;`;",
    };
    expect(findConformanceViolations(modules, allowlist)).toEqual([
      {
        file: "features/foo/Foo/Foo.styles.ts",
        exportName: "StyledGo",
        tag: "button",
      },
    ]);
  });

  it("flags an unlisted raw input", () => {
    const modules = {
      "components/Bar/Bar.styles.ts":
        "export const StyledField = styled.input`border: 0;`;",
    };
    expect(findConformanceViolations(modules, allowlist)).toEqual([
      {
        file: "components/Bar/Bar.styles.ts",
        exportName: "StyledField",
        tag: "input",
      },
    ]);
  });

  it("passes an allowlisted raw control", () => {
    const modules = {
      "features/settings/Thing/Thing.styles.ts":
        "export const HiddenFileInput = styled.input`display: none;`;",
    };
    expect(findConformanceViolations(modules, allowlist)).toEqual([]);
  });

  it("does not let an entry cover the same export name in another module", () => {
    const modules = {
      "features/other/Other/Other.styles.ts":
        "export const HiddenFileInput = styled.input`display: none;`;",
    };
    expect(findConformanceViolations(modules, allowlist)).toHaveLength(1);
  });

  it("passes a module with no raw controls", () => {
    const modules = {
      "layouts/Shell/Shell.styles.ts": "export const Root = styled.div``;",
    };
    expect(findConformanceViolations(modules, allowlist)).toEqual([]);
  });
});

describe("findStaleAllowlistEntries", () => {
  const entry: ConformanceAllowlistEntry = {
    file: "features/settings/Thing/Thing.styles.ts",
    exportName: "HiddenFileInput",
    reason: "hidden file input",
  };

  it("reports an entry whose control has moved onto a primitive", () => {
    const modules = {
      "features/settings/Thing/Thing.styles.ts":
        "export const HiddenFileInput = styled(Input)``;",
    };
    expect(findStaleAllowlistEntries(modules, [entry])).toEqual([entry]);
  });

  it("reports an entry whose module no longer exists", () => {
    expect(findStaleAllowlistEntries({}, [entry])).toEqual([entry]);
  });

  it("keeps an entry whose raw control is still there", () => {
    const modules = {
      "features/settings/Thing/Thing.styles.ts":
        "export const HiddenFileInput = styled.input`display: none;`;",
    };
    expect(findStaleAllowlistEntries(modules, [entry])).toEqual([]);
  });
});
