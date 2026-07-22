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

  it("has exactly 10 entries (the prototype's muted swatch set)", () => {
    expect(theme.colors.accountColorPalette).toHaveLength(10);
  });

  it("is exactly the prototype's 10-swatch muted set, in order", () => {
    expect(theme.colors.accountColorPalette).toEqual([
      "#7FA7D9", // steel
      "#74C29B", // sage
      "#C9897F", // rose
      "#B79CE0", // lilac
      "#E0A86B", // clay
      "#5FB8C0", // teal
      "#C7AE57", // ochre
      "#909AAE", // slate
      "#D08AB0", // pink
      "#9FBF6F", // olive
    ]);
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
  it("fontFamily.ui includes Space Grotesk", () => {
    expect(theme.typography.fontFamily.ui).toContain("Space Grotesk");
  });

  it("fontFamily.mono includes IBM Plex Mono", () => {
    expect(theme.typography.fontFamily.mono).toContain("IBM Plex Mono");
  });
});

describe("theme.layout — content max-width", () => {
  it("contentMaxWidth is 1200", () => {
    expect(theme.layout.contentMaxWidth).toBe(1200);
  });
});

// ─────────────────────────────────────────────────────────────
// Issue #123 — Token & font re-palette (gold-on-ink prototype)
// The MD3 vocabulary is kept; only the values are remapped and new
// gradation keys are added. ink↔MD3 mapping: docs/handoff prototype
// tokens.js is the source of truth for every value asserted below.
// ─────────────────────────────────────────────────────────────

describe("theme.colors — remapped to the gold/ink prototype palette", () => {
  it("primary is horizon gold (accent #E6B559)", () => {
    expect(theme.colors.primary).toBe("#E6B559");
  });

  it("onPrimary is the dark ink-on-gold tone (#1A1306)", () => {
    expect(theme.colors.onPrimary).toBe("#1A1306");
  });

  it("primaryContainer is the dim gold wash (accentDim)", () => {
    expect(theme.colors.primaryContainer).toBe("rgba(230,181,89,0.16)");
  });

  it("surface ladder spans ink0 (lowest) to ink5 (highest)", () => {
    expect(theme.colors.surfaceContainerLowest).toBe("#0C0E12");
    expect(theme.colors.surfaceContainerHighest).toBe("#2B333F");
  });

  it("carries every rung of the ink ladder, with no gap between ink3 and ink5", () => {
    // The prototype's ladder has six steps; ink4 was the one the theme never
    // encoded, which left the scrollbar thumb with no token to use (#207).
    expect([
      theme.colors.surfaceContainerLowest,
      theme.colors.surfaceContainerLow,
      theme.colors.surfaceContainer,
      theme.colors.surfaceContainerHigh,
      theme.colors.surfaceContainerHigher,
      theme.colors.surfaceContainerHighest,
    ]).toEqual([
      "#0C0E12",
      "#111419",
      "#161A21",
      "#1C212A",
      "#232A34",
      "#2B333F",
    ]);
  });

  it("onSurface text tones map to the ink text scale", () => {
    expect(theme.colors.onSurface).toBe("#ECEEF2");
    expect(theme.colors.onSurfaceVariant).toBe("#9BA3B0");
  });

  it("outline/outlineVariant map to the hairline line tones", () => {
    expect(theme.colors.outlineVariant).toBe("rgba(255,255,255,0.07)");
    expect(theme.colors.outline).toBe("rgba(255,255,255,0.12)");
  });

  it("secondary re-tints to pos (#74C29B) and error to neg (#CE8278)", () => {
    expect(theme.colors.secondary).toBe("#74C29B");
    expect(theme.colors.error).toBe("#CE8278");
  });
});

describe("theme.colors — new gradation keys MD3 lacks", () => {
  const newKeys = [
    "accentBright",
    "accentLine",
    "onSurfaceDim",
    "onSurfaceFaint",
    "lineFaint",
    "info",
    "warn",
    "infoDim",
    "warnDim",
  ];

  newKeys.forEach((key) => {
    it(`exports the new "${key}" colour key`, () => {
      expect(theme.colors).toHaveProperty(key);
    });
  });

  it("accentBright is the lighter gold (#F4CC74)", () => {
    expect(theme.colors.accentBright).toBe("#F4CC74");
  });

  it("accentLine is the gold hairline (rgba 0.30)", () => {
    expect(theme.colors.accentLine).toBe("rgba(230,181,89,0.30)");
  });

  it("onSurfaceDim / onSurfaceFaint extend the text scale", () => {
    expect(theme.colors.onSurfaceDim).toBe("#646C7A");
    expect(theme.colors.onSurfaceFaint).toBe("#454C58");
  });

  it("lineFaint is the faintest hairline (rgba 0.04)", () => {
    expect(theme.colors.lineFaint).toBe("rgba(255,255,255,0.04)");
  });

  it("info is steel (#7FA7D9) and warn is clay (#E0A86B)", () => {
    expect(theme.colors.info).toBe("#7FA7D9");
    expect(theme.colors.warn).toBe("#E0A86B");
  });
});

describe("theme.colors — data-viz line roles", () => {
  it("liquid is the gold Total-Liquid protagonist line (#E6B559)", () => {
    expect(theme.colors.liquid).toBe("#E6B559");
  });

  it("debt is the Restschuld line (#CE8278)", () => {
    expect(theme.colors.debt).toBe("#CE8278");
  });

  it("flow is the cool Net-Cashflow line (#7C93B4)", () => {
    expect(theme.colors.flow).toBe("#7C93B4");
  });
});

describe("theme.colors.chartColors — re-paletted per AccountKind", () => {
  it("maps each kind to the prototype's muted identity colour", () => {
    expect(theme.colors.chartColors).toEqual({
      Girokonto: "#7FA7D9",
      Tagesgeld: "#74C29B",
      Mortgage: "#CE8278",
      CreditCard: "#5FB8C0",
      Investment: "#B79CE0",
    });
  });
});

describe("theme.radius — prototype radius scale", () => {
  it("sm is 6", () => {
    expect(theme.radius.sm).toBe(6);
  });

  it("md is 8", () => {
    expect(theme.radius.md).toBe(8);
  });

  it("lg is 10", () => {
    expect(theme.radius.lg).toBe(10);
  });

  it("xl is 14", () => {
    expect(theme.radius.xl).toBe(14);
  });

  it("pill is 999", () => {
    expect(theme.radius.pill).toBe(999);
  });
});

describe("theme.space — n*4px helper", () => {
  it("is a function", () => {
    expect(typeof theme.space).toBe("function");
  });

  it("space(1) is '4px'", () => {
    expect(theme.space(1)).toBe("4px");
  });

  it("space(4) is '16px'", () => {
    expect(theme.space(4)).toBe("16px");
  });

  it("space(6) is '24px'", () => {
    expect(theme.space(6)).toBe("24px");
  });
});

describe("theme.typography — tabular figures", () => {
  it("exposes fontVariantNumeric set to tabular-nums", () => {
    expect(theme.typography.fontVariantNumeric).toBe("tabular-nums");
  });
});

// ─────────────────────────────────────────────────────────────
// Issue #205 — Motion tokens
// Transitions are restrained and targeted: one duration in the agreed
// 150–200ms band and one easing curve, so the data-swap cross-fade, the
// skeleton→content fade and the accordion expand all move the same way
// instead of each style file inventing its own timing.
// ─────────────────────────────────────────────────────────────

describe("theme.transitions — motion tokens", () => {
  it("exposes a swap duration inside the agreed 150–200ms band", () => {
    expect(theme.transitions.swapDuration).toMatch(/^\d+ms$/);

    const ms = parseFloat(theme.transitions.swapDuration);
    expect(ms).toBeGreaterThanOrEqual(150);
    expect(ms).toBeLessThanOrEqual(200);
  });

  it("exposes an eased curve rather than a linear or instant one", () => {
    expect(theme.transitions.easing).toMatch(/^cubic-bezier\(/);
    expect(theme.transitions.easing).not.toBe("linear");
  });

  it("composes the duration and the easing into one swap shorthand", () => {
    expect(theme.transitions.swap).toBe(
      `${theme.transitions.swapDuration} ${theme.transitions.easing}`
    );
  });
});

describe("theme.typography.scale — prototype role scale", () => {
  const roleKeys = [
    "displayLg",
    "display",
    "h1",
    "h2",
    "body",
    "bodyMd",
    "label",
    "monoLg",
    "monoMd",
    "monoSm",
  ];

  it("scale is defined on theme.typography", () => {
    expect(theme.typography).toHaveProperty("scale");
  });

  roleKeys.forEach((key) => {
    it(`scale exports the "${key}" role`, () => {
      expect(theme.typography.scale).toHaveProperty(key);
    });
  });

  it("font sizes match the prototype scale", () => {
    expect(theme.typography.scale.displayLg.fontSize).toBe("44px");
    expect(theme.typography.scale.display.fontSize).toBe("32px");
    expect(theme.typography.scale.h1.fontSize).toBe("24px");
    expect(theme.typography.scale.h2.fontSize).toBe("18px");
    expect(theme.typography.scale.body.fontSize).toBe("14px");
    expect(theme.typography.scale.bodyMd.fontSize).toBe("15px");
    expect(theme.typography.scale.label.fontSize).toBe("11px");
    expect(theme.typography.scale.monoLg.fontSize).toBe("30px");
    expect(theme.typography.scale.monoMd.fontSize).toBe("14px");
    expect(theme.typography.scale.monoSm.fontSize).toBe("12px");
  });

  it("UI roles use Space Grotesk, mono roles use IBM Plex Mono", () => {
    expect(theme.typography.scale.displayLg.fontFamily).toContain(
      "Space Grotesk"
    );
    expect(theme.typography.scale.monoLg.fontFamily).toContain("IBM Plex Mono");
  });

  it("the label role is an uppercase overline", () => {
    expect(theme.typography.scale.label.textTransform).toBe("uppercase");
  });
});
