// @vitest-environment jsdom
import { useState } from "react";
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCategoryProposals } from "./useCategoryProposals";
import { useCategories } from "../../categories/useCategories/useCategories";
import CacheProvider from "../../../components/CacheProvider/CacheProvider";
import { categoryColorPalette } from "../../../utils/categoryColor/categoryColor";
import type { Category } from "../../../types/category";
import type { ReviewRow } from "../reviewRows/reviewRows";

/**
 * Issue #262 — Category Proposals in the review step.
 *
 * `useCategoryProposals({ rows, setRows, categories })` derives one proposal
 * per distinct `proposedCategory` among the still-proposed rows, with its row
 * count. `approve(name)` creates the category through `POST /categories` with
 * the Next Free Colour, bumps the CATEGORIES cache and moves the still-proposed
 * rows into it as `suggested`; rows the user already changed stay as they are.
 * `dismiss(name)` returns the rows to `unmatched` and records the name in the
 * wizard-local `declinedProposals` the commit sends. A failed create keeps the
 * proposal and surfaces the error on it.
 *
 * The rows live with the caller (the wizard), so the harness holds them in
 * state and hands the hook the setter, as `useImportWizard` would.
 */

const categories: Category[] = [
  {
    id: "c-food",
    name: "Food",
    isDefault: true,
    color: categoryColorPalette[0],
    hidden: false,
  },
  {
    id: "c-misc",
    name: "Miscellaneous",
    isDefault: true,
    color: categoryColorPalette[1],
    hidden: false,
  },
];

const dining: Category = {
  id: "c-dining",
  name: "Dining",
  isDefault: false,
  color: categoryColorPalette[2],
  hidden: false,
};

type ProposalRow = ReviewRow & { proposedCategory?: string };

function reviewRow(
  id: string,
  overrides: Partial<ProposalRow> = {}
): ReviewRow {
  const row: ProposalRow = {
    id,
    date: "2026-06-24",
    description: `Payee ${id}`,
    counterparty: `Payee ${id}`,
    amount: -2390,
    category: "Miscellaneous",
    categorySource: "unmatched",
    included: true,
    flags: [],
    blockers: [],
    ...overrides,
  };
  return row;
}

const proposed = (id: string, name: string) =>
  reviewRow(id, { categorySource: "proposed", proposedCategory: name });

function initialRows(): ReviewRow[] {
  return [
    proposed("r0", "Dining"),
    proposed("r1", "Dining"),
    proposed("r2", "Health"),
    reviewRow("r3", { category: "Food", categorySource: "suggested" }),
    proposed("r4", "Dining"),
  ];
}

function useHarness(start: ReviewRow[]) {
  const [rows, setRows] = useState<ReviewRow[]>(start);
  const proposals = useCategoryProposals({ rows, setRows, categories });
  // A CATEGORIES reader elsewhere on the page — it refetches on a bump.
  useCategories();
  return { rows, ...proposals };
}

type FetchCall = [RequestInfo | URL, RequestInit | undefined];

function fetchCalls(): FetchCall[] {
  return vi.mocked(fetch).mock.calls as FetchCall[];
}

const isPost = ([, init]: FetchCall) => init?.method === "POST";
const isCategoriesGet = ([url, init]: FetchCall) =>
  (init?.method ?? "GET") === "GET" && String(url).endsWith("/categories");

/** Answer GET /categories with the list, POST /categories with `post`. */
function mockFetch(post: { ok: boolean; body: unknown }) {
  vi.spyOn(globalThis, "fetch").mockImplementation(
    (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve({
          ok: post.ok,
          status: post.ok ? 201 : 409,
          json: async () => post.body,
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => categories,
      } as Response);
    }
  );
}

function rowById(rows: ReviewRow[], id: string): ProposalRow {
  const row = rows.find((r) => r.id === id);
  expect(row, id).toBeDefined();
  return row as ProposalRow;
}

function renderHarness(start: ReviewRow[] = initialRows()) {
  return renderHook(() => useHarness(start), { wrapper: CacheProvider });
}

beforeEach(() => {
  mockFetch({ ok: true, body: dining });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useCategoryProposals — proposals", () => {
  it("derives one proposal per proposed category with its row count", async () => {
    const { result } = renderHarness();
    await act(async () => {});

    const byName = Object.fromEntries(
      result.current.proposals.map((p) => [p.name, p.count])
    );
    expect(byName).toEqual({ Dining: 3, Health: 1 });
  });

  it("has no proposals and nothing declined when no row is proposed", async () => {
    const { result } = renderHarness([
      reviewRow("r0"),
      reviewRow("r1", { category: "Food", categorySource: "learned" }),
    ]);
    await act(async () => {});

    expect(result.current.proposals).toEqual([]);
    expect(result.current.declinedProposals).toEqual([]);
  });
});

describe("useCategoryProposals — approve", () => {
  it("creates the category through POST /categories with the Next Free Colour", async () => {
    const { result } = renderHarness();
    await act(async () => {});

    await act(async () => {
      await result.current.approve("Dining");
    });

    const posts = fetchCalls().filter(isPost);
    expect(posts).toHaveLength(1);
    expect(String(posts[0][0]).endsWith("/categories")).toBe(true);
    // Food and Miscellaneous hold swatches 0 and 1, so swatch 2 is next free.
    expect(JSON.parse(String(posts[0][1]?.body))).toEqual({
      name: "Dining",
      color: categoryColorPalette[2],
    });
  });

  it("moves the still-proposed rows into the new category as suggested, and drops the proposal", async () => {
    const { result } = renderHarness();
    await act(async () => {});

    await act(async () => {
      await result.current.approve("Dining");
    });

    for (const id of ["r0", "r1", "r4"]) {
      const row = rowById(result.current.rows, id);
      expect(row, id).toMatchObject({
        category: "Dining",
        categorySource: "suggested",
      });
      expect(row.proposedCategory, id).toBeUndefined();
    }
    // The other proposal and the other rows are untouched.
    expect(rowById(result.current.rows, "r2")).toMatchObject({
      category: "Miscellaneous",
      categorySource: "proposed",
      proposedCategory: "Health",
    });
    expect(rowById(result.current.rows, "r3")).toMatchObject({
      category: "Food",
      categorySource: "suggested",
    });
    expect(result.current.proposals.map((p) => p.name)).toEqual(["Health"]);
    expect(result.current.declinedProposals).toEqual([]);
  });

  it("leaves a proposed row the user already changed as it is", async () => {
    const { result } = renderHarness([
      proposed("r0", "Dining"),
      reviewRow("r1", { category: "Food", categorySource: "chosen" }),
    ]);
    await act(async () => {});

    await act(async () => {
      await result.current.approve("Dining");
    });

    expect(rowById(result.current.rows, "r0")).toMatchObject({
      category: "Dining",
      categorySource: "suggested",
    });
    expect(rowById(result.current.rows, "r1")).toMatchObject({
      category: "Food",
      categorySource: "chosen",
    });
  });

  it("bumps the CATEGORIES cache so every category reader refetches", async () => {
    const { result } = renderHarness();
    await waitFor(() =>
      expect(fetchCalls().filter(isCategoriesGet).length).toBeGreaterThan(0)
    );
    const before = fetchCalls().filter(isCategoriesGet).length;

    await act(async () => {
      await result.current.approve("Dining");
    });

    await waitFor(() =>
      expect(fetchCalls().filter(isCategoriesGet).length).toBeGreaterThan(
        before
      )
    );
  });

  it("keeps the proposal and its rows, and surfaces the error, when the create fails", async () => {
    vi.restoreAllMocks();
    mockFetch({ ok: false, body: { error: "Category already exists" } });
    const { result } = renderHarness();
    await act(async () => {});

    await act(async () => {
      await result.current.approve("Dining").catch(() => undefined);
    });

    const proposal = result.current.proposals.find((p) => p.name === "Dining");
    expect(proposal).toBeDefined();
    expect(proposal?.count).toBe(3);
    expect(proposal?.error).toMatch(/already exists/i);
    expect(rowById(result.current.rows, "r0")).toMatchObject({
      category: "Miscellaneous",
      categorySource: "proposed",
      proposedCategory: "Dining",
    });
    expect(result.current.declinedProposals).toEqual([]);
  });
});

describe("useCategoryProposals — dismiss", () => {
  it("returns the proposed rows to unmatched in Miscellaneous and drops the proposal", async () => {
    const { result } = renderHarness();
    await act(async () => {});

    act(() => {
      result.current.dismiss("Dining");
    });

    for (const id of ["r0", "r1", "r4"]) {
      const row = rowById(result.current.rows, id);
      expect(row, id).toMatchObject({
        category: "Miscellaneous",
        categorySource: "unmatched",
      });
      expect(row.proposedCategory, id).toBeUndefined();
    }
    expect(rowById(result.current.rows, "r2")).toMatchObject({
      categorySource: "proposed",
      proposedCategory: "Health",
    });
    expect(result.current.proposals.map((p) => p.name)).toEqual(["Health"]);
  });

  it("records the dismissed names for the commit, without creating anything", async () => {
    const { result } = renderHarness();
    await act(async () => {});

    act(() => {
      result.current.dismiss("Dining");
    });
    act(() => {
      result.current.dismiss("Health");
    });

    expect([...result.current.declinedProposals].sort()).toEqual([
      "Dining",
      "Health",
    ]);
    expect(fetchCalls().filter(isPost)).toHaveLength(0);
  });

  it("starts with nothing declined in a fresh wizard", async () => {
    const first = renderHarness();
    await act(async () => {});
    act(() => {
      first.result.current.dismiss("Dining");
    });
    first.unmount();

    const second = renderHarness();
    await act(async () => {});

    expect(second.result.current.declinedProposals).toEqual([]);
    expect(second.result.current.proposals.map((p) => p.name).sort()).toEqual([
      "Dining",
      "Health",
    ]);
  });
});
