/* ============================================================
   HORIZON — Category Manager Modal
   Redesign of the repo's CategoryManagerModal: same functionality
   (recolor / rename / hide-unhide / add / delete-with-reassign),
   restructured as scannable rows with hover-reveal actions.
   ============================================================ */
const { T: CM } = window;
const {
  Modal: CM_Modal,
  Button: CM_Btn,
  Icon: CM_Icon,
  Badge: CM_Badge,
  Input: CM_Input,
} = window;

const MISCELLANEOUS = "Misc";

/* ---- popover color swatch: click the dot to open a small palette flyout ---- */
function SwatchPopover({ value, onChange, palette }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Change color"
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: value,
          flexShrink: 0,
          border: `2px solid ${CM.color.ink4}`,
          boxShadow: `0 0 0 1.5px ${open ? CM.color.accent : CM.color.line}`,
          cursor: "pointer",
          transition: "box-shadow .12s ease",
        }}
      />
      {open && (
        <div
          className="hz-fade"
          style={{
            position: "absolute",
            top: 30,
            left: 0,
            zIndex: 20,
            padding: 10,
            background: CM.color.ink4,
            border: `1px solid ${CM.color.lineStrong}`,
            borderRadius: CM.radius.lg,
            boxShadow: "0 14px 30px -8px rgba(0,0,0,0.55)",
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 7,
            width: 168,
          }}
        >
          {palette.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => {
                onChange(hex);
                setOpen(false);
              }}
              style={{
                width: 20,
                height: 20,
                borderRadius: 999,
                background: hex,
                cursor: "pointer",
                border:
                  hex === value
                    ? `2px solid ${CM.color.text}`
                    : "2px solid transparent",
                boxShadow: hex === value ? `0 0 0 1.5px ${hex}` : "none",
                transition: "transform .1s ease",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- one category row: swatch · name (click-to-rename) · badges · hover actions ---- */
function CategoryRow({
  category,
  isDefault,
  onRecolor,
  onRename,
  onToggleHidden,
  onDelete,
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(category.name);
  const [error, setError] = React.useState(null);
  const [hover, setHover] = React.useState(false);
  const HZ = window.HZ;

  const save = async () => {
    setError(null);
    if (draft.trim() === category.name) {
      setEditing(false);
      return;
    }
    const result = await onRename(category.id, draft.trim());
    if (result.ok) setEditing(false);
    else setError(result.error);
  };

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 12px",
        borderRadius: CM.radius.md,
        background: hover ? CM.color.ink3 : "transparent",
        opacity: category.hidden ? 0.55 : 1,
        transition: "background .12s ease, opacity .15s ease",
      }}
    >
      <SwatchPopover
        value={category.color}
        onChange={(hex) => onRecolor(category.id, hex)}
        palette={HZ.categoryColorPalette}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <div
            style={{ display: "flex", alignItems: "center", gap: 8 }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") {
                  setDraft(category.name);
                  setError(null);
                  setEditing(false);
                }
              }}
              style={{
                background: CM.color.ink0,
                border: `1px solid ${CM.color.accent}`,
                borderRadius: CM.radius.sm,
                color: CM.color.text,
                fontFamily: CM.font.ui,
                fontSize: 13.5,
                fontWeight: 500,
                padding: "5px 9px",
                outline: "none",
                minWidth: 140,
              }}
            />
            <button
              onClick={save}
              title="Save"
              style={{
                display: "grid",
                placeItems: "center",
                width: 26,
                height: 26,
                borderRadius: 7,
                color: CM.color.pos,
                background: CM.color.posDim,
              }}
            >
              <CM_Icon name="check" size={14} />
            </button>
            <button
              onClick={() => {
                setDraft(category.name);
                setError(null);
                setEditing(false);
              }}
              title="Cancel"
              style={{
                display: "grid",
                placeItems: "center",
                width: 26,
                height: 26,
                borderRadius: 7,
                color: CM.color.textDim,
              }}
            >
              <CM_Icon name="x" size={14} />
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span
              style={{
                ...CM.type.bodyMd,
                color: CM.color.text,
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {category.name}
            </span>
            {isDefault && <CM_Badge>Default</CM_Badge>}
            {category.hidden && (
              <CM_Badge tone="neutral">
                <CM_Icon name="info" size={10} />
                Hidden
              </CM_Badge>
            )}
          </div>
        )}
        {error && (
          <div
            style={{
              ...CM.type.body,
              color: CM.color.neg,
              fontSize: 11.5,
              marginTop: 5,
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* hover-reveal actions */}
      <div
        style={{
          display: "flex",
          gap: 2,
          opacity: hover || editing ? 1 : 0,
          transition: "opacity .14s ease",
          flexShrink: 0,
        }}
      >
        {!isDefault && !editing && (
          <button
            onClick={() => {
              setDraft(category.name);
              setEditing(true);
            }}
            title="Rename"
            style={{
              display: "grid",
              placeItems: "center",
              width: 30,
              height: 30,
              borderRadius: 8,
              color: CM.color.textDim,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = CM.color.ink4;
              e.currentTarget.style.color = CM.color.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = CM.color.textDim;
            }}
          >
            <CM_Icon name="pencil" size={15} />
          </button>
        )}
        <button
          onClick={() => onToggleHidden(category)}
          title={category.hidden ? "Un-hide" : "Hide"}
          style={{
            display: "grid",
            placeItems: "center",
            width: 30,
            height: 30,
            borderRadius: 8,
            color: CM.color.textDim,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = CM.color.ink4;
            e.currentTarget.style.color = CM.color.text;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = CM.color.textDim;
          }}
        >
          <CM_Icon name={category.hidden ? "eyeOff" : "eye"} size={15} />
        </button>
        {!isDefault && (
          <button
            onClick={() => onDelete(category)}
            title="Delete"
            style={{
              display: "grid",
              placeItems: "center",
              width: 30,
              height: 30,
              borderRadius: 8,
              color: CM.color.textDim,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(206,130,120,0.16)";
              e.currentTarget.style.color = CM.color.neg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = CM.color.textDim;
            }}
          >
            <CM_Icon name="trash" size={15} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ---- reassign-before-delete prompt ---- */
function ReassignPrompt({ category, targets, onConfirm, onCancel }) {
  const misc = targets.find((t) => t.name === MISCELLANEOUS);
  const [targetId, setTargetId] = React.useState(
    misc ? misc.id : targets[0] ? targets[0].id : ""
  );
  return (
    <CM_Modal
      open
      onClose={onCancel}
      title={`Delete “${category.name}”`}
      width={440}
      footer={
        <>
          <CM_Btn variant="secondary" onClick={onCancel}>
            Cancel
          </CM_Btn>
          <CM_Btn
            variant="danger"
            icon="trash"
            onClick={() => onConfirm(targetId)}
          >
            Reassign &amp; delete
          </CM_Btn>
        </>
      }
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          padding: "12px 14px",
          background: CM.color.negDim,
          border: "1px solid rgba(206,130,120,0.3)",
          borderRadius: CM.radius.md,
          marginBottom: 16,
        }}
      >
        <span style={{ color: CM.color.neg, flexShrink: 0, marginTop: 1 }}>
          <CM_Icon name="info" size={16} />
        </span>
        <span
          style={{
            ...CM.type.body,
            color: CM.color.textMuted,
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: CM.color.text }}>{category.name}</span> is used
          by existing transactions. Move them to another category first.
        </span>
      </div>
      <div
        style={{ ...CM.type.label, color: CM.color.textDim, marginBottom: 8 }}
      >
        Reassign transactions to
      </div>
      <window.MiniSelect
        value={targetId}
        onChange={setTargetId}
        options={targets.map((t) => ({ value: t.id, label: t.name }))}
      />
    </CM_Modal>
  );
}

/* ---- add-category row: a clear, primary affordance ---- */
function AddCategoryRow({ onCreate, palette }) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState(palette[0]);
  const [error, setError] = React.useState(null);

  const submit = async () => {
    if (!name.trim()) return;
    setError(null);
    const result = await onCreate(name.trim(), color);
    if (result.ok) {
      setName("");
      setColor(palette[0]);
      setOpen(false);
    } else setError(result.error);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          width: "100%",
          padding: "11px 12px",
          marginTop: 4,
          borderRadius: CM.radius.md,
          border: `1px dashed ${CM.color.lineStrong}`,
          color: CM.color.accent,
          fontFamily: CM.font.ui,
          fontSize: 13.5,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all .14s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = CM.color.accentDim;
          e.currentTarget.style.borderColor = CM.color.accent;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = CM.color.lineStrong;
        }}
      >
        <CM_Icon name="plus" size={16} />
        Add category
      </button>
    );
  }

  return (
    <div
      style={{
        marginTop: 4,
        padding: 12,
        borderRadius: CM.radius.md,
        border: `1px solid ${CM.color.accentLine}`,
        background: CM.color.ink1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <SwatchPopover value={color} onChange={setColor} palette={palette} />
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setOpen(false);
          }}
          style={{
            flex: 1,
            background: CM.color.ink0,
            border: `1px solid ${CM.color.line}`,
            borderRadius: CM.radius.sm,
            color: CM.color.text,
            fontFamily: CM.font.ui,
            fontSize: 13.5,
            padding: "8px 10px",
            outline: "none",
          }}
        />
        <CM_Btn variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </CM_Btn>
        <CM_Btn
          variant="primary"
          size="sm"
          icon="plus"
          onClick={submit}
          disabled={!name.trim()}
        >
          Add
        </CM_Btn>
      </div>
      {error && (
        <div
          style={{
            ...CM.type.body,
            color: CM.color.neg,
            fontSize: 11.5,
            marginTop: 8,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

/* ---- the manager modal ---- */
function CategoryManagerModal({ onClose, onToast }) {
  const HZ = window.HZ;
  const palette = HZ.categoryColorPalette || HZ.accountColorPalette;
  const seedDefaults = HZ.categories.map((c) => ({
    id: c.key,
    name: c.label,
    color: c.color,
    isDefault: true,
    hidden: false,
  }));
  const [customs, setCustoms] = React.useState([
    {
      id: "cat-vet",
      name: "Vet Bills",
      color: "#5FB8C0",
      isDefault: false,
      hidden: false,
    },
    {
      id: "cat-hobby",
      name: "Hobbies",
      color: "#B79CE0",
      isDefault: false,
      hidden: false,
    },
  ]);
  const [defaults, setDefaults] = React.useState(seedDefaults);
  const [reassignFor, setReassignFor] = React.useState(null);

  const recolor = (id, color) => {
    setDefaults((d) => d.map((c) => (c.id === id ? { ...c, color } : c)));
    setCustoms((d) => d.map((c) => (c.id === id ? { ...c, color } : c)));
  };
  const rename = async (id, name) => {
    if (
      [...defaults, ...customs].some(
        (c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      return { ok: false, error: `A category named “${name}” already exists` };
    }
    setCustoms((d) => d.map((c) => (c.id === id ? { ...c, name } : c)));
    onToast && onToast(`Category renamed to “${name}”`, { variant: "success" });
    return { ok: true };
  };
  const toggleHidden = (cat) => {
    const setFn = cat.isDefault ? setDefaults : setCustoms;
    setFn((d) =>
      d.map((c) => (c.id === cat.id ? { ...c, hidden: !c.hidden } : c))
    );
    onToast &&
      onToast(`“${cat.name}” ${cat.hidden ? "unhidden" : "hidden"}`, {
        variant: "info",
      });
  };
  const create = async (name, color) => {
    if (
      [...defaults, ...customs].some(
        (c) => c.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      return { ok: false, error: `A category named “${name}” already exists` };
    }
    setCustoms((d) => [
      ...d,
      { id: "cat-" + Date.now(), name, color, isDefault: false, hidden: false },
    ]);
    onToast && onToast(`Category “${name}” added`, { variant: "success" });
    return { ok: true };
  };
  const handleDelete = (cat) => {
    // simulate "in use" for the seeded Vet Bills row to demonstrate the reassign flow
    if (cat.id === "cat-vet") {
      setReassignFor(cat);
      return;
    }
    setCustoms((d) => d.filter((c) => c.id !== cat.id));
    onToast && onToast(`“${cat.name}” deleted`, { variant: "success" });
  };
  const confirmReassign = (targetId) => {
    const target = [...defaults, ...customs].find((c) => c.id === targetId);
    setCustoms((d) => d.filter((c) => c.id !== reassignFor.id));
    onToast &&
      onToast(
        `Transactions moved to “${target.name}” · “${reassignFor.name}” deleted`,
        { variant: "success" }
      );
    setReassignFor(null);
  };

  return (
    <CM_Modal
      open
      onClose={onClose}
      title="Manage categories"
      width={480}
      footer={
        <CM_Btn variant="secondary" onClick={onClose}>
          Done
        </CM_Btn>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 8,
              padding: "0 4px",
            }}
          >
            <span style={{ ...CM.type.label, color: CM.color.textDim }}>
              Default
            </span>
            <span
              style={{
                ...CM.type.body,
                color: CM.color.textFaint,
                fontSize: 11.5,
              }}
            >
              Recolor or hide — can't be deleted
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {defaults.map((c) => (
              <CategoryRow
                key={c.id}
                category={c}
                isDefault
                onRecolor={recolor}
                onToggleHidden={toggleHidden}
              />
            ))}
          </div>
        </div>

        <div>
          <div
            style={{
              ...CM.type.label,
              color: CM.color.textDim,
              marginBottom: 8,
              padding: "0 4px",
            }}
          >
            Custom
          </div>
          {customs.length === 0 ? (
            <window.EmptyState
              icon="filter"
              title="No custom categories yet"
              hint="Add one below to track spending your own way."
            />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
                marginBottom: 4,
              }}
            >
              {customs.map((c) => (
                <CategoryRow
                  key={c.id}
                  category={c}
                  isDefault={false}
                  onRecolor={recolor}
                  onRename={rename}
                  onToggleHidden={toggleHidden}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
          <AddCategoryRow onCreate={create} palette={palette} />
        </div>
      </div>

      {reassignFor && (
        <ReassignPrompt
          category={reassignFor}
          targets={[...defaults, ...customs].filter(
            (c) => c.id !== reassignFor.id
          )}
          onConfirm={confirmReassign}
          onCancel={() => setReassignFor(null)}
        />
      )}
    </CM_Modal>
  );
}

Object.assign(window, { CategoryManagerModal });
