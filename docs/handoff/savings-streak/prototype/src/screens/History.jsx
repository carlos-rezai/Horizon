/* ============================================================
   HORIZON — History
   Multi-year reconstructed actuals · configurable range · year archive
   Only covers years with at least one imported CSV statement.
   ============================================================ */
const { T: H } = window;
const H_MONTHS = [
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
const H_COLS = "22px 90px 1fr 1fr 1fr 1fr";

function RangeChips({ range, setRange, options }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        background: H.color.ink2,
        border: `1px solid ${H.color.line}`,
        borderRadius: H.radius.md,
        padding: 3,
      }}
    >
      {options.map((o) => {
        const active = range === o.value;
        return (
          <button
            key={o.value}
            onClick={() => setRange(o.value)}
            style={{
              padding: "7px 14px",
              borderRadius: 7,
              fontFamily: H.font.ui,
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              color: active ? H.color.onAccent : H.color.textMuted,
              background: active ? H.color.accent : "transparent",
              transition: "all .14s ease",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function HistoryYearSection({ year, months, files, open, onToggle, go }) {
  const { Money, Icon, Badge } = window;
  const dec = months[months.length - 1];
  const yearNet = months.reduce((s, m) => s + m.netCashflow, 0);
  const stTotal = months.filter((m) => m.isSTMonth).length; // count only, amount pulled below
  const stAmount = months.reduce((s, m, i) => {
    if (!m.isSTMonth) return s;
    const prev = i > 0 ? months[i - 1].restschuld : m.restschuld;
    return s + Math.max(0, prev - m.restschuld);
  }, 0);
  return (
    <div style={{ borderBottom: `1px solid ${H.color.line}` }}>
      <div
        onClick={onToggle}
        onMouseEnter={(e) => (e.currentTarget.style.background = H.color.ink3)}
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = open
            ? H.color.ink1
            : "transparent")
        }
        style={{
          display: "grid",
          gridTemplateColumns: H_COLS,
          gap: 16,
          alignItems: "center",
          padding: "15px 18px",
          cursor: "pointer",
          transition: "background .12s",
          background: open ? H.color.ink1 : "transparent",
        }}
      >
        <span
          style={{
            color: open ? H.color.accent : H.color.textDim,
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform .18s",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icon name="chevronRight" size={17} />
        </span>
        <span
          className="mono"
          style={{ fontSize: 15, fontWeight: 600, color: H.color.text }}
        >
          {year}
        </span>
        <span style={{ textAlign: "right" }}>
          <Money cents={dec.totalLiquid} size="sm" color={H.color.pos} />
        </span>
        <span style={{ textAlign: "right" }}>
          <Money cents={dec.restschuld} size="sm" color={H.color.debt} />
        </span>
        <span style={{ textAlign: "right" }}>
          <Money cents={yearNet} size="sm" sign />
        </span>
        <span
          style={{ textAlign: "right" }}
          onClick={(e) => {
            e.stopPropagation();
            go("import");
          }}
        >
          <Badge tone="neutral">{`${files.length} statement${files.length === 1 ? "" : "s"}`}</Badge>
        </span>
      </div>

      {open && (
        <div className="hz-fade" style={{ paddingBottom: 8 }}>
          {months.map((m) => (
            <div
              key={m.i}
              onClick={() => go("month", null, { year, month: m.month })}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = H.color.ink3;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
              style={{
                display: "grid",
                gridTemplateColumns: H_COLS,
                gap: 16,
                alignItems: "center",
                padding: "9px 18px",
                cursor: "pointer",
                transition: "background .12s",
              }}
            >
              <span />
              <span
                className="mono"
                style={{ fontSize: 12.5, color: H.color.textMuted }}
              >
                {H_MONTHS[m.month]}
              </span>
              <span style={{ textAlign: "right" }}>
                <Money cents={m.totalLiquid} size="sm" color={H.color.text} />
              </span>
              <span style={{ textAlign: "right" }}>
                <Money
                  cents={m.restschuld}
                  size="sm"
                  color={H.color.textMuted}
                />
              </span>
              <span style={{ textAlign: "right" }}>
                <Money cents={m.netCashflow} size="sm" sign />
              </span>
              <span style={{ textAlign: "right" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    color: H.color.textDim,
                    ...H.type.label,
                    fontSize: 10,
                  }}
                >
                  View month
                  <Icon name="arrowRight" size={11} />
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function History({ go }) {
  const { PageHeader, Card, Icon } = window;
  const HZ = window.HZ;
  const allPts = HZ.history.pts;
  const years = HZ.history.years; // years with ≥1 imported statement, ascending

  const RANGE_OPTIONS = [
    { value: "1y", label: "1 Year", months: 12 },
    { value: "3y", label: "3 Years", months: 36 },
    { value: "all", label: "All history", months: Infinity },
  ];
  const [range, setRange] = React.useState("all");
  const rangeMonths = RANGE_OPTIONS.find((o) => o.value === range).months;
  const data = allPts.slice(Math.max(0, allPts.length - rangeMonths));

  const nonMortgage = HZ.accounts.filter((a) => a.kind !== "Mortgage");
  const series = [
    {
      key: "totalLiquid",
      name: "Total Liquid",
      color: H.color.liquid,
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
      color: H.color.debt,
      kind: "debt",
      width: 2,
      dashed: true,
    },
  ];
  const allOn = () => series.reduce((o, s) => ((o[s.key] = true), o), {});
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
      const saved = JSON.parse(localStorage.getItem("hz-history-visible-v1"));
      if (saved) return { ...defaults(), ...saved };
    } catch (e) {}
    return defaults();
  });
  React.useEffect(() => {
    try {
      localStorage.setItem("hz-history-visible-v1", JSON.stringify(visible));
    } catch (e) {}
  }, [visible]);
  const toggle = (key) => setVisible((v) => ({ ...v, [key]: !v[key] }));
  const solo = (key) =>
    setVisible(series.reduce((o, s) => ((o[s.key] = s.key === key), o), {}));
  const showAll = () => setVisible(allOn());
  const visibleCount = series.filter((s) => visible[s.key]).length;

  // group by year, restricted to years with imports; open the most recent by default
  const byYear = {};
  allPts.forEach((p) => {
    if (years.includes(p.year)) (byYear[p.year] = byYear[p.year] || []).push(p);
  });
  const [open, setOpen] = React.useState(years[years.length - 1]);

  const first = data[0],
    last = data[data.length - 1];
  const span = data.length;

  return (
    <div className="stagger">
      <PageHeader
        overline="History"
        title="Historical Trajectory"
        subtitle={`Reconstructed actuals · ${H_MONTHS[first.month]} ${first.year} – ${H_MONTHS[last.month]} ${last.year}`}
        actions={
          <RangeChips
            range={range}
            setRange={setRange}
            options={RANGE_OPTIONS}
          />
        }
      />

      <Card pad={24} style={{ marginTop: 26 }}>
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
                ...H.type.label,
                color: H.color.accent,
                marginBottom: 7,
              }}
            >
              Actuals
            </div>
            <div style={{ ...H.type.h1, color: H.color.text }}>
              {span} Months · {years.length} Years Imported
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              ...H.type.body,
              color: H.color.textDim,
              fontSize: 12.5,
              alignSelf: "flex-end",
            }}
          >
            <Icon name="filter" size={14} />
            {visibleCount} of {series.length} series · click to toggle
          </div>
        </div>
        <window.HistoryChart
          data={data}
          series={series}
          visible={visible}
          onToggle={toggle}
          onSolo={solo}
          onShowAll={showAll}
          height={320}
        />
      </Card>

      <Card pad={0} style={{ marginTop: 22, overflow: "hidden" }}>
        <div
          style={{
            padding: "18px 20px",
            borderBottom: `1px solid ${H.color.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ ...H.type.h2 }}>Year Archive</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              ...H.type.body,
              color: H.color.textDim,
              fontSize: 12.5,
            }}
          >
            <Icon name="database" size={14} />
            Only years with imported statements
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: H_COLS,
            gap: 16,
            padding: "11px 18px",
            borderBottom: `1px solid ${H.color.line}`,
            background: H.color.ink1,
            ...H.type.label,
            color: H.color.textFaint,
          }}
        >
          <span />
          <span>Year</span>
          <span style={{ textAlign: "right" }}>Total Liquid</span>
          <span style={{ textAlign: "right" }}>Restschuld</span>
          <span style={{ textAlign: "right" }}>Net Cashflow</span>
          <span style={{ textAlign: "right" }}>Imports</span>
        </div>
        {years
          .slice()
          .reverse()
          .map((y) => (
            <HistoryYearSection
              key={y}
              year={y}
              months={byYear[y]}
              files={HZ.importHistory.filter((f) => f.year === y)}
              open={open === y}
              onToggle={() => setOpen(open === y ? null : y)}
              go={go}
            />
          ))}
      </Card>
    </div>
  );
}

Object.assign(window, { History });
