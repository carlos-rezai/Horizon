import { useState, useEffect } from "react";
import type { Category } from "../../types/category";
import { API_BASE } from "../../utils/api/api";

export type CreateCategoryResult = { ok: true } | { ok: false; error: string };
export type RenameCategoryResult = { ok: true } | { ok: false; error: string };

interface UseCategoryManagerResult {
  defaults: Category[];
  customs: Category[];
  isLoading: boolean;
  recolor: (id: string, color: string) => Promise<void>;
  create: (name: string, color: string) => Promise<CreateCategoryResult>;
  rename: (id: string, name: string) => Promise<RenameCategoryResult>;
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

  async function create(
    name: string,
    color: string
  ): Promise<CreateCategoryResult> {
    const res = await fetch(`${API_BASE}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, color }),
    });
    if (!res.ok) {
      let error = "Could not add category";
      try {
        const body = (await res.json()) as { error?: string };
        if (body.error) error = body.error;
      } catch {
        // response had no JSON body — keep the generic message
      }
      return { ok: false, error };
    }
    const created = (await res.json()) as Category;
    setCategories((prev) => [...prev, created]);
    return { ok: true };
  }

  async function rename(
    id: string,
    name: string
  ): Promise<RenameCategoryResult> {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      let error = "Could not rename category";
      try {
        const body = (await res.json()) as { error?: string };
        if (body.error) error = body.error;
      } catch {
        // response had no JSON body — keep the generic message
      }
      return { ok: false, error };
    }
    const updated = (await res.json()) as Category;
    setCategories((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    return { ok: true };
  }

  return {
    defaults: categories.filter((c) => c.isDefault),
    customs: categories.filter((c) => !c.isDefault),
    isLoading,
    recolor,
    create,
    rename,
  };
}
