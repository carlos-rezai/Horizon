import { useState, useEffect } from "react";
import { useCategoriesWithInlineAdd } from "../useCategoriesWithInlineAdd";

const ADD_CATEGORY_VALUE = "__add__";

interface Props {
  onChange: (id: string) => void;
}

export default function CategorySelect({ onChange }: Props) {
  const {
    categories,
    selectedCategoryId,
    setSelectedCategoryId,
    isAdding,
    addCategory,
    addError,
  } = useCategoriesWithInlineAdd();

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
      <>
        <label>
          New category name
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            disabled={isAdding}
          />
        </label>
        <button type="button" onClick={handleAddCategory} disabled={isAdding}>
          Add category
        </button>
        {addError && <p>{addError}</p>}
      </>
    );
  }

  return (
    <>
      <label>
        Category
        <select
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
        </select>
      </label>
      {addError && <p>{addError}</p>}
    </>
  );
}
