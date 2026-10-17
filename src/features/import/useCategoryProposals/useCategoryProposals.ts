import { useCallback, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Category } from "../../../types/category";
import { useCreateCategory } from "../../categories/useCreateCategory/useCreateCategory";
import { nextFreeCategoryColor } from "../../../utils/categoryColor/categoryColor";
import {
  approveProposal,
  dismissProposal,
  proposalsFor,
  type ReviewRow,
} from "../reviewRows/reviewRows";

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

  const proposals = useMemo(
    () =>
      proposalsFor(rows).map(
        ({ name, count }): CategoryProposal => ({
          name,
          count,
          error: errors[name] ?? null,
        })
      ),
    [rows, errors]
  );

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
      setRows((rs) => approveProposal(rs, name, created.name));
    },
    [categories, setRows, create]
  );

  const dismiss = useCallback(
    (name: string) => {
      setRows((rs) => dismissProposal(rs, name));
      setDeclinedProposals((prev) =>
        prev.includes(name) ? prev : [...prev, name]
      );
    },
    [setRows]
  );

  return { proposals, approve, dismiss, declinedProposals };
}
