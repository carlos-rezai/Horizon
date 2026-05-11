---
name: Horizon Digital Financial
colors:
  surface: "#10131a"
  surface-dim: "#10131a"
  surface-bright: "#363941"
  surface-container-lowest: "#0b0e15"
  surface-container-low: "#191b23"
  surface-container: "#1d2027"
  surface-container-high: "#272a31"
  surface-container-highest: "#32353c"
  on-surface: "#e1e2ec"
  on-surface-variant: "#c2c6d6"
  inverse-surface: "#e1e2ec"
  inverse-on-surface: "#2e3038"
  outline: "#8c909f"
  outline-variant: "#424754"
  surface-tint: "#adc6ff"
  primary: "#adc6ff"
  on-primary: "#002e6a"
  primary-container: "#4d8eff"
  on-primary-container: "#00285d"
  inverse-primary: "#005ac2"
  secondary: "#4edea3"
  on-secondary: "#003824"
  secondary-container: "#00a572"
  on-secondary-container: "#00311f"
  tertiary: "#ffb786"
  on-tertiary: "#502400"
  tertiary-container: "#df7412"
  on-tertiary-container: "#461f00"
  error: "#ffb4ab"
  on-error: "#690005"
  error-container: "#93000a"
  on-error-container: "#ffdad6"
  primary-fixed: "#d8e2ff"
  primary-fixed-dim: "#adc6ff"
  on-primary-fixed: "#001a42"
  on-primary-fixed-variant: "#004395"
  secondary-fixed: "#6ffbbe"
  secondary-fixed-dim: "#4edea3"
  on-secondary-fixed: "#002113"
  on-secondary-fixed-variant: "#005236"
  tertiary-fixed: "#ffdcc6"
  tertiary-fixed-dim: "#ffb786"
  on-tertiary-fixed: "#311400"
  on-tertiary-fixed-variant: "#723600"
  background: "#10131a"
  on-background: "#e1e2ec"
  surface-variant: "#32353c"
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: "700"
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: "600"
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 32px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: "400"
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  data-mono-lg:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: "500"
    lineHeight: 24px
    letterSpacing: -0.02em
  data-mono-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: "500"
    lineHeight: 20px
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: "700"
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is built on a philosophy of **Precision Minimalism**. It is designed for a high-net-worth demographic that demands clarity, speed, and institutional-grade reliability. The visual language conveys a sense of calm authority through a "Control Center" aesthetic—where data is dense but never cluttered.

The style leverages a **Modern Corporate** approach with subtle **Tactile** cues. It avoids unnecessary ornamentation, instead using light and depth to guide the user's focus toward equity, growth, and financial milestones. The emotional response is one of confidence and clear-eyed oversight.

## Colors

The palette is rooted in a **Deep Charcoal ecosystem** to reduce eye strain during extended analytical sessions.

- **Primary Blue (#3B82F6):** Reserved strictly for primary actions, progress indicators, and active states.
- **Surface Strategy:** Use `#1E293B` for primary card containers. For nested elements or hover states, use a 5% lighter tint to maintain a logical hierarchical stack.
- **Semantic Accents:**
  - **Emerald:** Indicates value increase, completed deposits, or surplus.
  - **Rose:** Indicates debt, outgoing payments, or budget overages.
  - **Gold:** Reserved for "Payoff" achievements—specifically for mortgages or long-term loan completions.
- **Border Treatment:** Use `#334155` for subtle, low-contrast borders to define edges without adding visual weight.

## Typography

The typography system uses a dual-font approach to separate narrative content from financial data.

**Hanken Grotesk** provides a contemporary, sharp feel for interface labels and headings. It feels engineered rather than drawn, fitting the financial context.

**JetBrains Mono** is utilized for all numerical values, account numbers, and currency symbols. Monospaced alignment ensures that digits line up perfectly in tables and lists, allowing users to scan vertical columns of numbers to compare magnitudes instantly.

**Mobile Scaling:** Headlines above 32px should scale down to 28px on mobile devices to prevent excessive line-breaking.

## Layout & Spacing

This design system utilizes an **8px grid system** for layout and a **4px baseline** for typography and small components.

- **Desktop (1440px+):** 12-column fluid grid. 24px margins. 16px gutters. Max-width container of 1280px for core dashboard views.
- **Tablet (768px - 1023px):** 8-column grid. 20px margins. 16px gutters.
- **Mobile (Under 767px):** 4-column grid. 16px margins. 12px gutters.

The layout philosophy emphasizes **Data Density**. Information is grouped into logical card modules. Use `stack-lg` (32px) to separate major sections like "Account Overview" and "Recent Transactions," while using `stack-sm` (8px) for internal card elements like labels and their corresponding values.

## Elevation & Depth

Depth is created through **Tonal Layering** and **Subtle Inner Glows** rather than heavy drop shadows.

1.  **Level 0 (Base):** Background `#0F172A`.
2.  **Level 1 (Cards):** Surface `#1E293B` with a 1px border of `#334155`.
3.  **Level 2 (Popovers/Modals):** Surface `#2D3748` with a diffused shadow: `0px 10px 25px -5px rgba(0, 0, 0, 0.5)`.

To achieve a premium feel, cards should have a very subtle `1px` top-stroke (inner shadow or border) that is slightly lighter than the card face, simulating a top-down light source catching the edge.

## Shapes

The shape language is defined by **Soft Geometricism**.

- **Standard Cards & Sections:** 12px radius (`rounded-lg`).
- **Buttons & Input Fields:** 8px radius (`rounded-md`).
- **Interactive Tags/Chips:** Fully rounded (pill-shaped) for high-contrast differentiation against rectangular data cells.

This curvature balances the "technical" feel of the monospaced numbers with a "human-centric" approachability.

## Components

- **Buttons:** Primary buttons use a solid `#3B82F6` fill with white text. Secondary buttons use a transparent fill with a `#334155` border. All buttons should have a `transition: all 0.2s ease` on hover, slightly increasing the border brightness.
- **Inputs:** Dark backgrounds (`#0F172A`) with a 1px border. On focus, the border transitions to Primary Blue with a subtle 2px outer glow.
- **Cards:** Financial cards should include a "Summary" area at the top using `headline-sm` and a "Details" area below using `data-mono-md`.
- **Progress Bars:** Thin (4px height) bars. Use Emerald for positive goals (savings) and Gold for "Payoff" milestones.
- **Data Tables:** Row-based layouts with no vertical dividers. Use a 1px bottom border for each row. Alternating row stripes are not necessary; use hover highlights (`#2D3748`) instead for tracking.
- **Status Chips:** High-contrast background tints (15% opacity of the accent color) with 100% opacity text of the same color for maximum legibility.
