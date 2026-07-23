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
