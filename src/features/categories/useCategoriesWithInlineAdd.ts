import { useState, useEffect } from "react";
import type { Category } from "../../types/category";
import { API_BASE } from "../../utils/api/api";
import { fetchCategories } from "./categoriesApi";

interface UseCategoriesWithInlineAddResult {
  categories: Category[];
  isLoading: boolean;
  selectedCategoryId: string;
  setSelectedCategoryId: (id: string) => void;
  isAdding: boolean;
  addCategory: (name: string) => Promise<void>;
  addError: string | null;
}

export function useCategoriesWithInlineAdd(
  initialCategoryName?: string
): UseCategoriesWithInlineAddResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Resolved from initialCategoryName once the list loads — a name can't be
  // mapped to an id synchronously before the categories are fetched.
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchCategories()
      .then((data) => {
        if (!cancelled) {
          setCategories(data);
          const preferred =
            data.find((c) => c.name === initialCategoryName)?.id ??
            data[0]?.id ??
            "";
          setSelectedCategoryId(preferred);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAddError("Failed to load categories");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // Runs once on mount: the initial category is resolved against the first
    // fetch, not re-resolved when initialCategoryName changes later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addCategory(name: string): Promise<void> {
    setIsAdding(true);
    setAddError(null);

    try {
      const res = await fetch(`${API_BASE}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        const message = data.error ?? "Failed to create category";
        setAddError(message);
        throw new Error(message);
      }

      const created = (await res.json()) as Category;
      setCategories((prev) => [...prev, created]);
      setSelectedCategoryId(created.id);
    } finally {
      setIsAdding(false);
    }
  }

  return {
    categories,
    isLoading,
    selectedCategoryId,
    setSelectedCategoryId,
    isAdding,
    addCategory,
    addError,
  };
}
