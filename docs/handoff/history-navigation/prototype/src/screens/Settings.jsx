/* ============================================================
   HORIZON — Settings / Storage
   ============================================================ */
const { T: ST2 } = window;

function SettingRow({ icon, title, desc, children, last }) {
  const { Icon } = window;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "18px 4px",
        borderBottom: last ? "none" : `1px solid ${ST2.color.lineFaint}`,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: ST2.radius.md,
          display: "grid",
          placeItems: "center",
          background: ST2.color.ink3,
          color: ST2.color.textMuted,
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{ ...ST2.type.bodyMd, color: ST2.color.text, fontWeight: 600 }}
        >
          {title}
        </div>
        <div
          style={{
            ...ST2.type.body,
            color: ST2.color.textDim,
            fontSize: 12.5,
            marginTop: 2,
          }}
        >
          {desc}
        </div>
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ on }) {
  const [v, setV] = React.useState(on);
  return (
    <button
      onClick={() => setV(!v)}
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        background: v ? ST2.color.accent : ST2.color.ink5,
        position: "relative",
        transition: "background .18s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: v ? 21 : 3,
          width: 18,
          height: 18,
          borderRadius: 999,
          background: v ? ST2.color.onAccent : ST2.color.textMuted,
          transition: "left .18s",
        }}
      />
    </button>
  );
}

function Settings({ ui }) {
  const { PageHeader, Card, SectionHead, Button, Money, Badge, Icon } = window;
  const n = (ui && ui.notify) || (() => {});
  return (
    <div className="stagger">
      <PageHeader
        overline="System"
        title="Settings"
        subtitle="Offline-first · all data lives locally on this device"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
          gap: 22,
          marginTop: 26,
          alignItems: "start",
        }}
      >
        <Card pad={22}>
          <SectionHead
            label="Storage"
            title="Database"
            right={
              <Badge tone="pos">
                <Icon name="check" size={11} />
                Integrity OK
              </Badge>
            }
          />
          <div
            style={{
              background: ST2.color.ink0,
              borderRadius: ST2.radius.md,
              border: `1px solid ${ST2.color.line}`,
              padding: "14px 16px",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                ...ST2.type.label,
                color: ST2.color.textDim,
                marginBottom: 7,
              }}
            >
              Path
            </div>
            <div
              className="mono"
              style={{
                fontSize: 12.5,
                color: ST2.color.textMuted,
                wordBreak: "break-all",
              }}
            >
              %AppData%\Roaming\Horizon\horizon.db
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              style={{
                flex: 1,
                padding: "12px 14px",
                background: ST2.color.ink1,
                borderRadius: ST2.radius.md,
                border: `1px solid ${ST2.color.line}`,
              }}
            >
              <div
                style={{
                  ...ST2.type.label,
                  color: ST2.color.textDim,
                  marginBottom: 6,
                }}
              >
                Size
              </div>
              <span className="mono" style={{ fontSize: 16, fontWeight: 600 }}>
                2,4 MB
              </span>
            </div>
            <div
              style={{
                flex: 1,
                padding: "12px 14px",
                background: ST2.color.ink1,
                borderRadius: ST2.radius.md,
                border: `1px solid ${ST2.color.line}`,
              }}
            >
              <div
                style={{
                  ...ST2.type.label,
                  color: ST2.color.textDim,
                  marginBottom: 6,
                }}
              >
                WAL mode
              </div>
              <span
                className="mono"
                style={{ fontSize: 16, fontWeight: 600, color: ST2.color.pos }}
              >
                active
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <Button
              variant="primary"
              icon="download"
              full
              onClick={() =>
                n("Backup saved · horizon-2026-11-18.db", {
                  variant: "success",
                })
              }
            >
              Create backup
            </Button>
            <Button
              variant="secondary"
              icon="upload"
              full
              onClick={() =>
                n("Database restored from backup", { variant: "info" })
              }
            >
              Restore
            </Button>
          </div>
        </Card>

        <Card pad={22}>
          <SectionHead label="Application" title="Preferences" />
          <SettingRow
            icon="refresh"
            title="Automatic updates"
            desc="Via GitHub Releases · electron-updater"
          >
            <Toggle on={true} />
          </SettingRow>
          <SettingRow
            icon="sun"
            title="Appearance"
            desc="Dark mode is Horizon's identity"
          >
            <Badge>Dark</Badge>
          </SettingRow>
          <SettingRow
            icon="filter"
            title="Categories"
            desc="Recolor, rename, hide or add spending categories"
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() => ui.manageCategories && ui.manageCategories()}
            >
              Manage
            </Button>
          </SettingRow>
          <SettingRow
            icon="shield"
            title="Privacy"
            desc="No cloud · no telemetry · no account"
            last
          >
            <Badge tone="pos">Local</Badge>
          </SettingRow>
        </Card>

        <Card pad={22}>
          <SectionHead
            label="Notifications"
            title="Snackbar states"
            right={<Badge tone="neutral">Preview</Badge>}
          />
          <div
            style={{
              ...ST2.type.body,
              color: ST2.color.textDim,
              fontSize: 12.5,
              marginBottom: 16,
              marginTop: -6,
            }}
          >
            Horizon confirms actions and surfaces update status with snackbars.
            Trigger each state to preview it.
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                n("A new version (1.0.2) is available", {
                  variant: "info",
                  action: { label: "Install" },
                })
              }
            >
              Info
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                n("Account “Tagesgeld” saved", { variant: "success" })
              }
            >
              Success
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                n("Sondertilgung exceeds this year’s allowance", {
                  variant: "warning",
                })
              }
            >
              Warning
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                n("Couldn’t reach the update server", {
                  variant: "error",
                  action: { label: "Retry" },
                })
              }
            >
              Error
            </Button>
          </div>
        </Card>

        <Card pad={22} style={{ gridColumn: "1 / -1" }}>
          <SectionHead label="About" title="Horizon" />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <svg width="40" height="40" viewBox="0 0 30 30">
                <circle
                  cx="15"
                  cy="15"
                  r="13.5"
                  fill="none"
                  stroke={ST2.color.line}
                  strokeWidth="1.5"
                />
                <path
                  d="M3 18 Q15 9 27 18"
                  fill="none"
                  stroke={ST2.color.accent}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="22.5" cy="11" r="2.6" fill={ST2.color.accent} />
              </svg>
              <div>
                <div
                  style={{
                    ...ST2.type.bodyMd,
                    color: ST2.color.text,
                    fontWeight: 600,
                  }}
                >
                  Personal Finance Tracker for Long-Term Thinkers
                </div>
                <div
                  style={{
                    ...ST2.type.body,
                    color: ST2.color.textDim,
                    fontSize: 12.5,
                    marginTop: 2,
                  }}
                >
                  Electron · React · SQLite · offline-first
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div>
                <div
                  style={{
                    ...ST2.type.label,
                    color: ST2.color.textDim,
                    marginBottom: 5,
                  }}
                >
                  Version
                </div>
                <span
                  className="mono"
                  style={{ fontSize: 14, color: ST2.color.textMuted }}
                >
                  1.0.1
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon="refresh"
                onClick={() =>
                  n("You’re on the latest version (1.0.1)", { variant: "info" })
                }
              >
                Check for updates
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { Settings });
