/* ============================================================
   HORIZON — Outlook (Plan Page · Projection Accordion)
   ============================================================ */
const { T: O } = window;
const MONTHS_DE = [
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
const ACC_COLS = "22px 80px 1fr 1fr 1fr 1fr";

function YearSection({
  year,
  months,
  summary,
  open,
  onToggle,
  go,
  sectionRef,
}) {
  const { Money, Icon } = window;
  const yearNet = months.reduce((s, m) => s + m.netCashflow, 0);
  return (
    <div ref={sectionRef} style={{ borderBottom: `1px solid ${O.color.line}` }}>
      <div
        onClick={onToggle}
        onMouseEnter={(e) => (e.currentTarget.style.background = O.color.ink3)}
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = open
            ? O.color.ink1
            : "transparent")
        }
        style={{
          display: "grid",
          gridTemplateColumns: ACC_COLS,
          gap: 16,
          alignItems: "center",
          padding: "15px 18px",
          cursor: "pointer",
          transition: "background .12s",
          background: open ? O.color.ink1 : "transparent",
        }}
      >
        <span
          style={{
            color: open ? O.color.accent : O.color.textDim,
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
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: summary.isPayoffYear ? O.color.accent : O.color.text,
          }}
        >
          {year}
        </span>
        <span style={{ textAlign: "right" }}>
          <Money cents={summary.totalLiquid} size="sm" color={O.color.pos} />
        </span>
        <span style={{ textAlign: "right" }}>
          {summary.restschuld > 0 ? (
            <Money cents={summary.restschuld} size="sm" color={O.color.debt} />
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                color: O.color.accent,
              }}
            >
              <Icon name="flag" size={12} />
              <span className="mono" style={{ fontSize: 13, fontWeight: 600 }}>
                0,00 €
              </span>
            </span>
          )}
        </span>
        <span style={{ textAlign: "right" }}>
          <Money cents={yearNet} size="sm" sign />
        </span>
        <span style={{ textAlign: "right" }}>
          {summary.st > 0 ? (
            <Money cents={-summary.st} size="sm" color={O.color.textMuted} />
          ) : (
            <span
              className="mono"
              style={{ color: O.color.textFaint, fontSize: 13 }}
            >
              —
            </span>
          )}
        </span>
      </div>

      {open && (
        <div className="hz-fade" style={{ paddingBottom: 8 }}>
          {months.map((m) => {
            const baseBg = m.isPayoffMonth
              ? O.color.accentDim
              : m.isSTMonth
                ? "rgba(206,130,120,0.07)"
                : "transparent";
            return (
              <div
                key={m.i}
                onClick={() => go("month", null, { year, month: m.month })}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = O.color.ink3;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = baseBg;
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: ACC_COLS,
                  gap: 16,
                  alignItems: "center",
                  padding: "9px 18px",
                  cursor: "pointer",
                  transition: "background .12s",
                  background: baseBg,
                }}
              >
                <span />
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    className="mono"
                    style={{
                      fontSize: 12.5,
                      color: m.isPayoffMonth
                        ? O.color.accent
                        : O.color.textMuted,
                    }}
                  >
                    {MONTHS_DE[m.month]}
                  </span>
                  {m.isPayoffMonth && (
                    <Icon name="flag" size={11} color={O.color.accent} />
                  )}
                </span>
                <span style={{ textAlign: "right" }}>
                  <Money cents={m.totalLiquid} size="sm" color={O.color.text} />
                </span>
                <span style={{ textAlign: "right" }}>
                  <Money
                    cents={m.restschuld}
                    size="sm"
                    color={
                      m.restschuld > 0 ? O.color.textMuted : O.color.accent
                    }
                  />
                </span>
                <span style={{ textAlign: "right" }}>
                  <Money cents={m.netCashflow} size="sm" sign />
                </span>
                <span style={{ textAlign: "right" }}>
                  {m.isSTMonth ? (
                    <Money
                      cents={-summary.st}
                      size="sm"
                      color={O.color.textMuted}
                    />
                  ) : (
                    <span
                      className="mono"
                      style={{ color: O.color.textFaint, fontSize: 13 }}
                    >
                      —
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Outlook({ go, ctx }) {
  const { PageHeader, Card, Money, StatBlock, Button, Icon } = window;
  const HZ = window.HZ;
  const targetYear = ctx && ctx.year ? ctx.year : HZ.today.year;
  const [open, setOpen] = React.useState(targetYear);
  const sectionRefs = React.useRef({});

  // When arriving with a target year (e.g. clicked from the dashboard Plan Summary),
  // open that year's section and scroll it into comfortable view.
  React.useEffect(() => {
    if (!(ctx && ctx.year)) return;
    setOpen(ctx.year);
    const id = requestAnimationFrame(() => {
      const el = sectionRefs.current[ctx.year];
      if (!el) return;
      let sc = el.parentElement;
      while (
        sc &&
        !(
          sc.scrollHeight > sc.clientHeight &&
          /(auto|scroll)/.test(getComputedStyle(sc).overflowY)
        )
      )
        sc = sc.parentElement;
      if (!sc) return;
      const top =
        el.getBoundingClientRect().top -
        sc.getBoundingClientRect().top +
        sc.scrollTop -
        80;
      sc.scrollTo({ top, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [ctx && ctx.year]);

  const byYear = {};
  HZ.projection.forEach((p) => {
    (byYear[p.year] = byYear[p.year] || []).push(p);
  });
  const years = HZ.yearSummaries;
  const endLiquid = HZ.projection[HZ.projection.length - 1].totalLiquid;
  const totalST = years.reduce((s, y) => s + y.st, 0);

  return (
    <div className="stagger">
      <PageHeader
        overline="Outlook"
        title="Financial Plan"
        subtitle="240-month projection · Recurring-Only Engine"
        actions={
          <Button variant="secondary" icon="refresh">
            Recalculate
          </Button>
        }
      />

      <Card
        pad={0}
        style={{ marginTop: 26, display: "flex", overflow: "hidden" }}
      >
        <div
          style={{
            flex: 1,
            padding: "20px 24px",
            borderRight: `1px solid ${O.color.line}`,
          }}
        >
          <StatBlock label="Total Liquid · 2045">
            <Money cents={endLiquid} size="lg" color={O.color.pos} />
          </StatBlock>
        </div>
        <div
          style={{
            flex: 1,
            padding: "20px 24px",
            borderRight: `1px solid ${O.color.line}`,
          }}
        >
          <StatBlock label="Debt-free" hint="first month with Restschuld 0">
            <span
              className="mono"
              style={{ fontSize: 30, fontWeight: 600, color: O.color.accent }}
            >
              Oct 2031
            </span>
          </StatBlock>
        </div>
        <div style={{ flex: 1, padding: "20px 24px" }}>
          <StatBlock
            label="Total Sondertilgung"
            hint={`${years.filter((y) => y.st > 0).length} annual payments`}
          >
            <Money cents={-totalST} size="lg" color={O.color.text} />
          </StatBlock>
        </div>
      </Card>

      <Card pad={0} style={{ marginTop: 22, overflow: "hidden" }}>
        <div
          style={{
            padding: "18px 20px",
            borderBottom: `1px solid ${O.color.line}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ ...O.type.h2 }}>Projection Accordion</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              ...O.type.body,
              color: O.color.textDim,
              fontSize: 12.5,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                background: O.color.accent,
              }}
            />
            Payoff year highlighted
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: ACC_COLS,
            gap: 16,
            padding: "11px 18px",
            borderBottom: `1px solid ${O.color.line}`,
            background: O.color.ink1,
            ...O.type.label,
            color: O.color.textFaint,
          }}
        >
          <span />
          <span>Period</span>
          <span style={{ textAlign: "right" }}>Total Liquid</span>
          <span style={{ textAlign: "right" }}>Restschuld</span>
          <span style={{ textAlign: "right" }}>Net Cashflow</span>
          <span style={{ textAlign: "right" }}>Sondertilgung</span>
        </div>
        {years.map((y) => (
          <YearSection
            key={y.year}
            year={y.year}
            summary={y}
            months={byYear[y.year]}
            sectionRef={(el) => {
              sectionRefs.current[y.year] = el;
            }}
            open={open === y.year}
            onToggle={() => setOpen(open === y.year ? null : y.year)}
            go={go}
          />
        ))}
      </Card>
    </div>
  );
}

Object.assign(window, { Outlook });
