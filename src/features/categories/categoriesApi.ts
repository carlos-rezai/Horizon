import type { Category } from "../../types/category";
import { API_BASE } from "../../utils/api/api";
import { fetchJson } from "../../utils/api/fetchJson";

export { readErrorMessage } from "../../utils/api/readErrorMessage";

/**
 * Feature-local request layer for the categories API. Holds the raw fetch
 * calls, and re-exports the shared `readErrorMessage` parser from `utils/api`
 * so the categories hooks keep one import site for the request/parse plumbing.
 * Each hook keeps its own `useState`/`useEffect`/`cancelled`-flag wrapper —
 * only the request body lives here.
 */

interface CategoryCreateBody {
  name: string;
  color?: string;
}

interface CategoryPatchBody {
  name?: string;
  color?: string;
  hidden?: boolean;
}

export function fetchCategories(): Promise<Category[]> {
  return fetchJson<Category[]>("/categories");
}

export function createCategory(body: CategoryCreateBody): Promise<Response> {
  return fetch(`${API_BASE}/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function patchCategory(
  id: string,
  body: CategoryPatchBody
): Promise<Response> {
  return fetch(`${API_BASE}/categories/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteCategory(
  id: string,
  reassignTo?: string
): Promise<Response> {
  const query = reassignTo ? `?reassignTo=${reassignTo}` : "";
  return fetch(`${API_BASE}/categories/${id}${query}`, { method: "DELETE" });
}
