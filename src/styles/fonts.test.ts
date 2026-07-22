import { describe, it, expect } from "vitest";

// Read through Vite rather than the filesystem, so the test sees what the
// bundler sees. `main.tsx` is not CSS, so `?raw` reaches its source; a raw
// import of the stylesheet itself would come back empty, because Vitest runs
// with CSS processing off.
const entrySource = Object.values(
  import.meta.glob("../main.tsx", {
    query: "?raw",
    import: "default",
    eager: true,
  })
)[0] as string;

const stylesheets = Object.keys(import.meta.glob("./fonts.css"));

/**
 * The font faces have to ship in a static stylesheet the entry imports, rather
 * than in a `createGlobalStyle`. Declared at runtime they cost a style
 * injection at mount and are not discoverable until the bundle has evaluated —
 * worth about 100ms of Dashboard LCP when measured (issue #206).
 */
describe("font faces", () => {
  it("ships as a static stylesheet", () => {
    expect(stylesheets).toHaveLength(1);
  });

  it("is imported by the entry module, so it lands in the entry CSS", () => {
    expect(entrySource).toContain('import "./styles/fonts.css"');
  });

  it("declares no font face at runtime", () => {
    // `createGlobalStyle` injects only once React has mounted, which is the
    // late discovery this arrangement exists to avoid.
    expect(entrySource).not.toContain("Fonts");
  });
});
