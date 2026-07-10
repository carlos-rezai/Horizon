import { useState } from "react";
import Modal from "../../../components/Modal/Modal";
import Select from "../../../primitives/Select/Select";
import type { Category } from "../../../types/category";
import { categoryColorPalette } from "../../../utils/categoryColor/categoryColor";
import { useCategoryManager } from "../useCategoryManager";
import type {
  CreateCategoryResult,
  RenameCategoryResult,
} from "../useCategoryManager";
import {
  Section,
  SectionLabel,
  Row,
  RowName,
  Swatches,
  Swatch,
  EmptyState,
  AddRow,
  NameInput,
  AddButton,
  RenameButton,
  HideButton,
  DeleteButton,
  ReassignText,
  ConfirmDeleteButton,
  ErrorText,
} from "./CategoryManagerModal.styles";

const MISCELLANEOUS = "Miscellaneous";

interface CategoryManagerModalProps {
  onClose: () => void;
}

function CategoryRow({
  category,
  onRecolor,
  onRename,
  onToggleHidden,
  onDelete,
}: {
  category: Category;
  onRecolor: (id: string, color: string) => void;
  onRename?: (id: string, name: string) => Promise<RenameCategoryResult>;
  onToggleHidden?: (category: Category) => void;
  onDelete?: (category: Category) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(category.name);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(): Promise<void> {
    setError(null);
    const result = await onRename!(category.id, draft);
    if (result.ok) {
      setEditing(false);
    } else {
      setError(result.error);
    }
  }

  return (
    <Row
      data-testid={`category-row-${category.id}`}
      aria-disabled={category.hidden ? "true" : undefined}
    >
      <RowName>{category.name}</RowName>
      {editing && (
        <NameInput
          type="text"
          aria-label="Rename category"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
      )}
      <Swatches>
        {categoryColorPalette.map((hex) => (
          <Swatch
            key={hex}
            type="button"
            aria-label={hex}
            aria-pressed={category.color.toLowerCase() === hex.toLowerCase()}
            $color={hex}
            $selected={category.color.toLowerCase() === hex.toLowerCase()}
            onClick={() => onRecolor(category.id, hex)}
          />
        ))}
      </Swatches>
      {onRename &&
        (editing ? (
          <RenameButton type="button" onClick={() => void handleSave()}>
            Save
          </RenameButton>
        ) : (
          <RenameButton
            type="button"
            onClick={() => {
              setDraft(category.name);
              setError(null);
              setEditing(true);
            }}
          >
            Rename
          </RenameButton>
        ))}
      {onToggleHidden && (
        <HideButton type="button" onClick={() => onToggleHidden(category)}>
          {category.hidden ? "Un-hide" : "Hide"}
        </HideButton>
      )}
      {onDelete && (
        <DeleteButton type="button" onClick={() => onDelete(category)}>
          Delete
        </DeleteButton>
      )}
      {error !== null && <ErrorText role="alert">{error}</ErrorText>}
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
      title={`Delete ${category.name}`}
      footer={
        <ConfirmDeleteButton type="button" onClick={() => onConfirm(targetId)}>
          Reassign and delete
        </ConfirmDeleteButton>
      }
    >
      <ReassignText>
        Move its transactions to another category, then delete “{category.name}
        ”.
      </ReassignText>
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
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(categoryColorPalette[0]);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(): Promise<void> {
    setError(null);
    const result = await onCreate(name, color);
    if (result.ok) {
      setName("");
      setColor(categoryColorPalette[0]);
    } else {
      setError(result.error);
    }
  }

  return (
    <AddRow data-testid="category-add-row">
      <Row>
        <NameInput
          type="search"
          aria-label="New category name"
          placeholder="New category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Swatches>
          {categoryColorPalette.map((hex) => (
            <Swatch
              key={hex}
              type="button"
              aria-label={hex}
              aria-pressed={color.toLowerCase() === hex.toLowerCase()}
              $color={hex}
              $selected={color.toLowerCase() === hex.toLowerCase()}
              onClick={() => setColor(hex)}
            />
          ))}
        </Swatches>
        <AddButton type="button" onClick={() => void handleAdd()}>
          Add category
        </AddButton>
      </Row>
      {error !== null && <ErrorText role="alert">{error}</ErrorText>}
    </AddRow>
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
    <Modal onClose={onClose} title="Manage categories">
      <Section>
        <SectionLabel>Default</SectionLabel>
        {defaults.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            onRecolor={handleRecolor}
            onToggleHidden={(c) => void setHidden(c.id, !c.hidden)}
          />
        ))}
      </Section>
      <Section>
        <SectionLabel>Custom</SectionLabel>
        {customs.length === 0 ? (
          <EmptyState>No custom categories yet</EmptyState>
        ) : (
          customs.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              onRecolor={handleRecolor}
              onRename={rename}
              onDelete={(c) => void handleDelete(c)}
            />
          ))
        )}
        <CategoryAddRow onCreate={create} />
      </Section>
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
