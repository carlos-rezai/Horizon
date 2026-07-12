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
import { Filter, RotateCcw } from "lucide-react";
import type { AccountWithBalance } from "../../../types/account";
import type { HistoryPoint } from "../historyTypes";
import {
  computeVisibleYDomain,
  type SeriesVisibility,
  type VisibilityAccount,
} from "../../../utils/trajectory/trajectory";
import { useSeriesVisibility } from "../../../hooks/useSeriesVisibility";
import { formatBalance, formatMonth } from "../../../utils/format/format";
import { resolveAccountColor } from "../../../utils/color/color";
import {
  StyledCard,
  StyledHeader,
  StyledOverline,
  StyledTitle,
  StyledSeriesToggle,
  StyledRangeChips,
  StyledRangeChip,
  StyledChartWrapper,
  StyledLoadingState,
  StyledTooltipBox,
  StyledTooltipLabel,
  StyledTooltipRow,
  StyledTooltipRowLabel,
  StyledTooltipSwatch,
  StyledTooltipNetRow,
  StyledLegend,
  StyledChip,
  StyledChipSwatch,
  StyledSumBadge,
  StyledShowAllButton,
} from "./HistoryChart.styles";

const VISIBILITY_KEY = "horizon.history.visibility.v1";

const TOTAL_LIQUID_KEY = "totalLiquid";
const RESTSCHULD_KEY = "restschuld";

/** A single reconstructed month projected onto the chart's flat data shape. */
interface HistoryChartDataPoint {
  monthIndex: number;
  label: string;
  totalLiquid: number;
  restschuld: number;
  netCashflow: number;
  [accountId: string]: number | string;
}

interface HistorySeries {
  key: string;
  name: string;
  color: string;
  kind: "liquid" | "account" | "debt";
  dashed: boolean;
}

interface RangeOption {
  value: string;
  label: string;
  months: number;
}

const RANGE_OPTIONS: RangeOption[] = [
  { value: "1y", label: "1 Year", months: 12 },
  { value: "3y", label: "3 Years", months: 36 },
  { value: "all", label: "All history", months: Infinity },
];

interface HistoryTooltipPayloadItem {
  payload?: HistoryChartDataPoint;
}

interface HistoryChartTooltipProps {
  active?: boolean;
  payload?: readonly HistoryTooltipPayloadItem[];
  series: HistorySeries[];
}

/**
 * Hover card for the History chart. Mirrors the Dashboard tooltip but always
 * ends with the month's Net Cashflow — the "what happened" number that the
 * forward-looking Trajectory tooltip doesn't carry.
 */
export function HistoryChartTooltip({
  active,
  payload,
  series,
}: HistoryChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  if (!point) return null;

  return (
    <StyledTooltipBox>
      <StyledTooltipLabel>{formatMonth(point.label)}</StyledTooltipLabel>
      {series.map((s) => {
        const value = point[s.key];
        if (typeof value !== "number") return null;
        return (
          <StyledTooltipRow key={s.key}>
            <StyledTooltipRowLabel>
              <StyledTooltipSwatch $color={s.color} />
              {s.name}
            </StyledTooltipRowLabel>
            <span>{formatBalance(value)}</span>
          </StyledTooltipRow>
        );
      })}
      <StyledTooltipNetRow>
        <span>Net Cashflow</span>
        <span>{formatBalance(point.netCashflow)}</span>
      </StyledTooltipNetRow>
    </StyledTooltipBox>
  );
}

interface HistoryLegendProps {
  series: HistorySeries[];
  visibility: SeriesVisibility;
  onToggle: (key: string) => void;
  onIsolate: (key: string) => void;
  onShowAll: () => void;
}

function HistoryLegend({
  series,
  visibility,
  onToggle,
  onIsolate,
  onShowAll,
}: HistoryLegendProps) {
  const hiddenCount = series.filter((s) => !visibility[s.key]).length;

  return (
    <StyledLegend data-testid="history-legend">
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
}

export default function HistoryChart({ points, accounts, isLoading }: Props) {
  const theme = useTheme();

  const [range, setRange] = useState("all");

  const nonMortgageAccounts = accounts.filter((a) => a.kind !== "Mortgage");
  const hasMortgage = accounts.some((a) => a.kind === "Mortgage");

  const series = useMemo<HistorySeries[]>(() => {
    const list: HistorySeries[] = [
      {
        key: TOTAL_LIQUID_KEY,
        name: "Total Liquid",
        color: theme.colors.liquid,
        kind: "liquid",
        dashed: false,
      },
      ...nonMortgageAccounts.map<HistorySeries>((a) => ({
        key: a.id,
        name: a.name,
        color: resolveAccountColor(a),
        kind: "account",
        dashed: false,
      })),
    ];
    if (hasMortgage) {
      list.push({
        key: RESTSCHULD_KEY,
        name: "Restschuld",
        color: theme.colors.restschuldStrokeColor,
        kind: "debt",
        dashed: true,
      });
    }
    return list;
  }, [nonMortgageAccounts, hasMortgage, theme]);

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

  // Range narrows from the right edge (TODAY), so a shorter window always keeps
  // the most recent months rather than the earliest.
  const rangeMonths =
    RANGE_OPTIONS.find((o) => o.value === range)?.months ?? Infinity;
  const windowed = points.slice(Math.max(0, points.length - rangeMonths));

  const data = useMemo<HistoryChartDataPoint[]>(
    () =>
      windowed.map((p, i) => ({
        monthIndex: i,
        label: p.month,
        totalLiquid: p.totalLiquid,
        restschuld: p.restschuld,
        netCashflow: p.netCashflow,
        ...p.accounts,
      })),
    [windowed]
  );

  const [, yMax] = computeVisibleYDomain(data, visibility);

  const liquidVisible = visibility[TOTAL_LIQUID_KEY] === true;
  const todayIndex = data.length - 1;

  return (
    <StyledCard>
      <StyledHeader>
        <div>
          <StyledOverline>Actuals</StyledOverline>
          <StyledTitle>Historical Trajectory</StyledTitle>
        </div>
        {!isLoading && (
          <StyledRangeChips role="group" aria-label="History range">
            {RANGE_OPTIONS.map((o) => {
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
        )}
      </StyledHeader>

      {isLoading ? (
        <StyledLoadingState data-testid="history-chart-loading">
          Loading…
        </StyledLoadingState>
      ) : (
        <>
          <StyledSeriesToggle>
            <Filter size={14} />
            {visibleCount} of {series.length} series · click to toggle
          </StyledSeriesToggle>
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
          <HistoryLegend
            series={series}
            visibility={visibility}
            onToggle={handleToggle}
            onIsolate={handleIsolate}
            onShowAll={handleShowAll}
          />
        </>
      )}
    </StyledCard>
  );
}
