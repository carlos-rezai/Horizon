import Card from "../../../components/Card/Card";
import SectionHead from "../../../components/SectionHead/SectionHead";
import Skeleton from "../../../primitives/Skeleton/Skeleton";
import {
  StyledIntro,
  StyledRows,
  StyledRow,
  StyledRowHead,
  StyledBars,
  StyledTrack,
  StyledLegend,
  StyledLegendItem,
  StyledSwatch,
} from "./YearComparison.styles";

// The card ranks the top five categories, so the placeholder shows five rows.
// Bars shorten down the list, the way ranked ones do.
const ROWS = [
  { category: 88, thisYear: "92%", lastYear: "78%" },
  { category: 74, thisYear: "76%", lastYear: "84%" },
  { category: 96, thisYear: "61%", lastYear: "52%" },
  { category: 68, thisYear: "44%", lastYear: "57%" },
  { category: 82, thisYear: "29%", lastYear: "24%" },
];

const CATEGORY_HEIGHT = 14;
const VALUE_WIDTH = 62;

interface Props {
  /** Full month label (e.g. "June") — known from the URL before any data lands. */
  monthLabel: string;
}

/**
 * Placeholder for the year comparison card. Its heading and intro describe the
 * span the URL already fixed, so they render for real; only the ranked rows
 * stand in, on the same track height the bars use, so the card does not resize
 * when the comparison lands.
 */
export default function YearComparisonSkeleton({ monthLabel }: Props) {
  return (
    <Card data-testid="year-comparison-skeleton">
      <SectionHead label="Year comparison" title="This year so far" />
      <StyledIntro>
        Spending from Jan 1 through {monthLabel}, compared with the same period
        last year.
      </StyledIntro>
      <StyledRows>
        {ROWS.map((row) => (
          <StyledRow key={row.category}>
            <StyledRowHead>
              <Skeleton width={row.category} height={CATEGORY_HEIGHT} />
              <Skeleton width={VALUE_WIDTH} height={CATEGORY_HEIGHT} />
            </StyledRowHead>
            <StyledBars>
              <StyledTrack>
                <Skeleton width={row.thisYear} height="100%" />
              </StyledTrack>
              <StyledTrack>
                <Skeleton width={row.lastYear} height="100%" />
              </StyledTrack>
            </StyledBars>
          </StyledRow>
        ))}
      </StyledRows>
      <StyledLegend>
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
