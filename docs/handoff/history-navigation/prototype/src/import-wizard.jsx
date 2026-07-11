/* ============================================================
   HORIZON — Import Wizard (3 steps) + Import Preview
   Account & file → Map columns → Review & categorize
   ============================================================ */
const { T: IW } = window;
const {
  Modal: IW_Modal,
  Button: IW_Btn,
  Icon: IW_Icon,
  Badge: IW_Badge,
  Money: IW_Money,
} = window;

/* sample parsed rows (with auto-category, duplicate + recurring flags) */
function sampleRows() {
  return [
    {
      id: "i1",
      date: "2026-11-02",
      desc: "REWE SAGT DANKE",
      amount: -6284,
      cat: "Groceries",
    },
    {
      id: "i2",
      date: "2026-11-01",
      desc: "Gehalt Arbeitgeber GmbH",
      amount: 412000,
      cat: "Income",
      recurring: true,
    },
    {
      id: "i3",
      date: "2026-11-01",
      desc: "Miete Hausverwaltung",
      amount: -148000,
      cat: "Housing",
      recurring: true,
    },
    {
      id: "i4",
      date: "2026-11-03",
      desc: "Restaurant Mitte",
      amount: -6400,
      cat: "Dining",
      duplicate: true,
    },
    {
      id: "i5",
      date: "2026-11-05",
      desc: "BVG Monatskarte",
      amount: -4900,
      cat: "Transport",
      duplicate: true,
    },
    {
      id: "i6",
      date: "2026-11-07",
      desc: "AMZN Mktp DE",
      amount: -4799,
      cat: "Shopping",
    },
    {
      id: "i7",
      date: "2026-11-09",
      desc: "Fressnapf Tiernahrung",
      amount: -3420,
      cat: "Cat",
    },
    {
      id: "i8",
      date: "2026-11-11",
      desc: "Netflix.com",
      amount: -1799,
      cat: "Misc",
      recurring: true,
    },
    {
      id: "i9",
      date: "2026-11-14",
      desc: "Edeka Muenchen",
      amount: -5512,
      cat: "Groceries",
    },
    {
      id: "i10",
      date: "2026-11-15",
      desc: "Sparplan ETF",
      amount: -50000,
      cat: "Invest",
      recurring: true,
    },
    {
      id: "i11",
      date: "2026-11-18",
      desc: "DM FIL. 4021",
      amount: -2237,
      cat: "Health",
    },
    {
      id: "i12",
      date: "2026-11-21",
      desc: "Shell Tankstelle",
      amount: -7140,
      cat: "Transport",
    },
  ];
}

function StepDots({ step }) {
  const steps = ["Account", "Map columns", "Review"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {steps.map((s, i) => {
        const n = i + 1,
          active = n === step,
          done = n < step;
        return (
          <React.Fragment key={s}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  background: active
                    ? IW.color.accent
                    : done
                      ? IW.color.accentDim
                      : IW.color.ink3,
                  color: active
                    ? IW.color.onAccent
                    : done
                      ? IW.color.accent
                      : IW.color.textDim,
                  fontFamily: IW.font.mono,
                  transition: "all .15s",
                }}
              >
                {done ? <IW_Icon name="check" size={13} stroke={3} /> : n}
              </span>
              <span
                style={{
                  ...IW.type.label,
                  fontSize: 10.5,
                  color: active ? IW.color.text : IW.color.textDim,
                }}
              >
                {s}
              </span>
            </div>
            {i < 2 && (
              <span
                style={{
                  flex: 1,
                  height: 1,
                  background: IW.color.line,
                  minWidth: 16,
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function MapField({ label, value, columns, onChange }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        alignItems: "center",
        gap: 14,
      }}
    >
      <span style={{ ...IW.type.label, color: IW.color.textDim }}>{label}</span>
      <div style={{ position: "relative" }}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            height: 38,
            padding: "0 34px 0 12px",
            appearance: "none",
            background: IW.color.ink0,
            color: IW.color.text,
            border: `1px solid ${IW.color.line}`,
            borderRadius: IW.radius.md,
            fontFamily: IW.font.mono,
            fontSize: 13,
            outline: "none",
            cursor: "pointer",
          }}
        >
          {columns.map((c) => (
            <option key={c} value={c} style={{ background: IW.color.ink4 }}>
              {c}
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
            color: IW.color.textDim,
          }}
        >
          <IW_Icon name="chevronDown" size={15} />
        </span>
      </div>
    </div>
  );
}

function ImportWizard({ onClose, presetAccount, onToast }) {
  const HZ = window.HZ;
  const importAccounts = HZ.accounts.filter((a) =>
    ["Girokonto", "CreditCard", "Tagesgeld"].includes(a.kind)
  );
  const [step, setStep] = React.useState(1);
  const [account, setAccount] = React.useState(
    presetAccount || importAccounts[0].id
  );
  const bank = HZ.accountBank[account] || "DKB";
  const preset = HZ.bankPresets[bank] || HZ.bankPresets.DKB;
  const [map, setMap] = React.useState(preset.map);
  const [rows, setRows] = React.useState(() =>
    sampleRows().map((r) => ({ ...r, included: !r.duplicate && !r.recurring }))
  );

  React.useEffect(() => {
    setMap(preset.map);
  }, [account]); // re-apply remembered preset on account change

  const dupes = rows.filter((r) => r.duplicate).length;
  const recur = rows.filter((r) => r.recurring).length;
  const included = rows.filter((r) => r.included).length;
  const toggle = (id) =>
    setRows((rs) =>
      rs.map((r) => (r.id === id ? { ...r, included: !r.included } : r))
    );
  const setCat = (id, cat) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, cat } : r)));
  const acctObj = HZ.accountById(account);

  const next = () => setStep((s) => Math.min(3, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));
  const confirm = () => {
    onToast(
      `${included} transactions imported to ${acctObj.name}${dupes + rows.filter((r) => r.recurring && !r.included).length ? ` · ${rows.length - included} skipped` : ""}`,
      { variant: "success" }
    );
    onClose();
  };

  const footer =
    step === 1 ? (
      <>
        <IW_Btn variant="secondary" onClick={onClose}>
          Cancel
        </IW_Btn>
        <IW_Btn variant="primary" iconRight="arrowRight" onClick={next}>
          Map columns
        </IW_Btn>
      </>
    ) : step === 2 ? (
      <>
        <IW_Btn variant="secondary" icon="arrowLeft" onClick={back}>
          Back
        </IW_Btn>
        <IW_Btn
          variant="primary"
          iconRight="arrowRight"
          onClick={next}
        >{`Review ${rows.length} rows`}</IW_Btn>
      </>
    ) : (
      <>
        <IW_Btn variant="secondary" icon="arrowLeft" onClick={back}>
          Back
        </IW_Btn>
        <IW_Btn
          variant="primary"
          icon="check"
          onClick={confirm}
          disabled={!included}
        >{`Import ${included} transaction${included !== 1 ? "s" : ""}`}</IW_Btn>
      </>
    );

  return (
    <IW_Modal
      open
      onClose={onClose}
      title="Import statement"
      width={step === 3 ? 820 : 560}
      footer={footer}
    >
      <div style={{ marginBottom: 22 }}>
        <StepDots step={step} />
      </div>

      {/* STEP 1 — account & file */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              background: IW.color.ink1,
              border: `1px solid ${IW.color.line}`,
              borderRadius: IW.radius.lg,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: IW.radius.md,
                display: "grid",
                placeItems: "center",
                background: IW.color.accentDim,
                color: IW.color.accent,
                flexShrink: 0,
              }}
            >
              <IW_Icon name="banknote" size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                className="mono"
                style={{
                  fontSize: 13.5,
                  color: IW.color.text,
                  fontWeight: 500,
                }}
              >
                {bank}_statement_2026-11.csv
              </div>
              <div
                style={{
                  ...IW.type.body,
                  color: IW.color.textDim,
                  fontSize: 12,
                  marginTop: 2,
                }}
              >
                12 rows detected · 24 KB
              </div>
            </div>
            <IW_Badge tone="pos">
              <IW_Icon name="check" size={11} />
              {`${bank} format`}
            </IW_Badge>
          </div>

          <div>
            <div
              style={{
                ...IW.type.label,
                color: IW.color.textDim,
                marginBottom: 10,
              }}
            >
              Import into account
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {importAccounts.map((a) => {
                const on = account === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAccount(a.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 13px",
                      borderRadius: IW.radius.pill,
                      fontFamily: IW.font.ui,
                      fontSize: 13,
                      fontWeight: 500,
                      background: on ? IW.color.accentDim : IW.color.ink0,
                      color: on ? IW.color.text : IW.color.textMuted,
                      border: `1px solid ${on ? IW.color.accent : IW.color.line}`,
                      transition: "all .14s",
                    }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 999,
                        background: a.color,
                      }}
                    />
                    {a.name}
                  </button>
                );
              })}
            </div>
            <div
              style={{
                ...IW.type.body,
                color: IW.color.textFaint,
                fontSize: 12,
                marginTop: 10,
              }}
            >
              Horizon detected this as a{" "}
              <span style={{ color: IW.color.textMuted }}>{bank}</span> export
              and will apply your saved column mapping.
            </div>
          </div>
        </div>
      )}

      {/* STEP 2 — map columns */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              ...IW.type.body,
              color: IW.color.textMuted,
              fontSize: 12.5,
            }}
          >
            <IW_Icon name="refresh" size={14} color={IW.color.accent} />
            Mapping remembered from your last{" "}
            <span style={{ color: IW.color.text }}>{bank}</span> import — adjust
            if the columns changed.
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: "16px",
              background: IW.color.ink1,
              border: `1px solid ${IW.color.line}`,
              borderRadius: IW.radius.lg,
            }}
          >
            <MapField
              label="Date"
              value={map.date}
              columns={preset.columns}
              onChange={(v) => setMap({ ...map, date: v })}
            />
            <MapField
              label="Description"
              value={map.desc}
              columns={preset.columns}
              onChange={(v) => setMap({ ...map, desc: v })}
            />
            <MapField
              label="Amount"
              value={map.amount}
              columns={preset.columns}
              onChange={(v) => setMap({ ...map, amount: v })}
            />
          </div>
          {/* raw preview */}
          <div>
            <div
              style={{
                ...IW.type.label,
                color: IW.color.textFaint,
                marginBottom: 8,
              }}
            >
              Raw preview · first rows
            </div>
            <div
              style={{
                border: `1px solid ${IW.color.line}`,
                borderRadius: IW.radius.md,
                overflow: "hidden",
              }}
            >
              {sampleRows()
                .slice(0, 3)
                .map((r, i) => (
                  <div
                    key={r.id}
                    className="mono"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "110px 1fr 110px",
                      gap: 12,
                      padding: "9px 14px",
                      fontSize: 12,
                      color: IW.color.textMuted,
                      background: i % 2 ? IW.color.ink1 : "transparent",
                      borderBottom:
                        i < 2 ? `1px solid ${IW.color.lineFaint}` : "none",
                    }}
                  >
                    <span>{r.date}</span>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: IW.color.text,
                      }}
                    >
                      {r.desc}
                    </span>
                    <span style={{ textAlign: "right" }}>
                      {(r.amount / 100).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3 — review & categorize */}
      {step === 3 && (
        <div>
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 14,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                ...IW.type.body,
                fontSize: 12.5,
                color: IW.color.textMuted,
              }}
            >
              <span style={{ color: IW.color.pos, fontWeight: 600 }}>
                {included}
              </span>{" "}
              selected to import
            </span>
            {dupes > 0 && (
              <IW_Badge tone="warn" color={IW.color.warn}>
                <IW_Icon name="info" size={11} />
                {`${dupes} likely duplicate${dupes !== 1 ? "s" : ""}`}
              </IW_Badge>
            )}
            {recur > 0 && (
              <IW_Badge tone="neutral">
                <IW_Icon name="refresh" size={11} />
                {`${recur} recurring`}
              </IW_Badge>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "34px 78px 1fr 130px 96px 96px",
              gap: 10,
              padding: "0 12px 8px",
              ...IW.type.label,
              color: IW.color.textFaint,
              fontSize: 9.5,
            }}
          >
            <span />
            <span>Date</span>
            <span>Description</span>
            <span>Category</span>
            <span>Flag</span>
            <span style={{ textAlign: "right" }}>Amount</span>
          </div>
          <div
            style={{
              maxHeight: 320,
              overflowY: "auto",
              overflowX: "hidden",
              border: `1px solid ${IW.color.line}`,
              borderRadius: IW.radius.md,
            }}
          >
            {rows.map((r, i) => {
              const cat = HZ.categories.find((c) => c.key === r.cat);
              return (
                <div
                  key={r.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "34px 78px 1fr 130px 96px 96px",
                    gap: 10,
                    alignItems: "center",
                    padding: "9px 12px",
                    background: !r.included
                      ? IW.color.ink1
                      : i % 2
                        ? "rgba(255,255,255,0.012)"
                        : "transparent",
                    borderBottom:
                      i < rows.length - 1
                        ? `1px solid ${IW.color.lineFaint}`
                        : "none",
                    opacity: r.included ? 1 : 0.55,
                    transition: "opacity .12s",
                  }}
                >
                  <button
                    onClick={() => toggle(r.id)}
                    aria-label="toggle"
                    style={{
                      width: 18,
                      height: 18,
                      padding: 0,
                      lineHeight: 0,
                      borderRadius: 5,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      background: r.included ? IW.color.accent : "transparent",
                      border: `1.5px solid ${r.included ? IW.color.accent : IW.color.lineStrong}`,
                      color: IW.color.onAccent,
                      transition: "all .12s",
                    }}
                  >
                    {r.included && (
                      <IW_Icon name="check" size={12} stroke={3} />
                    )}
                  </button>
                  <span
                    className="mono"
                    style={{ fontSize: 11.5, color: IW.color.textDim }}
                  >
                    {r.date.slice(5)}
                  </span>
                  <span
                    style={{
                      ...IW.type.body,
                      fontSize: 12.5,
                      color: IW.color.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.desc}
                  </span>
                  <div style={{ position: "relative" }}>
                    <select
                      value={r.cat}
                      onChange={(e) => setCat(r.id, e.target.value)}
                      style={{
                        width: "100%",
                        height: 28,
                        padding: "0 22px 0 8px",
                        appearance: "none",
                        background: IW.color.ink0,
                        color: cat ? cat.color : IW.color.textMuted,
                        border: `1px solid ${IW.color.line}`,
                        borderRadius: IW.radius.sm,
                        fontFamily: IW.font.ui,
                        fontSize: 11.5,
                        fontWeight: 500,
                        outline: "none",
                        cursor: "pointer",
                      }}
                    >
                      {HZ.categories.map((c) => (
                        <option
                          key={c.key}
                          value={c.key}
                          style={{
                            background: IW.color.ink4,
                            color: IW.color.text,
                          }}
                        >
                          {c.label}
                        </option>
                      ))}
                      <option
                        value="Income"
                        style={{
                          background: IW.color.ink4,
                          color: IW.color.text,
                        }}
                      >
                        Income
                      </option>
                      <option
                        value="Housing"
                        style={{
                          background: IW.color.ink4,
                          color: IW.color.text,
                        }}
                      >
                        Housing
                      </option>
                      <option
                        value="Invest"
                        style={{
                          background: IW.color.ink4,
                          color: IW.color.text,
                        }}
                      >
                        Invest
                      </option>
                    </select>
                    <span
                      style={{
                        position: "absolute",
                        right: 7,
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        color: IW.color.textDim,
                      }}
                    >
                      <IW_Icon name="chevronDown" size={12} />
                    </span>
                  </div>
                  <span>
                    {r.duplicate ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          ...IW.type.label,
                          fontSize: 9,
                          color: IW.color.warn,
                        }}
                      >
                        <IW_Icon name="info" size={10} />
                        Dupe
                      </span>
                    ) : r.recurring ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          ...IW.type.label,
                          fontSize: 9,
                          color: IW.color.textDim,
                        }}
                      >
                        <IW_Icon name="refresh" size={10} />
                        Recur
                      </span>
                    ) : (
                      <span style={{ color: IW.color.textFaint }}>·</span>
                    )}
                  </span>
                  <span style={{ textAlign: "right" }}>
                    <IW_Money cents={r.amount} sign size="sm" />
                  </span>
                </div>
              );
            })}
          </div>
          <div
            style={{
              ...IW.type.body,
              color: IW.color.textFaint,
              fontSize: 11.5,
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <IW_Icon name="info" size={13} />
            Duplicates and recurring rows are unchecked by default to avoid
            double-counting what Horizon already tracks.
          </div>
        </div>
      )}
    </IW_Modal>
  );
}

/* ---- Read-only preview of an already-imported file ---- */
function ImportPreview({ onClose, file }) {
  const HZ = window.HZ;
  const acct = HZ.accountById(file.account);
  return (
    <IW_Modal
      open
      onClose={onClose}
      title="Imported transactions"
      width={680}
      footer={
        <IW_Btn variant="secondary" onClick={onClose}>
          Close
        </IW_Btn>
      }
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div className="mono" style={{ fontSize: 13, color: IW.color.text }}>
          {file.filename}
        </div>
        <IW_Badge color={acct.color}>{acct.name}</IW_Badge>
        <span
          style={{ ...IW.type.body, color: IW.color.textDim, fontSize: 12 }}
        >
          {file.count} transactions · showing {file.txns.length}
        </span>
      </div>
      <div
        style={{
          border: `1px solid ${IW.color.line}`,
          borderRadius: IW.radius.md,
          overflow: "hidden",
        }}
      >
        {file.txns.map((t, i) => {
          const cat = HZ.categories.find((c) => c.key === t.cat);
          return (
            <div
              key={t.id}
              style={{
                display: "grid",
                gridTemplateColumns: "90px 1fr 120px 100px",
                gap: 12,
                alignItems: "center",
                padding: "10px 14px",
                background: i % 2 ? IW.color.ink1 : "transparent",
                borderBottom:
                  i < file.txns.length - 1
                    ? `1px solid ${IW.color.lineFaint}`
                    : "none",
              }}
            >
              <span
                className="mono"
                style={{ fontSize: 11.5, color: IW.color.textDim }}
              >
                {t.date.slice(5)}
              </span>
              <span
                style={{
                  ...IW.type.body,
                  fontSize: 12.5,
                  color: IW.color.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {t.desc}
              </span>
              <span>
                {cat ? (
                  <IW_Badge color={cat.color}>{cat.label}</IW_Badge>
                ) : (
                  <span
                    style={{
                      ...IW.type.label,
                      fontSize: 9.5,
                      color: IW.color.textDim,
                    }}
                  >
                    {t.cat}
                  </span>
                )}
              </span>
              <span style={{ textAlign: "right" }}>
                <IW_Money cents={t.amt} sign size="sm" />
              </span>
            </div>
          );
        })}
      </div>
    </IW_Modal>
  );
}

Object.assign(window, { ImportWizard, ImportPreview });
