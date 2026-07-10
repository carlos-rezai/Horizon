import { useState, useEffect } from "react";
import type { Category } from "../../types/category";
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  patchCategory,
  readErrorMessage,
} from "./categoriesApi";

export type CreateCategoryResult = { ok: true } | { ok: false; error: string };
export type RenameCategoryResult = { ok: true } | { ok: false; error: string };
/**
 * A plain delete that succeeds returns `{ ok: true }`. An in-use custom
 * category blocks with `{ ok: false, reason: "in_use" }` so the manager can
 * open the reassign prompt and retry with a target.
 */
export type DeleteCategoryResult =
  | { ok: true }
  | { ok: false; reason: "in_use" };

interface UseCategoryManagerResult {
  defaults: Category[];
  customs: Category[];
  isLoading: boolean;
  recolor: (id: string, color: string) => Promise<void>;
  create: (name: string, color: string) => Promise<CreateCategoryResult>;
  rename: (id: string, name: string) => Promise<RenameCategoryResult>;
  setHidden: (id: string, hidden: boolean) => Promise<void>;
  remove: (id: string, reassignTo?: string) => Promise<DeleteCategoryResult>;
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

    fetchCategories()
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

  // Folds a server-returned Category back into local state so the manager and
  // every surface reading `category.color`/`hidden` update without a refetch.
  function foldCategory(updated: Category): void {
    setCategories((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  }

  // Shared write path for the two silent-on-failure PATCH mutations (recolor,
  // setHidden): a rejected write leaves local state untouched.
  async function applyPatch(
    id: string,
    body: { color: string } | { hidden: boolean }
  ): Promise<void> {
    const res = await patchCategory(id, body);
    if (!res.ok) return;
    foldCategory((await res.json()) as Category);
  }

  async function recolor(id: string, color: string): Promise<void> {
    await applyPatch(id, { color });
  }

  async function create(
    name: string,
    color: string
  ): Promise<CreateCategoryResult> {
    const res = await createCategory({ name, color });
    if (!res.ok) {
      return {
        ok: false,
        error: await readErrorMessage(res, "Could not add category"),
      };
    }
    const created = (await res.json()) as Category;
    setCategories((prev) => [...prev, created]);
    return { ok: true };
  }

  async function rename(
    id: string,
    name: string
  ): Promise<RenameCategoryResult> {
    const res = await patchCategory(id, { name });
    if (!res.ok) {
      return {
        ok: false,
        error: await readErrorMessage(res, "Could not rename category"),
      };
    }
    foldCategory((await res.json()) as Category);
    return { ok: true };
  }

  async function setHidden(id: string, hidden: boolean): Promise<void> {
    await applyPatch(id, { hidden });
  }

  async function remove(
    id: string,
    reassignTo?: string
  ): Promise<DeleteCategoryResult> {
    const res = await deleteCategory(id, reassignTo);
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
      return { ok: true };
    }
    return { ok: false, reason: "in_use" };
  }

  return {
    defaults: categories.filter((c) => c.isDefault),
    customs: categories.filter((c) => !c.isDefault),
    isLoading,
    recolor,
    create,
    rename,
    setHidden,
    remove,
  };
}
