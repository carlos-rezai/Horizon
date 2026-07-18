import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import CategorySelect from "../../../categories/CategorySelect/CategorySelect";
import Money from "../../../../primitives/Money/Money";
import type { ReviewRow, RowFlag } from "../../reviewRows";
import { StyledFlagBadge } from "../ImportWizard.styles";
import {
  StyledFlagCell,
  StyledReviewHead,
  StyledReviewBody,
  StyledReviewRow,
  StyledCheck,
  StyledReviewDate,
  StyledReviewDesc,
  StyledReviewAmount,
} from "./ReviewTable.styles";

/** How one soft flag presents: the terse per-row badge, its tone and icon, and
 *  the counted summary phrasing. The single source shared by the review-summary
 *  badges (in `ImportWizard`) and the per-row badges rendered here. */
export interface FlagSpec {
  label: string;
  tone: "warn" | "neutral";
  Icon: LucideIcon;
  summaryLabel: (count: number) => string;
}

interface Props {
  rows: ReviewRow[];
  flagSpecs: Record<RowFlag, FlagSpec>;
  toggle: (id: string) => void;
  setCategory: (id: string, name: string) => void;
  setDescription: (id: string, value: string) => void;
  /** Registers (or clears, on unmount) the row's description input by id so the
   *  wizard's blocked-row jump can focus it. */
  registerDescRef: (id: string, el: HTMLInputElement | null) => void;
}

/**
 * The Import wizard's review-step table: a header row plus one editable row per
 * transaction. Purely presentational — it renders the rows it is given and
 * raises edits through its callbacks. All inclusion, attention, and blocked-row
 * orchestration stays in {@link ImportWizard}.
 */
export default function ReviewTable({
  rows,
  flagSpecs,
  toggle,
  setCategory,
  setDescription,
  registerDescRef,
}: Props) {
  return (
    <>
      <StyledReviewHead>
        <span />
        <span>Date</span>
        <span>Description</span>
        <span>Category</span>
        <span>Flag</span>
        <span>Amount</span>
      </StyledReviewHead>
      <StyledReviewBody>
        {rows.map((r, i) => {
          // A blocker only surfaces on a row that will actually commit;
          // unchecking is the other way to resolve it.
          const showsError = r.included && r.blockers.length > 0;
          return (
            <StyledReviewRow
              key={r.id}
              $included={r.included}
              $alt={i % 2 === 1}
              $blocked={showsError}
            >
              <StyledCheck
                type="button"
                $on={r.included}
                aria-label="toggle"
                aria-pressed={r.included}
                onClick={() => toggle(r.id)}
              >
                {r.included && <Check size={12} />}
              </StyledCheck>
              <StyledReviewDate>{r.date.slice(5)}</StyledReviewDate>
              <StyledReviewDesc
                ref={(el) => registerDescRef(r.id, el)}
                value={r.description}
                aria-label="Description"
                aria-invalid={showsError}
                placeholder={showsError ? "Add a description" : undefined}
                $error={showsError}
                onChange={(e) => setDescription(r.id, e.target.value)}
              />
              <CategorySelect
                initialCategory={r.category}
                onChange={(name) => setCategory(r.id, name)}
              />
              <StyledFlagCell>
                {r.flags.map((flag) => {
                  const { label, tone, Icon } = flagSpecs[flag];
                  return (
                    <StyledFlagBadge key={flag} $tone={tone}>
                      <Icon size={10} />
                      {label}
                    </StyledFlagBadge>
                  );
                })}
              </StyledFlagCell>
              <StyledReviewAmount>
                <Money cents={r.amount} sign />
              </StyledReviewAmount>
            </StyledReviewRow>
          );
        })}
      </StyledReviewBody>
    </>
  );
}
