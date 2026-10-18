import { Sparkles } from "lucide-react";
import Button from "../../../../primitives/Button/Button";
import { pluralize } from "../../../../utils/format/format";
import type { CategoryProposal } from "../../useCategoryProposals/useCategoryProposals";
import {
  StyledProposalStrip,
  StyledProposalText,
  StyledProposalActions,
  StyledProposalError,
} from "./CategoryProposalStrip.styles";

interface Props {
  proposal: CategoryProposal;
  onCreate: () => void;
  onDismiss: () => void;
}

/**
 * One Category Proposal above the Import wizard's review table: the proposed
 * name and its row count, with Dismiss and Create category, and a failed
 * create's error. Purely presentational — approving and dismissing stay in
 * {@link useCategoryProposals}.
 */
export default function CategoryProposalStrip({
  proposal,
  onCreate,
  onDismiss,
}: Props) {
  return (
    <StyledProposalStrip>
      <StyledProposalText>
        <Sparkles size={13} />
        <span>
          New category: <strong>{proposal.name}</strong>
          {` · ${pluralize(proposal.count, "row")}`}
        </span>
      </StyledProposalText>
      <StyledProposalActions>
        <Button variant="secondary" onClick={onDismiss}>
          Dismiss
        </Button>
        <Button variant="primary" icon="Plus" onClick={onCreate}>
          Create category
        </Button>
      </StyledProposalActions>
      {proposal.error && (
        <StyledProposalError role="alert">{proposal.error}</StyledProposalError>
      )}
    </StyledProposalStrip>
  );
}
