import { useMemo, useState } from "react";
import { useTheme } from "styled-components";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AccountWithBalance } from "../../../types/account";
import type { HistoryPoint } from "../../../types/history";
import {
  HISTORY_RANGE_OPTIONS,
  pointsInRange,
  type HistoryRange,
} from "../historyRange/historyRange";
import { firstKnownMonths, isUnknownMonth } from "../knownSince/knownSince";
import {
  paydownBridgeSpan,
  type PaydownBridgeSpan,
} from "../paydownBridge/paydownBridge";
import {
  buildSeriesDescriptors,
  computeVisibleYDomain,
  RESTSCHULD_BRIDGE_KEY,
  RESTSCHULD_KEY,
  TOTAL_LIQUID_KEY,
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
import {
  StyledRangeChips,
  StyledRangeChip,
  StyledChartWrapper,
  StyledTooltipRow,
  StyledTooltipRowLabel,
  StyledTooltipSwatch,
  StyledTooltipNetRow,
} from "./HistoryChart.styles";

const VISIBILITY_KEY = "horizon.history.visibility.v1";

/** A single reconstructed month projected onto the chart's flat data shape. */
interface HistoryChartDataPoint {
  monthIndex: number;
  label: string;
  totalLiquid: number | null;
  restschuld: number | null;
  netCashflow: number;
  /**
   * Account balances by id, plus `restschuldBridge` and `isUnknown` — true
   * when the source month is entirely Unknown (`isUnknownMonth`). A row
   * without `isUnknown` reads as known.
   */
  [key: string]: number | string | boolean | null;
}

interface HistoryTooltipPayloadItem {
  payload?: HistoryChartDataPoint;
}

interface HistoryChartTooltipProps {
  active?: boolean;
  payload?: readonly HistoryTooltipPayloadItem[];
  series: SeriesDescriptor[];
  /** Each series' first known month ("YYYY-MM"), keyed by series key. */
  firstKnown?: Record<string, string>;
  /** The Paydown Bridge's extent, read in a bridge month's Restschuld row. */
  bridge?: PaydownBridgeSpan | null;
}

/**
 * Hover card for the History chart. Mirrors the Dashboard tooltip but ends
 * with the month's Net Cashflow (left out in an Unknown month) — the "what happened" number that the
 * forward-looking Trajectory tooltip doesn't carry.
 */
export function HistoryChartTooltip({
  active,
  payload,
  series,
  firstKnown = {},
  bridge = null,
}: HistoryChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  if (!point) return null;

  return (
    <ChartTooltip label={formatMonth(point.label)}>
      {series.map((s) => {
        const value = point[s.key];
        const known = firstKnown[s.key];
        // A bridge month has no monthly Restschuld: it reads the paydown over
        // the whole bridge, never the interpolated value.
        const inBridge =
          s.key === RESTSCHULD_KEY &&
          value === null &&
          bridge !== null &&
          typeof point.restschuldBridge === "number";
        // Unknown (null) reads "No data before …", never €0.
        const text =
          typeof value === "number"
            ? formatBalance(value)
            : inBridge && bridge
              ? `No monthly data · ${formatBalance(bridge.paidOff)} paid off ${formatMonth(bridge.from)}–${formatMonth(bridge.to)}`
              : value === null && known !== undefined
                ? `No data before ${formatMonth(known)}`
                : null;
        if (text === null) return null;
        return (
          <StyledTooltipRow key={s.key}>
            <StyledTooltipRowLabel>
              <StyledTooltipSwatch $color={s.color} />
              {s.name}
            </StyledTooltipRowLabel>
            <span>{text}</span>
          </StyledTooltipRow>
        );
      })}
      {/* An Unknown month has no real Net Cashflow, whatever is visible. */}
      {point.isUnknown !== true && (
        <StyledTooltipNetRow>
          <span>Net Cashflow</span>
          <span>{formatBalance(point.netCashflow)}</span>
        </StyledTooltipNetRow>
      )}
    </ChartTooltip>
  );
}

interface YearTickProps {
  x?: number;
  y?: number;
  payload?: { value: number };
  data: HistoryChartDataPoint[];
  mutedColor: string;
}

function YearTick({ x = 0, y = 0, payload, data, mutedColor }: YearTickProps) {
  if (!payload) return null;
  const index = payload.value;
  const point = data[index];
  if (!point) return null;

  // A January label per year (or the very first month), thinned out so a long
  // "All history" span doesn't crowd the axis.
  const isJanuary = point.label.slice(5) === "01";
  if (!isJanuary && index !== 0) return null;

  const step = Math.max(1, Math.ceil(data.length / 96));
  if (index !== 0 && (index / 12) % step !== 0) return null;

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={16} textAnchor="middle" fill={mutedColor} fontSize={11}>
        {point.label.slice(0, 4)}
      </text>
    </g>
  );
}

interface Props {
  points: HistoryPoint[];
  accounts: AccountWithBalance[];
  isLoading: boolean;
  /** The selected range when the page owns it; the chart keeps its own otherwise. */
  range?: HistoryRange;
  /** Called with the chosen range when the page owns it. */
  onRangeChange?: (range: HistoryRange) => void;
}

export default function HistoryChart({
  points,
  accounts,
  isLoading,
  range: controlledRange,
  onRangeChange,
}: Props) {
  const theme = useTheme();

  const [ownRange, setOwnRange] = useState<HistoryRange>("all");
  const range = controlledRange ?? ownRange;
  const setRange = (next: HistoryRange) => {
    setOwnRange(next);
    onRangeChange?.(next);
  };

  const nonMortgageAccounts = accounts.filter((a) => a.kind !== "Mortgage");
  const hasMortgage = accounts.some((a) => a.kind === "Mortgage");

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

  const windowed = useMemo(() => pointsInRange(points, range), [points, range]);

  const firstKnown = useMemo(() => firstKnownMonths(points), [points]);
  const bridge = useMemo(() => paydownBridgeSpan(points), [points]);

  const data = useMemo<HistoryChartDataPoint[]>(
    () =>
      windowed.map((p, i) => ({
        monthIndex: i,
        label: p.month,
        totalLiquid: p.totalLiquid,
        restschuld: p.restschuld,
        restschuldBridge: p.restschuldBridge ?? null,
        netCashflow: p.netCashflow,
        isUnknown: isUnknownMonth(p),
        ...p.accounts,
      })),
    [windowed]
  );

  const restschuldVisible = visibility[RESTSCHULD_KEY] === true;
  const [, yMax] = computeVisibleYDomain(data, visibility);

  const liquidVisible = visibility[TOTAL_LIQUID_KEY] === true;
  const todayIndex = data.length - 1;

  return (
    <ChartFrame
      overline="Actuals"
      title="Historical Trajectory"
      isLoading={isLoading}
      loadingTestId="history-chart-loading"
      topSpacing={theme.spacing.space5}
      controls={
        !isLoading && (
          <StyledRangeChips role="group" aria-label="History range">
            {HISTORY_RANGE_OPTIONS.map((o) => {
              const active = range === o.value;
              return (
                <StyledRangeChip
                  key={o.value}
                  type="button"
                  $active={active}
                  aria-pressed={active}
                  onClick={() => setRange(o.value)}
                >
                  {o.label}
                </StyledRangeChip>
              );
            })}
          </StyledRangeChips>
        )
      }
    >
      <>
        <SeriesToggleIndicator
          visibleCount={visibleCount}
          total={series.length}
        />
        {nonMortgageAccounts.map((a) => (
          <span
            key={a.id}
            data-testid={`chart-line-${a.id}`}
            data-color={resolveAccountColor(a)}
            aria-hidden="true"
            style={{ display: "none" }}
          />
        ))}
        <StyledChartWrapper
          data-testid="history-chart"
          data-months={data.length}
        >
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 16, left: 20, bottom: 8 }}
            >
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
                  <HistoryChartTooltip
                    {...props}
                    series={series.filter((s) => visibility[s.key] === true)}
                    firstKnown={firstKnown}
                    bridge={bridge}
                  />
                )}
              />
              {todayIndex >= 0 && (
                <ReferenceLine
                  yAxisId="left"
                  x={todayIndex}
                  stroke={theme.colors.outline}
                  strokeDasharray="3 4"
                  strokeWidth={1}
                  label={{
                    value: "TODAY",
                    position: "insideTopRight",
                    fill: theme.colors.onSurfaceVariant,
                    fontSize: 10,
                  }}
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
                  strokeWidth={1.75}
                  strokeOpacity={0.85}
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
                strokeWidth={2}
                connectNulls={false}
                hide={!restschuldVisible}
              />
              <Line
                yAxisId="left"
                type="linear"
                dataKey={RESTSCHULD_BRIDGE_KEY}
                name="Restschuld (no monthly data)"
                dot={false}
                stroke={theme.colors.restschuldStrokeColor}
                strokeDasharray="1 4"
                strokeLinecap="round"
                strokeWidth={2}
                strokeOpacity={0.45}
                connectNulls={false}
                activeDot={false}
                legendType="none"
                hide={!restschuldVisible}
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
        <SeriesLegend
          series={series}
          visibility={visibility}
          onToggle={handleToggle}
          onIsolate={handleIsolate}
          onShowAll={handleShowAll}
          testId="history-legend"
        />
      </>
    </ChartFrame>
  );
}
