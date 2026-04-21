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
  onChange: (id: string) => void;
  initialCategoryId?: string;
}

export default function CategorySelect({ onChange, initialCategoryId }: Props) {
  const {
    categories,
    selectedCategoryId,
    setSelectedCategoryId,
    isAdding,
    addCategory,
    addError,
  } = useCategoriesWithInlineAdd(initialCategoryId);

  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    if (selectedCategoryId) {
      onChange(selectedCategoryId);
    }
    // onChange is a stable setState setter in all consumers — safe to omit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId]);

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
            <option key={cat._id} value={cat._id}>
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
