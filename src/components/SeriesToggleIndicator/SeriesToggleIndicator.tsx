import { Filter } from "lucide-react";
import { StyledSeriesToggle } from "./SeriesToggleIndicator.styles";

interface Props {
  /** How many series are currently visible. */
  visibleCount: number;
  /** The total number of series in the chart. */
  total: number;
}

/**
 * The compact "N of M series · click to toggle" hint shown beside a chart's
 * legend. Placement (header vs body) is the caller's responsibility — this
 * component only renders the count and its filter icon.
 */
export default function SeriesToggleIndicator({ visibleCount, total }: Props) {
  return (
    <StyledSeriesToggle>
      <Filter size={14} />
      {visibleCount} of {total} series · click to toggle
    </StyledSeriesToggle>
  );
}
