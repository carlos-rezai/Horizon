/* ============================================================
   HORIZON — App root (router + shell + modals)
   ============================================================ */
const { T: A } = window;

const SNACK_VARIANTS = {
  info: { color: "info", dim: "infoDim", icon: "info" },
  success: { color: "pos", dim: "posDim", icon: "check" },
  warning: { color: "warn", dim: "warnDim", icon: "alert" },
  error: { color: "neg", dim: "negDim", icon: "x" },
};

function SnackActionBtn({ color, dim, label, onClick }) {
  const [h, setH] = React.useState(false);
  return (
    <button
      onClick={onClick}
      className="focusable"
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        ...A.type.label,
        fontSize: 11,
        color,
        padding: "5px 9px",
        borderRadius: A.radius.sm,
        background: h ? color + "33" : A.color[dim],
        whiteSpace: "nowrap",
        transition: "background .14s ease",
      }}
    >
      {label}
    </button>
  );
}

function SnackCloseBtn({ onClose }) {
  const [h, setH] = React.useState(false);
  return (
    <button
      onClick={onClose}
      aria-label="close"
      className="focusable"
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "grid",
        placeItems: "center",
        width: 24,
        height: 24,
        borderRadius: A.radius.sm,
        color: h ? A.color.text : A.color.textDim,
        background: h ? A.color.ink5 : "transparent",
        flexShrink: 0,
        transition: "all .14s ease",
      }}
    >
      <window.Icon name="x" size={15} />
    </button>
  );
}

function Snackbar({ snack, onClose }) {
  const v = SNACK_VARIANTS[snack.variant] || SNACK_VARIANTS.success;
  const c = A.color[v.color];
  return (
    <div
      className="hz-rise"
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        minWidth: 300,
        maxWidth: 460,
        padding: "12px 14px",
        borderRadius: A.radius.lg,
        background: A.color.ink4,
        border: `1px solid ${c}59`,
        boxShadow: "0 16px 40px -12px rgba(0,0,0,0.55)",
        pointerEvents: "auto",
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          width: 28,
          height: 28,
          borderRadius: 999,
          flexShrink: 0,
          background: A.color[v.dim],
          color: c,
        }}
      >
        <window.Icon name={v.icon} size={16} stroke={2.6} />
      </span>
      <span
        style={{
          flex: 1,
          ...A.type.bodyMd,
          color: A.color.text,
          fontWeight: 450,
          fontSize: 13.5,
        }}
      >
        {snack.message}
      </span>
      {snack.action && (
        <SnackActionBtn
          color={c}
          dim={v.dim}
          label={snack.action.label}
          onClick={() => {
            snack.action.onClick && snack.action.onClick();
            onClose();
          }}
        />
      )}
      <SnackCloseBtn onClose={onClose} />
    </div>
  );
}

function SnackStack({ snacks, onClose }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 300,
        display: "flex",
        flexDirection: "column-reverse",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {snacks.map((s) => (
        <Snackbar key={s.id} snack={s} onClose={() => onClose(s.id)} />
      ))}
    </div>
  );
}

function App() {
  const [route, setRoute] = React.useState("dashboard");
  const [accountId, setAccountId] = React.useState(null);
  const [monthCtx, setMonthCtx] = React.useState(null);
  const [accountModal, setAccountModal] = React.useState(null); // 'create' | accountObj | null
  const [spendingModal, setSpendingModal] = React.useState(false);
  const [recurringModal, setRecurringModal] = React.useState(null); // { account, recurring } | null
  const [txModal, setTxModal] = React.useState(null); // transaction | null
  const [mortgageModal, setMortgageModal] = React.useState(false);
  const [mortgage, setMortgage] = React.useState(window.HZ.mortgage);
  const [importWizard, setImportWizard] = React.useState(null); // { account } | null
  const [importPreview, setImportPreview] = React.useState(null); // file | null
  const [accountOrder, setAccountOrder] = React.useState(
    window.HZ.accounts.map((a) => a.id)
  );
  const [toast, setToast] = React.useState(null);
  const [snacks, setSnacks] = React.useState([]);
  const scrollRef = React.useRef(null);
  const snackId = React.useRef(0);

  const go = (r, id, meta) => {
    if (id) setAccountId(id);
    if (meta !== undefined) setMonthCtx(meta);
    setRoute(r);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  };

  const dismissSnack = (id) =>
    setSnacks((list) => list.filter((s) => s.id !== id));
  const notify = (message, opts = {}) => {
    const variant = typeof opts === "string" ? opts : opts.variant || "success";
    const action = typeof opts === "object" ? opts.action : null;
    const id = ++snackId.current;
    const duration =
      opts.duration ||
      (variant === "error" || variant === "warning" || action ? 6000 : 3200);
    setSnacks((list) => [...list.slice(-3), { id, variant, message, action }]);
    setTimeout(() => dismissSnack(id), duration);
  };
  // back-compat: existing modal callers do onToast("…") → success snackbar
  const pushToast = (message, opts) => notify(message, opts);

  const ui = {
    addAccount: () => setAccountModal("create"),
    editAccount: (a) => setAccountModal(a),
    addSpending: () => setSpendingModal(true),
    addRecurring: (account) => setRecurringModal({ account, recurring: null }),
    editRecurring: (account, recurring) =>
      setRecurringModal({ account, recurring }),
    editTransaction: (tx) => setTxModal(tx),
    editMortgage: () => setMortgageModal(true),
    mortgage,
    startImport: (account) => setImportWizard({ account }),
    previewImport: (file) => setImportPreview(file),
    importHistory: window.HZ.importHistory,
    accountOrder,
    reorderAccounts: setAccountOrder,
    notify,
  };

  const {
    Sidebar,
    Dashboard,
    Outlook,
    MonthOverview,
    AccountDetail,
    Settings,
    Import,
    AccountCreateModal,
    SpendingModal,
    RecurringModal,
    MortgageModal,
    ImportWizard,
    ImportPreview,
    TransactionEditModal,
  } = window;

  let screen;
  if (route === "dashboard") screen = <Dashboard go={go} ui={ui} />;
  else if (route === "outlook")
    screen = <Outlook go={go} ui={ui} ctx={monthCtx} />;
  else if (route === "month")
    screen = <MonthOverview go={go} ui={ui} ctx={monthCtx} />;
  else if (route === "import") screen = <Import go={go} ui={ui} />;
  else if (route === "account")
    screen = <AccountDetail accountId={accountId} go={go} ui={ui} />;
  else if (route === "settings") screen = <Settings go={go} ui={ui} />;

  return (
    <div style={{ display: "flex", height: "100%", background: A.color.ink0 }}>
      <Sidebar route={route} go={go} />
      <main
        ref={scrollRef}
        style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "40px 44px 80px",
          }}
          key={route + (accountId || "")}
        >
          {screen}
        </div>
      </main>

      {accountModal && (
        <AccountCreateModal
          onClose={() => setAccountModal(null)}
          account={accountModal === "create" ? null : accountModal}
          onToast={pushToast}
        />
      )}
      {spendingModal && (
        <SpendingModal
          onClose={() => setSpendingModal(false)}
          onToast={pushToast}
        />
      )}
      {recurringModal && (
        <RecurringModal
          onClose={() => setRecurringModal(null)}
          account={recurringModal.account}
          recurring={recurringModal.recurring}
          onToast={pushToast}
        />
      )}
      {txModal && (
        <TransactionEditModal
          onClose={() => setTxModal(null)}
          transaction={txModal}
          onToast={pushToast}
        />
      )}
      {mortgageModal && (
        <MortgageModal
          onClose={() => setMortgageModal(false)}
          meta={mortgage}
          current={window.HZ.accountById("a4").balance}
          onSave={(data) => {
            setMortgage(data);
            notify("Mortgage details updated", { variant: "success" });
          }}
        />
      )}
      {importWizard && (
        <ImportWizard
          onClose={() => setImportWizard(null)}
          presetAccount={importWizard.account}
          onToast={pushToast}
        />
      )}
      {importPreview && (
        <ImportPreview
          onClose={() => setImportPreview(null)}
          file={importPreview}
        />
      )}
      <SnackStack snacks={snacks} onClose={dismissSnack} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
