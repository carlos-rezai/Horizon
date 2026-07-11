/* ============================================================
   HORIZON — Account Detail
   ============================================================ */
const { T: AD } = window;

function AccountDetail({ accountId, go, ui }) {
  const {
    Card,
    Avatar,
    Badge,
    Money,
    Button,
    Icon,
    Chip,
    DataRow,
    SectionHead,
    Sparkline,
    StatBlock,
  } = window;
  const HZ = window.HZ;
  const a = HZ.accountById(accountId) || HZ.accounts[0];

  const recurring = HZ.recurring.filter(
    (r) => r.account === a.id || r.linked === a.id
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
  const spark = [0.6, 0.65, 0.7, 0.68, 0.78, 0.82, 0.88, 0.9, 0.95, 1.0, 1.04];
  const isDebt = a.kind === "Mortgage" || a.balance < 0;
  const freq = { Monthly: "Monthly", Annual: "Annual", Quarterly: "Quarterly" };
  const perMonth = { Monthly: 1, Quarterly: 1 / 3, Annual: 1 / 12 };
  const monthlyNet = recurring
    .filter((r) => r.account === a.id)
    .reduce((s, r) => s + r.amount * (perMonth[r.freq] || 1), 0);
  const toOrdinal = (n) => {
    const s = ["th", "st", "nd", "rd"],
      v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  return (
    <div className="stagger">
      <button
        onClick={() => go("dashboard")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          color: AD.color.textMuted,
          ...AD.type.body,
          marginBottom: 18,
          fontWeight: 500,
        }}
      >
        <Icon name="arrowLeft" size={16} /> Back to Dashboard
      </button>

      <Card pad={24}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Avatar account={a} size={56} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h1 style={{ ...AD.type.h1, margin: 0 }}>{a.name}</h1>
                <Chip color={a.color} />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 7,
                }}
              >
                <Badge
                  tone={HZ.LIQUID_KINDS.includes(a.kind) ? "pos" : "neutral"}
                >
                  {a.kind}
                </Badge>
                <span
                  style={{
                    ...AD.type.body,
                    color: AD.color.textDim,
                    fontSize: 13,
                  }}
                >
                  {a.sub}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="ghost"
              size="sm"
              icon="pencil"
              onClick={() => ui.editAccount(a)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon="trash"
              onClick={() => {
                ui.notify(`“${a.name}” deleted`, {
                  variant: "success",
                  action: { label: "Undo" },
                });
                go("dashboard");
              }}
            >
              Delete
            </Button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: 22,
            paddingTop: 22,
            borderTop: `1px solid ${AD.color.line}`,
          }}
        >
          <StatBlock label={isDebt ? "Restschuld" : "Current Balance"}>
            <Money
              cents={a.balance}
              size="lg"
              color={isDebt ? AD.color.neg : AD.color.text}
            />
          </StatBlock>
          <Sparkline
            data={isDebt ? spark.slice().reverse() : spark}
            color={isDebt ? AD.color.debt : AD.color.pos}
            fill
            width={200}
            height={48}
          />
        </div>
      </Card>

      <Card
        pad={0}
        style={{ marginTop: 22, display: "flex", overflow: "hidden" }}
      >
        {[
          [
            "Opening Balance",
            a.kind === "Mortgage" ? 10800000 : Math.round(a.balance * 0.7),
          ],
          ["Opening Date", a.openingDate],
          ["Recurring", recurring.length],
          ["Recurring net / mo", Math.round(monthlyNet)],
        ].map(([l, v], i) => (
          <div
            key={l}
            style={{
              flex: 1,
              padding: "18px 22px",
              borderRight: i < 3 ? `1px solid ${AD.color.line}` : "none",
            }}
          >
            <div
              style={{
                ...AD.type.label,
                color: AD.color.textDim,
                marginBottom: 10,
              }}
            >
              {l}
            </div>
            {l === "Recurring" ? (
              <span className="mono" style={{ fontSize: 22, fontWeight: 600 }}>
                {v}
              </span>
            ) : l === "Recurring net / mo" ? (
              <Money cents={v} size="md" sign />
            ) : typeof v === "number" ? (
              <Money cents={v} size="md" color={AD.color.textMuted} />
            ) : (
              <span
                className="mono"
                style={{ fontSize: 14, color: AD.color.textMuted }}
              >
                {v}
              </span>
            )}
          </div>
        ))}
      </Card>

      <Card pad={22} style={{ marginTop: 22 }}>
        <SectionHead
          label="Recurring"
          title="Recurring transactions"
          right={
            <Button
              variant="primary"
              size="sm"
              icon="plus"
              onClick={() => ui.addRecurring(a)}
            >
              Add recurring
            </Button>
          }
        />

        {recurring.length ? (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 150px 120px 110px",
                gap: 16,
                padding: "0 14px 10px",
                ...AD.type.label,
                color: AD.color.textFaint,
              }}
            >
              <span>Name</span>
              <span style={{ textAlign: "right" }}>Amount</span>
              <span style={{ textAlign: "right" }}>Day</span>
              <span style={{ textAlign: "right" }}>Frequency</span>
            </div>
            {recurring.map((r, i) => {
              const linked = r.linked ? HZ.accountById(r.linked) : null;
              const cat = HZ.categories.find((c) => c.key === r.category);
              return (
                <DataRow
                  key={r.id}
                  cols="1fr 150px 120px 110px"
                  last={i === recurring.length - 1}
                  onClick={() => ui.editRecurring(a, r)}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 9 }}
                    >
                      <span
                        style={{
                          ...AD.type.bodyMd,
                          color: AD.color.text,
                          fontWeight: 500,
                        }}
                      >
                        {r.label}
                      </span>
                      {cat && <Badge color={cat.color}>{cat.label}</Badge>}
                    </div>
                    {linked && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          marginTop: 4,
                        }}
                      >
                        <Icon
                          name="arrowRight"
                          size={12}
                          color={AD.color.textDim}
                        />
                        <Chip color={linked.color} size="sm" />
                        <span
                          style={{
                            ...AD.type.body,
                            color: AD.color.textDim,
                            fontSize: 12,
                          }}
                        >
                          {linked.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <span style={{ textAlign: "right" }}>
                    <Money cents={r.amount} sign />
                  </span>
                  <span
                    className="mono"
                    style={{
                      textAlign: "right",
                      fontSize: 12.5,
                      color: AD.color.textMuted,
                    }}
                  >
                    {toOrdinal(r.day || r.monthOfYear || 1)}
                  </span>
                  <span style={{ textAlign: "right" }}>
                    <Badge>{freq[r.freq] || r.freq}</Badge>
                  </span>
                </DataRow>
              );
            })}
          </div>
        ) : (
          <window.EmptyState
            icon="refresh"
            title="No recurring transactions"
            hint="Add a salary, rent, savings rate, or Sondertilgung to drive the projection."
            action={
              <Button
                variant="primary"
                size="sm"
                icon="plus"
                onClick={() => ui.addRecurring(a)}
              >
                Add recurring
              </Button>
            }
          />
        )}
      </Card>
    </div>
  );
}

Object.assign(window, { AccountDetail });
