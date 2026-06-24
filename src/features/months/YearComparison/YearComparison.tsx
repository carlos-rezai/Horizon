import Card from "../../../components/Card/Card";
import SectionHead from "../../../components/SectionHead/SectionHead";
import { formatBalance } from "../../../utils/format/format";
import { colorForCategoryName } from "../../../utils/categoryColor/categoryColor";
import type { YearComparisonRow } from "../useYearComparison";
import {
  StyledIntro,
  StyledRows,
  StyledRow,
  StyledRowHead,
  StyledCategory,
  StyledValue,
  StyledBars,
  StyledTrack,
  StyledBar,
  StyledLastYearBar,
  StyledLegend,
  StyledLegendItem,
  StyledSwatch,
} from "./YearComparison.styles";

interface Props {
  /** Full month label (e.g. "June") used in the descriptive copy. */
  monthLabel: string;
  /** Ranked category rows, this year against the same span last year. */
  rows: YearComparisonRow[];
}

/** Width as a percentage of the shared maximum, divide-by-zero guarded. */
function widthPct(value: number, max: number): string {
  if (max <= 0) return "0%";
  return `${(value / max) * 100}%`;
}

/**
 * Year-over-year comparison card. Renders the top-five categories' cumulative
 * variable spend — Jan 1 through the viewed month — as two stacked bars per
 * category: this year in the category colour, last year muted. All bars share a
 * single maximum so magnitudes read against each other across both years.
 */
export default function YearComparison({ monthLabel, rows }: Props) {
  const sharedMax = Math.max(
    0,
    ...rows.map((r) => Math.max(r.thisYear, r.lastYear))
  );

  return (
    <Card>
      <SectionHead label="Year comparison" title="This year so far" />
      <StyledIntro>
        Spending from Jan 1 through {monthLabel}, compared with the same period
        last year.
      </StyledIntro>

      <StyledRows>
        {rows.map((row) => (
          <StyledRow key={row.category} data-testid="yc-row">
            <StyledRowHead>
              <StyledCategory>{row.category}</StyledCategory>
              <StyledValue>{formatBalance(row.thisYear)}</StyledValue>
            </StyledRowHead>
            <StyledBars>
              <StyledTrack>
                <StyledBar
                  data-testid="yc-bar-thisyear"
                  style={{
                    width: widthPct(row.thisYear, sharedMax),
                    backgroundColor: colorForCategoryName(row.category),
                  }}
                />
              </StyledTrack>
              <StyledTrack>
                <StyledLastYearBar
                  data-testid="yc-bar-lastyear"
                  style={{ width: widthPct(row.lastYear, sharedMax) }}
                />
              </StyledTrack>
            </StyledBars>
          </StyledRow>
        ))}
      </StyledRows>

      <StyledLegend data-testid="yc-legend">
        <StyledLegendItem>
          <StyledSwatch />
          This year
        </StyledLegendItem>
        <StyledLegendItem>
          <StyledSwatch $muted />
          Last year
        </StyledLegendItem>
      </StyledLegend>
    </Card>
  );
}
