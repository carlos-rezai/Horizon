import Card from "../../../components/Card/Card";
import SectionHead from "../../../components/SectionHead/SectionHead";
import DataRow from "../../../components/DataRow/DataRow";
import Skeleton from "../../../primitives/Skeleton/Skeleton";
import {
  ROW_COLUMNS,
  StyledTabsWrap,
  StyledAccountLine,
} from "./SpendingList.styles";
import { StyledDayBlock } from "./SpendingListSkeleton.styles";

// A typical month of variable spending; enough rows to fill the card without
// pretending to know how many the month actually holds.
const ROWS = [0, 1, 2, 3, 4, 5];

const TABS_HEIGHT = 34;
const ACTION_WIDTH = 108;
const ACTION_HEIGHT = 30;

interface Props {
  /** Full month label (e.g. "June") — known from the URL before any data lands. */
  monthLabel: string;
}

/**
 * Placeholder for the spending card. The section header names a month the URL
 * already decided, so it renders for real; the tabs and rows stand in on the
 * same `DataRow` grid, so the card keeps its column rhythm and does not jump
 * when the month's transactions land.
 */
export default function SpendingListSkeleton({ monthLabel }: Props) {
  return (
    <Card data-testid="spending-list-skeleton">
      <SectionHead
        label="Variable Spending"
        title={`Spending in ${monthLabel}`}
        right={<Skeleton width={ACTION_WIDTH} height={ACTION_HEIGHT} />}
      />
      <StyledTabsWrap>
        <Skeleton height={TABS_HEIGHT} />
      </StyledTabsWrap>
      {ROWS.map((row) => (
        <DataRow
          key={row}
          columns={ROW_COLUMNS}
          last={row === ROWS.length - 1}
          aria-hidden="true"
        >
          <StyledDayBlock>
            <Skeleton width={22} height={15} />
            <Skeleton width={26} height={9} />
          </StyledDayBlock>
          <div>
            <Skeleton width="58%" height={15} />
            <StyledAccountLine>
              <Skeleton width={8} height={8} shape="circle" />
              <Skeleton width={64} height={12} />
            </StyledAccountLine>
          </div>
          <Skeleton width={78} height={20} />
          <Skeleton width={72} height={15} />
        </DataRow>
      ))}
    </Card>
  );
}
