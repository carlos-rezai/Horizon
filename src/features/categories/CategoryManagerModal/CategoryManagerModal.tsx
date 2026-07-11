import { useEffect, useRef, useState } from "react";
import {
  Check,
  Eye,
  EyeOff,
  Info,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import Modal from "../../../components/Modal/Modal";
import Button from "../../../primitives/Button/Button";
import Badge from "../../../primitives/Badge/Badge";
import Select from "../../../primitives/Select/Select";
import SwatchPicker from "../../../primitives/SwatchPicker/SwatchPicker";
import EmptyState from "../../../components/EmptyState/EmptyState";
import type { Category } from "../../../types/category";
import { categoryColorPalette } from "../../../utils/categoryColor/categoryColor";
import { useCategoryManager } from "../useCategoryManager";
import type {
  CreateCategoryResult,
  RenameCategoryResult,
} from "../useCategoryManager";
import {
  Sections,
  Section,
  SectionHeader,
  SectionLabel,
  SectionHint,
  RowList,
  Row,
  RowMain,
  DisplayWrap,
  RowName,
  EditWrap,
  NameInput,
  EditActionButton,
  ActionButton,
  Actions,
  SwatchAnchor,
  SwatchDot,
  Popover,
  AddButton,
  AddForm,
  AddFormRow,
  AddInput,
  ErrorText,
  WarnBanner,
  WarnIcon,
  WarnText,
  ReassignLabel,
} from "./CategoryManagerModal.styles";

const MISCELLANEOUS = "Miscellaneous";

interface CategoryManagerModalProps {
  onClose: () => void;
}

/** Click the dot to open a small palette flyout; closes on select or outside-click. */
function SwatchPopover({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <SwatchAnchor ref={ref}>
      <SwatchDot
        type="button"
        aria-label="Change color"
        $color={value}
        $open={open}
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <Popover>
          <SwatchPicker
            palette={categoryColorPalette}
            value={value}
            onChange={(hex) => {
              onChange(hex);
              setOpen(false);
            }}
            columns={6}
          />
        </Popover>
      )}
    </SwatchAnchor>
  );
}

function CategoryRow({
  category,
  isDefault,
  onRecolor,
  onRename,
  onToggleHidden,
  onDelete,
}: {
  category: Category;
  isDefault: boolean;
  onRecolor: (id: string, color: string) => void;
  onRename?: (id: string, name: string) => Promise<RenameCategoryResult>;
  onToggleHidden?: (category: Category) => void;
  onDelete?: (category: Category) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category.name);
  const [error, setError] = useState<string | null>(null);

  function cancelEdit(): void {
    setDraft(category.name);
    setError(null);
    setEditing(false);
  }

  async function handleSave(): Promise<void> {
    setError(null);
    if (draft.trim() === category.name) {
      setEditing(false);
      return;
    }
    const result = await onRename!(category.id, draft.trim());
    if (result.ok) setEditing(false);
    else setError(result.error);
  }

  return (
    <Row
      data-testid={`category-row-${category.id}`}
      aria-disabled={category.hidden ? "true" : undefined}
      $hidden={category.hidden}
    >
      <SwatchPopover
        value={category.color}
        onChange={(hex) => onRecolor(category.id, hex)}
      />

      <RowMain>
        {editing ? (
          <EditWrap>
            <NameInput
              type="text"
              autoFocus
              aria-label="Rename category"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSave();
                if (e.key === "Escape") cancelEdit();
              }}
            />
            <EditActionButton
              type="button"
              aria-label="Save"
              $tone="pos"
              onClick={() => void handleSave()}
            >
              <Check size={14} />
            </EditActionButton>
            <EditActionButton
              type="button"
              aria-label="Cancel"
              $tone="neutral"
              onClick={cancelEdit}
            >
              <X size={14} />
            </EditActionButton>
          </EditWrap>
        ) : (
          <DisplayWrap>
            <RowName>{category.name}</RowName>
            {isDefault && <Badge tone="neutral">Default</Badge>}
            {category.hidden && (
              <Badge tone="neutral">
                <Info size={10} />
                Hidden
              </Badge>
            )}
          </DisplayWrap>
        )}
        {error !== null && <ErrorText role="alert">{error}</ErrorText>}
      </RowMain>

      <Actions>
        {onRename && !editing && (
          <ActionButton
            type="button"
            aria-label="Rename"
            onClick={() => {
              setDraft(category.name);
              setError(null);
              setEditing(true);
            }}
          >
            <Pencil size={15} />
          </ActionButton>
        )}
        {onToggleHidden && (
          <ActionButton
            type="button"
            aria-label={category.hidden ? "Un-hide" : "Hide"}
            onClick={() => onToggleHidden(category)}
          >
            {category.hidden ? <EyeOff size={15} /> : <Eye size={15} />}
          </ActionButton>
        )}
        {onDelete && (
          <ActionButton
            type="button"
            aria-label="Delete"
            $danger
            onClick={() => onDelete(category)}
          >
            <Trash2 size={15} />
          </ActionButton>
        )}
      </Actions>
    </Row>
  );
}

function ReassignPrompt({
  category,
  targets,
  onConfirm,
  onCancel,
}: {
  category: Category;
  targets: Category[];
  onConfirm: (targetId: string) => void;
  onCancel: () => void;
}) {
  const misc = targets.find((t) => t.name === MISCELLANEOUS);
  const [targetId, setTargetId] = useState(misc?.id ?? targets[0]?.id ?? "");

  return (
    <Modal
      onClose={onCancel}
      title={`Delete “${category.name}”`}
      width={440}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="danger"
            icon="Trash2"
            onClick={() => onConfirm(targetId)}
          >
            Reassign &amp; delete
          </Button>
        </>
      }
    >
      <WarnBanner>
        <WarnIcon>
          <Info size={16} />
        </WarnIcon>
        <WarnText>
          <strong>{category.name}</strong> is used by existing transactions.
          Move them to another category first.
        </WarnText>
      </WarnBanner>
      <ReassignLabel>Reassign transactions to</ReassignLabel>
      <Select
        aria-label="Reassign transactions to"
        value={targetId}
        onChange={(e) => setTargetId(e.target.value)}
      >
        {targets.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </Select>
    </Modal>
  );
}

function CategoryAddRow({
  onCreate,
}: {
  onCreate: (name: string, color: string) => Promise<CreateCategoryResult>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(categoryColorPalette[0]);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(): Promise<void> {
    if (!name.trim()) return;
    setError(null);
    const result = await onCreate(name.trim(), color);
    if (result.ok) {
      setName("");
      setColor(categoryColorPalette[0]);
      setOpen(false);
    } else {
      setError(result.error);
    }
  }

  if (!open) {
    return (
      <AddButton
        type="button"
        data-testid="category-add-row"
        onClick={() => setOpen(true)}
      >
        <Plus size={16} />
        Add category
      </AddButton>
    );
  }

  return (
    <AddForm data-testid="category-add-row">
      <AddFormRow>
        <SwatchPopover value={color} onChange={setColor} />
        <AddInput
          type="text"
          autoFocus
          aria-label="New category name"
          placeholder="New category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleAdd();
            if (e.key === "Escape") setOpen(false);
          }}
        />
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          icon="Plus"
          onClick={() => void handleAdd()}
          disabled={!name.trim()}
        >
          Add category
        </Button>
      </AddFormRow>
      {error !== null && <ErrorText role="alert">{error}</ErrorText>}
    </AddForm>
  );
}

export default function CategoryManagerModal({
  onClose,
}: CategoryManagerModalProps) {
  const { defaults, customs, recolor, create, rename, setHidden, remove } =
    useCategoryManager();
  const [reassignFor, setReassignFor] = useState<Category | null>(null);

  function handleRecolor(id: string, color: string): void {
    void recolor(id, color);
  }

  async function handleDelete(category: Category): Promise<void> {
    const result = await remove(category.id);
    if (!result.ok) {
      // In use — reassign its transactions before it can be removed.
      setReassignFor(category);
    }
  }

  async function handleConfirmReassign(targetId: string): Promise<void> {
    if (reassignFor === null) return;
    await remove(reassignFor.id, targetId);
    setReassignFor(null);
  }

  return (
    <Modal
      onClose={onClose}
      title="Manage categories"
      width={480}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <Sections>
        <Section>
          <SectionHeader>
            <SectionLabel>Default</SectionLabel>
            <SectionHint>Recolor or hide — can't be deleted</SectionHint>
          </SectionHeader>
          <RowList>
            {defaults.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                isDefault
                onRecolor={handleRecolor}
                onToggleHidden={(c) => void setHidden(c.id, !c.hidden)}
              />
            ))}
          </RowList>
        </Section>

        <Section>
          <SectionHeader>
            <SectionLabel>Custom</SectionLabel>
          </SectionHeader>
          {customs.length === 0 ? (
            <EmptyState
              title="No custom categories yet"
              hint="Add one below to track spending your own way."
            />
          ) : (
            <RowList>
              {customs.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  isDefault={false}
                  onRecolor={handleRecolor}
                  onRename={rename}
                  onDelete={(c) => void handleDelete(c)}
                />
              ))}
            </RowList>
          )}
          <CategoryAddRow onCreate={create} />
        </Section>
      </Sections>

      {reassignFor !== null && (
        <ReassignPrompt
          category={reassignFor}
          targets={[...defaults, ...customs].filter(
            (c) => c.id !== reassignFor.id
          )}
          onConfirm={(targetId) => void handleConfirmReassign(targetId)}
          onCancel={() => setReassignFor(null)}
        />
      )}
    </Modal>
  );
}
