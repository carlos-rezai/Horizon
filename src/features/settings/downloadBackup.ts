import { API_BASE } from "../../utils/api/api";

export async function downloadBackup(): Promise<void> {
  const res = await fetch(`${API_BASE}/storage/backup`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`Backup failed: ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "horizon-backup.db";
  anchor.click();
  URL.revokeObjectURL(url);
}
