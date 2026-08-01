/* ============================================================
   HORIZON — Month Overview
   Account tabs · variable spending · breakdown donut · YoY (planned)
   ============================================================ */
const { T: M } = window;

function AddSpendingRow() {
  const { Input, Button } = window;
  const [label, setLabel] = React.useState("");
  const [amt, setAmt] = React.useState("");
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 130px 120px",
        gap: 10,
        padding: "12px 14px",
        background: M.color.ink1,
        borderRadius: M.radius.md,
        border: `1px dashed ${M.color.line}`,
        marginBottom: 6,
      }}
    >
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="New expense…"
      />
      <Input
        value={amt}
        onChange={(e) => setAmt(e.target.value)}
        placeholder="0,00"
        prefix="€"
      />
      <Button variant="primary" icon="plus" full>
        Add
      </Button>
    </div>
  );
}

function MonthYearPicker({ year, month, onJump }) {
  const { Icon } = window;
  const HZ = window.HZ;
  const bounds = React.useMemo(() => {
    const pts = HZ.history.pts;
    const min = pts[0],
      max = pts[pts.length - 1];
    return {
      minYear: min.year,
      minMonth: min.month,
      maxYear: max.year,
      maxMonth: max.month,
    };
  }, []);
  const [open, setOpen] = React.useState(false);
  const [viewYear, setViewYear] = React.useState(year);
  const [pos, setPos] = React.useState(null);
  const ref = React.useRef(null);
  const popRef = React.useRef(null);
  React.useEffect(() => {
    if (open) setViewYear(year);
  }, [open, year]);
  React.useEffect(() => {
    if (open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
  }, [open]);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (
        ref.current &&
        !ref.current.contains(e.target) &&
        popRef.current &&
        !popRef.current.contains(e.target)
      )
        setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const inBounds = (yy, mm) => {
    if (yy < bounds.minYear || yy > bounds.maxYear) return false;
    if (yy === bounds.minYear && mm < bounds.minMonth) return false;
    if (yy === bounds.maxYear && mm > bounds.maxMonth) return false;
    return true;
  };
  const canPrevYear = viewYear - 1 >= bounds.minYear;
  const canNextYear = viewYear + 1 <= bounds.maxYear;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="focusable"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "0 10px",
          height: 32,
          borderRadius: 6,
          color: M.color.text,
          cursor: "pointer",
        }}
      >
        <span className="mono" style={{ fontSize: 13 }}>
          {M_MONTHS_FULL[month]} {year}
        </span>
        <Icon name="chevronDown" size={14} color={M.color.textDim} />
      </button>

      {open &&
        pos &&
        ReactDOM.createPortal(
          <div
            ref={popRef}
            className="hz-rise"
            style={{
              position: "fixed",
              top: pos.top,
              right: pos.right,
              zIndex: 500,
              width: 244,
              background: M.color.ink4,
              border: `1px solid ${M.color.lineStrong}`,
              borderRadius: M.radius.lg,
              boxShadow: "0 16px 40px -12px rgba(0,0,0,0.6)",
              padding: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <button
                onClick={() => canPrevYear && setViewYear((y) => y - 1)}
                disabled={!canPrevYear}
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  color: canPrevYear ? M.color.textMuted : M.color.textFaint,
                  cursor: canPrevYear ? "pointer" : "not-allowed",
                }}
              >
                <Icon name="arrowLeft" size={15} />
              </button>
              <span
                className="mono"
                style={{ fontSize: 14, fontWeight: 600, color: M.color.text }}
              >
                {viewYear}
              </span>
              <button
                onClick={() => canNextYear && setViewYear((y) => y + 1)}
                disabled={!canNextYear}
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  color: canNextYear ? M.color.textMuted : M.color.textFaint,
                  cursor: canNextYear ? "pointer" : "not-allowed",
                }}
              >
                <Icon name="arrowRight" size={15} />
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 6,
              }}
            >
              {M_MONTHS_FULL.map((label, mi) => {
                const disabled = !inBounds(viewYear, mi);
                const active = viewYear === year && mi === month;
                return (
                  <button
                    key={mi}
                    disabled={disabled}
                    onClick={() => {
                      onJump(viewYear, mi);
                      setOpen(false);
                    }}
                    style={{
                      padding: "8px 0",
                      borderRadius: 7,
                      fontFamily: M.font.mono,
                      fontSize: 12.5,
                      color: active
                        ? M.color.onAccent
                        : disabled
                          ? M.color.textFaint
                          : M.color.text,
                      background: active
                        ? M.color.accent
                        : disabled
                          ? "transparent"
                          : M.color.ink3,
                      fontWeight: active ? 600 : 500,
                      cursor: disabled ? "not-allowed" : "pointer",
                      transition: "all .12s ease",
                    }}
                  >
                    {label.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

const M_MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function MonthOverview({ go, ui, ctx }) {
  const {
    PageHeader,
    Card,
    SectionHead,
    DataRow,
    Money,
    Badge,
    Donut,
    Icon,
    Chip,
    Avatar,
    Button,
  } = window;
  const HZ = window.HZ;
  const [tab, setTab] = React.useState("all");

  const MONTHS_FULL = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const cy = (ctx && ctx.year) || 2026;
  const cm = ctx && ctx.month != null ? ctx.month : 10;
  const fullMonth = MONTHS_FULL[cm];
  const shiftMonth = (delta) => {
    let mm = cm + delta,
      yy = cy;
    if (mm < 0) {
      mm = 11;
      yy--;
    }
    if (mm > 11) {
      mm = 0;
      yy++;
    }
    go("month", null, { year: yy, month: mm });
  };

  const accts = HZ.accounts;
  const spending =
    tab === "all"
      ? HZ.variableSpending
      : HZ.variableSpending.filter((t) => t.account === tab);
  const totalSpend = HZ.variableSpending.reduce((s, t) => s + t.amount, 0);

  // breakdown by category
  const catMap = {};
  HZ.variableSpending.forEach((t) => {
    catMap[t.category] = (catMap[t.category] || 0) + Math.abs(t.amount);
  });
  const segments = HZ.categories
    .filter((c) => catMap[c.key])
    .map((c) => ({ ...c, value: catMap[c.key] }))
    .sort((a, b) => b.value - a.value);

  const tabItems = [
    { value: "all", label: "All accounts", count: HZ.variableSpending.length },
  ].concat(
    accts
      .filter((a) => a.kind !== "Mortgage" && a.kind !== "Investment")
      .map((a) => ({
        value: a.id,
        label: a.name,
        dot: a.color,
        count: HZ.variableSpending.filter((t) => t.account === a.id).length,
      }))
  );

  const months = [
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

  // YoY (planned feature): YTD per category, this year vs last
  const yoy = segments.slice(0, 5).map((c) => ({
    ...c,
    thisYear: c.value * 9 + 4000,
    lastYear: c.value * 8 + 9000,
  }));
  const yoyMax = Math.max(...yoy.flatMap((c) => [c.thisYear, c.lastYear]));

  return (
    <div className="stagger">
      <PageHeader
        overline={`${fullMonth} ${cy}`}
        title="Month Overview"
        subtitle="Variable spending · Recurring-Only Model"
        actions={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: M.color.ink2,
              border: `1px solid ${M.color.line}`,
              borderRadius: M.radius.md,
              padding: 3,
            }}
          >
            <button
              onClick={() => shiftMonth(-1)}
              style={{
                display: "grid",
                placeItems: "center",
                width: 32,
                height: 32,
                borderRadius: 6,
                color: M.color.textMuted,
                cursor: "pointer",
              }}
            >
              <Icon name="arrowLeft" size={16} />
            </button>
            <MonthYearPicker
              year={cy}
              month={cm}
              onJump={(yy, mm) => go("month", null, { year: yy, month: mm })}
            />
            <button
              onClick={() => shiftMonth(1)}
              style={{
                display: "grid",
                placeItems: "center",
                width: 32,
                height: 32,
                borderRadius: 6,
                color: M.color.textMuted,
                cursor: "pointer",
              }}
            >
              <Icon name="arrowRight" size={16} />
            </button>
          </div>
        }
      />

      {/* month KPIs */}
      <Card
        pad={0}
        style={{ marginTop: 26, display: "flex", overflow: "hidden" }}
      >
        {[
          ["Variable Spending", totalSpend, M.color.neg],
          ["Of which Cat", -(catMap.Cat || 0), M.color.text],
          ["Entries", null, null, HZ.variableSpending.length],
          ["Avg / day", Math.round(totalSpend / 28), M.color.textMuted],
        ].map(([l, v, c, count], i) => (
          <div
            key={l}
            style={{
              flex: 1,
              padding: "18px 22px",
              borderRight: i < 3 ? `1px solid ${M.color.line}` : "none",
            }}
          >
            <div style={{ ...M.type.label, color: M.color.textDim }}>{l}</div>
            <div style={{ marginTop: 11 }}>
              {count != null ? (
                <span
                  className="mono"
                  style={{ fontSize: 26, fontWeight: 600 }}
                >
                  {count}
                </span>
              ) : (
                <Money cents={v} size="lg" color={c} />
              )}
            </div>
          </div>
        ))}
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)",
          gap: 22,
          marginTop: 22,
          alignItems: "start",
        }}
      >
        {/* spending list */}
        <Card pad={22}>
          <SectionHead
            label="Variable Spending"
            title={`Spending in ${fullMonth}`}
            right={
              <Button
                variant="secondary"
                size="sm"
                icon="plus"
                onClick={ui.addSpending}
              >
                Add expense
              </Button>
            }
          />
          <div style={{ marginBottom: 14 }}>
            <window.Tabs items={tabItems} value={tab} onChange={setTab} />
          </div>
          <div>
            {spending.map((t, i) => {
              const acct = HZ.accountById(t.account);
              const cat = HZ.categories.find((c) => c.key === t.category);
              const d = new Date(t.date);
              return (
                <DataRow
                  key={t.id}
                  cols="44px 1fr auto auto"
                  last={i === spending.length - 1}
                  onClick={() => ui.editTransaction(t)}
                >
                  <div style={{ textAlign: "center" }}>
                    <div
                      className="mono"
                      style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: M.color.text,
                      }}
                    >
                      {d.getDate()}
                    </div>
                    <div
                      style={{
                        ...M.type.label,
                        color: M.color.textFaint,
                        fontSize: 9,
                      }}
                    >
                      {months[cm]}
                    </div>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        ...M.type.bodyMd,
                        color: M.color.text,
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {t.label}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        marginTop: 3,
                      }}
                    >
                      <Chip color={acct.color} size="sm" />
                      <span
                        style={{
                          ...M.type.body,
                          color: M.color.textDim,
                          fontSize: 12,
                        }}
                      >
                        {acct.name}
                      </span>
                    </div>
                  </div>
                  <Badge color={cat.color}>{cat.label}</Badge>
                  <Money cents={t.amount} sign size="md" />
                </DataRow>
              );
            })}
          </div>
        </Card>

        {/* right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <Card pad={22}>
            <SectionHead label="Breakdown" title="By category" />
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Donut
                segments={segments}
                size={164}
                thickness={20}
                centerLabel="Total"
                centerValue={
                  HZ.eur(Math.abs(totalSpend), { cents: false }) + " €"
                }
              />
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 9,
                }}
              >
                {segments.map((s) => (
                  <div
                    key={s.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        ...M.type.body,
                        color: M.color.textMuted,
                        fontSize: 12.5,
                        minWidth: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: 3,
                          background: s.color,
                          flexShrink: 0,
                        }}
                      />
                      {s.label}
                    </span>
                    <Money cents={s.value} size="sm" color={M.color.text} />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* YoY — planned feature */}
          <Card pad={22}>
            <SectionHead
              label="Year comparison"
              title="This year so far"
              right={<Badge tone="accent">Planned</Badge>}
            />
            <div
              style={{
                ...M.type.body,
                color: M.color.textDim,
                fontSize: 12.5,
                marginBottom: 16,
                marginTop: -6,
              }}
            >
              Spending from Jan 1 through {fullMonth}, compared with the same
              period last year.
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {yoy.map((c) => (
                <div key={c.key}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        ...M.type.body,
                        color: M.color.textMuted,
                        fontSize: 13,
                      }}
                    >
                      {c.label}
                    </span>
                    <span
                      className="mono"
                      style={{ fontSize: 12.5, color: M.color.text }}
                    >
                      {HZ.eurUnit(c.thisYear, { cents: false })}
                    </span>
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
                  >
                    <div
                      style={{
                        height: 6,
                        borderRadius: 999,
                        background: M.color.ink3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${(c.thisYear / yoyMax) * 100}%`,
                          height: "100%",
                          background: c.color,
                          borderRadius: 999,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 999,
                        background: M.color.ink3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${(c.lastYear / yoyMax) * 100}%`,
                          height: "100%",
                          background: M.color.ink5,
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                gap: 16,
                marginTop: 16,
                paddingTop: 14,
                borderTop: `1px solid ${M.color.line}`,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  ...M.type.body,
                  color: M.color.textDim,
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 4,
                    borderRadius: 2,
                    background: M.color.accent,
                  }}
                />
                This year ({cy})
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  ...M.type.body,
                  color: M.color.textDim,
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 4,
                    borderRadius: 2,
                    background: M.color.ink5,
                  }}
                />
                Last year ({cy - 1})
              </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MonthOverview });
