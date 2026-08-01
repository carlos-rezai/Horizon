/* ============================================================
   HORIZON — Design Tokens  (Meridian, refined)
   Precision-instrument dark theme · one signature accent.
   Plain JS: exposes window.T  (and mirrors CSS vars in styles.css)
   ============================================================ */
(function () {
  const color = {
    /* Cool-ink surface ladder (tonal elevation, not shadows) */
    ink0: "#0C0E12", // app base (behind the shell)
    ink1: "#111419", // content background
    ink2: "#161A21", // card surface (Level 1)
    ink3: "#1C212A", // raised / hover / nested
    ink4: "#232A34", // modal / popover (Level 2)
    ink5: "#2B333F", // highest

    /* Hairline borders */
    line: "rgba(255,255,255,0.07)",
    lineStrong: "rgba(255,255,255,0.12)",
    lineFaint: "rgba(255,255,255,0.04)",

    /* Text */
    text: "#ECEEF2",
    textMuted: "#9BA3B0",
    textDim: "#646C7A",
    textFaint: "#454C58",

    /* Signature accent — "horizon gold". Payoff + Freedom + primary. */
    accent: "#E6B559",
    accentBright: "#F4CC74",
    accentDim: "rgba(230,181,89,0.16)",
    accentLine: "rgba(230,181,89,0.30)",
    onAccent: "#1A1306",

    /* Quiet semantics */
    pos: "#74C29B", // growth / liquid / positive delta / success
    posDim: "rgba(116,194,155,0.14)",
    neg: "#CE8278", // debt / outflow / negative delta / error
    negDim: "rgba(206,130,120,0.14)",
    info: "#7FA7D9", // informational (steel)
    infoDim: "rgba(127,167,217,0.14)",
    warn: "#E0A86B", // caution (clay/amber, distinct from brand gold)
    warnDim: "rgba(224,168,107,0.14)",

    /* Data-viz line roles */
    liquid: "#E6B559", // Total Liquid (the protagonist) = accent
    debt: "#CE8278", // Restschuld
    flow: "#7C93B4", // Net Cashflow (secondary, cool)
  };

  /* Curated account-color palette (muted, distinct on dark) */
  const accountColorPalette = [
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

  /* Deterministic per-kind chart/identity colors */
  const kindColor = {
    Girokonto: "#7FA7D9",
    Tagesgeld: "#74C29B",
    Mortgage: "#CE8278",
    CreditCard: "#5FB8C0",
    Investment: "#B79CE0",
  };

  const font = {
    ui: "'Space Grotesk', system-ui, sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, monospace",
  };

  /* Type scale */
  const type = {
    displayLg: {
      fontFamily: font.ui,
      fontSize: "44px",
      fontWeight: 600,
      lineHeight: "48px",
      letterSpacing: "-0.02em",
    },
    display: {
      fontFamily: font.ui,
      fontSize: "32px",
      fontWeight: 600,
      lineHeight: "38px",
      letterSpacing: "-0.018em",
    },
    h1: {
      fontFamily: font.ui,
      fontSize: "24px",
      fontWeight: 600,
      lineHeight: "30px",
      letterSpacing: "-0.01em",
    },
    h2: {
      fontFamily: font.ui,
      fontSize: "18px",
      fontWeight: 600,
      lineHeight: "24px",
      letterSpacing: "-0.005em",
    },
    body: {
      fontFamily: font.ui,
      fontSize: "14px",
      fontWeight: 400,
      lineHeight: "20px",
    },
    bodyMd: {
      fontFamily: font.ui,
      fontSize: "15px",
      fontWeight: 450,
      lineHeight: "22px",
    },
    label: {
      fontFamily: font.ui,
      fontSize: "11px",
      fontWeight: 600,
      lineHeight: "14px",
      letterSpacing: "0.10em",
      textTransform: "uppercase",
    },
    monoLg: {
      fontFamily: font.mono,
      fontSize: "30px",
      fontWeight: 500,
      lineHeight: "34px",
      letterSpacing: "-0.02em",
    },
    monoMd: {
      fontFamily: font.mono,
      fontSize: "14px",
      fontWeight: 500,
      lineHeight: "20px",
      letterSpacing: "-0.01em",
    },
    monoSm: {
      fontFamily: font.mono,
      fontSize: "12px",
      fontWeight: 500,
      lineHeight: "16px",
    },
  };

  const radius = {
    sm: "6px",
    md: "8px",
    lg: "10px",
    xl: "14px",
    pill: "999px",
  };

  const space = (n) => `${n * 4}px`;

  window.T = {
    color,
    accountColorPalette,
    kindColor,
    font,
    type,
    radius,
    space,
  };
})();
