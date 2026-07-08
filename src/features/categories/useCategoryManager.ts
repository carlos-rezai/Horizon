import { useState, useEffect } from "react";
import type { Category } from "../../types/category";
import { API_BASE } from "../../utils/api/api";

interface UseCategoryManagerResult {
  defaults: Category[];
  customs: Category[];
  isLoading: boolean;
  recolor: (id: string, color: string) => Promise<void>;
}

/**
 * Owns the Category Manager surface's data: the full list split into its
 * Default and Custom sections, plus the recolor write path. Recoloring PATCHes
 * `categories.color` and folds the returned Category back into local state so
 * the manager — and every surface reading `category.color` — reflects the new
 * colour without a manual refresh.
 */
export function useCategoryManager(): UseCategoryManagerResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function recolor(id: string, color: string): Promise<void> {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
    if (!res.ok) return;
    const updated = (await res.json()) as Category;
    setCategories((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  }

  return {
    defaults: categories.filter((c) => c.isDefault),
    customs: categories.filter((c) => !c.isDefault),
    isLoading,
    recolor,
  };
}
