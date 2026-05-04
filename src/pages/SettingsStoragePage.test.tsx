// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { describe, it, expect, afterEach, vi } from "vitest";
import { theme } from "../tokens";
import SettingsStoragePage from "./SettingsStoragePage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={["/settings/storage"]}>
        <SettingsStoragePage />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("SettingsStoragePage — loading state", () => {
  it("renders a loading indicator before the fetch resolves", () => {
    let resolveFetch: ((value: Response) => void) | null = null;
    const pending = new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    });
    vi.spyOn(globalThis, "fetch").mockReturnValue(pending);

    renderPage();

    expect(screen.getByRole("status")).toBeInTheDocument();

    if (resolveFetch) {
      resolveFetch({
        ok: true,
        json: async () => ({
          driver: "sqlite",
          schemaVersion: 2,
          integrity: "ok",
          path: ":memory:",
          sizeBytes: 0,
        }),
      } as Response);
    }
  });
});

describe("SettingsStoragePage — SQLite status", () => {
  it("renders driver, schemaVersion, integrity, path and sizeBytes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        driver: "sqlite",
        schemaVersion: 2,
        integrity: "ok",
        path: "/Users/x/horizon.db",
        sizeBytes: 12345,
      }),
    } as Response);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/sqlite/i)).toBeInTheDocument();
    });
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("ok")).toBeInTheDocument();
    expect(screen.getByText("/Users/x/horizon.db")).toBeInTheDocument();
    expect(screen.getByText(/12345/)).toBeInTheDocument();
  });
});

describe("SettingsStoragePage — Mongo status", () => {
  it("renders driver/schemaVersion/integrity but does not render path or sizeBytes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        driver: "mongo",
        schemaVersion: 0,
        integrity: "ok",
      }),
    } as Response);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/mongo/i)).toBeInTheDocument();
    });
    expect(screen.getByText("0")).toBeInTheDocument();
    expect(screen.getByText("ok")).toBeInTheDocument();
    expect(screen.queryByText(/path/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sizeBytes|size/i)).not.toBeInTheDocument();
  });
});

describe("SettingsStoragePage — error state", () => {
  it("renders an error message when the fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});

describe("SettingsStoragePage — Download backup button (SQLite)", () => {
  function mockStatusFetch(): void {
    vi.spyOn(globalThis, "fetch").mockImplementation(((
      input: RequestInfo | URL,
      init?: RequestInit
    ) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = init?.method ?? "GET";

      if (method === "GET" && url.includes("/storage/status")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            driver: "sqlite",
            schemaVersion: 2,
            integrity: "ok",
            path: "/Users/x/horizon.db",
            sizeBytes: 12345,
          }),
        } as Response);
      }

      if (method === "POST" && url.includes("/storage/backup")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          blob: async () =>
            new Blob([new Uint8Array([0x53, 0x51, 0x4c, 0x69])], {
              type: "application/octet-stream",
            }),
        } as Response);
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    }) as typeof fetch);
  }

  it("renders a Download backup button under SQLite", async () => {
    mockStatusFetch();

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /download backup/i })
      ).toBeInTheDocument();
    });
  });

  it("clicking the button POSTs to /storage/backup", async () => {
    mockStatusFetch();

    renderPage();

    const button = await screen.findByRole("button", {
      name: /download backup/i,
    });

    fireEvent.click(button);

    await waitFor(() => {
      const calls = (
        globalThis.fetch as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls;
      const backupCall = calls.find((c) => {
        const url = typeof c[0] === "string" ? c[0] : String(c[0]);
        const init = c[1] as RequestInit | undefined;
        return (
          url.includes("/storage/backup") &&
          (init?.method ?? "GET").toUpperCase() === "POST"
        );
      });
      expect(backupCall).toBeDefined();
    });
  });

  it("triggers a browser download via createObjectURL + an anchor with download attr", async () => {
    mockStatusFetch();

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
      renderPage();

      const button = await screen.findByRole("button", {
        name: /download backup/i,
      });
      fireEvent.click(button);

      await waitFor(() => {
        expect(createObjectURL).toHaveBeenCalled();
      });

      const blobArg = createObjectURL.mock.calls[0]?.[0];
      expect(blobArg).toBeInstanceOf(Blob);

      const downloadAnchor = anchorClicks.find(
        (a) => a.getAttribute("download") !== null
      );
      expect(downloadAnchor).toBeDefined();
    } finally {
      createElementSpy.mockRestore();
    }
  });
});

describe("SettingsStoragePage — Download backup button (Mongo)", () => {
  it("does not render the Download backup button under Mongo", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        driver: "mongo",
        schemaVersion: 0,
        integrity: "ok",
      }),
    } as Response);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/mongo/i)).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /download backup/i })
    ).not.toBeInTheDocument();
  });
});

describe("SettingsStoragePage — Restore from backup button (SQLite)", () => {
  interface RestoreFetchOptions {
    initialStatus?: {
      driver: "sqlite" | "mongo";
      schemaVersion: number;
      integrity: string;
      path?: string;
      sizeBytes?: number;
    };
    secondStatus?: {
      driver: "sqlite" | "mongo";
      schemaVersion: number;
      integrity: string;
      path?: string;
      sizeBytes?: number;
    };
    restoreResponse?: { ok: boolean; status: number; body?: unknown };
  }

  function mockRestoreFetch(opts: RestoreFetchOptions = {}): {
    statusCalls: number;
  } {
    const initialStatus = opts.initialStatus ?? {
      driver: "sqlite" as const,
      schemaVersion: 2,
      integrity: "ok",
      path: "/Users/x/horizon.db",
      sizeBytes: 100,
    };
    const secondStatus = opts.secondStatus ?? initialStatus;
    const restoreResponse = opts.restoreResponse ?? {
      ok: true,
      status: 204,
      body: {},
    };

    const counter = { statusCalls: 0 };

    vi.spyOn(globalThis, "fetch").mockImplementation(((
      input: RequestInfo | URL,
      init?: RequestInit
    ) => {
      const url = typeof input === "string" ? input : input.toString();
      const method = (init?.method ?? "GET").toUpperCase();

      if (method === "GET" && url.includes("/storage/status")) {
        counter.statusCalls += 1;
        const body = counter.statusCalls === 1 ? initialStatus : secondStatus;
        return Promise.resolve({
          ok: true,
          json: async () => body,
        } as Response);
      }

      if (method === "POST" && url.includes("/storage/restore")) {
        return Promise.resolve({
          ok: restoreResponse.ok,
          status: restoreResponse.status,
          json: async () => restoreResponse.body ?? {},
        } as Response);
      }

      throw new Error(`Unexpected fetch: ${method} ${url}`);
    }) as typeof fetch);

    return counter;
  }

  it("renders a Restore from backup button under SQLite", async () => {
    mockRestoreFetch();

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /restore from backup/i })
      ).toBeInTheDocument();
    });
  });

  it("clicking the button opens a file picker (hidden file input)", async () => {
    mockRestoreFetch();

    renderPage();

    const button = await screen.findByRole("button", {
      name: /restore from backup/i,
    });

    const inputBefore = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement | null;
    expect(inputBefore).not.toBeNull();

    const clickSpy = vi.fn();
    if (inputBefore) inputBefore.click = clickSpy;

    fireEvent.click(button);
    expect(clickSpy).toHaveBeenCalled();
  });

  it("selecting a file shows a confirm dialog naming the file", async () => {
    mockRestoreFetch();

    renderPage();

    await screen.findByRole("button", { name: /restore from backup/i });

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    const file = new File([new Uint8Array([0x00])], "my-backup.db");
    Object.defineProperty(fileInput, "files", { value: [file] });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText(/my-backup\.db/)).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: /confirm/i })
    ).toBeInTheDocument();
  });

  it("confirming calls uploadRestore, refetches status, and shows success", async () => {
    const counter = mockRestoreFetch();

    renderPage();

    await screen.findByRole("button", { name: /restore from backup/i });

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File([new Uint8Array([0x00])], "ok.db");
    Object.defineProperty(fileInput, "files", { value: [file] });
    fireEvent.change(fileInput);

    const confirm = await screen.findByRole("button", { name: /confirm/i });
    fireEvent.click(confirm);

    await waitFor(() => {
      const calls = (
        globalThis.fetch as unknown as { mock: { calls: unknown[][] } }
      ).mock.calls;
      const restoreCall = calls.find((c) => {
        const url = typeof c[0] === "string" ? c[0] : String(c[0]);
        const init = c[1] as RequestInit | undefined;
        return (
          url.includes("/storage/restore") &&
          (init?.method ?? "GET").toUpperCase() === "POST"
        );
      });
      expect(restoreCall).toBeDefined();
    });

    await waitFor(() => {
      expect(counter.statusCalls).toBeGreaterThanOrEqual(2);
    });
    await waitFor(() => {
      expect(screen.getByText(/restore.*succe/i)).toBeInTheDocument();
    });
  });

  it("surfaces the server error when uploadRestore rejects", async () => {
    mockRestoreFetch({
      restoreResponse: {
        ok: false,
        status: 400,
        body: { error: "Backup file failed integrity check" },
      },
    });

    renderPage();

    await screen.findByRole("button", { name: /restore from backup/i });

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const file = new File([new Uint8Array([0x00])], "bad.db");
    Object.defineProperty(fileInput, "files", { value: [file] });
    fireEvent.change(fileInput);

    const confirm = await screen.findByRole("button", { name: /confirm/i });
    fireEvent.click(confirm);

    await waitFor(() => {
      expect(
        screen.getByText(/Backup file failed integrity check/i)
      ).toBeInTheDocument();
    });
  });
});

describe("SettingsStoragePage — Restore from backup button (Mongo)", () => {
  it("does not render the Restore button under Mongo", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        driver: "mongo",
        schemaVersion: 0,
        integrity: "ok",
      }),
    } as Response);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/mongo/i)).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /restore from backup/i })
    ).not.toBeInTheDocument();
  });
});
