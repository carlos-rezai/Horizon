import Skeleton from "../../../primitives/Skeleton/Skeleton";
import {
  StyledStrip,
  StyledTile,
  StyledTileHead,
  StyledValue,
  StyledSpark,
} from "./KpiStrip.styles";

// The strip is always four tiles wide, so the placeholder is too.
const TILES = [0, 1, 2, 3];

/**
 * Placeholder for the KPI strip. Built from the strip's own styled parts, so
 * the tiles, dividers and internal spacing are the ones the real strip uses and
 * the row keeps its height when the numbers land.
 */
export default function KpiStripSkeleton() {
  return (
    <StyledStrip data-testid="kpi-strip-skeleton">
      {TILES.map((tile) => (
        <StyledTile key={tile}>
          <StyledTileHead>
            <Skeleton width={78} height={11} />
          </StyledTileHead>
          <StyledValue>
            <Skeleton width={132} height={34} />
          </StyledValue>
          <StyledSpark>
            <Skeleton height={26} />
          </StyledSpark>
        </StyledTile>
      ))}
    </StyledStrip>
  );
}
