/* ============================================================
   HORIZON — Import (CSV / bank statement import + history)
   ============================================================ */
const { T: IM } = window;

function Dropzone({ onPick }) {
  const { Icon, Button } = window;
  const [over, setOver] = React.useState(false);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onPick();
      }}
      onClick={onPick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 18,
        padding: "22px 24px",
        cursor: "pointer",
        borderRadius: IM.radius.xl,
        border: `1.5px dashed ${over ? IM.color.accent : IM.color.lineStrong}`,
        background: over ? IM.color.accentDim : IM.color.ink2,
        transition: "all .15s ease",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: IM.radius.lg,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          background: over ? IM.color.accent : IM.color.ink3,
          color: over ? IM.color.onAccent : IM.color.accent,
          transition: "all .15s ease",
        }}
      >
        <Icon name="upload" size={22} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ ...IM.type.h2, color: IM.color.text }}>
          Drop a bank statement to import
        </div>
        <div
          style={{
            ...IM.type.body,
            color: IM.color.textDim,
            fontSize: 13,
            marginTop: 3,
          }}
        >
          CSV from Sparkasse, DKB, ING and more · or click to browse
        </div>
      </div>
      <Button variant="secondary" icon="plus">
        Choose file
      </Button>
    </div>
  );
}

function FileRow({ file, onPreview, onReimport, onDelete, onRecat }) {
  const { Icon, Badge } = window;
  const HZ = window.HZ;
  const acct = HZ.accountById(file.account);
  const [h, setH] = React.useState(false);
  const fmt = (d) => {
    const x = new Date(d);
    return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][x.getMonth()]} ${x.getDate()}`;
  };
  const actionBtn = (icon, label, fn, danger) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        fn();
      }}
      title={label}
      aria-label={label}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? "rgba(206,130,120,0.16)"
          : IM.color.ink4;
        e.currentTarget.style.color = danger ? IM.color.neg : IM.color.text;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = IM.color.textDim;
      }}
      style={{
        display: "grid",
        placeItems: "center",
        width: 32,
        height: 32,
        borderRadius: IM.radius.md,
        color: IM.color.textDim,
        transition: "all .14s ease",
      }}
    >
      <Icon name={icon} size={16} />
    </button>
  );
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "32px 1fr 150px 90px 140px",
        gap: 16,
        alignItems: "center",
        padding: "12px 16px 12px 8px",
        borderRadius: IM.radius.md,
        background: h ? IM.color.ink2 : "transparent",
        transition: "background .12s",
      }}
    >
      <div
        style={{
          display: "grid",
          placeItems: "center",
          width: 32,
          height: 32,
          borderRadius: IM.radius.md,
          background: acct.color + "1a",
          color: acct.color,
        }}
      >
        <Icon name="banknote" size={16} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          className="mono"
          style={{
            fontSize: 13,
            color: IM.color.text,
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {file.filename}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 4,
          }}
        >
          <Badge color={acct.color}>{acct.name}</Badge>
          <span
            style={{ ...IM.type.body, color: IM.color.textDim, fontSize: 12 }}
          >
            {file.bank} · {file.sizeKB} KB
          </span>
        </div>
      </div>
      <span
        style={{ ...IM.type.body, color: IM.color.textMuted, fontSize: 12.5 }}
      >
        {fmt(file.from)} – {fmt(file.to)}
      </span>
      <span
        className="mono"
        style={{ textAlign: "right", fontSize: 13, color: IM.color.text }}
      >
        {file.count}
        <span style={{ color: IM.color.textFaint, fontSize: 11 }}> tx</span>
      </span>
      <div
        style={{
          display: "flex",
          gap: 2,
          justifyContent: "flex-end",
          opacity: h ? 1 : 0.35,
          transition: "opacity .14s",
        }}
      >
        {actionBtn("search", "Preview", onPreview)}
        {actionBtn("filter", "Re-categorize", onRecat)}
        {actionBtn("download", "Re-download CSV", onReimport)}
        {actionBtn("trash", "Delete import", onDelete, true)}
      </div>
    </div>
  );
}

function YearGroup({ year, files, open, onToggle, ...handlers }) {
  const { Icon } = window;
  const total = files.reduce((s, f) => s + f.count, 0);
  return (
    <div style={{ borderBottom: `1px solid ${IM.color.line}` }}>
      <div
        onClick={onToggle}
        onMouseEnter={(e) => (e.currentTarget.style.background = IM.color.ink2)}
        onMouseLeave={(e) =>
          (e.currentTarget.style.background = open
            ? IM.color.ink1
            : "transparent")
        }
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "15px 18px",
          cursor: "pointer",
          transition: "background .12s",
          background: open ? IM.color.ink1 : "transparent",
        }}
      >
        <span
          style={{
            color: open ? IM.color.accent : IM.color.textDim,
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
          style={{ fontSize: 16, fontWeight: 600, color: IM.color.text }}
        >
          {year}
        </span>
        <span style={{ flex: 1 }} />
        <span
          style={{ ...IM.type.body, color: IM.color.textDim, fontSize: 12.5 }}
        >
          {files.length} statement{files.length !== 1 ? "s" : ""}
        </span>
        <span
          className="mono"
          style={{
            fontSize: 12.5,
            color: IM.color.textMuted,
            minWidth: 80,
            textAlign: "right",
          }}
        >
          {total.toLocaleString("de-DE")} tx
        </span>
      </div>
      {open && (
        <div className="hz-fade" style={{ padding: "4px 12px 14px 40px" }}>
          {files.map((f) => (
            <FileRow
              key={f.id}
              file={f}
              onPreview={() => handlers.onPreview(f)}
              onReimport={() => handlers.onReimport(f)}
              onDelete={() => handlers.onDelete(f)}
              onRecat={() => handlers.onRecat(f)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Import({ ui }) {
  const { PageHeader, Card, Tabs, EmptyState, Button, Icon } = window;
  const HZ = window.HZ;
  const [acct, setAcct] = React.useState("all");
  const [openYear, setOpenYear] = React.useState(2026);

  const importAccounts = HZ.accounts.filter((a) =>
    ["Girokonto", "CreditCard", "Tagesgeld"].includes(a.kind)
  );
  const files = (ui && ui.importHistory) || HZ.importHistory;
  const filtered =
    acct === "all" ? files : files.filter((f) => f.account === acct);

  const byYear = {};
  filtered.forEach((f) => {
    (byYear[f.year] = byYear[f.year] || []).push(f);
  });
  const years = Object.keys(byYear)
    .map(Number)
    .sort((a, b) => b - a);

  const tabItems = [
    { value: "all", label: "All accounts", count: files.length },
  ].concat(
    importAccounts.map((a) => ({
      value: a.id,
      label: a.name,
      dot: a.color,
      count: files.filter((f) => f.account === a.id).length,
    }))
  );

  const totalTx = filtered.reduce((s, f) => s + f.count, 0);

  const handlers = {
    onPreview: (f) => ui.previewImport(f),
    onReimport: (f) =>
      ui.notify(`Re-downloading “${f.filename}”`, { variant: "info" }),
    onDelete: (f) =>
      ui.notify(
        `Import “${f.filename}” deleted · ${f.count} transactions removed`,
        { variant: "success", action: { label: "Undo" } }
      ),
    onRecat: (f) =>
      ui.notify(`Re-categorizing ${f.count} transactions in “${f.filename}”`, {
        variant: "info",
      }),
  };

  return (
    <div className="stagger">
      <PageHeader
        overline="Data"
        title="Import"
        subtitle="Bring bank statements into Horizon · everything stays on this device"
        actions={
          <Button
            variant="primary"
            icon="upload"
            onClick={() => ui.startImport(acct === "all" ? null : acct)}
          >
            New import
          </Button>
        }
      />

      <div style={{ marginTop: 26 }}>
        <Dropzone onPick={() => ui.startImport(acct === "all" ? null : acct)} />
      </div>

      <Card pad={0} style={{ marginTop: 22, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <div style={{ ...IM.type.h2 }}>Import history</div>
            <span
              style={{
                ...IM.type.body,
                color: IM.color.textDim,
                fontSize: 12.5,
              }}
            >
              {filtered.length} files · {totalTx.toLocaleString("de-DE")}{" "}
              transactions
            </span>
          </div>
          <Tabs items={tabItems} value={acct} onChange={setAcct} />
        </div>

        {years.length ? (
          years.map((y) => (
            <YearGroup
              key={y}
              year={y}
              files={byYear[y]}
              open={openYear === y}
              onToggle={() => setOpenYear(openYear === y ? null : y)}
              {...handlers}
            />
          ))
        ) : (
          <EmptyState
            icon="upload"
            title="No imports yet"
            hint="Drop a CSV above to bring in transactions from this account. Horizon remembers each bank's format for next time."
            action={
              <Button
                variant="primary"
                size="sm"
                icon="upload"
                onClick={() => ui.startImport(acct === "all" ? null : acct)}
              >
                Import a statement
              </Button>
            }
          />
        )}
      </Card>
    </div>
  );
}

Object.assign(window, { Import });
