import Skeleton from "../../../primitives/Skeleton/Skeleton";
import {
  StyledStatBlock,
  StyledLabel,
  StyledValue,
  StyledHint,
} from "../../../components/StatBlock/StatBlock.styles";
import { StyledStrip, StyledCell } from "./OutlookSummary.styles";

// Total Liquid · Debt-free · Total Sondertilgung. The last two carry a hint
// line under their value, so their placeholders do too.
const CELLS = [
  { label: 132, value: 176, hint: 0 },
  { label: 74, value: 138, hint: 152 },
  { label: 126, value: 190, hint: 118 },
];

const LABEL_HEIGHT = 11;
const VALUE_HEIGHT = 30;
const HINT_HEIGHT = 12;

/**
 * Placeholder for the Outlook summary. Built from the strip's own cells and
 * `StatBlock`'s label / value / hint parts, so the dividers and vertical rhythm
 * are the ones the real strip uses and the row keeps its height when the
 * projection lands.
 */
export default function OutlookSummarySkeleton() {
  return (
    <StyledStrip data-testid="outlook-summary-skeleton">
      {CELLS.map((cell, index) => (
        <StyledCell key={cell.label} $last={index === CELLS.length - 1}>
          <StyledStatBlock $align="left">
            <StyledLabel>
              <Skeleton width={cell.label} height={LABEL_HEIGHT} />
            </StyledLabel>
            <StyledValue $align="left">
              <Skeleton width={cell.value} height={VALUE_HEIGHT} />
            </StyledValue>
            {cell.hint > 0 && (
              <StyledHint>
                <Skeleton width={cell.hint} height={HINT_HEIGHT} />
              </StyledHint>
            )}
          </StyledStatBlock>
        </StyledCell>
      ))}
    </StyledStrip>
  );
}
