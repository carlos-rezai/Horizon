import { useState, useEffect, useMemo } from "react";
import type { Category } from "../../../types/category";
import { fetchCategories } from "../categoriesApi/categoriesApi";
import { CATEGORIES } from "../../../components/CacheProvider/cacheKeys";
import { useCachedResource } from "../../../components/CacheProvider/useCachedResource";
import {
  useCreateCategory,
  withAdded,
} from "../useCreateCategory/useCreateCategory";

interface UseCategoriesWithInlineAddResult {
  categories: Category[];
  isLoading: boolean;
  selectedCategoryId: string;
  setSelectedCategoryId: (id: string) => void;
  isAdding: boolean;
  addCategory: (name: string) => Promise<void>;
  addError: string | null;
}

const NO_CATEGORIES: Category[] = [];

/**
 * The Category list behind a `CategorySelect`, read through the app cache so
 * every picker on a page shares one request, plus inline-add.
 *
 * `initialCategoryName` seeds the selection; `controlledName`, when given,
 * drives it — a change from outside moves the selection, and a pick made in
 * the picker holds only until the next outside change.
 */
export function useCategoriesWithInlineAdd(
  initialCategoryName?: string,
  controlledName?: string
): UseCategoriesWithInlineAddResult {
  const { data, error } = useCachedResource(CATEGORIES, fetchCategories);
  const { create } = useCreateCategory();

  // Categories this picker created. A cached read that started before the add
  // can land after it without them — they are kept regardless.
  const [added, setAdded] = useState<Category[]>([]);
  // A pick made in this picker. It wins over the name-derived selection until
  // the controlled name changes from outside.
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    if (controlledName !== undefined) setChosenId(null);
  }, [controlledName]);

  const categories = useMemo(
    () => withAdded(data ?? NO_CATEGORIES, added),
    [data, added]
  );

  const preferredName = controlledName ?? initialCategoryName;
  const selectedCategoryId =
    chosenId ??
    (data === undefined
      ? ""
      : (categories.find((c) => c.name === preferredName)?.id ??
        categories[0]?.id ??
        ""));

  async function addCategory(name: string): Promise<void> {
    setIsAdding(true);
    setAddError(null);

    try {
      // useCreateCategory publishes the new category to every other picker at
      // once, then lets the server's list reconcile it.
      const outcome = await create({ name });
      if (!outcome.ok) {
        setAddError(outcome.error);
        throw new Error(outcome.error);
      }

      setAdded((prev) => [...prev, outcome.category]);
      setChosenId(outcome.category.id);
    } finally {
      setIsAdding(false);
    }
  }

  return {
    categories,
    isLoading: data === undefined && error === null,
    selectedCategoryId,
    setSelectedCategoryId: setChosenId,
    isAdding,
    addCategory,
    addError:
      addError ??
      (data === undefined && error !== null
        ? "Failed to load categories"
        : null),
  };
}
