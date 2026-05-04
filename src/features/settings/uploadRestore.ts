import { API_BASE } from "../../utils/api";

export async function uploadRestore(file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/storage/restore`, {
    method: "POST",
    body: formData,
  });

  if (res.ok) return;

  let message = `Restore failed: ${res.status}`;
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) message = body.error;
  } catch {
    // body wasn't JSON — fall back to the generic message
  }
  throw new Error(message);
}
