/* ============================================================
   HORIZON — Components (composed, domain-agnostic)
   Card · PageHeader · SectionHead · StatBlock · DataRow
   Tabs · Modal · EmptyState
   ============================================================ */
const { T: C_T } = window;
const { Icon: C_Icon, Button: C_Button } = window;

/* ---- Card: Level-1 surface with hairline top-light ---- */
function Card({ children, pad = 20, hover, onClick, accent, style }) {
  const [h, setH] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        position: "relative",
        background: C_T.color.ink2,
        borderRadius: C_T.radius.xl,
        border: `1px solid ${hover && h ? C_T.color.lineStrong : C_T.color.line}`,
        padding: pad,
        cursor: onClick ? "pointer" : "default",
        transition:
          "border-color .15s ease, transform .15s ease, background .15s ease",
        transform: hover && h ? "translateY(-1px)" : "none",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        ...style,
      }}
    >
      {accent && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 14,
            bottom: 14,
            width: 3,
            borderRadius: 999,
            background: accent,
          }}
        />
      )}
      {children}
    </div>
  );
}

/* ---- Page header (title + actions) ---- */
function PageHeader({ overline, title, subtitle, actions, style }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 24,
        ...style,
      }}
    >
      <div>
        {overline && (
          <div
            style={{
              ...C_T.type.label,
              color: C_T.color.accent,
              marginBottom: 8,
            }}
          >
            {overline}
          </div>
        )}
        <h1 style={{ ...C_T.type.display, margin: 0, color: C_T.color.text }}>
          {title}
        </h1>
        {subtitle && (
          <div
            style={{
              ...C_T.type.bodyMd,
              color: C_T.color.textMuted,
              marginTop: 6,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {actions && (
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>{actions}</div>
      )}
    </div>
  );
}

/* ---- Section head (in-card) ---- */
function SectionHead({ label, title, right, style }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 18,
        ...style,
      }}
    >
      <div>
        {label && (
          <div
            style={{
              ...C_T.type.label,
              color: C_T.color.textDim,
              marginBottom: 7,
            }}
          >
            {label}
          </div>
        )}
        {title && (
          <div style={{ ...C_T.type.h2, color: C_T.color.text }}>{title}</div>
        )}
      </div>
      {right}
    </div>
  );
}

/* ---- Stat block ---- */
function StatBlock({ label, children, hint, align = "left" }) {
  return (
    <div style={{ textAlign: align }}>
      <div
        style={{ ...C_T.type.label, color: C_T.color.textDim, marginBottom: 9 }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          justifyContent: align === "right" ? "flex-end" : "flex-start",
        }}
      >
        {children}
      </div>
      {hint && (
        <div
          style={{
            ...C_T.type.body,
            color: C_T.color.textDim,
            marginTop: 6,
            fontSize: 12.5,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

/* ---- Data row (table row, hairline bottom, hover) ---- */
function DataRow({ children, onClick, cols, last, style }) {
  const [h, setH] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "grid",
        gridTemplateColumns: cols,
        alignItems: "center",
        gap: 16,
        padding: "13px 14px",
        borderRadius: C_T.radius.md,
        borderBottom: last ? "none" : `1px solid ${C_T.color.lineFaint}`,
        background: h && onClick ? C_T.color.ink3 : "transparent",
        cursor: onClick ? "pointer" : "default",
        transition: "background .12s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ---- Tabs (underline) ---- */
function Tabs({ items, value, onChange, style }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        borderBottom: `1px solid ${C_T.color.line}`,
        ...style,
      }}
    >
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "11px 14px",
              color: active ? C_T.color.text : C_T.color.textDim,
              fontFamily: C_T.font.ui,
              fontSize: 14,
              fontWeight: active ? 600 : 500,
              position: "relative",
              transition: "color .15s",
            }}
          >
            {it.dot && (
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: it.dot,
                }}
              />
            )}
            {it.label}
            {it.count != null && (
              <span
                className="mono"
                style={{ fontSize: 11, color: C_T.color.textDim }}
              >
                {it.count}
              </span>
            )}
            <span
              style={{
                position: "absolute",
                left: 8,
                right: 8,
                bottom: -1,
                height: 2,
                borderRadius: 2,
                background: active ? it.dot || C_T.color.accent : "transparent",
                transition: "background .15s",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

/* ---- Modal ---- */
function Modal({ open, onClose, title, children, width = 480, footer }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(6,8,11,0.66)",
        backdropFilter: "blur(3px)",
        display: "grid",
        placeItems: "center",
        padding: 24,
        animation: "hz-fade .2s ease both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="hz-rise"
        style={{
          width,
          maxWidth: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          background: C_T.color.ink4,
          borderRadius: C_T.radius.xl,
          border: `1px solid ${C_T.color.lineStrong}`,
          boxShadow: "0 24px 60px -12px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            borderBottom: `1px solid ${C_T.color.line}`,
          }}
        >
          <div style={{ ...C_T.type.h2 }}>{title}</div>
          <button
            onClick={onClose}
            className="focusable"
            style={{
              display: "grid",
              placeItems: "center",
              width: 30,
              height: 30,
              borderRadius: 8,
              color: C_T.color.textMuted,
            }}
          >
            <C_Icon name="x" size={18} />
          </button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
        {footer && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              padding: "16px 22px",
              borderTop: `1px solid ${C_T.color.line}`,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Empty state ---- */
function EmptyState({ icon, title, hint, action }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "48px 24px",
        gap: 8,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          background: C_T.color.ink3,
          color: C_T.color.textDim,
          marginBottom: 6,
        }}
      >
        <C_Icon name={icon || "info"} size={22} />
      </div>
      <div style={{ ...C_T.type.h2, color: C_T.color.text }}>{title}</div>
      {hint && (
        <div
          style={{ ...C_T.type.body, color: C_T.color.textDim, maxWidth: 320 }}
        >
          {hint}
        </div>
      )}
      {action && <div style={{ marginTop: 10 }}>{action}</div>}
    </div>
  );
}

Object.assign(window, {
  Card,
  PageHeader,
  SectionHead,
  StatBlock,
  DataRow,
  Tabs,
  Modal,
  EmptyState,
});
