import { useMemo } from "react";
import { useTheme } from "styled-components";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";
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
} from "../../../utils/projection/projection";
import {
  buildSeriesDescriptors,
  computeVisibleYDomain,
  type SeriesDescriptor,
  type VisibilityAccount,
} from "../../../utils/trajectory/trajectory";
import { useSeriesVisibility } from "../../../hooks/useSeriesVisibility";
import SeriesLegend from "../../../components/SeriesLegend/SeriesLegend";
import SeriesToggleIndicator from "../../../components/SeriesToggleIndicator/SeriesToggleIndicator";
import ChartFrame from "../../../components/ChartFrame/ChartFrame";
import ChartTooltip from "../../../components/ChartTooltip/ChartTooltip";
import { formatBalance, formatMonth } from "../../../utils/format/format";
import { resolveAccountColor } from "../../../utils/color/color";
import { Clock, ArrowRight } from "lucide-react";
import {
  StyledHeaderControls,
  StyledHeaderDivider,
  StyledViewHistoryLink,
  StyledChartWrapper,
  StyledEmptyState,
  StyledPayoffMarker,
  StyledTooltipRowPositive,
  StyledTooltipRowWarning,
  StyledTooltipRowMuted,
} from "./TrajectoryHorizon.styles";

const VISIBILITY_KEY = "horizon.trajectory.visibility.v2";

const TOTAL_LIQUID_KEY = "totalLiquid";
const RESTSCHULD_KEY = "restschuld";

interface Props {
  snapshots: MonthlySnapshot[];
  accounts: AccountWithBalance[];
  recurringTransactions: RecurringTransaction[];
  isLoading: boolean;
  onViewHistory?: () => void;
}

const HORIZON_MONTHS = 120;

interface TrajectoryTooltipProps {
  active?: boolean;
  payload?: readonly { payload?: TrajectoryDataPoint }[];
  nonMortgageAccounts: AccountWithBalance[];
  getColor: (account: AccountWithBalance) => string;
}

function TrajectoryTooltip({
  active,
  payload,
  nonMortgageAccounts,
  getColor,
}: TrajectoryTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload as TrajectoryDataPoint;

  return (
    <ChartTooltip label={point.label}>
      <StyledTooltipRowPositive>
        Liquid: {formatBalance(point.totalLiquid)}
      </StyledTooltipRowPositive>
      {nonMortgageAccounts.map((a) => {
        const value = point[a.id];
        if (typeof value !== "number") return null;
        return (
          <StyledTooltipRowMuted key={a.id} style={{ color: getColor(a) }}>
            {a.name}: {formatBalance(value)}
          </StyledTooltipRowMuted>
        );
      })}
      {point.restschuld != null && point.restschuld > 0 && (
        <StyledTooltipRowWarning>
          Restschuld: {formatBalance(point.restschuld)}
        </StyledTooltipRowWarning>
      )}
    </ChartTooltip>
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

  // One label every two years (prototype cadence), anchored on the year
  // boundary closest to each data start.
  if (index % 24 !== 0) return null;

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={16} textAnchor="middle" fill={mutedColor} fontSize={11}>
        {point.label.slice(0, 4)}
      </text>
    </g>
  );
}

interface PayoffMarkerLabelProps {
  viewBox?: { x?: number; y?: number };
  dateText: string;
  color: string;
}

// Flag + "PAYOFF · <month year>" rendered at the top of the payoff reference
// line, matching the canonical prototype marker.
function PayoffMarkerLabel({
  viewBox,
  dateText,
  color,
}: PayoffMarkerLabelProps) {
  if (!viewBox || viewBox.x == null || viewBox.y == null) return null;
  return (
    <g transform={`translate(${viewBox.x + 7},${viewBox.y + 1})`}>
      <g
        transform="scale(0.5)"
        stroke={color}
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1={4} y1={22} x2={4} y2={15} />
      </g>
      <text
        x={14}
        y={9}
        fill={color}
        fontSize={10}
        fontWeight={600}
        letterSpacing="0.08em"
      >
        PAYOFF · {dateText}
      </text>
    </g>
  );
}

export default function TrajectoryHorizon({
  snapshots,
  accounts,
  recurringTransactions,
  isLoading,
  onViewHistory,
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
  const hasMortgage = mortgageIds.length > 0;

  // Legend order (prototype): the gold Total Liquid "SUM" line first, then each
  // account, then Restschuld. The `<Line>` elements are rendered separately so
  // their draw order (liquid on top) is unaffected by this list order.
  const series = useMemo<SeriesDescriptor[]>(
    () =>
      buildSeriesDescriptors(nonMortgageAccounts, hasMortgage, {
        liquid: theme.colors.liquid,
        restschuld: theme.colors.restschuldStrokeColor,
      }),
    [nonMortgageAccounts, hasMortgage, theme]
  );

  const visibilityAccounts: VisibilityAccount[] = accounts.map((a) => ({
    id: a.id,
    kind: a.kind,
    showInTrajectory: a.showInTrajectory ?? true,
  }));

  const seriesKeys = series.map((s) => s.key);
  const {
    visibility,
    visibleCount,
    toggle: handleToggle,
    isolate: handleIsolate,
    showAll: handleShowAll,
  } = useSeriesVisibility(visibilityAccounts, seriesKeys, VISIBILITY_KEY);

  const [, yMax] = computeVisibleYDomain(data, visibility);

  const payoffIndex = payoffMonth
    ? data.findIndex((p) => p.label === payoffMonth)
    : -1;
  const payoffDateLabel = payoffMonth
    ? formatMonth(payoffMonth).toUpperCase()
    : "";
  const liquidVisible = visibility[TOTAL_LIQUID_KEY] === true;

  // Post-payoff portion of the Total Liquid line, used to shade the freedom
  // gradient only after the mortgage is gone.
  const freedomData: TrajectoryDataPoint[] = data.map((p, i) => ({
    ...p,
    freedomLiquid: payoffIndex >= 0 && i >= payoffIndex ? p.totalLiquid : null,
  }));

  const currentMonth = new Date().toISOString().slice(0, 7);
  const todayIndex = data.findIndex((p) => p.label === currentMonth);

  return (
    <ChartFrame
      overline="Trajectory Horizon"
      title="10-Year Projection"
      isLoading={isLoading}
      loadingTestId="trajectory-horizon-loading"
      controls={
        (!isLoading && accounts.length > 0) || onViewHistory ? (
          <StyledHeaderControls>
            {!isLoading && accounts.length > 0 && (
              <SeriesToggleIndicator
                visibleCount={visibleCount}
                total={series.length}
              />
            )}
            {!isLoading && accounts.length > 0 && onViewHistory && (
              <StyledHeaderDivider aria-hidden="true" />
            )}
            {onViewHistory && (
              <StyledViewHistoryLink type="button" onClick={onViewHistory}>
                <Clock size={13} />
                View history
                <ArrowRight size={12} />
              </StyledViewHistoryLink>
            )}
          </StyledHeaderControls>
        ) : null
      }
    >
      {accounts.length === 0 ? (
        <StyledEmptyState data-testid="trajectory-horizon-empty">
          Add accounts to see your 20-year financial trajectory.
        </StyledEmptyState>
      ) : (
        <>
          {payoffMonth && (
            <StyledPayoffMarker data-testid="payoff-marker" aria-hidden="true">
              Payoff: {formatMonth(payoffMonth)}
            </StyledPayoffMarker>
          )}
          {nonMortgageAccounts.map((a) => (
            <span
              key={a.id}
              data-testid={`chart-line-${a.id}`}
              data-color={resolveAccountColor(a)}
              aria-hidden="true"
              style={{ display: "none" }}
            />
          ))}
          <StyledChartWrapper data-testid="trajectory-horizon-chart">
            <ResponsiveContainer width="100%" height={360}>
              <ComposedChart
                data={freedomData}
                margin={{ top: 8, right: 20, left: 20, bottom: 8 }}
              >
                <defs>
                  <linearGradient id="freedomGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={theme.colors.liquid}
                      stopOpacity={0.2}
                    />
                    <stop
                      offset="100%"
                      stopColor={theme.colors.liquid}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke={theme.colors.outlineVariant}
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="monthIndex"
                  tick={
                    <YearTick
                      data={data}
                      mutedColor={theme.colors.onSurfaceVariant}
                    />
                  }
                  interval={0}
                />
                <YAxis yAxisId="left" domain={[0, yMax]} hide />
                <Tooltip
                  content={(props) => (
                    <TrajectoryTooltip
                      {...props}
                      nonMortgageAccounts={nonMortgageAccounts}
                      getColor={resolveAccountColor}
                    />
                  )}
                />
                <Legend
                  verticalAlign="bottom"
                  content={() => (
                    <SeriesLegend
                      series={series}
                      visibility={visibility}
                      onToggle={handleToggle}
                      onIsolate={handleIsolate}
                      onShowAll={handleShowAll}
                      testId="trajectory-legend"
                    />
                  )}
                />
                {payoffIndex >= 0 && (
                  <ReferenceArea
                    yAxisId="left"
                    x1={payoffIndex}
                    x2={data.length - 1}
                    fill={theme.colors.primary}
                    fillOpacity={0.04}
                  />
                )}
                {payoffIndex >= 0 && (
                  <ReferenceLine
                    yAxisId="left"
                    x={payoffIndex}
                    stroke={theme.colors.primary}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={
                      <PayoffMarkerLabel
                        dateText={payoffDateLabel}
                        color={theme.colors.primary}
                      />
                    }
                  />
                )}
                {payoffIndex >= 0 && (
                  <ReferenceDot
                    yAxisId="left"
                    x={payoffIndex}
                    y={0}
                    r={4.5}
                    fill={theme.colors.primary}
                    stroke={theme.colors.surfaceContainer}
                    strokeWidth={2}
                  />
                )}
                {todayIndex >= 0 && (
                  <ReferenceLine
                    yAxisId="left"
                    x={todayIndex}
                    stroke={theme.colors.outline}
                    strokeDasharray="3 4"
                    strokeWidth={1}
                    label={{
                      value: "TODAY",
                      position: "insideTopLeft",
                      fill: theme.colors.onSurfaceVariant,
                      fontSize: 10,
                    }}
                  />
                )}
                {liquidVisible && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="freedomLiquid"
                    stroke="none"
                    fill="url(#freedomGrad)"
                    connectNulls={false}
                    isAnimationActive={false}
                    legendType="none"
                    tooltipType="none"
                  />
                )}
                {nonMortgageAccounts.map((a) => (
                  <Line
                    key={a.id}
                    yAxisId="left"
                    type="monotone"
                    dataKey={a.id}
                    name={a.name}
                    dot={false}
                    stroke={resolveAccountColor(a)}
                    hide={visibility[a.id] !== true}
                  />
                ))}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="restschuld"
                  name="Restschuld"
                  dot={false}
                  stroke={theme.colors.restschuldStrokeColor}
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                  connectNulls={false}
                  hide={visibility[RESTSCHULD_KEY] !== true}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="totalLiquid"
                  name="Total Liquid"
                  dot={false}
                  stroke={theme.colors.liquid}
                  strokeWidth={3}
                  hide={!liquidVisible}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </StyledChartWrapper>
        </>
      )}
    </ChartFrame>
  );
}
