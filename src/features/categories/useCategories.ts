import { useState, useEffect } from "react";
import type { Category } from "../../types/category";
import { API_BASE } from "../../utils/api/api";

/**
 * Fetches the full Category list once on mount. Read-only — the source of
 * truth for each Category's authoritative colour + hidden flag on surfaces
 * that only need to display them (the Month Overview donut, badges, and
 * year-comparison). An empty list before the fetch resolves means those
 * surfaces fall back to the name-derived colour, which matches the pre-#157
 * rendering exactly.
 */
export function useCategories(): { categories: Category[] } {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/categories`)
      .then((res) => {
        if (!res.ok)
          throw new Error(`Failed to fetch categories: ${res.status}`);
        return res.json() as Promise<Category[]>;
      })
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { categories };
}
