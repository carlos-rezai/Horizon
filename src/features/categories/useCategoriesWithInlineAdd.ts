import { useState, useEffect } from "react";
import type { Category } from "../../types/category";
import { API_BASE } from "../../utils/api";

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
  initialId?: string
): UseCategoriesWithInlineAddResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/categories`)
      .then((res) => {
        if (!res.ok)
          throw new Error(`Failed to fetch categories: ${res.status}`);
        return res.json() as Promise<Category[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setCategories(data);
          const preferred =
            initialId && data.some((c) => c._id === initialId)
              ? initialId
              : (data[0]?._id ?? "");
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
      setSelectedCategoryId(created._id);
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
