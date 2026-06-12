const fontFamily = {
  ui: "'Space Grotesk', system-ui, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
};

// Prototype role scale (docs/handoff tokens.js `T.type`). UI roles use
// Space Grotesk; mono roles use IBM Plex Mono. All figures render with
// `font-variant-numeric: tabular-nums` so columns align.
const scale = {
  displayLg: {
    fontFamily: fontFamily.ui,
    fontSize: "44px",
    fontWeight: 600,
    lineHeight: "48px",
    letterSpacing: "-0.02em",
  },
  display: {
    fontFamily: fontFamily.ui,
    fontSize: "32px",
    fontWeight: 600,
    lineHeight: "38px",
    letterSpacing: "-0.018em",
  },
  h1: {
    fontFamily: fontFamily.ui,
    fontSize: "24px",
    fontWeight: 600,
    lineHeight: "30px",
    letterSpacing: "-0.01em",
  },
  h2: {
    fontFamily: fontFamily.ui,
    fontSize: "18px",
    fontWeight: 600,
    lineHeight: "24px",
    letterSpacing: "-0.005em",
  },
  body: {
    fontFamily: fontFamily.ui,
    fontSize: "14px",
    fontWeight: 400,
    lineHeight: "20px",
  },
  bodyMd: {
    fontFamily: fontFamily.ui,
    fontSize: "15px",
    fontWeight: 450,
    lineHeight: "22px",
  },
  label: {
    fontFamily: fontFamily.ui,
    fontSize: "11px",
    fontWeight: 600,
    lineHeight: "14px",
    letterSpacing: "0.10em",
    textTransform: "uppercase" as const,
  },
  monoLg: {
    fontFamily: fontFamily.mono,
    fontSize: "30px",
    fontWeight: 500,
    lineHeight: "34px",
    letterSpacing: "-0.02em",
  },
  monoMd: {
    fontFamily: fontFamily.mono,
    fontSize: "14px",
    fontWeight: 500,
    lineHeight: "20px",
    letterSpacing: "-0.01em",
  },
  monoSm: {
    fontFamily: fontFamily.mono,
    fontSize: "12px",
    fontWeight: 500,
    lineHeight: "16px",
  },
};

export const typography = {
  fontFamily,
  fontVariantNumeric: "tabular-nums",
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
  },
  scale,
};
