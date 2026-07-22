import Skeleton from "../../../primitives/Skeleton/Skeleton";
import {
  StyledStatBlock,
  StyledLabel,
  StyledValue,
} from "../../../components/StatBlock/StatBlock.styles";
import { StyledStrip, StyledCell } from "./MonthStatStrip.styles";

// Variable Spending · Of which Cat · Entries · Avg / day — the strip is always
// four cells wide, so the placeholder is too.
const CELLS = [
  { label: 118, value: 158 },
  { label: 96, value: 132 },
  { label: 54, value: 46 },
  { label: 68, value: 110 },
];

const LABEL_HEIGHT = 11;
const VALUE_HEIGHT = 26;

/**
 * Placeholder for the Month Overview stat strip. Built from the strip's own
 * cells and `StatBlock`'s label / value parts, so the dividers and vertical
 * rhythm are the ones the real strip uses and the row keeps its height when
 * the month's transactions land.
 */
export default function MonthStatStripSkeleton() {
  return (
    <StyledStrip data-testid="month-stat-strip-skeleton">
      {CELLS.map((cell, index) => (
        <StyledCell key={cell.label} $last={index === CELLS.length - 1}>
          <StyledStatBlock $align="left">
            <StyledLabel>
              <Skeleton width={cell.label} height={LABEL_HEIGHT} />
            </StyledLabel>
            <StyledValue $align="left">
              <Skeleton width={cell.value} height={VALUE_HEIGHT} />
            </StyledValue>
          </StyledStatBlock>
        </StyledCell>
      ))}
    </StyledStrip>
  );
}
