import { RotateCcw } from "lucide-react";
import type {
  SeriesDescriptor,
  SeriesVisibility,
} from "../../utils/trajectory/trajectory";
import {
  StyledLegend,
  StyledChip,
  StyledChipSwatch,
  StyledSumBadge,
  StyledShowAllButton,
} from "./SeriesLegend.styles";

interface Props {
  series: SeriesDescriptor[];
  visibility: SeriesVisibility;
  onToggle: (key: string) => void;
  onIsolate: (key: string) => void;
  onShowAll: () => void;
  /** Stable hook for tests to target a specific chart's legend. */
  testId?: string;
}

/**
 * A toggle-chip legend for a multi-series chart: click a chip to show/hide its
 * series, double-click to isolate it, and — once anything is hidden — a
 * "Show all" affordance restores every series. A `kind: "liquid"` series carries
 * a "SUM" badge; a `dashed` series draws its swatch as a dashed rule. Dumb and
 * chart-agnostic: it renders whatever descriptors it is given and reports
 * intent through callbacks.
 */
export default function SeriesLegend({
  series,
  visibility,
  onToggle,
  onIsolate,
  onShowAll,
  testId,
}: Props) {
  const hiddenCount = series.filter((s) => !visibility[s.key]).length;

  return (
    <StyledLegend data-testid={testId}>
      {series.map((s) => {
        const on = visibility[s.key] === true;
        return (
          <StyledChip
            key={s.key}
            type="button"
            $on={on}
            aria-pressed={on}
            onClick={() => onToggle(s.key)}
            onDoubleClick={() => onIsolate(s.key)}
            title={
              on ? `Hide ${s.name} (double-click to isolate)` : `Show ${s.name}`
            }
          >
            <StyledChipSwatch $color={s.color} $on={on} $dashed={s.dashed} />
            {s.name}
            {s.kind === "liquid" && (
              <StyledSumBadge $on={on}>SUM</StyledSumBadge>
            )}
          </StyledChip>
        );
      })}
      {hiddenCount > 0 && (
        <StyledShowAllButton type="button" onClick={onShowAll}>
          <RotateCcw size={13} />
          Show all
        </StyledShowAllButton>
      )}
    </StyledLegend>
  );
}
