import Card from "../../../components/Card/Card";
import SectionHead from "../../../components/SectionHead/SectionHead";
import DataRow from "../../../components/DataRow/DataRow";
import Skeleton from "../../../primitives/Skeleton/Skeleton";
import { StyledAccountLine } from "../SpendingList/SpendingList.styles";
import { StyledDayBlockSkeleton } from "../../../components/DayBlock/DayBlock.styles";
import {
  ROW_COLUMNS,
  StyledGroups,
  StyledGroupHead,
  StyledNet,
} from "./MonthCashFlow.styles";

// Two account groups of a few rows each: enough to hold the card's height
// without pretending to know how many accounts or rules the month has.
const GROUPS = [0, 1];
const ROWS = [0, 1, 2];

interface Props {
  /** Full month label (e.g. "September") — known from the URL. */
  monthLabel: string;
}

/**
 * Placeholder for the Fixed Flows card. The header names a month the URL
 * already decided, so it renders for real; the groups stand in on the same
 * `DataRow` grid so the card does not jump when the report lands.
 */
export default function MonthCashFlowSkeleton({ monthLabel }: Props) {
  return (
    <Card data-testid="month-cash-flow-skeleton">
      <SectionHead label="Fixed Flows" title={`Fixed in ${monthLabel}`} />
      <StyledGroups>
        {GROUPS.map((group) => (
          <div key={group} aria-hidden="true">
            <StyledGroupHead>
              <Skeleton width={10} height={10} shape="circle" />
              <Skeleton width={96} height={15} />
            </StyledGroupHead>
            {ROWS.map((row) => (
              <DataRow
                key={row}
                columns={ROW_COLUMNS}
                last={row === ROWS.length - 1}
              >
                <StyledDayBlockSkeleton>
                  <Skeleton width={22} height={15} />
                  <Skeleton width={26} height={9} />
                </StyledDayBlockSkeleton>
                <div>
                  <Skeleton width="52%" height={15} />
                  <StyledAccountLine>
                    <Skeleton width={8} height={8} shape="circle" />
                    <Skeleton width={64} height={12} />
                  </StyledAccountLine>
                </div>
                <Skeleton width={78} height={20} />
                <Skeleton width={72} height={15} />
              </DataRow>
            ))}
            <StyledNet>
              <Skeleton width={72} height={11} />
              <Skeleton width={72} height={15} />
            </StyledNet>
          </div>
        ))}
      </StyledGroups>
    </Card>
  );
}
