import { useMemo } from "react";
import { useTheme } from "styled-components";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChartFrame from "../../../components/ChartFrame/ChartFrame";
import ChartTooltip from "../../../components/ChartTooltip/ChartTooltip";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { formatBalance, formatMonth } from "../../../utils/format/format";
import {
  HISTORY_RANGE_OPTIONS,
  type HistoryPoint,
  type HistoryRange,
} from "../historyTypes/historyTypes";
import { trailingAverage } from "../trailingAverage/trailingAverage";
import {
  StyledChartWrapper,
  StyledNote,
  StyledTooltipRow,
} from "./HistoryTrends.styles";

const SAVED_KEY = "saved";

/** A visible month projected onto the trends chart's flat data shape. */
interface TrendsDataPoint {
  monthIndex: number;
  label: string;
  saved: number | null;
}

interface TrendsTooltipProps {
  active?: boolean;
  payload?: readonly { payload?: TrendsDataPoint }[];
  /** The first month with a known Monthly Savings ("YYYY-MM"), if any. */
  firstKnown: string | null;
}

function TrendsTooltip({ active, payload, firstKnown }: TrendsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  if (!point) return null;
  // Unknown (null) reads "No data before …", never €0.
  const text =
    point.saved !== null
      ? formatBalance(point.saved)
      : firstKnown !== null
        ? `No data before ${formatMonth(firstKnown)}`
        : "No data";
  return (
    <ChartTooltip label={formatMonth(point.label)}>
      <StyledTooltipRow>
        <span>Saved</span>
        <span>{text}</span>
      </StyledTooltipRow>
    </ChartTooltip>
  );
}

interface Props {
  points: HistoryPoint[];
  range: HistoryRange;
  isLoading: boolean;
}

/**
 * History Trends: each month's Monthly Savings as a bar diverging around zero,
 * an Unknown month as no bar, and the trailing-12-month average as a line.
 */
export default function HistoryTrends({ points, range, isLoading }: Props) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();

  // Range narrows from the right edge, as on the History chart.
  const rangeMonths =
    HISTORY_RANGE_OPTIONS.find((o) => o.value === range)?.months ?? Infinity;
  const windowed = points.slice(Math.max(0, points.length - rangeMonths));

  const data = useMemo<TrendsDataPoint[]>(
    () =>
      windowed.map((p, i) => ({
        monthIndex: i,
        label: p.month,
        saved: p.monthlySavings ?? null,
      })),
    [windowed]
  );

  const firstKnown = useMemo(
    () =>
      points.find((p) => typeof p.monthlySavings === "number")?.month ?? null,
    [points]
  );
  const average = trailingAverage(data.map((d) => d.saved));

  return (
    <ChartFrame
      overline="Trends"
      title="Monthly Savings"
      isLoading={isLoading}
      loadingTestId="history-trends-loading"
    >
      <>
        <StyledChartWrapper
          data-testid="history-trends"
          data-months={data.length}
        >
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 16, left: 20, bottom: 8 }}
            >
              <CartesianGrid
                stroke={theme.colors.outlineVariant}
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis dataKey="monthIndex" hide />
              <YAxis hide />
              <Tooltip
                content={(props) => (
                  <TrendsTooltip {...props} firstKnown={firstKnown} />
                )}
              />
              <ReferenceLine y={0} stroke={theme.colors.outline} />
              <Bar
                dataKey={SAVED_KEY}
                name="Saved"
                isAnimationActive={!reducedMotion}
              >
                {data.map((d) => (
                  <Cell
                    key={d.label}
                    fill={
                      d.saved !== null && d.saved < 0
                        ? theme.colors.error
                        : theme.colors.secondary
                    }
                  />
                ))}
              </Bar>
              {average !== null && (
                <ReferenceLine
                  y={average}
                  stroke={theme.colors.onSurfaceVariant}
                  strokeDasharray="4 4"
                  label={{
                    value: `12-mo avg ${formatBalance(average)}`,
                    position: "insideTopRight",
                    fill: theme.colors.onSurfaceVariant,
                    fontSize: 10,
                  }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </StyledChartWrapper>
        <StyledNote>
          Months after the Anchor Date may read low when their recurring income
          is missing — import those statements or re-anchor to fill them in.
        </StyledNote>
      </>
    </ChartFrame>
  );
}
