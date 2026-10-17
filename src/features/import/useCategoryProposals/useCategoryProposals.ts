import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Category } from "../../../types/category";
import { useCreateCategory } from "../../categories/useCreateCategory/useCreateCategory";
import { nextFreeCategoryColor } from "../../../utils/categoryColor/categoryColor";
import type { ReviewRow } from "../reviewRows/reviewRows";

/** One Category Proposal: a canonical name, its still-proposed rows, and a failed create's error. */
export interface CategoryProposal {
  name: string;
  count: number;
  error: string | null;
}

interface UseCategoryProposalsParams {
  rows: ReviewRow[];
  setRows: Dispatch<SetStateAction<ReviewRow[]>>;
  categories: Category[];
}

interface UseCategoryProposalsResult {
  /** One per distinct proposed category, in first-row order. */
  proposals: CategoryProposal[];
  /**
   * Create the category with the Next Free Colour and move its still-proposed
   * rows into it. Never rejects: a failed create leaves its error on the
   * proposal.
   */
  approve: (name: string) => Promise<void>;
  /** Return the proposal's rows to Miscellaneous and record the name for the commit. */
  dismiss: (name: string) => void;
  /** Names dismissed in this wizard — the commit sends them. */
  declinedProposals: string[];
}

const FALLBACK_CATEGORY = "Miscellaneous";

const isProposedAs = (row: ReviewRow, name: string) =>
  row.categorySource === "proposed" && row.proposedCategory === name;

/** Drop a row's proposal, leaving the rest of the row as it is. */
function withoutProposal(row: ReviewRow): ReviewRow {
  const next = { ...row };
  delete next.proposedCategory;
  return next;
}

/**
 * Category Proposals in the Import review step (issue #262). Proposals are
 * derived from the rows the caller holds; approving creates the category
 * through `useCreateCategory`, which publishes it to every picker before the
 * rows move into it; dismissing is wizard-local until the commit sends
 * `declinedProposals`.
 */
export function useCategoryProposals({
  rows,
  setRows,
  categories,
}: UseCategoryProposalsParams): UseCategoryProposalsResult {
  const { create } = useCreateCategory();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [declinedProposals, setDeclinedProposals] = useState<string[]>([]);

  const proposals = useMemo(() => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (row.categorySource !== "proposed" || !row.proposedCategory) continue;
      counts.set(
        row.proposedCategory,
        (counts.get(row.proposedCategory) ?? 0) + 1
      );
    }
    return [...counts].map(
      ([name, count]): CategoryProposal => ({
        name,
        count,
        error: errors[name] ?? null,
      })
    );
  }, [rows, errors]);

  const approve = useCallback(
    async (name: string) => {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      const outcome = await create({
        name,
        color: nextFreeCategoryColor(categories, name),
      });
      if (!outcome.ok) {
        setErrors((prev) => ({ ...prev, [name]: outcome.error }));
        return;
      }
      const created = outcome.category;
      setRows((rs) =>
        rs.map((r) =>
          isProposedAs(r, name)
            ? {
                ...withoutProposal(r),
                category: created.name,
                categorySource: "suggested",
              }
            : r
        )
      );
    },
    [categories, setRows, create]
  );

  const dismiss = useCallback(
    (name: string) => {
      setRows((rs) =>
        rs.map((r) =>
          isProposedAs(r, name)
            ? {
                ...withoutProposal(r),
                category: FALLBACK_CATEGORY,
                categorySource: "unmatched",
              }
            : r
        )
      );
      setDeclinedProposals((prev) =>
        prev.includes(name) ? prev : [...prev, name]
      );
    },
    [setRows]
  );

  return { proposals, approve, dismiss, declinedProposals };
}
