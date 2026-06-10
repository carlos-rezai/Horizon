/* ============================================================
   HORIZON — Dashboard
   ============================================================ */
const { T: D } = window;

function KpiTile({ label, children, spark, sparkColor, fill, delta, accent }) {
  const { Sparkline, Delta } = window;
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: "18px 20px",
        borderRight: `1px solid ${D.color.line}`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
          minHeight: 30,
        }}
      >
        <div
          style={{
            ...D.type.label,
            letterSpacing: "0.05em",
            fontSize: 10.5,
            color: accent ? D.color.accent : D.color.textDim,
          }}
        >
          {label}
        </div>
        {delta != null && <Delta value={delta} />}
      </div>
      <div style={{ marginTop: 12 }}>{children}</div>
      {spark && (
        <div style={{ marginTop: 16 }}>
          <Sparkline
            data={spark}
            color={sparkColor}
            fill={fill}
            width={160}
            height={26}
            stretch
          />
        </div>
      )}
    </div>
  );
}

function MortgageCountdown({ ui }) {
  const { Card, SectionHead, Money, ProgressBar, Icon } = window;
  const m = window.HZ.accountById("a4");
  const meta = (ui && ui.mortgage) || window.HZ.mortgage;
  const start = meta.originalPrincipal;
  const paid = Math.max(0, start - m.balance);
  const pct = Math.max(0, Math.min(100, (paid / start) * 100));
  const months = window.HZ.monthsToPayoff;
  const yrs = Math.floor(months / 12),
    mos = months % 12;
  const sd = new Date(meta.startDate);
  const startedMonths = (2026 - sd.getFullYear()) * 12 + (10 - sd.getMonth());
  const yearInTerm = Math.floor(startedMonths / 12) + 1;
  const MON = [
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
  const [eh, setEh] = React.useState(false);
  return (
    <Card pad={22} style={{ display: "flex", flexDirection: "column" }}>
      <SectionHead
        label="Mortgage Countdown"
        title="Mortgage"
        right={
          <button
            onClick={() => ui && ui.editMortgage()}
            onMouseEnter={() => setEh(true)}
            onMouseLeave={() => setEh(false)}
            className="focusable"
            aria-label="Edit mortgage details"
            style={{
              display: "grid",
              placeItems: "center",
              width: 30,
              height: 30,
              borderRadius: D.radius.md,
              color: eh ? D.color.text : D.color.textMuted,
              background: eh ? D.color.ink3 : "transparent",
              border: `1px solid ${eh ? D.color.line : "transparent"}`,
              transition: "all .14s ease",
            }}
          >
            <Icon name="pencil" size={16} />
          </button>
        }
      />
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <Money cents={m.balance} size="lg" color={D.color.text} />
      </div>
      <div style={{ ...D.type.body, color: D.color.textDim, marginTop: 4 }}>
        remaining Restschuld · {m.interest}%
      </div>

      <div
        style={{
          marginTop: 22,
          marginBottom: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <span style={{ ...D.type.label, color: D.color.textDim }}>
          Paid off
        </span>
        <span
          className="mono"
          style={{ fontSize: 13, color: D.color.accent, fontWeight: 600 }}
        >
          {pct.toFixed(0)}%
        </span>
      </div>
      <ProgressBar value={pct} color={D.color.accent} />
      <div
        style={{
          ...D.type.body,
          color: D.color.textFaint,
          fontSize: 12,
          marginTop: 8,
        }}
      >
        of{" "}
        <span className="mono" style={{ color: D.color.textDim }}>
          {window.HZ.eurUnit(start, { cents: false })}
        </span>{" "}
        · started {MON[sd.getMonth()]} {sd.getFullYear()} · year {yearInTerm} of{" "}
        {meta.termYears}
      </div>

      <div
        style={{
          marginTop: "auto",
          paddingTop: 22,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{ ...D.type.label, color: D.color.textDim, marginBottom: 6 }}
          >
            To Payoff
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span
              className="mono"
              style={{ fontSize: 22, fontWeight: 600, color: D.color.accent }}
            >
              {yrs}
            </span>
            <span
              style={{
                ...D.type.body,
                color: D.color.textMuted,
                marginRight: 6,
              }}
            >
              yr
            </span>
            <span
              className="mono"
              style={{ fontSize: 22, fontWeight: 600, color: D.color.accent }}
            >
              {mos}
            </span>
            <span style={{ ...D.type.body, color: D.color.textMuted }}>mo</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: D.color.accent,
            ...D.type.label,
            fontSize: 10,
          }}
        >
          <Icon name="flag" size={13} />
          Oct 2031
        </div>
      </div>
    </Card>
  );
}

function AccountsSummary({ go, ui }) {
  const { Card, SectionHead, Button, Avatar, Badge, Money, Chip, Icon } =
    window;
  const HZ = window.HZ;
  const order = (ui && ui.accountOrder) || HZ.accounts.map((a) => a.id);
  const accts = order.map((id) => HZ.accountById(id)).filter(Boolean);
  const [hoverId, setHoverId] = React.useState(null);
  const [dragIdx, setDragIdx] = React.useState(null);
  const [overIdx, setOverIdx] = React.useState(null);
  const dragIdxRef = React.useRef(null);

  const reorder = (from, to) => {
    if (from == null || from === to) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    ui.reorderAccounts(next);
  };

  return (
    <Card pad={22}>
      <SectionHead
        label="Accounts"
        title="Accounts"
        right={
          <Button
            variant="secondary"
            size="sm"
            icon="plus"
            onClick={ui.addAccount}
          >
            Account
          </Button>
        }
      />
      <div style={{ display: "flex", flexDirection: "column" }}>
        {accts.map((a, i) => {
          const liquid = HZ.LIQUID_KINDS.includes(a.kind);
          const dragging = dragIdx === i;
          const isOver = overIdx === i && dragIdx !== null && dragIdx !== i;
          return (
            <div
              key={a.id}
              draggable
              onDragStart={(e) => {
                dragIdxRef.current = i;
                setDragIdx(i);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIdx(i);
              }}
              onDrop={(e) => {
                e.preventDefault();
                reorder(dragIdxRef.current, i);
                dragIdxRef.current = null;
                setDragIdx(null);
                setOverIdx(null);
              }}
              onDragEnd={() => {
                dragIdxRef.current = null;
                setDragIdx(null);
                setOverIdx(null);
              }}
              onClick={() => {
                if (dragIdxRef.current === null) go("account", a.id);
              }}
              onMouseEnter={(e) => {
                setHoverId(a.id);
                e.currentTarget.style.background = D.color.ink3;
              }}
              onMouseLeave={(e) => {
                setHoverId(null);
                e.currentTarget.style.background = "transparent";
              }}
              style={{
                display: "grid",
                gridTemplateColumns: "18px 38px 1fr auto",
                alignItems: "center",
                gap: 12,
                padding: "12px 10px",
                borderRadius: D.radius.md,
                cursor: "pointer",
                borderBottom:
                  i === accts.length - 1
                    ? "none"
                    : `1px solid ${D.color.lineFaint}`,
                transition: "background .12s, opacity .12s",
                opacity: dragging ? 0.4 : 1,
                boxShadow: isOver ? `inset 0 2px 0 ${D.color.accent}` : "none",
              }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  color: D.color.textFaint,
                  cursor: "grab",
                  opacity: hoverId === a.id || dragging ? 1 : 0,
                  transition: "opacity .14s",
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Icon name="grip" size={16} />
              </span>
              <Avatar account={a} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span
                    style={{
                      ...D.type.bodyMd,
                      color: D.color.text,
                      fontWeight: 600,
                    }}
                  >
                    {a.name}
                  </span>
                  <Chip color={a.color} size="sm" />
                </div>
                <div
                  style={{
                    ...D.type.body,
                    color: D.color.textDim,
                    fontSize: 12.5,
                    marginTop: 1,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {a.sub}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <Money
                  cents={a.balance}
                  color={
                    a.kind === "Mortgage" || a.balance < 0
                      ? D.color.neg
                      : D.color.text
                  }
                />
                <div style={{ marginTop: 4 }}>
                  <Badge tone={liquid ? "pos" : "neutral"}>{a.kind}</Badge>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function PlanSummary({ go }) {
  const { Card, SectionHead, Money, Button, Icon } = window;
  const rows = window.HZ.yearSummaries.slice(0, 7);
  return (
    <Card pad={22}>
      <SectionHead
        label="Outlook"
        title="Plan Summary"
        right={
          <Button
            variant="ghost"
            size="sm"
            iconRight="arrowRight"
            onClick={() => go("outlook", null, null)}
          >
            Full plan
          </Button>
        }
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "52px 1fr 1fr 1fr",
          gap: 12,
          padding: "0 12px 10px",
          ...D.type.label,
          color: D.color.textFaint,
        }}
      >
        <span>Year</span>
        <span style={{ textAlign: "right" }}>Total Liquid</span>
        <span style={{ textAlign: "right" }}>Restschuld</span>
        <span style={{ textAlign: "right" }}>ST</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {rows.map((r, i) => (
          <div
            key={r.year}
            onClick={() => go("outlook", null, { year: r.year })}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = D.color.ink3)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
            style={{
              display: "grid",
              gridTemplateColumns: "52px 1fr 1fr 1fr",
              gap: 12,
              alignItems: "center",
              padding: "11px 12px",
              borderRadius: D.radius.md,
              cursor: "pointer",
              transition: "background .12s",
              borderBottom:
                i === rows.length - 1
                  ? "none"
                  : `1px solid ${D.color.lineFaint}`,
              background: r.isPayoffYear ? D.color.accentDim : "transparent",
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 13,
                color: r.isPayoffYear ? D.color.accent : D.color.text,
                fontWeight: r.isPayoffYear ? 600 : 500,
              }}
            >
              {r.year}
            </span>
            <span style={{ textAlign: "right" }}>
              <Money cents={r.totalLiquid} size="sm" color={D.color.pos} />
            </span>
            <span style={{ textAlign: "right" }}>
              {r.restschuld > 0 ? (
                <Money cents={r.restschuld} size="sm" color={D.color.debt} />
              ) : (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    color: D.color.accent,
                    ...D.type.label,
                    fontSize: 10,
                  }}
                >
                  <Icon name="flag" size={12} />
                  Payoff
                </span>
              )}
            </span>
            <span style={{ textAlign: "right" }} className="mono">
              {r.st > 0 ? (
                <Money cents={-r.st} size="sm" color={D.color.textMuted} />
              ) : (
                <span style={{ color: D.color.textFaint }}>—</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Dashboard({ go, ui }) {
  const { PageHeader, Button, Card, TrajectoryChart, Money } = window;
  const HZ = window.HZ;
  const liquidSpark = HZ.projection.slice(0, 11).map((p) => p.totalLiquid);
  const debtSpark = HZ.projection.slice(0, 11).map((p) => p.restschuld);
  const flowSpark = [1.1, 1.3, 1.25, 1.45, 1.4, 1.55, 1.42, 1.6, 1.5, 1.62];
  const netMonthly = 145000;

  // Trajectory series: Total Liquid (sum, hero) + one line per non-mortgage account + Restschuld.
  const nonMortgage = HZ.accounts.filter((a) => a.kind !== "Mortgage");
  const series = [
    {
      key: "totalLiquid",
      name: "Total Liquid",
      color: D.color.liquid,
      kind: "liquid",
      width: 3,
    },
    ...nonMortgage.map((a) => ({
      key: a.id,
      name: a.name,
      color: a.color,
      kind: "account",
      width: 1.75,
    })),
    {
      key: "restschuld",
      name: "Restschuld",
      color: D.color.debt,
      kind: "debt",
      width: 2,
      dashed: true,
    },
  ];
  const allOn = () => series.reduce((o, s) => ((o[s.key] = true), o), {});
  // Default visibility: Total Liquid off (lives in tooltip), each account follows its
  // showInTrajectory flag, Restschuld on.
  const defaults = () =>
    series.reduce((o, s) => {
      if (s.key === "totalLiquid") o[s.key] = false;
      else if (s.kind === "account") {
        const a = HZ.accountById(s.key);
        o[s.key] = a ? a.showInTrajectory !== false : true;
      } else o[s.key] = true;
      return o;
    }, {});
  const [visible, setVisible] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("hz-traj-visible-v2"));
      if (saved) return { ...defaults(), ...saved };
    } catch (e) {}
    return defaults();
  });
  React.useEffect(() => {
    try {
      localStorage.setItem("hz-traj-visible-v2", JSON.stringify(visible));
    } catch (e) {}
  }, [visible]);
  const toggle = (key) => setVisible((v) => ({ ...v, [key]: !v[key] }));
  const solo = (key) =>
    setVisible(series.reduce((o, s) => ((o[s.key] = s.key === key), o), {}));
  const showAll = () => setVisible(allOn());
  const visibleCount = series.filter((s) => visible[s.key]).length;

  return (
    <div className="stagger">
      <PageHeader
        overline="Overview"
        title="Dashboard"
        subtitle="Your financial horizon at a glance"
        actions={
          <>
            <Button
              variant="secondary"
              icon="download"
              onClick={() =>
                ui.notify("Backup saved · horizon-2026-11-18.db", {
                  variant: "success",
                })
              }
            >
              Backup
            </Button>
            <Button variant="primary" icon="plus" onClick={ui.addAccount}>
              Add account
            </Button>
          </>
        }
      />

      {/* KPI strip */}
      <Card
        pad={0}
        style={{ marginTop: 26, display: "flex", overflow: "hidden" }}
      >
        <KpiTile
          label="Total Liquid"
          delta={6.8}
          spark={liquidSpark}
          sparkColor={D.color.pos}
          fill
          accent
        >
          <Money cents={HZ.totalLiquid} size="lg" color={D.color.text} />
        </KpiTile>
        <KpiTile
          label="Restschuld"
          delta={-16.7}
          spark={debtSpark}
          sparkColor={D.color.debt}
        >
          <Money cents={HZ.restschuld} size="lg" color={D.color.text} />
        </KpiTile>
        <KpiTile
          label="Net Cashflow"
          spark={flowSpark}
          sparkColor={D.color.flow}
          fill
        >
          <Money cents={netMonthly} size="lg" sign color={D.color.pos} />
        </KpiTile>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            padding: "18px 20px",
            background: D.color.accentDim,
          }}
        >
          <div
            style={{
              ...D.type.label,
              letterSpacing: "0.05em",
              fontSize: 10.5,
              color: D.color.accent,
              minHeight: 30,
            }}
          >
            To Payoff
          </div>
          <div
            style={{
              marginTop: 12,
              display: "flex",
              alignItems: "baseline",
              gap: 5,
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 30,
                fontWeight: 600,
                color: D.color.accent,
                letterSpacing: "-0.02em",
              }}
            >
              {Math.floor(HZ.monthsToPayoff / 12)}
            </span>
            <span
              style={{
                ...D.type.body,
                color: D.color.textMuted,
                marginRight: 4,
              }}
            >
              Years
            </span>
            <span
              className="mono"
              style={{
                fontSize: 30,
                fontWeight: 600,
                color: D.color.accent,
                letterSpacing: "-0.02em",
              }}
            >
              {HZ.monthsToPayoff % 12}
            </span>
            <span style={{ ...D.type.body, color: D.color.textMuted }}>
              Months
            </span>
          </div>
          <div
            style={{
              ...D.type.body,
              color: D.color.textDim,
              fontSize: 12.5,
              marginTop: 6,
            }}
          >
            debt-free in October 2031
          </div>
        </div>
      </Card>

      {/* Trajectory */}
      <Card pad={24} style={{ marginTop: 22 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div>
            <div
              style={{
                ...D.type.label,
                color: D.color.accent,
                marginBottom: 7,
              }}
            >
              Trajectory Horizon
            </div>
            <div style={{ ...D.type.h1, color: D.color.text }}>
              10-Year Projection
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              ...D.type.body,
              color: D.color.textDim,
              fontSize: 12.5,
              alignSelf: "flex-end",
            }}
          >
            <window.Icon name="filter" size={14} />
            {visibleCount} of {series.length} series · click to toggle
          </div>
        </div>
        <TrajectoryChart
          data={HZ.projection.slice(0, 120)}
          series={series}
          visible={visible}
          onToggle={toggle}
          onSolo={solo}
          onShowAll={showAll}
          payoffIndex={HZ.payoffIndex}
          todayIndex={HZ.TODAY_INDEX}
          height={330}
        />
      </Card>

      {/* Lower grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.15fr) minmax(0,0.85fr)",
          gap: 22,
          marginTop: 22,
          alignItems: "start",
        }}
      >
        <AccountsSummary go={go} ui={ui} />
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <MortgageCountdown ui={ui} />
          <PlanSummary go={go} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard });
