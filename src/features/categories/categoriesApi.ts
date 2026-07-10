import type { Category } from "../../types/category";
import { API_BASE } from "../../utils/api/api";

/**
 * Feature-local request layer for the categories API. Holds the raw fetch
 * calls and a shared failed-response parser so the categories hooks share one
 * copy of the request/parse plumbing. Each hook keeps its own
 * `useState`/`useEffect`/`cancelled`-flag wrapper — only the request body lives
 * here.
 */

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) {
    throw new Error(`Failed to fetch categories: ${res.status}`);
  }
  return (await res.json()) as Category[];
}

/**
 * Reads an `{ error }` message off a failed response body, falling back to
 * `fallback` when the body is missing or not JSON.
 */
export async function readErrorMessage(
  res: Response,
  fallback: string
): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}
