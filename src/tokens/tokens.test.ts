import { describe, it, expect } from "vitest";
import { theme, accountIconSet } from "./index";
import type { AccountKind } from "../types/account";

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

describe("theme.colors — MD3 token keys", () => {
  const md3Keys = [
    "primary",
    "onPrimary",
    "primaryContainer",
    "onPrimaryContainer",
    "surface",
    "onSurface",
    "surfaceContainerHigh",
    "surfaceContainerHighest",
    "outline",
    "outlineVariant",
    "error",
    "onError",
  ];

  md3Keys.forEach((key) => {
    it(`exports the "${key}" MD3 colour key`, () => {
      expect(theme.colors).toHaveProperty(key);
    });
  });

  it("old Meridian key 'bgBase' is no longer present", () => {
    expect(theme.colors).not.toHaveProperty("bgBase");
  });
});

describe("theme.colors.chartColors — AccountKind coverage", () => {
  const allKinds: AccountKind[] = [
    "Girokonto",
    "Tagesgeld",
    "Mortgage",
    "CreditCard",
    "Investment",
  ];

  it("chartColors is defined on theme.colors", () => {
    expect(theme.colors).toHaveProperty("chartColors");
  });

  allKinds.forEach((kind) => {
    it(`chartColors has a colour entry for "${kind}"`, () => {
      expect(theme.colors.chartColors).toHaveProperty(kind);
    });
  });

  it("chartColors has exactly 5 entries (one per AccountKind)", () => {
    expect(Object.keys(theme.colors.chartColors)).toHaveLength(5);
  });
});

describe("theme.colors.accountColorPalette", () => {
  it("is defined on theme.colors", () => {
    expect(theme.colors).toHaveProperty("accountColorPalette");
  });

  it("has exactly 10 entries", () => {
    expect(theme.colors.accountColorPalette).toHaveLength(10);
  });
});

describe("accountIconSet named export", () => {
  it("is exported from the tokens module", () => {
    expect(accountIconSet).toBeDefined();
  });

  it("has exactly 8 entries", () => {
    expect(accountIconSet).toHaveLength(8);
  });
});

describe("theme.radius — redesign tokens", () => {
  it("card radius is 12", () => {
    expect(theme.radius.card).toBe(12);
  });

  it("button radius is 8", () => {
    expect(theme.radius.button).toBe(8);
  });

  it("badge radius is 9999", () => {
    expect(theme.radius.badge).toBe(9999);
  });
});

describe("theme.typography — font families", () => {
  it("fontFamily.ui includes Hanken Grotesk", () => {
    expect(theme.typography.fontFamily.ui).toContain("Hanken Grotesk");
  });

  it("fontFamily.mono includes JetBrains Mono", () => {
    expect(theme.typography.fontFamily.mono).toContain("JetBrains Mono");
  });
});

describe("theme.layout — content max-width", () => {
  it("contentMaxWidth is 1200", () => {
    expect(theme.layout.contentMaxWidth).toBe(1200);
  });
});
