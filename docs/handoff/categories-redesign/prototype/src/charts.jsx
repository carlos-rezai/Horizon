/* ============================================================
   HORIZON — Charts (hand-built SVG, no deps)
   TrajectoryChart · Donut · Sparkline · useMeasure
   ============================================================ */
const { T: K } = window;
const { Icon: K_Icon } = window;

/* measure container width responsively */
function useMeasure() {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(0);
  React.useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((ents) => setW(ents[0].contentRect.width));
    ro.observe(ref.current);
    setW(ref.current.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/* monotone-ish smooth cubic path from [{x,y}] */
function smoothPath(pts) {
  if (pts.length < 2) return "";
  const d = [];
  for (let i = 0; i < pts.length - 1; i++) {
    d.push((pts[i + 1].y - pts[i].y) / (pts[i + 1].x - pts[i].x || 1));
  }
  const m = [];
  m[0] = d[0];
  for (let i = 1; i < pts.length - 1; i++)
    m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  m[pts.length - 1] = d[pts.length - 2];
  let p = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = (pts[i + 1].x - pts[i].x) / 3;
    p += ` C${pts[i].x + dx},${pts[i].y + m[i] * dx} ${pts[i + 1].x - dx},${pts[i + 1].y - m[i + 1] * dx} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return p;
}

/* ---------- Trajectory Horizon ----------
   series: [{ key, name, color, kind:'liquid'|'account'|'debt', width, dashed }]
   visible: { [key]: bool }   onToggle(key)   onSolo(key) */
function TrajectoryChart({
  data,
  series,
  visible,
  onToggle,
  onSolo,
  onShowAll,
  payoffIndex,
  todayIndex,
  height = 340,
}) {
  const [ref, W] = useMeasure();
  const [hi, setHi] = React.useState(null);
  const pad = { l: 8, r: 16, t: 18, b: 28 };
  const w = Math.max(W, 320);
  const innerW = w - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const active = series.filter((s) => visible[s.key]);
  const liquidVisible = visible.totalLiquid;

  // Y domain over *visible* series only (hiding rescales — mirrors Recharts `hide`)
  const maxY =
    Math.max(1, ...active.flatMap((s) => data.map((d) => d[s.key] || 0))) *
    1.08;
  const x = (i) => pad.l + (i / (data.length - 1)) * innerW;
  const y = (v) =>
    Math.max(
      pad.t,
      Math.min(pad.t + innerH, pad.t + innerH - (v / maxY) * innerH)
    );

  const pathFor = (key) =>
    smoothPath(data.map((d, i) => ({ x: x(i), y: y(d[key] || 0) })));

  // freedom-phase area under Total Liquid (only when visible)
  const liquidPts = data.map((d, i) => ({ x: x(i), y: y(d.totalLiquid) }));
  const fp = liquidPts.slice(payoffIndex);
  const freedomArea =
    liquidVisible && fp.length > 1
      ? smoothPath(fp) +
        ` L${fp[fp.length - 1].x},${pad.t + innerH} L${fp[0].x},${pad.t + innerH} Z`
      : "";

  const payoffX = x(payoffIndex);
  const todayX = x(todayIndex);

  const years = [];
  data.forEach((d, i) => {
    if (d.month === 0) years.push({ i, year: d.year });
  });
  const tickStep = Math.ceil(years.length / 7);
  const shownYears = years.filter((_, k) => k % tickStep === 0);

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const idx = Math.round(((px - pad.l) / innerW) * (data.length - 1));
    setHi(Math.max(0, Math.min(data.length - 1, idx)));
  };
  const hd = hi != null ? data[hi] : null;
  const MONTHS = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const hiddenCount = series.length - active.length;

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <svg
        width={w}
        height={height}
        style={{ display: "block", overflow: "visible" }}
        onMouseMove={onMove}
        onMouseLeave={() => setHi(null)}
      >
        <defs>
          <linearGradient id="freedomGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={K.color.accent} stopOpacity="0.20" />
            <stop offset="100%" stopColor={K.color.accent} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((g, k) => (
          <line
            key={k}
            x1={pad.l}
            x2={w - pad.r}
            y1={pad.t + innerH * g}
            y2={pad.t + innerH * g}
            stroke={K.color.line}
            strokeWidth="1"
            strokeDasharray={g === 1 ? "0" : "2 5"}
            opacity={g === 1 ? 1 : 0.6}
          />
        ))}

        <rect
          x={payoffX}
          y={pad.t}
          width={Math.max(0, w - pad.r - payoffX)}
          height={innerH}
          fill={K.color.accent}
          opacity="0.035"
        />
        {freedomArea && <path d={freedomArea} fill="url(#freedomGrad)" />}

        {shownYears.map((t) => (
          <text
            key={t.i}
            x={x(t.i)}
            y={height - 8}
            fill={K.color.textDim}
            fontSize="11"
            fontFamily={K.font.mono}
            textAnchor="middle"
          >
            {t.year}
          </text>
        ))}

        <line
          x1={todayX}
          x2={todayX}
          y1={pad.t}
          y2={pad.t + innerH}
          stroke={K.color.lineStrong}
          strokeWidth="1"
          strokeDasharray="3 4"
        />
        <text
          x={todayX + 6}
          y={pad.t + 11}
          fill={K.color.textDim}
          fontSize="10"
          fontFamily={K.font.ui}
          fontWeight="600"
          letterSpacing="0.08em"
        >
          TODAY
        </text>

        {/* account + debt lines first (secondary), hero liquid last (on top) */}
        {active
          .filter((s) => s.kind !== "liquid")
          .map((s) => {
            // Restschuld ends at the payoff point (value 0) — no flat line crawling the axis after.
            const src =
              s.kind === "debt" && payoffIndex > 0
                ? data.slice(0, payoffIndex + 1)
                : data;
            const d = smoothPath(
              src.map((p, i) => ({ x: x(i), y: y(p[s.key] || 0) }))
            );
            return (
              <path
                key={s.key}
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth={s.width || 1.75}
                strokeLinecap="round"
                strokeDasharray={s.dashed ? "6 4" : "0"}
                opacity={s.kind === "account" ? 0.85 : 1}
              />
            );
          })}
        {liquidVisible && (
          <path
            d={pathFor("totalLiquid")}
            fill="none"
            stroke={K.color.liquid}
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}

        <line
          x1={payoffX}
          x2={payoffX}
          y1={pad.t - 4}
          y2={pad.t + innerH}
          stroke={K.color.accent}
          strokeWidth="1.5"
          strokeDasharray="4 4"
          opacity="0.8"
        />
        <circle
          cx={payoffX}
          cy={y(0)}
          r="4.5"
          fill={K.color.accent}
          stroke={K.color.ink2}
          strokeWidth="2"
        />

        {hd && (
          <g>
            <line
              x1={x(hi)}
              x2={x(hi)}
              y1={pad.t}
              y2={pad.t + innerH}
              stroke={K.color.lineStrong}
              strokeWidth="1"
            />
            {active.map((s) => {
              if (s.kind === "debt" && (hd[s.key] || 0) <= 0) return null;
              return (
                <circle
                  key={s.key}
                  cx={x(hi)}
                  cy={y(hd[s.key] || 0)}
                  r={s.kind === "liquid" ? 4 : 3}
                  fill={s.color}
                  stroke={K.color.ink2}
                  strokeWidth="1.5"
                />
              );
            })}
          </g>
        )}
      </svg>

      <div
        style={{
          position: "absolute",
          top: 2,
          left: Math.min(payoffX + 8, w - 150),
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: K.color.accent,
        }}
      >
        <K_Icon name="flag" size={13} />
        <span style={{ ...K.type.label, fontSize: 10, color: K.color.accent }}>
          Payoff · Oct 2031
        </span>
      </div>

      {hd && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: Math.min(Math.max(x(hi) + 12, 8), w - 230),
            width: 214,
            background: K.color.ink4,
            border: `1px solid ${K.color.lineStrong}`,
            borderRadius: K.radius.lg,
            padding: "11px 13px",
            pointerEvents: "none",
            boxShadow: "0 12px 30px -8px rgba(0,0,0,0.6)",
            zIndex: 5,
          }}
        >
          <div
            style={{ ...K.type.label, color: K.color.textDim, marginBottom: 9 }}
          >
            {MONTHS[hd.month]} {hd.year}
            {hd.freedom ? " · Freedom Phase" : ""}
          </div>
          {active
            .filter((s) => !(s.kind === "debt" && (hd[s.key] || 0) <= 0))
            .map((s) => (
              <div
                key={s.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 5,
                }}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 12,
                    color: K.color.textMuted,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      background: s.color,
                    }}
                  />
                  {s.name}
                </span>
                <span
                  className="mono"
                  style={{ fontSize: 12, color: K.color.text }}
                >
                  {window.HZ.eurUnit(hd[s.key] || 0, { cents: false })}
                </span>
              </div>
            ))}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 8,
              paddingTop: 8,
              borderTop: `1px solid ${K.color.line}`,
            }}
          >
            <span style={{ fontSize: 11.5, color: K.color.textDim }}>
              Net Cashflow
            </span>
            <span
              className="mono"
              style={{
                fontSize: 11.5,
                color: hd.netCashflow >= 0 ? K.color.pos : K.color.neg,
              }}
            >
              {window.HZ.eurUnit(hd.netCashflow, { sign: true, cents: false })}
            </span>
          </div>
        </div>
      )}

      {/* interactive legend — toggle chips */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          marginTop: 16,
          paddingTop: 14,
          borderTop: `1px solid ${K.color.line}`,
        }}
      >
        {series.map((s) => {
          const on = visible[s.key];
          return (
            <button
              key={s.key}
              onClick={() => onToggle(s.key)}
              onDoubleClick={() => onSolo && onSolo(s.key)}
              title={
                on
                  ? `Hide ${s.name} (double-click to isolate)`
                  : `Show ${s.name}`
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 11px",
                borderRadius: K.radius.pill,
                background: on ? K.color.ink3 : "transparent",
                border: `1px solid ${on ? K.color.line : K.color.lineFaint}`,
                color: on ? K.color.text : K.color.textFaint,
                fontFamily: K.font.ui,
                fontSize: 12.5,
                fontWeight: 500,
                cursor: "pointer",
                transition: "all .14s ease",
                opacity: on ? 1 : 0.6,
              }}
            >
              <span
                style={{
                  width: 16,
                  height: s.dashed ? 0 : 3,
                  borderRadius: 2,
                  borderTop: s.dashed
                    ? `2px dashed ${on ? s.color : K.color.textFaint}`
                    : "none",
                  background: s.dashed
                    ? "transparent"
                    : on
                      ? s.color
                      : K.color.textFaint,
                  transition: "all .14s ease",
                  flexShrink: 0,
                }}
              />
              {s.name}
              {s.kind === "liquid" && (
                <span
                  style={{
                    ...K.type.label,
                    fontSize: 8.5,
                    color: on ? K.color.accent : K.color.textFaint,
                    letterSpacing: "0.08em",
                  }}
                >
                  SUM
                </span>
              )}
            </button>
          );
        })}
        {hiddenCount > 0 && (
          <button
            onClick={onShowAll}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 11px",
              borderRadius: K.radius.pill,
              background: "transparent",
              border: `1px dashed ${K.color.accentLine}`,
              color: K.color.accent,
              fontFamily: K.font.ui,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <K_Icon name="refresh" size={13} />
            Show all
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------- Donut ---------- */
function Donut({
  segments,
  size = 188,
  thickness = 22,
  centerLabel,
  centerValue,
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const cx = size / 2,
    cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={K.color.ink3}
          strokeWidth={thickness}
        />
        {segments.map((s, i) => {
          const len = (s.value / total) * circ;
          const el = (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              style={{ transition: "stroke-dasharray .6s ease" }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ ...K.type.label, color: K.color.textDim, fontSize: 10 }}>
          {centerLabel}
        </div>
        <div
          className="mono"
          style={{
            fontSize: 19,
            fontWeight: 600,
            color: K.color.text,
            marginTop: 3,
          }}
        >
          {centerValue}
        </div>
      </div>
    </div>
  );
}

/* ---------- Sparkline ---------- */
function Sparkline({ data, color, width = 120, height = 34, fill, stretch }) {
  const max = Math.max(...data),
    min = Math.min(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - 3 - ((v - min) / rng) * (height - 6),
  }));
  const p = smoothPath(pts);
  return (
    <svg
      width={stretch ? "100%" : width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={stretch ? "none" : "xMidYMid meet"}
      style={{ display: "block", overflow: stretch ? "hidden" : "visible" }}
    >
      {fill && (
        <path
          d={`${p} L${width},${height} L0,${height} Z`}
          fill={color}
          opacity="0.1"
        />
      )}
      <path
        d={p}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect={stretch ? "non-scaling-stroke" : undefined}
      />
      {!stretch && (
        <circle
          cx={pts[pts.length - 1].x}
          cy={pts[pts.length - 1].y}
          r="2.5"
          fill={color}
        />
      )}
    </svg>
  );
}

Object.assign(window, { TrajectoryChart, Donut, Sparkline, useMeasure });
