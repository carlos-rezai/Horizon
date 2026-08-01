/* ============================================================
   HORIZON — Primitives (atomic UI)
   Button · Chip · Badge · ProgressBar · Avatar · Input · Select
   Label · Spinner · Delta · Money
   ============================================================ */
const { T } = window;
const { Icon } = window;

/* ---- Label (caps) ---- */
function Label({ children, color, style }) {
  return (
    <div style={{ ...T.type.label, color: color || T.color.textDim, ...style }}>
      {children}
    </div>
  );
}

/* ---- Money (mono, tabular) ---- */
function Money({ cents, sign = false, size = "md", color, strong, style }) {
  const sz = { sm: T.type.monoSm, md: T.type.monoMd, lg: T.type.monoLg }[size];
  const neg = cents < 0;
  const c = color || (sign ? (neg ? T.color.neg : T.color.pos) : T.color.text);
  return (
    <span
      className="mono"
      style={{
        ...sz,
        color: c,
        fontWeight: strong ? 600 : sz.fontWeight,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {window.HZ.eurUnit(cents, { sign })}
    </span>
  );
}

/* ---- Delta pill (▲/▼ %) ---- */
function Delta({ value, suffix = "%", style }) {
  const pos = value >= 0;
  const c = pos ? T.color.pos : T.color.neg;
  return (
    <span
      className="mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        color: c,
        fontSize: 12,
        fontWeight: 600,
        background: pos ? T.color.posDim : T.color.negDim,
        padding: "2px 7px",
        borderRadius: T.radius.pill,
        letterSpacing: "-0.01em",
        ...style,
      }}
    >
      <Icon name={pos ? "arrowUpRight" : "arrowDown"} size={11} stroke={2.5} />
      {Math.abs(value).toLocaleString("de-DE", { maximumFractionDigits: 1 })}
      {suffix}
    </span>
  );
}

/* ---- Button ---- */
function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  full,
  onClick,
  disabled,
  style,
}) {
  const [h, setH] = React.useState(false);
  const sizes = {
    sm: { padding: "0 12px", height: 32, fontSize: 13 },
    md: { padding: "0 16px", height: 38, fontSize: 14 },
    lg: { padding: "0 20px", height: 44, fontSize: 15 },
  }[size];
  const variants = {
    primary: {
      background: h ? T.color.accentBright : T.color.accent,
      color: T.color.onAccent,
      border: "1px solid transparent",
      fontWeight: 600,
    },
    secondary: {
      background: h ? T.color.ink3 : "transparent",
      color: T.color.text,
      border: `1px solid ${h ? T.color.lineStrong : T.color.line}`,
      fontWeight: 500,
    },
    ghost: {
      background: h ? T.color.ink3 : "transparent",
      color: T.color.textMuted,
      border: "1px solid transparent",
      fontWeight: 500,
    },
    danger: {
      background: h ? "rgba(206,130,120,0.16)" : "transparent",
      color: T.color.neg,
      border: `1px solid ${h ? T.color.neg : "rgba(206,130,120,0.4)"}`,
      fontWeight: 500,
    },
  }[variant];
  return (
    <button
      className="focusable"
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        width: full ? "100%" : "auto",
        borderRadius: T.radius.md,
        fontFamily: T.font.ui,
        transition: "all .15s ease",
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...sizes,
        ...variants,
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 15 : 17} stroke={2.2} />}
      {children}
      {iconRight && (
        <Icon name={iconRight} size={size === "sm" ? 15 : 17} stroke={2.2} />
      )}
    </button>
  );
}

/* ---- Chip (color identity dot) ---- */
function Chip({ color, size = "md", style }) {
  const d = size === "sm" ? 8 : 10;
  return (
    <span
      style={{
        width: d,
        height: d,
        borderRadius: T.radius.pill,
        background: color,
        flexShrink: 0,
        boxShadow: `0 0 0 3px ${color}1f`,
        ...style,
      }}
    />
  );
}

/* ---- Badge (account-kind pill) ---- */
function Badge({ children, color, tone = "neutral", style }) {
  const tones = {
    neutral: { color: T.color.textMuted, bg: T.color.ink3, bd: T.color.line },
    accent: {
      color: T.color.accent,
      bg: T.color.accentDim,
      bd: T.color.accentLine,
    },
    pos: {
      color: T.color.pos,
      bg: T.color.posDim,
      bd: "rgba(116,194,155,0.3)",
    },
    neg: {
      color: T.color.neg,
      bg: T.color.negDim,
      bd: "rgba(206,130,120,0.3)",
    },
  };
  const t = tones[tone] || tones.neutral;
  const c = color ? { color, bg: color + "1f", bd: color + "4d" } : t;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        ...T.type.label,
        fontSize: 10.5,
        color: c.color,
        background: c.bg,
        border: `1px solid ${c.bd}`,
        padding: "3px 9px",
        borderRadius: T.radius.pill,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* ---- ProgressBar (thin) ---- */
function ProgressBar({ value, color, track, height = 4, style }) {
  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: 999,
        background: track || T.color.ink3,
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          height: "100%",
          borderRadius: 999,
          background: color || T.color.accent,
          transition: "width .6s cubic-bezier(.2,.7,.3,1)",
        }}
      />
    </div>
  );
}

/* ---- Account avatar (icon in account color) ---- */
function Avatar({ account, size = 38, style }) {
  const icon = window.HZ_KIND_ICON[account.kind] || "wallet";
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: T.radius.md,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        color: account.color,
        background: account.color + "1a",
        border: `1px solid ${account.color}33`,
        ...style,
      }}
    >
      <Icon name={icon} size={Math.round(size * 0.5)} stroke={2} />
    </div>
  );
}

/* ---- Input ---- */
function Input({
  value,
  onChange,
  placeholder,
  prefix,
  type = "text",
  disabled,
  style,
}) {
  const [f, setF] = React.useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 40,
        padding: "0 12px",
        background: disabled ? T.color.ink1 : T.color.ink0,
        borderRadius: T.radius.md,
        border: `1px solid ${f && !disabled ? T.color.accent : T.color.line}`,
        boxShadow: f && !disabled ? `0 0 0 3px ${T.color.accentDim}` : "none",
        transition: "all .15s ease",
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {prefix && (
        <span className="mono" style={{ color: T.color.textDim, fontSize: 14 }}>
          {prefix}
        </span>
      )}
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        disabled={disabled}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        style={{
          flex: 1,
          background: "none",
          border: "none",
          outline: "none",
          color: T.color.text,
          fontSize: 14,
          fontFamily: prefix ? T.font.mono : T.font.ui,
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
    </div>
  );
}

/* ---- Spinner ---- */
function Spinner({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ animation: "hz-spin .8s linear infinite" }}
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke={T.color.line}
        strokeWidth="2.5"
      />
      <path
        d="M12 3a9 9 0 0 1 9 9"
        fill="none"
        stroke={T.color.accent}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

Object.assign(window, {
  Label,
  Money,
  Delta,
  Button,
  Chip,
  Badge,
  ProgressBar,
  Avatar,
  Input,
  Spinner,
});
