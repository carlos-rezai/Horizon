import { useEffect, useMemo, useState } from "react";
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
  computeVisibleYDomain,
  deriveDefaultVisibility,
  isolateSeries,
  loadVisibility,
  saveVisibility,
  showAllSeries,
  toggleSeries,
  type SeriesVisibility,
  type VisibilityAccount,
} from "../../../utils/trajectory/trajectory";
import { formatBalance } from "../../../utils/format/format";
import { resolveAccountColor } from "../../../utils/color/color";
import { Filter } from "lucide-react";
import {
  StyledSection,
  StyledHeader,
  StyledOverline,
  StyledTitle,
  StyledSeriesToggle,
  StyledChartWrapper,
  StyledEmptyState,
  StyledLoadingState,
  StyledPayoffMarker,
  StyledTooltipBox,
  StyledTooltipLabel,
  StyledTooltipRowPositive,
  StyledTooltipRowWarning,
  StyledTooltipRowMuted,
  StyledLegend,
  StyledChip,
  StyledChipSwatch,
  StyledSumBadge,
  StyledShowAllButton,
} from "./TrajectoryHorizon.styles";

const VISIBILITY_KEY = "horizon.trajectory.visibility.v2";

const TOTAL_LIQUID_KEY = "totalLiquid";
const RESTSCHULD_KEY = "restschuld";

interface TrajectorySeries {
  key: string;
  name: string;
  color: string;
  kind: "liquid" | "account" | "debt";
  dashed: boolean;
}

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

interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly { payload?: TrajectoryDataPoint }[];
  nonMortgageAccounts: AccountWithBalance[];
  getColor: (account: AccountWithBalance) => string;
}

function ChartTooltip({
  active,
  payload,
  nonMortgageAccounts,
  getColor,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0].payload as TrajectoryDataPoint;

  return (
    <StyledTooltipBox>
      <StyledTooltipLabel>{point.label}</StyledTooltipLabel>
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
    </StyledTooltipBox>
  );
}

interface TrajectoryLegendProps {
  series: TrajectorySeries[];
  visibility: SeriesVisibility;
  onToggle: (key: string) => void;
  onIsolate: (key: string) => void;
  onShowAll: () => void;
}

function TrajectoryLegend({
  series,
  visibility,
  onToggle,
  onIsolate,
  onShowAll,
}: TrajectoryLegendProps) {
  const hiddenCount = series.filter((s) => !visibility[s.key]).length;

  return (
    <StyledLegend data-testid="trajectory-legend">
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
          Show all
        </StyledShowAllButton>
      )}
    </StyledLegend>
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
  const hasMortgage = mortgageIds.length > 0;

  // Series rendered in the chart and listed in the interactive legend. Account
  // and debt lines first; the gold Total Liquid "SUM" hero line renders last
  // (on top).
  const series = useMemo<TrajectorySeries[]>(() => {
    const list: TrajectorySeries[] = nonMortgageAccounts.map((a) => ({
      key: a.id,
      name: a.name,
      color: resolveAccountColor(a),
      kind: "account",
      dashed: false,
    }));
    if (hasMortgage) {
      list.push({
        key: RESTSCHULD_KEY,
        name: "Restschuld",
        color: theme.colors.restschuldStrokeColor,
        kind: "debt",
        dashed: true,
      });
    }
    list.push({
      key: TOTAL_LIQUID_KEY,
      name: "Total Liquid",
      color: theme.colors.liquid,
      kind: "liquid",
      dashed: false,
    });
    return list;
  }, [nonMortgageAccounts, hasMortgage, theme]);

  const visibilityAccounts: VisibilityAccount[] = accounts.map((a) => ({
    id: a.id,
    kind: a.kind,
    showInTrajectory: a.showInTrajectory ?? true,
  }));

  const [visibility, setVisibility] = useState<SeriesVisibility>(() => {
    const defaults = deriveDefaultVisibility(visibilityAccounts);
    const persisted =
      typeof window !== "undefined"
        ? loadVisibility(window.localStorage, VISIBILITY_KEY)
        : null;
    return persisted ? { ...defaults, ...persisted } : defaults;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      saveVisibility(window.localStorage, VISIBILITY_KEY, visibility);
    }
  }, [visibility]);

  const seriesKeys = series.map((s) => s.key);
  const handleToggle = (key: string) =>
    setVisibility((v) => toggleSeries(v, key));
  const handleIsolate = (key: string) =>
    setVisibility(isolateSeries(seriesKeys, key));
  const handleShowAll = () => setVisibility(showAllSeries(seriesKeys));
  const visibleCount = series.filter((s) => visibility[s.key] === true).length;

  const [, yMax] = computeVisibleYDomain(data, visibility);
  const TICK_STEP_CENTS = 2_500_000;
  const yTicks: number[] = [];
  for (let v = 0; v <= yMax; v += TICK_STEP_CENTS) yTicks.push(v);

  const payoffIndex = payoffMonth
    ? data.findIndex((p) => p.label === payoffMonth)
    : -1;
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
    <StyledSection>
      <StyledHeader>
        <div>
          <StyledOverline>Trajectory Horizon</StyledOverline>
          <StyledTitle>10-Year Projection</StyledTitle>
        </div>
        {!isLoading && accounts.length > 0 && (
          <StyledSeriesToggle>
            <Filter size={14} />
            {visibleCount} of {series.length} series · click to toggle
          </StyledSeriesToggle>
        )}
      </StyledHeader>
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
            <StyledPayoffMarker data-testid="payoff-marker" aria-hidden="true">
              Payoff: {formatMonthLabel(payoffMonth)}
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
                margin={{ top: 8, right: 70, left: 70, bottom: 8 }}
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
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v: number) => formatBalance(v)}
                  ticks={yTicks}
                  domain={[0, yMax]}
                  width={90}
                />
                <Tooltip
                  content={(props) => (
                    <ChartTooltip
                      {...props}
                      nonMortgageAccounts={nonMortgageAccounts}
                      getColor={resolveAccountColor}
                    />
                  )}
                />
                <Legend
                  verticalAlign="bottom"
                  content={() => (
                    <TrajectoryLegend
                      series={series}
                      visibility={visibility}
                      onToggle={handleToggle}
                      onIsolate={handleIsolate}
                      onShowAll={handleShowAll}
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
                    label={{
                      value: "Payoff",
                      position: "insideTopRight",
                      fill: theme.colors.primary,
                      fontSize: 10,
                    }}
                  />
                )}
                {todayIndex >= 0 && (
                  <ReferenceLine
                    yAxisId="left"
                    x={todayIndex}
                    stroke={theme.colors.onSurface}
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
    </StyledSection>
  );
}
