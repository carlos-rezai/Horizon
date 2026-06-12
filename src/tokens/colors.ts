import type { AccountKind } from "../types/account";

// ─────────────────────────────────────────────────────────────────────────
// Horizon palette — gold-on-ink (canonical prototype, docs/handoff).
// The MD3 token *vocabulary* is preserved so existing consumers keep
// compiling; only the *values* are remapped onto the ink palette, and new
// gradation keys MD3 lacks are added. See ./MAPPING.md for the ink↔MD3 table.
// ─────────────────────────────────────────────────────────────────────────

export const chartColors: Record<AccountKind, string> = {
  Girokonto: "#7FA7D9", // steel
  Tagesgeld: "#74C29B", // sage
  Mortgage: "#CE8278", // rose / debt
  CreditCard: "#5FB8C0", // teal
  Investment: "#B79CE0", // lilac
};

// The prototype's 10-swatch muted set (distinct on dark, in order).
export const accountColorPalette: string[] = [
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
];

export const colors = {
  // Primary = horizon gold (accent).
  primary: "#E6B559",
  onPrimary: "#1A1306",
  primaryContainer: "rgba(230,181,89,0.16)", // accentDim
  onPrimaryContainer: "#F4CC74", // accentBright

  // Secondary = growth/positive (sage).
  secondary: "#74C29B",
  onSecondary: "#0E1F18",
  secondaryContainer: "rgba(116,194,155,0.14)", // posDim
  onSecondaryContainer: "#74C29B",

  // Tertiary = caution (clay/amber, distinct from brand gold).
  tertiary: "#E0A86B",
  onTertiary: "#2A1B0A",
  tertiaryContainer: "rgba(224,168,107,0.14)", // warnDim
  onTertiaryContainer: "#E0A86B",

  // Error = debt/outflow (rose).
  error: "#CE8278",
  onError: "#2A0F0C",
  errorContainer: "rgba(206,130,120,0.14)", // negDim
  onErrorContainer: "#CE8278",

  // Cool-ink surface ladder (tonal elevation, lowest → highest).
  surface: "#111419", // ink1 — content background
  onSurface: "#ECEEF2", // text
  onSurfaceVariant: "#9BA3B0", // textMuted
  surfaceContainerLowest: "#0C0E12", // ink0
  surfaceContainerLow: "#111419", // ink1
  surfaceContainer: "#161A21", // ink2
  surfaceContainerHigh: "#1C212A", // ink3
  surfaceContainerHighest: "#2B333F", // ink5
  surfaceTint: "#E6B559",
  surfaceBright: "#2B333F", // ink5
  surfaceDim: "#0C0E12", // ink0
  surfaceVariant: "#1C212A", // ink3

  // Hairline borders.
  outline: "rgba(255,255,255,0.12)", // lineStrong
  outlineVariant: "rgba(255,255,255,0.07)", // line

  background: "#0C0E12", // ink0 — app base
  onBackground: "#ECEEF2",
  inverseSurface: "#ECEEF2",
  inverseOnSurface: "#111419",
  inversePrimary: "#8A6D2E",

  primaryFixed: "#F4CC74",
  primaryFixedDim: "#E6B559",
  onPrimaryFixed: "#1A1306",
  onPrimaryFixedVariant: "#3D2F11",
  secondaryFixed: "#9BD9BB",
  secondaryFixedDim: "#74C29B",
  onSecondaryFixed: "#0E1F18",
  onSecondaryFixedVariant: "#2C5141",
  tertiaryFixed: "#F0C79B",
  tertiaryFixedDim: "#E0A86B",
  onTertiaryFixed: "#2A1B0A",
  onTertiaryFixedVariant: "#5E4423",

  // Restschuld line stroke = debt tone.
  restschuldStrokeColor: "#CE8278",

  // Surface-overlay tints.
  primaryTint: "rgba(230,181,89,0.16)",
  secondaryTint: "rgba(116,194,155,0.14)",
  errorTint: "rgba(206,130,120,0.14)",
  tertiaryTint: "rgba(224,168,107,0.14)",
  surfaceVariantTint: "rgba(255,255,255,0.07)",
  overlay: "rgba(0, 0, 0, 0.6)",

  // ── New gradation keys MD3 lacks (named accents, extra tones) ──
  accentBright: "#F4CC74",
  accentLine: "rgba(230,181,89,0.30)",
  onSurfaceDim: "#646C7A", // textDim — extends the text scale
  onSurfaceFaint: "#454C58", // textFaint
  lineFaint: "rgba(255,255,255,0.04)", // faintest hairline
  info: "#7FA7D9", // steel
  infoDim: "rgba(127,167,217,0.14)",
  warn: "#E0A86B", // clay
  warnDim: "rgba(224,168,107,0.14)",

  // ── Data-viz line roles ──
  liquid: "#E6B559", // Total Liquid (the protagonist) = accent
  debt: "#CE8278", // Restschuld
  flow: "#7C93B4", // Net Cashflow (secondary, cool)

  chartColors,
  accountColorPalette,
};
