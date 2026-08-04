// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { uploadRestore } from "./uploadRestore";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("uploadRestore", () => {
  it("POSTs the file to /storage/restore as multipart and resolves on 204", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({}),
    } as Response);

    const file = new File([new Uint8Array([0x53, 0x51, 0x4c])], "backup.db", {
      type: "application/octet-stream",
    });

    await expect(uploadRestore(file)).resolves.toBeUndefined();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toMatch(/\/storage\/restore$/);
    expect(init.method).toBe("POST");
    expect(init.body).toBeInstanceOf(FormData);

    const form = init.body as FormData;
    const uploaded = form.get("file");
    expect(uploaded).toBeInstanceOf(File);
    expect((uploaded as File).name).toBe("backup.db");
  });

  it("rejects with the server's error string when the response is 4xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Backup file failed integrity check" }),
    } as Response);

    const file = new File([new Uint8Array([0x00])], "bad.db");

    await expect(uploadRestore(file)).rejects.toThrow(
      "Backup file failed integrity check"
    );
  });

  it("rejects with a generic message when the error body has no error field", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    const file = new File([new Uint8Array([0x00])], "x.db");

    await expect(uploadRestore(file)).rejects.toThrow(/500/);
  });
});
