import { CATEGORIES } from "../../components/CacheProvider/cacheKeys";
import { useCachedResource } from "../../components/CacheProvider/useCachedResource";
import type { Category } from "../../types/category";
import { fetchCategories } from "./categoriesApi";

/**
 * Stable identity for the not-yet-loaded case, so consumers never see a fresh
 * array on every render.
 */
const NO_CATEGORIES: Category[] = [];

/**
 * Reads the full Category list through the app cache. Read-only — the source
 * of truth for each Category's authoritative colour + hidden flag on surfaces
 * that only need to display them (the Month Overview donut, badges, and
 * year-comparison). An empty list before the fetch resolves — or after it
 * fails — means those surfaces fall back to the name-derived colour, which
 * matches the pre-#157 rendering exactly.
 */
export function useCategories(): { categories: Category[] } {
  const { data } = useCachedResource(CATEGORIES, fetchCategories);

  return { categories: data ?? NO_CATEGORIES };
}
