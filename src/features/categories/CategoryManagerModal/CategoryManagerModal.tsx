import { useState } from "react";
import Modal from "../../../components/Modal/Modal";
import type { Category } from "../../../types/category";
import { categoryColorPalette } from "../../../utils/categoryColor/categoryColor";
import { useCategoryManager } from "../useCategoryManager";
import type { CreateCategoryResult } from "../useCategoryManager";
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
  ErrorText,
} from "./CategoryManagerModal.styles";

interface CategoryManagerModalProps {
  onClose: () => void;
}

function CategoryRow({
  category,
  onRecolor,
}: {
  category: Category;
  onRecolor: (id: string, color: string) => void;
}) {
  return (
    <Row data-testid={`category-row-${category.id}`}>
      <RowName>{category.name}</RowName>
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
    </Row>
  );
}

function CategoryAddRow({
  onCreate,
}: {
  onCreate: (name: string, color: string) => Promise<CreateCategoryResult>;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(categoryColorPalette[0]);
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
  const { defaults, customs, recolor, create } = useCategoryManager();

  function handleRecolor(id: string, color: string): void {
    void recolor(id, color);
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
            />
          ))
        )}
        <CategoryAddRow onCreate={create} />
      </Section>
    </Modal>
  );
}
