import { useCallback } from "react";
import type { Category } from "../../../types/category";
import { CATEGORIES } from "../../../components/CacheProvider/cacheKeys";
import { useCachedResource } from "../../../components/CacheProvider/useCachedResource";
import { useCacheBump } from "../../../components/CacheProvider/useCacheBump";
import {
  createCategory,
  fetchCategories,
  readErrorMessage,
} from "../categoriesApi/categoriesApi";

export type CreateCategoryOutcome =
  | { ok: true; category: Category }
  | { ok: false; error: string };

const NO_CATEGORIES: Category[] = [];

/** Appends the categories in `extra` that `list` does not already hold. */
export function withAdded(list: Category[], extra: Category[]): Category[] {
  const missing = extra.filter((e) => !list.some((c) => c.id === e.id));
  return missing.length === 0 ? list : [...list, ...missing];
}

/**
 * The one create path for a category the open pickers must see. On success the
 * created category is published to every CATEGORIES reader at once, before
 * the cache is bumped, so no picker holds a value its list does not have
 * while the server's list reconciles.
 */
export function useCreateCategory(): {
  create: (body: {
    name: string;
    color?: string;
  }) => Promise<CreateCategoryOutcome>;
} {
  const { setData } = useCachedResource(CATEGORIES, fetchCategories);
  const bump = useCacheBump();

  const create = useCallback(
    async (body: {
      name: string;
      color?: string;
    }): Promise<CreateCategoryOutcome> => {
      const res = await createCategory(body);
      if (!res.ok) {
        return {
          ok: false,
          error: await readErrorMessage(res, "Failed to create category"),
        };
      }
      const category = (await res.json()) as Category;
      setData((prev) => withAdded(prev ?? NO_CATEGORIES, [category]));
      bump(CATEGORIES);
      return { ok: true, category };
    },
    [setData, bump]
  );

  return { create };
}
