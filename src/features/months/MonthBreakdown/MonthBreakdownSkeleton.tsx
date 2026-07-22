import Card from "../../../components/Card/Card";
import SectionHead from "../../../components/SectionHead/SectionHead";
import Skeleton from "../../../primitives/Skeleton/Skeleton";
import {
  StyledDonut,
  StyledChartWrap,
  StyledLegend,
  StyledLegendRow,
  StyledLegendLabel,
} from "../../../components/Donut/Donut.styles";

// The donut's default diameter, so the ring lands where the placeholder stood.
const DONUT_SIZE = 164;

// A legend row per slice; five is what the breakdown shows for a typical month.
const SLICES = [72, 88, 64, 96, 78];

/**
 * Placeholder for the breakdown card. Its heading names a fixed view rather
 * than anything the data decides, so it renders for real; the ring and its
 * legend stand in inside `Donut`'s own layout, so the card keeps its height
 * when the month's spending lands.
 */
export default function MonthBreakdownSkeleton() {
  return (
    <Card data-testid="month-breakdown-skeleton">
      <SectionHead label="Breakdown" title="By category" />
      <StyledDonut>
        <StyledChartWrap $size={DONUT_SIZE}>
          <Skeleton width={DONUT_SIZE} height={DONUT_SIZE} shape="circle" />
        </StyledChartWrap>
        <StyledLegend>
          {SLICES.map((width) => (
            <StyledLegendRow key={width}>
              <StyledLegendLabel>
                <Skeleton width={9} height={9} shape="circle" />
                <Skeleton width={width} height={12} />
              </StyledLegendLabel>
              <Skeleton width={58} height={12} />
            </StyledLegendRow>
          ))}
        </StyledLegend>
      </StyledDonut>
    </Card>
  );
}
