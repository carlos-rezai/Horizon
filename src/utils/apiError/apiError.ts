/** The error body a route answers with: `{ issues }` or `{ error }`. */
export interface ApiErrorBody {
  issues?: { message: string }[];
  error?: string;
}

/**
 * The user-facing message for a rejected request: the first validation issue
 * (`{ issues }`), else the route's `{ error }`, else the caller's fallback.
 */
export function apiErrorMessage(body: unknown, fallback: string): string {
  if (typeof body !== "object" || body === null) return fallback;
  const { issues, error } = body as ApiErrorBody;
  const first = Array.isArray(issues) ? issues[0]?.message : undefined;
  if (typeof first === "string" && first !== "") return first;
  if (typeof error === "string" && error !== "") return error;
  return fallback;
}
