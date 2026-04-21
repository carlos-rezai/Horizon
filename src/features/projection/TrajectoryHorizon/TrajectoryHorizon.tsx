import { useTheme } from "styled-components";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import type { RecurringTransaction } from "../../../types/recurring";
import {
  buildTrajectoryData,
  deriveSTMonths,
  findMortgagePayoffMonth,
} from "../../../utils/projection";
import Heading from "../../../primitives/Heading/Heading";
import {
  StyledSection,
  StyledChartWrapper,
  StyledEmptyState,
  StyledLoadingState,
} from "./TrajectoryHorizon.styles";

interface Props {
  snapshots: MonthlySnapshot[];
  accounts: AccountWithBalance[];
  recurringTransactions: RecurringTransaction[];
  isLoading: boolean;
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

  const data = buildTrajectoryData(
    snapshots,
    stMonths,
    payoffMonth,
    mortgageIds
  );

  function xAxisFormatter(value: number): string {
    if (value % 24 !== 0) return "";
    const point = data[value];
    return point ? point.label.slice(0, 4) : "";
  }

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
        <StyledChartWrapper data-testid="trajectory-horizon-chart">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data}>
              <XAxis dataKey="monthIndex" tickFormatter={xAxisFormatter} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
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
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="netCashflow"
                dot={false}
                stroke={theme.colors.accent}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </StyledChartWrapper>
      )}
    </StyledSection>
  );
}
