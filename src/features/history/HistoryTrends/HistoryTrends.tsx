import { useMemo, useState } from "react";
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
import ChoiceChip from "../../../primitives/ChoiceChip/ChoiceChip";
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
  StyledMetricToggle,
  StyledNote,
  StyledTooltipRow,
} from "./HistoryTrends.styles";

const VALUE_KEY = "value";

/** Which monthly figure the bars draw. */
type TrendsMetric = "saved" | "spent";

const METRICS: {
  value: TrendsMetric;
  label: string;
  title: string;
  field: "monthlySavings" | "monthlySpending";
}[] = [
  {
    value: "saved",
    label: "Saved",
    title: "Monthly Savings",
    field: "monthlySavings",
  },
  {
    value: "spent",
    label: "Spent",
    title: "Monthly Spending",
    field: "monthlySpending",
  },
];

/** A visible month projected onto the trends chart's flat data shape. */
interface TrendsDataPoint {
  monthIndex: number;
  label: string;
  value: number | null;
}

interface TrendsTooltipProps {
  active?: boolean;
  payload?: readonly { payload?: TrendsDataPoint }[];
  /** The series name shown beside the value ("Saved" / "Spent"). */
  seriesLabel: string;
  /** The first month with a known value for the series ("YYYY-MM"), if any. */
  firstKnown: string | null;
}

function TrendsTooltip({
  active,
  payload,
  seriesLabel,
  firstKnown,
}: TrendsTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  if (!point) return null;
  // Unknown (null) reads "No data before …", never €0.
  const text =
    point.value !== null
      ? formatBalance(point.value)
      : firstKnown !== null
        ? `No data before ${formatMonth(firstKnown)}`
        : "No data";
  return (
    <ChartTooltip label={formatMonth(point.label)}>
      <StyledTooltipRow>
        <span>{seriesLabel}</span>
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
 * History Trends: a Saved / Spent switch. Saved draws each month's Monthly
 * Savings as a bar diverging around zero; Spent draws Monthly Spending as
 * single-fill bars. An Unknown month is no bar, and the chosen series'
 * trailing-12-month average is a line.
 */
export default function HistoryTrends({ points, range, isLoading }: Props) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const [metric, setMetric] = useState<TrendsMetric>("saved");
  const active = METRICS.find((m) => m.value === metric) ?? METRICS[0];
  const field = active.field;

  // Range narrows from the right edge, as on the History chart.
  const rangeMonths =
    HISTORY_RANGE_OPTIONS.find((o) => o.value === range)?.months ?? Infinity;
  const windowed = points.slice(Math.max(0, points.length - rangeMonths));

  const data = useMemo<TrendsDataPoint[]>(
    () =>
      windowed.map((p, i) => ({
        monthIndex: i,
        label: p.month,
        value: p[field] ?? null,
      })),
    [windowed, field]
  );

  const firstKnown = useMemo(
    () => points.find((p) => typeof p[field] === "number")?.month ?? null,
    [points, field]
  );
  const average = trailingAverage(data.map((d) => d.value));

  return (
    <ChartFrame
      overline="Trends"
      title={active.title}
      controls={
        <StyledMetricToggle>
          {METRICS.map((m) => (
            <ChoiceChip
              key={m.value}
              label={m.label}
              active={metric === m.value}
              onClick={() => setMetric(m.value)}
            />
          ))}
        </StyledMetricToggle>
      }
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
                  <TrendsTooltip
                    {...props}
                    seriesLabel={active.label}
                    firstKnown={firstKnown}
                  />
                )}
              />
              <ReferenceLine y={0} stroke={theme.colors.outline} />
              <Bar
                dataKey={VALUE_KEY}
                name={active.label}
                isAnimationActive={!reducedMotion}
              >
                {data.map((d) => (
                  <Cell
                    key={d.label}
                    fill={
                      metric === "spent"
                        ? theme.colors.primary
                        : d.value !== null && d.value < 0
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
