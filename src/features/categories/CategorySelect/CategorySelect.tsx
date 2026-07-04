import { useState, useEffect } from "react";
import { useCategoriesWithInlineAdd } from "../useCategoriesWithInlineAdd";
import Select from "../../../primitives/Select/Select";
import Input from "../../../primitives/Input/Input";
import Button from "../../../primitives/Button/Button";
import {
  StyledWrapper,
  StyledLabel,
  StyledInlineAddRow,
  StyledErrorText,
} from "./CategorySelect.styles";

const ADD_CATEGORY_VALUE = "__add__";

interface Props {
  /**
   * Called with the selected category's *name*. Transactions reference their
   * category by name (not id), so consumers store this value directly.
   */
  onChange: (categoryName: string) => void;
  /** Pre-select this category by *name* (e.g. when editing an existing row). */
  initialCategory?: string;
}

export default function CategorySelect({ onChange, initialCategory }: Props) {
  const {
    categories,
    selectedCategoryId,
    setSelectedCategoryId,
    isAdding,
    addCategory,
    addError,
  } = useCategoriesWithInlineAdd(initialCategory);

  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Emit the selected category's name (not its id): transactions store the
  // category by name, so this is what consumers persist.
  useEffect(() => {
    const selected = categories.find((c) => c.id === selectedCategoryId);
    if (selected) {
      onChange(selected.name);
    }
    // onChange is a stable setState setter in all consumers — safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, categories]);

  const handleCategoryChange = (selected: string) => {
    if (selected === ADD_CATEGORY_VALUE) {
      setShowInlineAdd(true);
    } else {
      setSelectedCategoryId(selected);
    }
  };

  const handleAddCategory = async () => {
    try {
      await addCategory(newCategoryName);
      setShowInlineAdd(false);
      setNewCategoryName("");
    } catch {
      setShowInlineAdd(false);
    }
  };

  if (showInlineAdd) {
    return (
      <StyledWrapper>
        <StyledLabel htmlFor="new-category-input">
          New category name
          <Input
            id="new-category-input"
            type="text"
            aria-label="New category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            disabled={isAdding}
          />
        </StyledLabel>
        <StyledInlineAddRow>
          <Button type="button" onClick={handleAddCategory} disabled={isAdding}>
            Add category
          </Button>
        </StyledInlineAddRow>
        {addError && <StyledErrorText>{addError}</StyledErrorText>}
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <StyledLabel htmlFor="category-select">
        Category
        <Select
          id="category-select"
          aria-label="Category"
          value={selectedCategoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
          disabled={isAdding}
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
          <option value={ADD_CATEGORY_VALUE}>+ Add category</option>
        </Select>
      </StyledLabel>
      {addError && <StyledErrorText>{addError}</StyledErrorText>}
    </StyledWrapper>
  );
}
