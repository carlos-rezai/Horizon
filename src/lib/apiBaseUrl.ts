export function resolveApiBaseUrl(): string {
  return (
    window.horizon?.apiBaseUrl ??
    import.meta.env.VITE_API_BASE_URL ??
    "http://localhost:3001"
  );
}
