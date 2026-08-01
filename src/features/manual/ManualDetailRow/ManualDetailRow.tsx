import { Fragment, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { ManualDetail } from "../manualTypes";
import {
  StyledRow,
  StyledToggle,
  StyledChevron,
  StyledHeading,
  StyledBody,
  StyledProse,
  StyledTerms,
  StyledTerm,
  StyledDefinition,
} from "./ManualDetailRow.styles";

interface ManualDetailRowProps {
  detail: ManualDetail;
}

/**
 * One collapsible claim inside a topic: a heading a reader can scan past, and a
 * body they only pay for when they ask. Rows own their own open state — a topic
 * is a list of independent answers, not an accordion where reading one question
 * closes the last.
 *
 * A row carrying terms expands into a real definition list, because that is
 * what a name-and-meaning pair is; the two-column look is the grid's doing, not
 * the markup's.
 */
export default function ManualDetailRow({ detail }: ManualDetailRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <StyledRow>
      <StyledToggle
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((wasOpen) => !wasOpen)}
      >
        <StyledChevron $open={open} data-testid="manual-row-chevron">
          <ChevronRight size={15} />
        </StyledChevron>
        <StyledHeading>{detail.heading}</StyledHeading>
      </StyledToggle>

      {open && (
        <StyledBody>
          <StyledProse>{detail.body}</StyledProse>
          {detail.terms && (
            <StyledTerms>
              {detail.terms.map(({ term, definition }) => (
                <Fragment key={term}>
                  <StyledTerm>{term}</StyledTerm>
                  <StyledDefinition>{definition}</StyledDefinition>
                </Fragment>
              ))}
            </StyledTerms>
          )}
        </StyledBody>
      )}
    </StyledRow>
  );
}
