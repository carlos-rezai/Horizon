import DataRow from "../../../components/DataRow/DataRow";
import Skeleton from "../../../primitives/Skeleton/Skeleton";
import { ROW_COLUMNS, StyledList, StyledRight } from "./AccountOverview.styles";

// A typical account list; enough rows to fill the card without pretending to
// know how many the user actually has.
const ROWS = [0, 1, 2, 3];

const AVATAR_SIZE = 38;

/**
 * Placeholder for the account list, built from the same `DataRow` grid as the
 * real rows so the list keeps its height and column rhythm when accounts land.
 */
export default function AccountOverviewSkeleton() {
  return (
    <StyledList data-testid="account-overview-skeleton">
      {ROWS.map((row) => (
        <DataRow
          key={row}
          columns={ROW_COLUMNS}
          last={row === ROWS.length - 1}
          aria-hidden="true"
        >
          <Skeleton width={AVATAR_SIZE} height={AVATAR_SIZE} />
          <Skeleton width="55%" height={14} />
          <StyledRight>
            <Skeleton width={92} height={14} />
            <Skeleton width={68} height={16} />
          </StyledRight>
        </DataRow>
      ))}
    </StyledList>
  );
}
