// @vitest-environment jsdom
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { Check } from "lucide-react";
import { theme } from "../../../../tokens";
import CacheProvider from "../../../../components/CacheProvider/CacheProvider";
import ReviewTable, { type FlagSpec } from "./ReviewTable";
import { buildReviewRows } from "../../reviewRows/reviewRows";
import type {
  ParsedImportRow,
  ReviewRow,
  RowFlag,
} from "../../reviewRows/reviewRows";
import type { Category } from "../../../../types/category";

/**
 * Issue #259 — Category Proposals and Same-Counterparty Propagation change a
 * row's category from outside its picker, so each row's picker is driven by
 * the row's category, not seeded from it once on mount.
 */

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const categories: Category[] = [
  {
    id: "c-food",
    name: "Food",
    isDefault: true,
    color: "#74C29B",
    hidden: false,
  },
  {
    id: "c-income",
    name: "Income",
    isDefault: false,
    color: "#7BA7D9",
    hidden: false,
  },
];

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => categories,
  } as Response);
});

const spec: FlagSpec = {
  label: "flag",
  tone: "neutral",
  Icon: Check,
  summaryLabel: (n) => `${n} flagged`,
};
const flagSpecs: Record<RowFlag, FlagSpec> = {
  duplicate: spec,
  recurring: spec,
  pending: spec,
};

function parsed(id: string, category: string): ParsedImportRow {
  return {
    id,
    date: "2026-03-05",
    description: `Row ${id}`,
    counterparty: `Row ${id}`,
    amount: -1000,
    category,
    categorySource: "suggested",
  };
}

function tree(rows: ReviewRow[]) {
  return (
    <CacheProvider>
      <ThemeProvider theme={theme}>
        <ReviewTable
          rows={rows}
          flagSpecs={flagSpecs}
          toggle={vi.fn()}
          setCategory={vi.fn()}
          setDescription={vi.fn()}
          registerDescRef={vi.fn()}
        />
      </ThemeProvider>
    </CacheProvider>
  );
}

describe("ReviewTable — row-driven category picker (#259)", () => {
  it("moves a row's picker when the row's category changes from outside", async () => {
    const before = buildReviewRows([
      parsed("r0", "Food"),
      parsed("r1", "Food"),
    ]);
    const { rerender } = render(tree(before));

    await waitFor(() => {
      const pickers = screen.getAllByLabelText(/^category$/i);
      expect(pickers.map((p) => (p as HTMLSelectElement).value)).toEqual([
        "c-food",
        "c-food",
      ]);
    });

    // e.g. a Category Proposal approved, or a propagated pick.
    const after = before.map((r) =>
      r.id === "r1" ? { ...r, category: "Income" } : r
    );
    rerender(tree(after));

    await waitFor(() => {
      const pickers = screen.getAllByLabelText(/^category$/i);
      expect(pickers.map((p) => (p as HTMLSelectElement).value)).toEqual([
        "c-food",
        "c-income",
      ]);
    });
  });
});
