import { PieChart, Pie, Cell } from "recharts";
import Money from "../../primitives/Money/Money";
import {
  StyledDonut,
  StyledChartWrap,
  StyledCenter,
  StyledCenterLabel,
  StyledLegend,
  StyledLegendRow,
  StyledLegendLabel,
  StyledSwatch,
} from "./Donut.styles";

export interface DonutSegment {
  label: string;
  /** Resolved slice colour (hex). */
  color: string;
  /** Slice value in cents. */
  amount: number;
}

interface DonutProps {
  segments: DonutSegment[];
  /** Caption above the centre total. Defaults to "Total". */
  centerLabel?: string;
  /** Outer diameter in px. */
  size?: number;
  /** Ring thickness in px. */
  thickness?: number;
  /** When set, the centre total is rounded to whole euros (the legend keeps cents). */
  wholeCenter?: boolean;
}

/**
 * A category breakdown ring: one arc per slice, a centre total, and a legend
 * row per slice. Dumb and reusable — it sums its own slice amounts for the
 * centre value but carries no domain knowledge; callers resolve labels,
 * colours, and cent amounts.
 */
export default function Donut({
  segments,
  centerLabel = "Total",
  size = 164,
  thickness = 20,
  wholeCenter = false,
}: DonutProps) {
  const total = segments.reduce((sum, s) => sum + s.amount, 0);
  const outerRadius = size / 2;
  const innerRadius = outerRadius - thickness;

  return (
    <StyledDonut>
      <StyledChartWrap $size={size}>
        <PieChart width={size} height={size}>
          <Pie
            data={segments}
            dataKey="amount"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={false}
          >
            {segments.map((s) => (
              <Cell key={s.label} fill={s.color} />
            ))}
          </Pie>
        </PieChart>
        <StyledCenter data-testid="donut-center">
          <StyledCenterLabel>{centerLabel}</StyledCenterLabel>
          <Money cents={total} whole={wholeCenter} />
        </StyledCenter>
      </StyledChartWrap>

      <StyledLegend>
        {segments.map((s) => (
          <StyledLegendRow key={s.label} data-testid="donut-legend-row">
            <StyledLegendLabel>
              <StyledSwatch
                data-testid="donut-swatch"
                data-color={s.color}
                $color={s.color}
              />
              {s.label}
            </StyledLegendLabel>
            <Money cents={s.amount} />
          </StyledLegendRow>
        ))}
      </StyledLegend>
    </StyledDonut>
  );
}
