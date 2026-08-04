// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadBackup } from "./downloadBackup";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("downloadBackup", () => {
  it("POSTs to /storage/backup and triggers a browser download via anchor + revokeObjectURL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () =>
        new Blob([new Uint8Array([0x53, 0x51, 0x4c, 0x69])], {
          type: "application/octet-stream",
        }),
    } as Response);

    const createObjectURL = vi.fn(() => "blob:mock-url");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(globalThis.URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: createObjectURL,
    });
    Object.defineProperty(globalThis.URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: revokeObjectURL,
    });

    const anchorClicks: HTMLAnchorElement[] = [];
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName.toLowerCase() === "a") {
          const anchor = element as HTMLAnchorElement;
          const originalClick = anchor.click.bind(anchor);
          anchor.click = () => {
            anchorClicks.push(anchor);
            originalClick();
          };
        }
        return element;
      });

    try {
      await downloadBackup();

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(String(url)).toMatch(/\/storage\/backup$/);
      expect(init.method).toBe("POST");

      expect(createObjectURL).toHaveBeenCalled();
      const blobArg = (createObjectURL.mock.calls as [Blob][][])[0]?.[0];
      expect(blobArg).toBeInstanceOf(Blob);

      const downloadAnchor = anchorClicks.find(
        (a) => a.getAttribute("download") !== null
      );
      expect(downloadAnchor).toBeDefined();

      expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    } finally {
      createElementSpy.mockRestore();
    }
  });

  it("rejects when the server returns a non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    await expect(downloadBackup()).rejects.toThrow(/500/);
  });
});
