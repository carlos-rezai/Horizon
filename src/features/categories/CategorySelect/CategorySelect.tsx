import { useState, useEffect, useId } from "react";
import { useCategoriesWithInlineAdd } from "../useCategoriesWithInlineAdd/useCategoriesWithInlineAdd";
import Select from "../../../primitives/Select/Select";
import Input from "../../../primitives/Input/Input";
import Button from "../../../primitives/Button/Button";
import FormField from "../../../components/FormField/FormField";
import type { ControlSize } from "../../../tokens";
import {
  StyledWrapper,
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
  /**
   * Controlled category *name*. Wins over `initialCategory`, and a change from
   * outside moves the picker (e.g. the Import review table's row category).
   */
  value?: string;
  /**
   * Drops the visible label where something else already names the picker
   * (e.g. a table column header); the select keeps its accessible name.
   */
  hideLabel?: boolean;
  /** Control Height of the select and the inline-add field. */
  size?: ControlSize;
}

export default function CategorySelect({
  onChange,
  initialCategory,
  value,
  hideLabel = false,
  size = "md",
}: Props) {
  const {
    categories,
    selectedCategoryId,
    setSelectedCategoryId,
    isLoading,
    isAdding,
    addCategory,
    addError,
  } = useCategoriesWithInlineAdd(initialCategory, value);

  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // The Import review table renders one of these per row, so the ids have to be
  // per-instance: a duplicated id is invalid HTML and quietly re-points every
  // `<label for>` at the first match in the document, which would leave a row's
  // label focusing the first row's picker.
  const instanceId = useId();
  const selectId = `category-select-${instanceId}`;
  const newCategoryInputId = `new-category-input-${instanceId}`;

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
    const nameInput = (
      <Input
        id={newCategoryInputId}
        type="text"
        size={size}
        aria-label="New category name"
        value={newCategoryName}
        onChange={(e) => setNewCategoryName(e.target.value)}
        disabled={isAdding}
      />
    );
    return (
      <StyledWrapper>
        {hideLabel ? (
          nameInput
        ) : (
          <FormField label="New category name" htmlFor={newCategoryInputId}>
            {nameInput}
          </FormField>
        )}
        <StyledInlineAddRow>
          <Button type="button" onClick={handleAddCategory} disabled={isAdding}>
            Add category
          </Button>
        </StyledInlineAddRow>
        {addError && <StyledErrorText>{addError}</StyledErrorText>}
      </StyledWrapper>
    );
  }

  const select = (
    <Select
      id={selectId}
      size={size}
      aria-label="Category"
      value={selectedCategoryId}
      onChange={(e) => handleCategoryChange(e.target.value)}
      disabled={isAdding || isLoading}
    >
      {categories
        .filter((cat) => !cat.hidden || cat.id === selectedCategoryId)
        .map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      <option value={ADD_CATEGORY_VALUE}>+ Add category</option>
    </Select>
  );

  return (
    <StyledWrapper>
      {hideLabel ? (
        select
      ) : (
        <FormField label="Category" htmlFor={selectId}>
          {select}
        </FormField>
      )}
      {addError && <StyledErrorText>{addError}</StyledErrorText>}
    </StyledWrapper>
  );
}
