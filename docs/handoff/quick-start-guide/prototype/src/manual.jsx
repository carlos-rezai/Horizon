/* ============================================================
   HORIZON — In-App User Manual
   Slide-over drawer · TOC + expandable topic sections
   ============================================================ */
const { T: MN } = window;

const MANUAL_GROUPS = [
  { label: "Getting Started", items: ["start"] },
  { label: "Overview", items: ["dashboard", "streak"] },
  { label: "Planning", items: ["outlook", "month", "history"] },
  { label: "Data", items: ["import", "accounts", "categories"] },
  { label: "System", items: ["settings"] },
];

const MANUAL_TOPICS = {
  start: {
    icon: "flag",
    title: "Getting Started",
    blurb:
      "A suggested order for setting up Horizon the first time, from a blank database to a working projection.",
    details: [
      {
        h: "1. Create your accounts",
        b: "Start with every account whose balance you want Horizon to track. Each account needs a kind, a name, an opening balance and an opening date (the date that balance was true) — icon, color and the trajectory-visibility toggle are optional polish.",
        list: [
          {
            t: "Girokonto",
            d: "Everyday checking account — where salary lands and bills go out. Most users have exactly one.",
          },
          {
            t: "Tagesgeld",
            d: "Instant-access savings, kept separate from day-to-day spending so it isn\u2019t accidentally spent.",
          },
          {
            t: "Mortgage",
            d: "Tracks Restschuld (remaining loan balance) as a negative-facing balance. Opening balance is the Restschuld on your opening date, not the original loan amount — that\u2019s captured separately in step 2.",
          },
          {
            t: "CreditCard",
            d: "Needs a funding account and a settlement day, since its balance is settled from another account monthly rather than projected on its own.",
          },
          {
            t: "Investment",
            d: "ETF or brokerage holdings. Usually excluded from the Savings Streak by default since it grows from market performance, not a fixed monthly deposit.",
          },
        ],
      },
      {
        h: "2. Configure your mortgage",
        b: "If you added a Mortgage account, open its Edit (pencil) icon on the Dashboard\u2019s Mortgage Countdown card and fill in the original loan amount, the mortgage start date, and the term in years. This is what \u201c% paid off\u201d is measured against, so payments made before you started using Horizon are still reflected correctly.",
      },
      {
        h: "3. Add your recurring transactions",
        b: "Outlook and the Trajectory chart are driven only by recurring transactions — nothing is projected from guesswork. From each account\u2019s detail page, add salary, rent, savings transfers, ETF contributions and Sondertilgung payments, with an amount, frequency and day. Link a transfer to another account (e.g. a savings-rate line linked from Girokonto to Tagesgeld) to model money moving between two of your accounts, or link a Sondertilgung to your Mortgage account to model it paying down Restschuld.",
      },
      {
        h: "4. Set a savings goal",
        b: "Open the Savings Streak card on the Dashboard and click the pencil to set a goal. Milestone mode — a total amount and target date, auto-split across accounts — is the recommended starting point; switch to Manual only if you want to set each account\u2019s monthly target by hand.",
      },
      {
        h: "5. Import your history (optional but recommended)",
        b: "From Import, bring in past bank statement CSVs for each account. This backfills History with reconstructed actuals and lets Month Overview show real variable spending instead of starting from zero.",
      },
      {
        h: "6. Read the Trajectory chart",
        b: "Back on the Dashboard, Trajectory Horizon plots Total Liquid, each account, and Restschuld ten years out based on everything set up above. Use it to sanity-check the setup: balances should trend the way you\u2019d expect, and the payoff marker should land on a believable date. Toggle series on and off to inspect one account\u2019s line at a time.",
      },
    ],
  },
  dashboard: {
    icon: "dashboard",
    title: "Dashboard",
    img: "src/manual-assets/dashboard.png",
    blurb:
      "Your financial horizon at a glance: four headline KPIs, the Trajectory Horizon chart, your accounts, mortgage countdown and plan summary.",
    details: [
      {
        h: "KPI strip",
        b: "Total Liquid, Restschuld (remaining mortgage debt), Net Cashflow and time-to-payoff. Each liquid/debt tile carries a small trend sparkline and a percentage delta.",
      },
      {
        h: "Trajectory Horizon chart",
        b: '10-year projection combining every account plus Restschuld. Click a legend pill to toggle that line, click "Show all" to reset, or hold to solo a single series. The dashed gold line marks the mortgage payoff month.',
      },
      {
        h: "Accounts list",
        b: "Drag the grip handle to reorder accounts — the order is remembered and reused across Dashboard, Import and Month Overview account tabs. Click a row to open Account Detail.",
      },
      {
        h: "Mortgage Countdown",
        b: "Shows % paid off against the original loan amount, years/months remaining, and the payoff date. Click the pencil to edit origination details (original principal, start date, term).",
      },
      {
        h: "Plan Summary",
        b: "A condensed 7-year preview of the Outlook accordion. Click a row to jump straight to that year in Outlook.",
      },
    ],
  },
  streak: {
    icon: "flame",
    title: "Savings Streak",
    img: "src/manual-assets/savings-goal.png",
    blurb:
      "A motivational card under Trajectory Horizon that tracks whether you hit your monthly savings target, account by account, month by month.",
    details: [
      {
        h: "Two goal modes",
        b: "Milestone (recommended): set a total amount and a target date — Horizon auto-splits the monthly figure across your tracked accounts, weighted by each account\u2019s trailing 12-month average gain. Manual: type the monthly euro target per account directly. Editing any value while in Milestone mode switches you to Manual.",
      },
      {
        h: "Calendar strip",
        b: "Twelve tiles, Jan\u2013Dec. Filled gold tiles are months where every tracked account hit its target; dim tiles are missed months; dashed tiles are future months still to come.",
      },
      {
        h: "Tracked vs. untracked accounts",
        b: 'Expand the card to see each account\u2019s progress bar and monthly target. Accounts with no target set show "Not tracked" and are excluded from the streak math — useful for accounts with irregular large withdrawals.',
      },
      {
        h: "Streak count",
        b: 'The number next to the flame is your current consecutive-month streak; "best" shows your all-time record.',
      },
    ],
  },
  outlook: {
    icon: "outlook",
    title: "Outlook",
    img: "src/manual-assets/outlook.png",
    blurb:
      "The full 240-month (20-year) projection, driven only by your recurring transactions — no variable spending is guessed at.",
    details: [
      {
        h: "Summary strip",
        b: "Total Liquid at the end of the projection, the debt-free month, and total Sondertilgung (extra mortgage repayments) paid across all years.",
      },
      {
        h: "Projection Accordion",
        b: "One row per year — click to expand into its twelve months. The payoff year and its exact month are highlighted in gold; months with a Sondertilgung payment are tinted.",
      },
      {
        h: "Jump to a month",
        b: "Click any month row to open Month Overview for that period.",
      },
      {
        h: "Recalculate",
        b: "Re-runs the projection after you\u2019ve added or edited recurring transactions or account balances.",
      },
    ],
  },
  month: {
    icon: "calendar",
    title: "Month Overview",
    img: "src/manual-assets/month.png",
    blurb:
      "Variable (non-recurring) spending for a single month, with category breakdown and account filters.",
    details: [
      {
        h: "Month navigation",
        b: "Step one month at a time with the arrows, or click the month/year label to jump directly via the picker — bounded to the range of months you\u2019ve imported statements for.",
      },
      {
        h: "Spending list",
        b: "Filter by account using the tabs above the list. Click any row to edit its description, amount, date or category — or delete it.",
      },
      {
        h: "Add expense",
        b: "Manually log a one-off purchase without importing a statement: description, amount, date, account and category.",
      },
      {
        h: "Breakdown donut",
        b: "Spending this month grouped by category, largest first.",
      },
      {
        h: "Year comparison",
        b: 'Marked "Planned" — shows year-to-date spending by category against the same period last year once available.',
      },
    ],
  },
  history: {
    icon: "clock",
    title: "History",
    img: "src/manual-assets/history.png",
    blurb:
      "Reconstructed actuals — the real trajectory of your accounts over time, built from imported bank statements only.",
    details: [
      {
        h: "Range chips",
        b: "1 Year, 3 Years or All history, applied to the chart above the Year Archive.",
      },
      {
        h: "Year Archive",
        b: "Only years with at least one imported statement appear here. Expand a year to see its months, or click the statement-count badge to jump to Import.",
      },
      {
        h: "Chart series",
        b: "Same toggle/solo/show-all behavior as the Dashboard\u2019s Trajectory chart.",
      },
    ],
  },
  import: {
    icon: "upload",
    title: "Import",
    img: "src/manual-assets/import.png",
    blurb:
      "Bring bank statement CSVs into Horizon. Everything is parsed and stored locally — nothing leaves this device.",
    details: [
      {
        h: "Drop or browse",
        b: "Drag a CSV onto the dropzone, or click Choose file / New import to launch the wizard. Horizon recognizes Sparkasse, DKB, ING and other common export formats automatically.",
      },
      {
        h: "Step 1 \u2014 Account",
        b: "Confirm which account the statement belongs to. Horizon shows the detected bank format.",
        img: "src/manual-assets/import-wizard.png",
      },
      {
        h: "Step 2 \u2014 Map columns",
        b: "Horizon remembers your last column mapping per bank (date / description / amount) and pre-fills it — adjust only if the export format changed.",
      },
      {
        h: "Step 3 \u2014 Review & categorize",
        b: "Each row can be included or excluded, and re-categorized before import. Likely duplicates and rows that match an existing recurring transaction are unchecked by default so you don\u2019t double-count them.",
      },
      {
        h: "Import history",
        b: "Every past import is listed by year, with per-file actions: preview its transactions, re-categorize, re-download the source CSV, or delete the import (which removes its transactions too).",
      },
    ],
  },
  accounts: {
    icon: "landmark",
    title: "Accounts",
    img: "src/manual-assets/account-detail.png",
    blurb:
      "Each account\u2014Girokonto, Tagesgeld, Mortgage, Credit Card or Investment\u2014has its own detail page with balance history and recurring transactions.",
    details: [
      {
        h: "Account kinds explained",
        b: "Pick the kind that matches how the account behaves, not just its bank label — it changes which fields show up and how the account feeds the projection.",
        list: [
          {
            t: "Girokonto",
            d: "A liquid checking account. Included in Total Liquid and shown in Trajectory by default.",
          },
          {
            t: "Tagesgeld",
            d: "A liquid savings account, kept distinct from Girokonto so spending and saving don\u2019t mix in the charts.",
          },
          {
            t: "Mortgage",
            d: "The only debt kind. Its balance is treated as Restschuld throughout the app (Dashboard KPI, Outlook, History) and it powers the Mortgage Countdown card.",
          },
          {
            t: "CreditCard",
            d: "Not counted in Total Liquid. Requires a funding account and a settlement day — Horizon assumes the balance is paid off from that account each month.",
          },
          {
            t: "Investment",
            d: "Liquid but typically excluded from the Savings Streak by default, since its growth comes from performance rather than a fixed transfer.",
          },
        ],
      },
      {
        h: "Create / edit an account",
        b: 'Set kind, name, opening balance and date, icon and color. Credit cards need a funding (settlement) account; mortgages get a Sondertilgung allowance field. "Display in Trajectory Horizon" controls whether the account appears as a line on the Dashboard chart by default.',
        img: "src/manual-assets/add-account.png",
      },
      {
        h: "Recurring transactions",
        b: "Salary, rent, savings transfers, ETF plans, Sondertilgung — anything that repeats. Set amount, direction, frequency (Monthly / Quarterly / Annual), day of month, category, and optionally link it to another account as a transfer. Linking a recurring payment to a Mortgage account models a Sondertilgung that reduces Restschuld.",
      },
      {
        h: "Editing a transaction",
        b: "Click any row in Month Overview or Account Detail to edit it. Transfer legs are read-only — deleting one removes both legs of the transfer.",
      },
      {
        h: "Deleting an account",
        b: "Removes the account and its recurring transactions from every projection. There\u2019s no archive/restore — export a backup from Settings first if you might need the history later.",
      },
    ],
  },
  categories: {
    icon: "filter",
    title: "Categories",
    img: "src/manual-assets/categories.png",
    blurb:
      "Manage the categories used to tag spending, from Settings \u2192 Preferences \u2192 Categories \u2192 Manage.",
    details: [
      {
        h: "Default categories",
        b: "Can be recolored or hidden, but not deleted or renamed.",
      },
      {
        h: "Custom categories",
        b: "Add your own with a name and color. Rename by clicking the name; recolor via the swatch; hide to keep old data intact without cluttering pickers.",
      },
      {
        h: "Deleting a category in use",
        b: "If transactions still reference it, Horizon asks you to reassign them to another category first, then deletes it.",
      },
    ],
  },
  settings: {
    icon: "settings",
    title: "Settings",
    img: "src/manual-assets/settings.png",
    blurb:
      "Storage, preferences and app info. Horizon is offline-first: no cloud, no telemetry, no account.",
    details: [
      {
        h: "Database",
        b: "Shows the local file path, size and WAL mode status. Create a manual backup or restore from one at any time.",
      },
      {
        h: "Preferences",
        b: "Toggle automatic updates, and open the Categories manager. Appearance is fixed to dark — it\u2019s Horizon\u2019s identity.",
      },
      {
        h: "Notification previews",
        b: "Trigger each snackbar variant (info, success, warning, error) to see how Horizon confirms actions and surfaces update status.",
      },
      {
        h: "About",
        b: 'Current version and a manual "check for updates" action.',
      },
    ],
  },
};

function ManualDetail({ item }) {
  const [open, setOpen] = React.useState(false);
  const { Icon } = window;
  return (
    <div style={{ borderBottom: `1px solid ${MN.color.lineFaint}` }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="focusable"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "13px 4px",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            color: open ? MN.color.accent : MN.color.textDim,
            transform: open ? "rotate(90deg)" : "none",
            transition: "transform .16s",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <Icon name="chevronRight" size={15} />
        </span>
        <span
          style={{
            ...MN.type.bodyMd,
            color: MN.color.text,
            fontWeight: 600,
            fontSize: 13.5,
          }}
        >
          {item.h}
        </span>
      </button>
      {open && (
        <div className="hz-fade" style={{ padding: "0 4px 16px 29px" }}>
          <div
            style={{
              ...MN.type.body,
              color: MN.color.textMuted,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            {item.b}
          </div>
          {item.list && (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {item.list.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "112px 1fr",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      ...MN.type.label,
                      color: MN.color.accent,
                      fontSize: 10.5,
                      paddingTop: 1,
                    }}
                  >
                    {row.t}
                  </span>
                  <span
                    style={{
                      ...MN.type.body,
                      color: MN.color.textMuted,
                      fontSize: 12.5,
                      lineHeight: 1.55,
                    }}
                  >
                    {row.d}
                  </span>
                </div>
              ))}
            </div>
          )}
          {item.img && (
            <img
              src={item.img}
              alt=""
              style={{
                width: "100%",
                borderRadius: MN.radius.lg,
                border: `1px solid ${MN.color.line}`,
                marginTop: 12,
                display: "block",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ManualSection({ id, topic, sectionRef }) {
  const { Icon, Badge } = window;
  return (
    <div
      ref={sectionRef}
      style={{ padding: "34px 0", borderBottom: `1px solid ${MN.color.line}` }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 34,
            height: 34,
            borderRadius: MN.radius.md,
            background: MN.color.accentDim,
            color: MN.color.accent,
            flexShrink: 0,
          }}
        >
          <Icon name={topic.icon} size={18} />
        </span>
        <h2 style={{ ...MN.type.h1, color: MN.color.text, margin: 0 }}>
          {topic.title}
        </h2>
      </div>
      <p
        style={{
          ...MN.type.bodyMd,
          color: MN.color.textMuted,
          fontSize: 14.5,
          lineHeight: 1.6,
          maxWidth: 620,
          margin: "0 0 18px",
        }}
      >
        {topic.blurb}
      </p>
      {topic.img && (
        <img
          src={topic.img}
          alt=""
          style={{
            width: "100%",
            borderRadius: MN.radius.xl,
            border: `1px solid ${MN.color.line}`,
            boxShadow: "0 16px 40px -18px rgba(0,0,0,0.6)",
            display: "block",
            marginBottom: 6,
          }}
        />
      )}
      <div style={{ marginTop: 14 }}>
        {topic.details.map((d, i) => (
          <ManualDetail key={i} item={d} />
        ))}
      </div>
    </div>
  );
}

const MANUAL_TRANSITION_MS = 320;

function ManualDrawer({ open, onClose }) {
  const { Icon } = window;
  const paneRef = React.useRef(null);
  const sectionRefs = React.useRef({});
  const [active, setActive] = React.useState("dashboard");
  const [mounted, setMounted] = React.useState(open);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setShown(true))
      );
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const t = setTimeout(() => setMounted(false), MANUAL_TRANSITION_MS);
    return () => clearTimeout(t);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!mounted) return null;

  const jump = (id) => {
    setActive(id);
    const el = sectionRefs.current[id];
    const pane = paneRef.current;
    if (!el || !pane) return;
    pane.scrollTo({ top: el.offsetTop - 18, behavior: "smooth" });
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 400,
        display: "flex",
        justifyContent: "flex-end",
        transition: `background-color ${MANUAL_TRANSITION_MS}ms ease`,
        backgroundColor: shown ? "rgba(6,8,11,0.66)" : "rgba(6,8,11,0)",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          backdropFilter: shown ? "blur(3px)" : "none",
          transition: `backdrop-filter ${MANUAL_TRANSITION_MS}ms ease`,
        }}
      />
      <div
        style={{
          position: "relative",
          width: "min(980px, 94vw)",
          height: "100%",
          background: MN.color.ink1,
          borderLeft: `1px solid ${MN.color.lineStrong}`,
          boxShadow: "-24px 0 60px -20px rgba(0,0,0,0.6)",
          display: "flex",
          flexDirection: "column",
          transform: shown ? "translateX(0)" : "translateX(100%)",
          transition: `transform ${MANUAL_TRANSITION_MS}ms cubic-bezier(.2,.7,.3,1)`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 28px",
            borderBottom: `1px solid ${MN.color.line}`,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 34,
                height: 34,
                borderRadius: MN.radius.md,
                background: MN.color.accentDim,
                color: MN.color.accent,
              }}
            >
              <Icon name="book" size={18} />
            </span>
            <div>
              <div style={{ ...MN.type.h2, color: MN.color.text }}>
                User Manual
              </div>
              <div
                style={{
                  ...MN.type.body,
                  color: MN.color.textDim,
                  fontSize: 12.5,
                }}
              >
                How to use Horizon
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="focusable"
            aria-label="Close manual"
            style={{
              display: "grid",
              placeItems: "center",
              width: 34,
              height: 34,
              borderRadius: MN.radius.md,
              color: MN.color.textMuted,
            }}
          >
            <Icon name="x" size={19} />
          </button>
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <nav
            style={{
              width: 216,
              flexShrink: 0,
              borderRight: `1px solid ${MN.color.line}`,
              padding: "20px 12px",
              overflowY: "auto",
            }}
          >
            {MANUAL_GROUPS.map((g) => (
              <div key={g.label} style={{ marginBottom: 18 }}>
                <div
                  style={{
                    ...MN.type.label,
                    color: MN.color.textFaint,
                    padding: "0 10px 8px",
                  }}
                >
                  {g.label}
                </div>
                {g.items.map((id) => {
                  const t = MANUAL_TOPICS[id];
                  const isActive = active === id;
                  return (
                    <button
                      key={id}
                      onClick={() => jump(id)}
                      className="focusable"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: MN.radius.md,
                        color: isActive ? MN.color.text : MN.color.textMuted,
                        background: isActive ? MN.color.ink3 : "transparent",
                        fontFamily: MN.font.ui,
                        fontSize: 13,
                        fontWeight: isActive ? 600 : 500,
                        textAlign: "left",
                        transition: "all .12s ease",
                      }}
                    >
                      <Icon
                        name={t.icon}
                        size={15}
                        color={isActive ? MN.color.accent : MN.color.textDim}
                      />
                      {t.title}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div
            ref={paneRef}
            style={{ flex: 1, overflowY: "auto", padding: "0 32px" }}
          >
            {Object.keys(MANUAL_TOPICS).map((id) => (
              <ManualSection
                key={id}
                id={id}
                topic={MANUAL_TOPICS[id]}
                sectionRef={(el) => {
                  sectionRefs.current[id] = el;
                }}
              />
            ))}
            <div style={{ height: 40 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ManualDrawer });
