import Modal from "../../../components/Modal/Modal";
import type { Category } from "../../../types/category";
import { categoryColorPalette } from "../../../utils/categoryColor/categoryColor";
import { useCategoryManager } from "../useCategoryManager";
import {
  Section,
  SectionLabel,
  Row,
  RowName,
  Swatches,
  Swatch,
  EmptyState,
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

export default function CategoryManagerModal({
  onClose,
}: CategoryManagerModalProps) {
  const { defaults, customs, recolor } = useCategoryManager();

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
      </Section>
    </Modal>
  );
}
