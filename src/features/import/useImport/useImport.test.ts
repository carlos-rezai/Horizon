// @vitest-environment jsdom
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import CacheProvider from "../../../components/CacheProvider/CacheProvider";
import { useHistory } from "../../history/useHistory/useHistory";
import type {
  CommitImportInput,
  ImportRecord,
} from "../importTypes/importTypes";
import { useImport } from "./useImport";

// ---------------------------------------------------------------------------
// Import commit and delete refresh the Year Archive badges (#241). The badges
// are the per-year statement counts `useHistory` derives from the imports
// list, which is cached under `IMPORT_HISTORY`; a commit or a delete changes
// that list, so it has to bump the key.
// ---------------------------------------------------------------------------

function importRecord(id: string, startDate: string): ImportRecord {
  return {
    id,
    accountId: "acc-1",
    bank: "Sparkasse",
    filename: `${id}.csv`,
    sizeBytes: 1024,
    rowCount: 1,
    startDate,
    endDate: startDate,
    importedAt: "2026-10-16T10:00:00.000Z",
  };
}

const COMMIT: CommitImportInput = {
  accountId: "acc-1",
  bank: "Sparkasse",
  filename: "imp-new.csv",
  sizeBytes: 1024,
  mapping: {
    date: "Buchungstag",
    description: "Verwendungszweck",
    amount: "Betrag",
  },
  delimiter: ";",
  decimal: ",",
  dateFmt: "DD.MM.YYYY",
  rows: [
    {
      date: "2024-02-03",
      amount: -1299,
      description: "REWE",
      counterparty: "REWE",
      category: "Food",
      categorySource: "unmatched",
    },
  ],
};

/**
 * A server whose imports list the requests really change: POST /imports adds
 * a 2024 statement, DELETE /imports/:id removes one.
 */
function mockImportsServer(initial: ImportRecord[]) {
  let records = [...initial];
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = init?.method ?? "GET";
    if (url.includes("/projection/history")) {
      return { ok: true, json: async () => [] } as Response;
    }
    if (url.endsWith("/imports") && method === "POST") {
      records = [...records, importRecord("imp-new", "2024-02-03")];
      return { ok: true, status: 201, json: async () => ({}) } as Response;
    }
    const deleted = url.match(/\/imports\/([^/]+)$/);
    if (deleted && method === "DELETE") {
      records = records.filter((record) => record.id !== deleted[1]);
      return { ok: true, status: 204, json: async () => ({}) } as Response;
    }
    if (url.endsWith("/imports")) {
      return { ok: true, json: async () => records } as Response;
    }
    return { ok: true, json: async () => [] } as Response;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useImport — Year Archive badges", () => {
  it("a commit refreshes the per-year statement counts", async () => {
    mockImportsServer([importRecord("imp-1", "2023-03-15")]);

    const { result } = renderHook(
      () => ({ history: useHistory(), imports: useImport([]) }),
      { wrapper: CacheProvider }
    );

    await waitFor(() => {
      expect(result.current.history.statementCounts).toEqual({ 2023: 1 });
    });

    await act(async () => {
      await result.current.imports.commit(COMMIT);
    });

    await waitFor(() => {
      expect(result.current.history.statementCounts).toEqual({
        2023: 1,
        2024: 1,
      });
    });
  });

  it("a delete refreshes the per-year statement counts", async () => {
    mockImportsServer([
      importRecord("imp-1", "2023-03-15"),
      importRecord("imp-2", "2024-01-10"),
    ]);

    const { result } = renderHook(
      () => ({ history: useHistory(), imports: useImport([]) }),
      { wrapper: CacheProvider }
    );

    await waitFor(() => {
      expect(result.current.history.statementCounts).toEqual({
        2023: 1,
        2024: 1,
      });
    });

    await act(async () => {
      await result.current.imports.remove("imp-1");
    });

    await waitFor(() => {
      expect(result.current.history.statementCounts).toEqual({ 2024: 1 });
    });
  });
});
