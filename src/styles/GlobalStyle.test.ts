import { describe, it, expect } from "vitest";
import { theme } from "../tokens";

// Read as source rather than asserted through the DOM: `createGlobalStyle`
// injects nothing observable under jsdom, so there is no rendered CSS to
// inspect. `?raw` reaches a .ts file (unlike a stylesheet, which Vitest blanks
// with CSS processing off).
const globalStyleSource = Object.values(
  import.meta.glob("./GlobalStyle.ts", {
    query: "?raw",
    import: "default",
    eager: true,
  })
)[0] as string;

/**
 * The prototype styles scrollbars globally ("thin, quiet" —
 * `docs/handoff/prototype/styles.css`). Without this every scrolling surface
 * falls back to the native OS scrollbar, which is what the Import review step
 * exposed (#207).
 */
describe("GlobalStyle — scrollbars", () => {
  it("styles the scrollbar rather than leaving the native one", () => {
    expect(globalStyleSource).toContain("::-webkit-scrollbar");
  });

  it("draws the thumb and its hover from the ink ladder", () => {
    expect(globalStyleSource).toContain("colors.surfaceContainerHigher");
    expect(globalStyleSource).toContain("colors.surfaceContainerHighest");
  });

  it("hardcodes no colour in the scrollbar rules", () => {
    const scrollbarRules = globalStyleSource.slice(
      globalStyleSource.indexOf("::-webkit-scrollbar")
    );

    expect(scrollbarRules).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(scrollbarRules).not.toMatch(/rgba?\(/i);
  });

  it("leaves the track transparent, so only the thumb reads", () => {
    expect(globalStyleSource).toMatch(
      /::-webkit-scrollbar-track\s*{\s*background:\s*transparent/
    );
  });

  it("insets the thumb rather than letting it fill the gutter", () => {
    // The transparent border plus content-box clip is what makes it float.
    expect(globalStyleSource).toContain("background-clip: content-box");
    expect(globalStyleSource).toContain("border: 3px solid transparent");
  });

  it("keeps the ink4 rung available as a real token", () => {
    expect(theme.colors.surfaceContainerHigher).toBe("#232A34");
  });
});
