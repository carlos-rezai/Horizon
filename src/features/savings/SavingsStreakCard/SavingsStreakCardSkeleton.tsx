import Card from "../../../components/Card/Card";
import Skeleton from "../../../primitives/Skeleton/Skeleton";
import { StyledStrip, StyledCaption } from "./SavingsStreakCard.styles";
import {
  StyledHeaderRow,
  StyledTitleStack,
  StyledTileSlot,
} from "./SavingsStreakCardSkeleton.styles";

// Jan→Dec: the strip is a full calendar year in every state.
const MONTH_SLOTS = Array.from({ length: 12 }, (_, month) => month);

const FLAME_BADGE_SIZE = 44;
const TILE_HEIGHT = 30;

/**
 * Placeholder for the collapsed Savings Streak card — flame badge, title line
 * and the twelve-month strip, at the sizes the real card uses.
 */
export default function SavingsStreakCardSkeleton() {
  return (
    <Card data-testid="savings-streak-skeleton">
      <StyledHeaderRow>
        <Skeleton width={FLAME_BADGE_SIZE} height={FLAME_BADGE_SIZE} />
        <StyledTitleStack>
          <Skeleton width={72} height={10} />
          <Skeleton width={210} height={20} />
        </StyledTitleStack>
      </StyledHeaderRow>
      <StyledStrip>
        {MONTH_SLOTS.map((month) => (
          <StyledTileSlot key={month}>
            <Skeleton height={TILE_HEIGHT} />
          </StyledTileSlot>
        ))}
      </StyledStrip>
      <StyledCaption>
        <Skeleton width={260} height={11} />
      </StyledCaption>
    </Card>
  );
}
