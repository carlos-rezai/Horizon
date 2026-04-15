import { describe, it, expect } from "vitest";
import { theme } from "./index";

// Token layer tests verify the shape and rules of the Meridian design
// system token object. These are plain TypeScript — no React, no jsdom.
// The unit/interaction describe structure is not used here because
// there are no user events to test.

describe("theme — top-level shape", () => {
  it("exports a colors key", () => {
    expect(theme).toHaveProperty("colors");
  });

  it("exports a spacing key", () => {
    expect(theme).toHaveProperty("spacing");
  });

  it("exports a typography key", () => {
    expect(theme).toHaveProperty("typography");
  });

  it("exports a breakpoints key", () => {
    expect(theme).toHaveProperty("breakpoints");
  });
});

describe("theme.colors — semantic keys", () => {
  const requiredKeys = [
    "bgBase",
    "bgSurface",
    "bgElevated",
    "border",
    "textPrimary",
    "textMuted",
    "accent",
    "positive",
    "negative",
  ];

  requiredKeys.forEach((key) => {
    it(`exports the "${key}" colour key`, () => {
      expect(theme.colors).toHaveProperty(key);
    });
  });
});

describe("theme.spacing — 4px grid rule", () => {
  it("exports all 16 spacing steps (space1 through space16)", () => {
    for (let n = 1; n <= 16; n++) {
      expect(theme.spacing).toHaveProperty(`space${n}`);
    }
  });

  it("each step equals n × 4 (raw pixels as numbers)", () => {
    for (let n = 1; n <= 16; n++) {
      const key = `space${n}` as keyof typeof theme.spacing;
      expect(theme.spacing[key]).toBe(n * 4);
    }
  });
});

describe("theme.typography — size scale", () => {
  it("exports all six size keys (xs, sm, md, lg, xl, xxl)", () => {
    const keys = ["xs", "sm", "md", "lg", "xl", "xxl"];
    keys.forEach((key) => {
      expect(theme.typography.sizes).toHaveProperty(key);
    });
  });

  it("size scale matches the agreed values: 12/14/16/20/24/32", () => {
    expect(theme.typography.sizes.xs).toBe(12);
    expect(theme.typography.sizes.sm).toBe(14);
    expect(theme.typography.sizes.md).toBe(16);
    expect(theme.typography.sizes.lg).toBe(20);
    expect(theme.typography.sizes.xl).toBe(24);
    expect(theme.typography.sizes.xxl).toBe(32);
  });
});

describe("theme.breakpoints — values", () => {
  it("sm is 480", () => {
    expect(theme.breakpoints.sm).toBe(480);
  });

  it("md is 768", () => {
    expect(theme.breakpoints.md).toBe(768);
  });

  it("lg is 1024", () => {
    expect(theme.breakpoints.lg).toBe(1024);
  });
});

describe("theme.breakpoints — media query helpers", () => {
  it("up('sm') returns a min-width media query string for 480px", () => {
    expect(theme.breakpoints.up("sm")).toBe("@media (min-width: 480px)");
  });

  it("up('md') returns a min-width media query string for 768px", () => {
    expect(theme.breakpoints.up("md")).toBe("@media (min-width: 768px)");
  });

  it("up('lg') returns a min-width media query string for 1024px", () => {
    expect(theme.breakpoints.up("lg")).toBe("@media (min-width: 1024px)");
  });
});
