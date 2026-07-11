/* ============================================================
   HORIZON — Modals (Create/Edit Account · Add Expense)
   Faithful to repo AccountCreateModal field set.
   ============================================================ */
const { T: MD } = window;
const {
  Modal: MD_Modal,
  Input: MD_Input,
  Button: MD_Button,
  Icon: MD_Icon,
} = window;

const KINDS = [
  "Girokonto",
  "Tagesgeld",
  "Mortgage",
  "CreditCard",
  "Investment",
];
const ICON_SET = [
  "wallet",
  "home",
  "piggy",
  "trend",
  "card",
  "landmark",
  "building",
  "banknote",
];

/* ---- form field wrapper ---- */
function Field({ label, hint, children, style }) {
  return (
    <div style={{ ...style }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            ...MD.type.label,
            color: MD.color.textDim,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        {hint && (
          <span
            style={{
              ...MD.type.body,
              color: MD.color.textFaint,
              fontSize: 11,
              whiteSpace: "nowrap",
            }}
          >
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ---- styled native date input ---- */
function DateField({ value, onChange, disabled }) {
  const [f, setF] = React.useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        height: 40,
        padding: "0 12px",
        background: disabled ? MD.color.ink1 : MD.color.ink0,
        borderRadius: MD.radius.md,
        border: `1px solid ${f && !disabled ? MD.color.accent : MD.color.line}`,
        boxShadow: f && !disabled ? `0 0 0 3px ${MD.color.accentDim}` : "none",
        transition: "all .15s ease",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        onFocus={() => setF(true)}
        onBlur={() => setF(false)}
        style={{
          flex: 1,
          background: "none",
          border: "none",
          outline: "none",
          color: value ? MD.color.text : MD.color.textDim,
          fontFamily: MD.font.mono,
          fontSize: 13,
          colorScheme: "dark",
          cursor: disabled ? "not-allowed" : "text",
        }}
      />
    </div>
  );
}

/* ---- styled native select ---- */
function MiniSelect({ value, onChange, options }) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          height: 40,
          padding: "0 34px 0 12px",
          appearance: "none",
          background: MD.color.ink0,
          color: value ? MD.color.text : MD.color.textDim,
          border: `1px solid ${MD.color.line}`,
          borderRadius: MD.radius.md,
          fontFamily: MD.font.ui,
          fontSize: 14,
          outline: "none",
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option
            key={o.value}
            value={o.value}
            style={{ background: MD.color.ink4 }}
          >
            {o.label}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: MD.color.textDim,
        }}
      >
        <MD_Icon name="chevronDown" size={16} />
      </span>
    </div>
  );
}

/* ---- toggle switch ---- */
function MDToggle({ on, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      style={{
        width: 42,
        height: 24,
        borderRadius: 999,
        background: on ? MD.color.accent : MD.color.ink5,
        position: "relative",
        flexShrink: 0,
        transition: "background .18s",
        cursor: "pointer",
        border: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          width: 18,
          height: 18,
          borderRadius: 999,
          background: on ? MD.color.onAccent : MD.color.textMuted,
          transition: "left .18s",
        }}
      />
    </button>
  );
}

/* ---- selectable chip ---- */
function PickChip({ active, color, icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        padding: "7px 12px",
        borderRadius: MD.radius.pill,
        fontFamily: MD.font.ui,
        fontSize: 13,
        fontWeight: 500,
        background: active ? MD.color.accentDim : MD.color.ink0,
        color: active ? MD.color.text : MD.color.textMuted,
        border: `1px solid ${active ? MD.color.accent : MD.color.line}`,
        transition: "all .14s ease",
      }}
    >
      {color && (
        <span
          style={{ width: 9, height: 9, borderRadius: 999, background: color }}
        />
      )}
      {icon && (
        <MD_Icon
          name={icon}
          size={15}
          color={active ? MD.color.accent : MD.color.textDim}
        />
      )}
      {label}
    </button>
  );
}

/* ============================================================
   Create / Edit Account
   ============================================================ */
function AccountCreateModal({ onClose, account, onToast }) {
  const editing = !!(account && account.id);
  const palette = MD.accountColorPalette;
  const [kind, setKind] = React.useState(account?.kind || "Girokonto");
  const [name, setName] = React.useState(account?.name || "");
  const [bal, setBal] = React.useState(
    account ? (account.balance / 100).toFixed(2) : "0.00"
  );
  const [date, setDate] = React.useState(account?.openingDate || "");
  const [stAllow, setStAllow] = React.useState(
    account?.stAllowance ? (account.stAllowance / 100).toFixed(2) : "20000.00"
  );
  const [linked, setLinked] = React.useState(account?.linked || "");
  const [settleDay, setSettleDay] = React.useState("28");
  const [icon, setIcon] = React.useState(
    account?.icon || window.HZ_KIND_ICON[account?.kind] || "wallet"
  );
  const [color, setColor] = React.useState(
    account?.color || palette[Math.floor(Math.random() * palette.length)]
  );
  const [showInTraj, setShowInTraj] = React.useState(
    account?.showInTrajectory !== false
  );

  const giro = window.HZ.accounts.filter((a) => a.kind === "Girokonto");
  const preview = { kind, color, name: name || "New account" };
  const canSubmit = name.trim() && date;

  const submit = () => {
    if (!canSubmit) return;
    onToast(editing ? `“${name}” updated` : `“${name}” created`);
    onClose();
  };

  return (
    <MD_Modal
      open
      onClose={onClose}
      title={editing ? "Edit account" : "Create account"}
      width={540}
      footer={
        <>
          <MD_Button variant="secondary" onClick={onClose}>
            Cancel
          </MD_Button>
          <MD_Button variant="primary" onClick={submit} disabled={!canSubmit}>
            {editing ? "Save changes" : "Create account"}
          </MD_Button>
        </>
      }
    >
      {/* live preview */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 14px",
          background: MD.color.ink1,
          border: `1px solid ${MD.color.line}`,
          borderRadius: MD.radius.lg,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: MD.radius.md,
            display: "grid",
            placeItems: "center",
            color,
            background: color + "1a",
            border: `1px solid ${color}33`,
          }}
        >
          <MD_Icon name={icon} size={22} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{ ...MD.type.bodyMd, color: MD.color.text, fontWeight: 600 }}
          >
            {preview.name}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 3,
            }}
          >
            <span style={{ ...MD.type.label, fontSize: 10, color }}>
              {kind}
            </span>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: 999,
                background: color,
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Field label="Kind">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {KINDS.map((k) => (
              <PickChip
                key={k}
                active={kind === k}
                icon={window.HZ_KIND_ICON[k]}
                label={k}
                onClick={() => {
                  setKind(k);
                  setIcon(window.HZ_KIND_ICON[k]);
                }}
              />
            ))}
          </div>
        </Field>

        <Field label="Name">
          <MD_Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Main, Tagesgeld, Mortgage"
          />
        </Field>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
            gap: 14,
          }}
        >
          <Field
            label={
              kind === "Mortgage" ? "Restschuld (opening)" : "Opening balance"
            }
          >
            <MD_Input
              value={bal}
              onChange={(e) => setBal(e.target.value)}
              prefix="€"
            />
          </Field>
          <Field label="Opening date">
            <DateField value={date} onChange={setDate} />
          </Field>
        </div>

        {kind === "Mortgage" && (
          <Field
            label="Sondertilgung allowance"
            hint="annual cap set by lender"
          >
            <MD_Input
              value={stAllow}
              onChange={(e) => setStAllow(e.target.value)}
              prefix="€"
            />
          </Field>
        )}

        {kind === "CreditCard" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1.6fr) minmax(0,1fr)",
              gap: 14,
              alignItems: "end",
            }}
          >
            <Field label="Funding account" hint="settles monthly">
              <MiniSelect
                value={linked}
                onChange={setLinked}
                options={[{ value: "", label: "Select account…" }].concat(
                  giro.map((a) => ({ value: a.id, label: a.name }))
                )}
              />
            </Field>
            <Field label="Settlement day">
              <MD_Input
                value={settleDay}
                onChange={(e) => setSettleDay(e.target.value)}
              />
            </Field>
          </div>
        )}

        <Field label="Icon" hint="optional">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gap: 8,
            }}
          >
            {ICON_SET.map((ic) => {
              const active = icon === ic;
              return (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(active ? null : ic)}
                  style={{
                    height: 42,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: MD.radius.md,
                    background: active ? MD.color.accentDim : MD.color.ink0,
                    color: active ? MD.color.accent : MD.color.textMuted,
                    border: `1px solid ${active ? MD.color.accent : MD.color.line}`,
                    transition: "all .14s ease",
                  }}
                >
                  <MD_Icon name={ic} size={19} />
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Color">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {palette.map((c) => {
              const active = color === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    background: c,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: active
                      ? `0 0 0 2px ${MD.color.ink4}, 0 0 0 4px ${c}`
                      : "none",
                    transition: "box-shadow .14s ease",
                  }}
                />
              );
            })}
          </div>
        </Field>

        {kind !== "Mortgage" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "14px 16px",
              background: MD.color.ink1,
              border: `1px solid ${MD.color.line}`,
              borderRadius: MD.radius.lg,
            }}
          >
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: 36,
                height: 36,
                borderRadius: MD.radius.md,
                background: MD.color.ink3,
                color: showInTraj ? color : MD.color.textDim,
                flexShrink: 0,
                transition: "color .15s",
              }}
            >
              <MD_Icon name="outlook" size={18} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  ...MD.type.bodyMd,
                  color: MD.color.text,
                  fontWeight: 600,
                }}
              >
                Display in Trajectory Horizon
              </div>
              <div
                style={{
                  ...MD.type.body,
                  color: MD.color.textDim,
                  fontSize: 12.5,
                  marginTop: 2,
                }}
              >
                Show this account as a line on the dashboard chart by default.
              </div>
            </div>
            <MDToggle on={showInTraj} onChange={setShowInTraj} />
          </div>
        )}
      </div>
    </MD_Modal>
  );
}

/* ============================================================
   Add Expense (Variable Spending)
   ============================================================ */
function SpendingModal({ onClose, onToast }) {
  const HZ = window.HZ;
  const accts = HZ.accounts.filter(
    (a) =>
      a.kind === "Girokonto" ||
      a.kind === "CreditCard" ||
      a.kind === "Tagesgeld"
  );
  const [desc, setDesc] = React.useState("");
  const [amt, setAmt] = React.useState("");
  const [date, setDate] = React.useState("2026-11-18");
  const [acct, setAcct] = React.useState(accts[0].id);
  const [cat, setCat] = React.useState("Groceries");
  const canSubmit = desc.trim() && amt;

  const submit = () => {
    if (!canSubmit) return;
    onToast(`Expense “${desc}” added`);
    onClose();
  };

  return (
    <MD_Modal
      open
      onClose={onClose}
      title="Add expense"
      width={500}
      footer={
        <>
          <MD_Button variant="secondary" onClick={onClose}>
            Cancel
          </MD_Button>
          <MD_Button
            variant="primary"
            icon="plus"
            onClick={submit}
            disabled={!canSubmit}
          >
            Add expense
          </MD_Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Field label="Description">
          <MD_Input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="e.g. REWE groceries"
          />
        </Field>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
            gap: 14,
          }}
        >
          <Field label="Amount">
            <MD_Input
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
              prefix="€"
              placeholder="0,00"
            />
          </Field>
          <Field label="Date">
            <DateField value={date} onChange={setDate} />
          </Field>
        </div>

        <Field label="Account">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {accts.map((a) => (
              <PickChip
                key={a.id}
                active={acct === a.id}
                color={a.color}
                label={a.name}
                onClick={() => setAcct(a.id)}
              />
            ))}
          </div>
        </Field>

        <Field label="Category">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {HZ.categories.map((c) => (
              <PickChip
                key={c.key}
                active={cat === c.key}
                color={c.color}
                label={c.label}
                onClick={() => setCat(c.key)}
              />
            ))}
          </div>
        </Field>
      </div>
    </MD_Modal>
  );
}

Object.assign(window, { AccountCreateModal, SpendingModal });

/* ============================================================
   Edit Transaction (Variable Spending row → edit)
   Faithful to repo TransactionEditModal: Date · Description · Amount · Category.
   Transfer legs are read-only (delete removes both legs); Save hidden for transfers.
   ============================================================ */
function TransactionEditModal({ onClose, transaction, onToast }) {
  const HZ = window.HZ;
  const tx = transaction;
  const acct = HZ.accountById(tx.account);
  const isTransfer = !!tx.transferId;
  const toAccount = tx.linked ? HZ.accountById(tx.linked) : null;

  const [date, setDate] = React.useState(tx.date);
  const [desc, setDesc] = React.useState(tx.label);
  const [amt, setAmt] = React.useState((Math.abs(tx.amount) / 100).toFixed(2));
  const [flow, setFlow] = React.useState(tx.amount >= 0 ? "in" : "out");
  const [cat, setCat] = React.useState(tx.category);

  const canSave = !isTransfer && desc.trim() && amt;
  const save = () => {
    if (!canSave) return;
    onToast(`“${desc}” updated`, { variant: "success" });
    onClose();
  };
  const del = () => {
    onToast(
      isTransfer
        ? `Transfer deleted · both legs removed`
        : `“${tx.label}” deleted`,
      { variant: "success", action: { label: "Undo" } }
    );
    onClose();
  };

  return (
    <MD_Modal
      open
      onClose={onClose}
      title="Edit transaction"
      width={500}
      footer={
        <>
          <MD_Button
            variant="danger"
            icon="trash"
            onClick={del}
            style={{ marginRight: "auto" }}
          >
            Delete
          </MD_Button>
          <MD_Button variant="secondary" onClick={onClose}>
            Cancel
          </MD_Button>
          {!isTransfer && (
            <MD_Button
              variant="primary"
              icon="check"
              onClick={save}
              disabled={!canSave}
            >
              Save changes
            </MD_Button>
          )}
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* account context */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            ...MD.type.body,
            color: MD.color.textDim,
            fontSize: 12.5,
          }}
        >
          <span style={{ ...MD.type.label, color: MD.color.textFaint }}>
            On
          </span>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                background: acct.color,
              }}
            />
            <span
              style={{
                color: MD.color.text,
                fontWeight: 500,
                fontSize: 13,
                fontFamily: MD.font.ui,
              }}
            >
              {acct.name}
            </span>
          </span>
        </div>

        {isTransfer && (
          <div
            style={{
              display: "flex",
              gap: 10,
              padding: "12px 14px",
              background: MD.color.ink1,
              border: `1px solid ${MD.color.line}`,
              borderRadius: MD.radius.md,
            }}
          >
            <span
              style={{ color: MD.color.textDim, flexShrink: 0, marginTop: 1 }}
            >
              <MD_Icon name="info" size={16} />
            </span>
            <div
              style={{
                ...MD.type.body,
                color: MD.color.textMuted,
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              This is one leg of a transfer — deleting it removes{" "}
              <span style={{ color: MD.color.text }}>both legs</span>.
              {toAccount && (
                <span>
                  {" "}
                  Transfer to{" "}
                  <span style={{ color: toAccount.color }}>
                    {toAccount.name}
                  </span>
                  .
                </span>
              )}
            </div>
          </div>
        )}

        <Field label="Description">
          <MD_Input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            disabled={isTransfer}
          />
        </Field>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
            gap: 14,
          }}
        >
          <Field label="Amount">
            <MD_Input
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
              prefix="€"
              disabled={isTransfer}
            />
          </Field>
          <Field label="Date">
            <DateField value={date} onChange={setDate} disabled={isTransfer} />
          </Field>
        </div>

        {!isTransfer && (
          <Field label="Direction">
            <div style={{ display: "flex", gap: 8 }}>
              <PickChip
                active={flow === "out"}
                label="Outflow"
                onClick={() => setFlow("out")}
              />
              <PickChip
                active={flow === "in"}
                label="Inflow"
                onClick={() => setFlow("in")}
              />
            </div>
          </Field>
        )}

        <Field label="Category">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {HZ.categories.map((c) => (
              <PickChip
                key={c.key}
                active={cat === c.key}
                color={c.color}
                label={c.label}
                onClick={() => !isTransfer && setCat(c.key)}
              />
            ))}
          </div>
        </Field>
      </div>
    </MD_Modal>
  );
}

Object.assign(window, { TransactionEditModal });

/* ============================================================
   Stepper (day of month)
   ============================================================ */
function Stepper({ value, onChange, min = 1, max = 31 }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  const btn = {
    width: 40,
    height: 40,
    display: "grid",
    placeItems: "center",
    background: MD.color.ink0,
    color: MD.color.textMuted,
    border: `1px solid ${MD.color.line}`,
    cursor: "pointer",
    transition: "all .14s ease",
  };
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "stretch",
        borderRadius: MD.radius.md,
        overflow: "hidden",
        border: `1px solid ${MD.color.line}`,
      }}
    >
      <button
        type="button"
        onClick={dec}
        style={{
          ...btn,
          borderTop: "none",
          borderBottom: "none",
          borderLeft: "none",
        }}
      >
        <MD_Icon name="arrowLeft" size={15} />
      </button>
      <div
        className="mono"
        style={{
          minWidth: 56,
          display: "grid",
          placeItems: "center",
          background: MD.color.ink0,
          color: MD.color.text,
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {value}
      </div>
      <button
        type="button"
        onClick={inc}
        style={{
          ...btn,
          borderTop: "none",
          borderBottom: "none",
          borderRight: "none",
        }}
      >
        <MD_Icon name="arrowRight" size={15} />
      </button>
    </div>
  );
}

/* ============================================================
   Add / Edit Recurring Transaction
   Faithful to repo RecurringTransactionModal field set.
   ============================================================ */
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

function RecurringModal({ onClose, account, recurring, onToast }) {
  const HZ = window.HZ;
  const editing = !!(recurring && recurring.id);
  const otherAccounts = HZ.accounts.filter((a) => a.id !== account.id);

  const [amt, setAmt] = React.useState(
    recurring ? (Math.abs(recurring.amount) / 100).toFixed(2) : ""
  );
  const [flow, setFlow] = React.useState(
    recurring ? (recurring.amount >= 0 ? "in" : "out") : "out"
  );
  const [desc, setDesc] = React.useState(recurring?.label || "");
  const [freq, setFreq] = React.useState(recurring?.freq || "Monthly");
  const [day, setDay] = React.useState(recurring?.day || 1);
  const [monthOfYear, setMonthOfYear] = React.useState(
    recurring?.monthOfYear || 10
  );
  const [cat, setCat] = React.useState(
    recurring?.category || HZ.categories[0].key
  );
  const [linked, setLinked] = React.useState(recurring?.linked || "");

  const canSubmit = desc.trim() && amt;
  const linkedAcct = otherAccounts.find((a) => a.id === linked);
  const isMortgageLink = linkedAcct?.kind === "Mortgage";

  const submit = () => {
    if (!canSubmit) return;
    onToast(editing ? `“${desc}” updated` : `Recurring “${desc}” added`);
    onClose();
  };
  const del = () => {
    onToast(`“${desc}” deleted`, {
      variant: "success",
      action: { label: "Undo" },
    });
    onClose();
  };

  const FREQS = ["Monthly", "Quarterly", "Annual"];

  return (
    <MD_Modal
      open
      onClose={onClose}
      title={
        editing ? "Edit recurring transaction" : "Add recurring transaction"
      }
      width={520}
      footer={
        <>
          {editing && (
            <MD_Button
              variant="danger"
              icon="trash"
              onClick={del}
              style={{ marginRight: "auto" }}
            >
              Delete
            </MD_Button>
          )}
          <MD_Button variant="secondary" onClick={onClose}>
            Cancel
          </MD_Button>
          <MD_Button
            variant="primary"
            icon={editing ? "check" : "plus"}
            onClick={submit}
            disabled={!canSubmit}
          >
            {editing ? "Save changes" : "Add recurring"}
          </MD_Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* on-account context */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            ...MD.type.body,
            color: MD.color.textDim,
            fontSize: 12.5,
          }}
        >
          <span style={{ ...MD.type.label, color: MD.color.textFaint }}>
            On
          </span>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                background: account.color,
              }}
            />
            <span
              style={{
                color: MD.color.text,
                fontWeight: 500,
                fontSize: 13,
                fontFamily: MD.font.ui,
              }}
            >
              {account.name}
            </span>
          </span>
        </div>

        <Field label="Description">
          <MD_Input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="e.g. Salary, Rent, ETF plan"
          />
        </Field>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,1.1fr)",
            gap: 14,
          }}
        >
          <Field label="Amount">
            <MD_Input
              value={amt}
              onChange={(e) => setAmt(e.target.value)}
              prefix="€"
              placeholder="0,00"
            />
          </Field>
          <Field label="Direction">
            <div style={{ display: "flex", gap: 8 }}>
              <PickChip
                active={flow === "out"}
                label="Outflow"
                onClick={() => setFlow("out")}
              />
              <PickChip
                active={flow === "in"}
                label="Inflow"
                onClick={() => setFlow("in")}
              />
            </div>
          </Field>
        </div>

        <Field label="Frequency">
          <div style={{ display: "flex", gap: 8 }}>
            {FREQS.map((f) => (
              <PickChip
                key={f}
                active={freq === f}
                label={f}
                onClick={() => setFreq(f)}
              />
            ))}
          </div>
        </Field>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              freq === "Annual"
                ? "minmax(0,1fr) minmax(0,1.4fr)"
                : "minmax(0,1fr)",
            gap: 14,
          }}
        >
          <Field label="Day of month">
            <Stepper value={day} onChange={setDay} min={1} max={31} />
          </Field>
          {freq === "Annual" && (
            <Field label="Month of year">
              <MiniSelect
                value={String(monthOfYear)}
                onChange={(v) => setMonthOfYear(parseInt(v, 10))}
                options={MONTHS_FULL.map((m, i) => ({
                  value: String(i + 1),
                  label: m,
                }))}
              />
            </Field>
          )}
        </div>

        <Field label="Category">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {HZ.categories.map((c) => (
              <PickChip
                key={c.key}
                active={cat === c.key}
                color={c.color}
                label={c.label}
                onClick={() => setCat(c.key)}
              />
            ))}
          </div>
        </Field>

        <Field label="Transfer to account" hint="optional">
          <MiniSelect
            value={linked}
            onChange={setLinked}
            options={[{ value: "", label: "— None" }].concat(
              otherAccounts.map((a) => ({ value: a.id, label: a.name }))
            )}
          />
        </Field>

        {isMortgageLink && (
          <div
            style={{
              display: "flex",
              gap: 10,
              padding: "12px 14px",
              background: MD.color.accentDim,
              border: `1px solid ${MD.color.accentLine}`,
              borderRadius: MD.radius.md,
            }}
          >
            <span
              style={{ color: MD.color.accent, flexShrink: 0, marginTop: 1 }}
            >
              <MD_Icon name="info" size={16} />
            </span>
            <span
              style={{
                ...MD.type.body,
                color: MD.color.textMuted,
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              Linking to a Mortgage models a recurring transfer that reduces the{" "}
              <span style={{ color: MD.color.text }}>Restschuld</span> each time
              it fires. Per the ST-only model, only{" "}
              <span style={{ color: MD.color.text }}>Sondertilgung</span>{" "}
              payments should link to a Mortgage account.
            </span>
          </div>
        )}
      </div>
    </MD_Modal>
  );
}

Object.assign(window, { RecurringModal });

/* ============================================================
   Edit Mortgage (origination details)
   New feature: capture original principal + start date so
   "% paid off" reflects payments made before using Horizon.
   ============================================================ */
function MortgageModal({ onClose, meta, current, onSave }) {
  const HZ = window.HZ;
  const [principal, setPrincipal] = React.useState(
    (meta.originalPrincipal / 100).toFixed(2)
  );
  const [startDate, setStartDate] = React.useState(meta.startDate);
  const [term, setTerm] = React.useState(String(meta.termYears || 15));

  const principalCents =
    Math.round(parseFloat(principal.replace(",", ".")) * 100) || 0;
  const validPrincipal = principalCents >= current;
  const paid = Math.max(0, principalCents - current);
  const pct =
    principalCents > 0
      ? Math.max(0, Math.min(100, (paid / principalCents) * 100))
      : 0;
  const canSubmit = validPrincipal && startDate;

  const submit = () => {
    if (!canSubmit) return;
    onSave({
      originalPrincipal: principalCents,
      startDate,
      termYears: parseInt(term, 10) || 15,
    });
    onClose();
  };

  return (
    <MD_Modal
      open
      onClose={onClose}
      title="Edit mortgage"
      width={500}
      footer={
        <>
          <MD_Button variant="secondary" onClick={onClose}>
            Cancel
          </MD_Button>
          <MD_Button
            variant="primary"
            icon="check"
            onClick={submit}
            disabled={!canSubmit}
          >
            Save changes
          </MD_Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            ...MD.type.body,
            color: MD.color.textDim,
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          The <span style={{ color: MD.color.text }}>original loan amount</span>{" "}
          is what “% paid off” is measured against — set it so payments made
          before Horizon are reflected. The current Restschuld is{" "}
          <span className="mono" style={{ color: MD.color.text }}>
            {HZ.eurUnit(current, { cents: false })}
          </span>
          .
        </div>

        <Field label="Original loan amount" hint="principal at origination">
          <MD_Input
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            prefix="€"
            placeholder="0,00"
          />
        </Field>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)",
            gap: 14,
            alignItems: "end",
          }}
        >
          <Field label="Mortgage start date">
            <DateField value={startDate} onChange={setStartDate} />
          </Field>
          <Field label="Term" hint="years">
            <MD_Input value={term} onChange={(e) => setTerm(e.target.value)} />
          </Field>
        </div>

        {!validPrincipal && principal && (
          <div style={{ ...MD.type.body, color: MD.color.neg, fontSize: 12.5 }}>
            Original amount can’t be less than the current Restschuld.
          </div>
        )}

        {/* live preview */}
        <div
          style={{
            padding: "14px 16px",
            background: MD.color.ink1,
            border: `1px solid ${MD.color.line}`,
            borderRadius: MD.radius.lg,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 10,
            }}
          >
            <span style={{ ...MD.type.label, color: MD.color.textDim }}>
              Paid off (preview)
            </span>
            <span
              className="mono"
              style={{ fontSize: 15, fontWeight: 600, color: MD.color.accent }}
            >
              {pct.toFixed(0)}%
            </span>
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              background: MD.color.ink3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                borderRadius: 999,
                background: MD.color.accent,
                transition: "width .3s ease",
              }}
            />
          </div>
          <div
            style={{
              ...MD.type.body,
              color: MD.color.textFaint,
              fontSize: 11.5,
              marginTop: 8,
            }}
          >
            {validPrincipal
              ? `${HZ.eurUnit(paid, { cents: false })} repaid of ${HZ.eurUnit(principalCents, { cents: false })}`
              : "—"}
          </div>
        </div>
      </div>
    </MD_Modal>
  );
}

Object.assign(window, { MortgageModal });
