import { useTheme } from "styled-components";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
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
  StyledTooltipRowMuted,
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

const HORIZON_MONTHS = 120;

interface ChartTooltipProps extends TooltipProps<number, string> {
  nonMortgageAccounts: AccountWithBalance[];
  accountColours: string[];
}

function ChartTooltip({
  active,
  payload,
  nonMortgageAccounts,
  accountColours,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload as TrajectoryDataPoint;

  return (
    <StyledTooltipBox>
      <StyledTooltipLabel>{point.label}</StyledTooltipLabel>
      <StyledTooltipRowPositive>
        Liquid: {formatBalance(point.totalLiquid)}
      </StyledTooltipRowPositive>
      {nonMortgageAccounts.map((a, i) => {
        const value = point[a.id];
        if (typeof value !== "number") return null;
        return (
          <StyledTooltipRowMuted
            key={a.id}
            style={{ color: accountColours[i % accountColours.length] }}
          >
            {a.name}: {formatBalance(value)}
          </StyledTooltipRowMuted>
        );
      })}
      {point.restschuld != null && point.restschuld > 0 && (
        <StyledTooltipRowWarning>
          Restschuld: {formatBalance(point.restschuld)}
        </StyledTooltipRowWarning>
      )}
    </StyledTooltipBox>
  );
}

interface YearTickProps {
  x?: number;
  y?: number;
  payload?: { value: number };
  data: TrajectoryDataPoint[];
  mutedColor: string;
}

function YearTick({ x = 0, y = 0, payload, data, mutedColor }: YearTickProps) {
  if (!payload) return null;
  const index = payload.value;
  const point = data[index];
  if (!point) return null;

  if (index % 12 !== 0) return null;

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={16} textAnchor="middle" fill={mutedColor} fontSize={11}>
        {point.label.slice(0, 4)}
      </text>
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

  const horizonSnapshots = snapshots.slice(0, HORIZON_MONTHS);

  const mortgageIds = accounts
    .filter((a) => a.kind === "Mortgage")
    .map((a) => a.id);

  const stMonths =
    horizonSnapshots.length > 0
      ? deriveSTMonths(
          recurringTransactions,
          accounts,
          horizonSnapshots[0].month,
          horizonSnapshots.length
        )
      : new Map<string, number>();

  const payoffMonth =
    mortgageIds.length > 0 && horizonSnapshots.length > 0
      ? findMortgagePayoffMonth(horizonSnapshots, mortgageIds[0])
      : null;

  const data = buildTrajectoryData(
    horizonSnapshots,
    stMonths,
    payoffMonth,
    accounts
  );

  const nonMortgageAccounts = accounts.filter((a) => a.kind !== "Mortgage");
  const accountColours = [
    theme.colors.accent,
    theme.colors.negative,
    theme.colors.textMuted,
  ];

  const dataMax = data.reduce((max, p) => {
    const candidates: number[] = [];
    if (typeof p.restschuld === "number") candidates.push(p.restschuld);
    for (const a of nonMortgageAccounts) {
      const v = p[a.id];
      if (typeof v === "number") candidates.push(v);
    }
    return Math.max(max, ...candidates);
  }, 0);

  const TICK_STEP_CENTS = 2_500_000;
  const yMax =
    Math.ceil(Math.max(dataMax, TICK_STEP_CENTS) / TICK_STEP_CENTS) *
    TICK_STEP_CENTS;
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += TICK_STEP_CENTS) yTicks.push(v);

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
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart
                data={data}
                margin={{ top: 8, right: 70, left: 70, bottom: 8 }}
              >
                <CartesianGrid
                  stroke={theme.colors.border}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="monthIndex"
                  tick={
                    <YearTick data={data} mutedColor={theme.colors.textMuted} />
                  }
                  interval={0}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v: number) => formatBalance(v)}
                  ticks={yTicks}
                  domain={[0, yMax]}
                  width={90}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      nonMortgageAccounts={nonMortgageAccounts}
                      accountColours={accountColours}
                    />
                  }
                />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ paddingTop: 12 }}
                  iconType="plainline"
                />
                {payoffMonth && (
                  <ReferenceLine
                    yAxisId="left"
                    x={data.findIndex((p) => p.label === payoffMonth)}
                    stroke={theme.colors.textPrimary}
                    strokeDasharray="2 6"
                    strokeWidth={1}
                  />
                )}
                {nonMortgageAccounts.map((a, i) => (
                  <Line
                    key={a.id}
                    yAxisId="left"
                    type="monotone"
                    dataKey={a.id}
                    name={a.name}
                    dot={false}
                    stroke={accountColours[i % accountColours.length]}
                  />
                ))}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="restschuld"
                  name="Restschuld"
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
