import { API_BASE } from "./api";

/**
 * Issues a GET against the API and returns the parsed JSON body.
 *
 * The one home for the app's "fetch, check the status, parse" idiom, so every
 * cached read throws the same shape of error — the path and the status — rather
 * than re-typing that message at each call site where it can drift.
 */
export async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status}`);
  }
  return (await res.json()) as T;
}
