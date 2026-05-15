import { getToken } from "../../auth/tokenStore";

type SilentRefresh = () => Promise<void>;

let silentRefresh: SilentRefresh | null = null;

export function setSilentRefresh(refresh: SilentRefresh | null): void {
  silentRefresh = refresh;
}

function withAuth(
  init: RequestInit | undefined,
  token: string | null
): RequestInit {
  const headers = new Headers(init?.headers);
  if (token !== null) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return { ...init, headers };
}

export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, withAuth(init, getToken()));
  if (response.status !== 401 || silentRefresh === null) {
    return response;
  }
  try {
    await silentRefresh();
  } catch {
    return response;
  }
  return fetch(input, withAuth(init, getToken()));
}
