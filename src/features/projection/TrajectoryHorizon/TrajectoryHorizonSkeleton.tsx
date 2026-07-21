import ChartFrame from "../../../components/ChartFrame/ChartFrame";
import Skeleton from "../../../primitives/Skeleton/Skeleton";
import { StyledChartPlaceholder } from "./TrajectoryHorizonSkeleton.styles";

/** Matches the plotting area the chart reserves once its data arrives. */
const CHART_HEIGHT = 360;

/**
 * Placeholder for the Trajectory Horizon. Keeps the real card frame and its
 * header, and stands a full-height block where the chart will draw, so the card
 * does not grow when the projection resolves.
 */
export default function TrajectoryHorizonSkeleton() {
  return (
    <ChartFrame
      overline="Trajectory Horizon"
      title="10-Year Projection"
      isLoading={false}
    >
      <StyledChartPlaceholder data-testid="trajectory-horizon-skeleton">
        <Skeleton height={CHART_HEIGHT} />
      </StyledChartPlaceholder>
    </ChartFrame>
  );
}
