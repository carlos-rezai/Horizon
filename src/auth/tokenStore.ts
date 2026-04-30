let token: string | null = null;

export function getToken(): string | null {
  return token;
}

export function setToken(next: string): void {
  token = next;
}

export function clearToken(): void {
  token = null;
}
