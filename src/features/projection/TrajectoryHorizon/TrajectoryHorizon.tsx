import { useTheme } from "styled-components";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { TooltipProps } from "recharts";
import type {
  MonthlySnapshot,
  TrajectoryDataPoint,
} from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import type { RecurringTransaction } from "../../../types/recurring";
import {
  buildTrajectoryData,
  deriveSTMonths,
  findMortgagePayoffMonth,
} from "../../../utils/projection";
import { formatBalance } from "../../../utils/format";
import Heading from "../../../primitives/Heading/Heading";
import {
  StyledSection,
  StyledChartWrapper,
  StyledEmptyState,
  StyledLoadingState,
  StyledPayoffMarker,
  StyledTooltipBox,
  StyledTooltipLabel,
  StyledTooltipRowPositive,
  StyledTooltipRowWarning,
} from "./TrajectoryHorizon.styles";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatMonthLabel(yyyyMM: string): string {
  const [year, month] = yyyyMM.split("-");
  return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
}

interface Props {
  snapshots: MonthlySnapshot[];
  accounts: AccountWithBalance[];
  recurringTransactions: RecurringTransaction[];
  isLoading: boolean;
}

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload as TrajectoryDataPoint;

  return (
    <StyledTooltipBox>
      <StyledTooltipLabel>{point.label}</StyledTooltipLabel>
      <StyledTooltipRowPositive>
        Liquid: {formatBalance(point.totalLiquid)}
      </StyledTooltipRowPositive>
      {point.restschuld != null && point.restschuld > 0 && (
        <StyledTooltipRowWarning>
          Restschuld: {formatBalance(point.restschuld)}
        </StyledTooltipRowWarning>
      )}
    </StyledTooltipBox>
  );
}

interface STTickProps {
  x?: number;
  y?: number;
  payload?: { value: number };
  data: TrajectoryDataPoint[];
  labelColor: string;
  mutedColor: string;
}

function STTick({
  x = 0,
  y = 0,
  payload,
  data,
  labelColor,
  mutedColor,
}: STTickProps) {
  if (!payload) return null;
  const index = payload.value;
  const point = data[index];
  if (!point) return null;

  const isYearTick = index % 24 === 0;
  const isSTMonth = point.isSTMonth;

  if (!isYearTick && !isSTMonth) return null;

  return (
    <g transform={`translate(${x},${y})`}>
      {isSTMonth && <line y2={-6} stroke={labelColor} strokeWidth={2} />}
      {isYearTick && (
        <text x={0} y={16} textAnchor="middle" fill={mutedColor} fontSize={11}>
          {point.label.slice(0, 4)}
        </text>
      )}
    </g>
  );
}

export default function TrajectoryHorizon({
  snapshots,
  accounts,
  recurringTransactions,
  isLoading,
}: Props) {
  const theme = useTheme();

  const mortgageIds = accounts
    .filter((a) => a.kind === "Mortgage")
    .map((a) => a._id);

  const stMonths =
    snapshots.length > 0
      ? deriveSTMonths(
          recurringTransactions,
          accounts,
          snapshots[0].month,
          snapshots.length
        )
      : new Map<string, number>();

  const payoffMonth =
    mortgageIds.length > 0 && snapshots.length > 0
      ? findMortgagePayoffMonth(snapshots, mortgageIds[0])
      : null;

  const data = buildTrajectoryData(snapshots, stMonths, payoffMonth, accounts);

  return (
    <StyledSection>
      <Heading level={2}>Trajectory Horizon</Heading>
      {isLoading ? (
        <StyledLoadingState data-testid="trajectory-horizon-loading">
          Loading…
        </StyledLoadingState>
      ) : accounts.length === 0 ? (
        <StyledEmptyState data-testid="trajectory-horizon-empty">
          Add accounts to see your 20-year financial trajectory.
        </StyledEmptyState>
      ) : (
        <>
          {payoffMonth && (
            <StyledPayoffMarker data-testid="payoff-marker">
              Payoff: {formatMonthLabel(payoffMonth)}
            </StyledPayoffMarker>
          )}
          <StyledChartWrapper data-testid="trajectory-horizon-chart">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={data}
                margin={{ top: 8, right: 70, left: 70, bottom: 8 }}
              >
                <XAxis
                  dataKey="monthIndex"
                  tick={
                    <STTick
                      data={data}
                      labelColor={theme.colors.warning}
                      mutedColor={theme.colors.textMuted}
                    />
                  }
                  interval={0}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip content={<ChartTooltip />} />
                {payoffMonth && (
                  <ReferenceLine
                    yAxisId="left"
                    x={data.findIndex((p) => p.label === payoffMonth)}
                    stroke={theme.colors.warning}
                    strokeDasharray="4 4"
                  />
                )}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="totalLiquid"
                  dot={false}
                  stroke={theme.colors.positive}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="restschuld"
                  dot={false}
                  stroke={theme.colors.warning}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </StyledChartWrapper>
        </>
      )}
    </StyledSection>
  );
}
