/* ============================================================
   HORIZON — Shell (Sidebar + Clock)
   ============================================================ */
const { T: S } = window;
const { Icon: S_Icon } = window;

function SidebarClock() {
  const [now, setNow] = React.useState(new Date(2026, 10, 18, 9, 41, 0));
  React.useEffect(() => {
    const id = setInterval(
      () => setNow((d) => new Date(d.getTime() + 1000)),
      1000
    );
    return () => clearInterval(id);
  }, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
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
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: S.radius.lg,
        background: S.color.ink1,
        border: `1px solid ${S.color.line}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
        <span
          className="mono"
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: S.color.text,
            letterSpacing: "-0.02em",
          }}
        >
          {hh}:{mm}
        </span>
        <span
          className="mono"
          style={{ fontSize: 14, color: S.color.textDim, marginLeft: 1 }}
        >
          :{ss}
        </span>
      </div>
      <div
        style={{
          ...S.type.body,
          color: S.color.textMuted,
          marginTop: 4,
          fontSize: 12.5,
        }}
      >
        {days[now.getDay()]}, {months[now.getMonth()]} {now.getDate()}
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  const [h, setH] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      className="focusable"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "10px 12px",
        borderRadius: S.radius.md,
        textAlign: "left",
        color: active ? S.color.text : h ? S.color.text : S.color.textMuted,
        background: active
          ? S.color.accentDim
          : h
            ? S.color.ink2
            : "transparent",
        border: `1px solid ${active ? S.color.accentLine : "transparent"}`,
        fontFamily: S.font.ui,
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        transition: "all .14s ease",
        position: "relative",
      }}
    >
      {active && (
        <span
          style={{
            position: "absolute",
            left: -1,
            top: 9,
            bottom: 9,
            width: 2.5,
            borderRadius: 999,
            background: S.color.accent,
          }}
        />
      )}
      <span
        style={{
          color: active ? S.color.accent : "inherit",
          display: "grid",
          placeItems: "center",
        }}
      >
        <S_Icon name={icon} size={18} stroke={active ? 2.2 : 2} />
      </span>
      {label}
    </button>
  );
}

function Sidebar({ route, go }) {
  const nav = [
    { id: "dashboard", icon: "dashboard", label: "Dashboard" },
    { id: "outlook", icon: "outlook", label: "Outlook" },
    { id: "month", icon: "calendar", label: "Month" },
    { id: "import", icon: "upload", label: "Import" },
  ];
  return (
    <aside
      style={{
        width: 236,
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "22px 16px",
        borderRight: `1px solid ${S.color.line}`,
        background: S.color.ink1,
      }}
    >
      {/* wordmark */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "4px 8px 22px",
        }}
      >
        <div
          style={{ position: "relative", width: 30, height: 30, flexShrink: 0 }}
        >
          <svg width="30" height="30" viewBox="0 0 30 30">
            <circle
              cx="15"
              cy="15"
              r="13.5"
              fill="none"
              stroke={S.color.line}
              strokeWidth="1.5"
            />
            <path
              d="M3 18 Q15 9 27 18"
              fill="none"
              stroke={S.color.accent}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="22.5" cy="11" r="2.6" fill={S.color.accent} />
          </svg>
        </div>
        <span
          style={{
            fontFamily: S.font.ui,
            fontWeight: 600,
            fontSize: 18,
            letterSpacing: "0.16em",
            color: S.color.text,
          }}
        >
          HORIZON
        </span>
      </div>

      <div
        style={{
          ...S.type.label,
          color: S.color.textFaint,
          padding: "0 12px 10px",
        }}
      >
        Navigation
      </div>
      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {nav.map((n) => (
          <NavItem
            key={n.id}
            {...n}
            active={
              route === n.id || (route === "account" && n.id === "dashboard")
            }
            onClick={() => go(n.id, null, n.id === "month" ? null : undefined)}
          />
        ))}
      </nav>

      <div style={{ flex: 1 }} />

      <div style={{ marginBottom: 12 }}>
        <SidebarClock />
      </div>
      <NavItem
        icon="settings"
        label="Settings"
        active={route === "settings"}
        onClick={() => go("settings")}
      />
    </aside>
  );
}

Object.assign(window, { Sidebar, SidebarClock, NavItem });
