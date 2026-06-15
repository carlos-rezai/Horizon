import { useTheme } from "styled-components";
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import {
  deriveKpiStrip,
  type KpiPoint,
  type Kpi,
  type ToPayoffKpi,
} from "../../../utils/kpi/kpi";
import Money from "../../../primitives/Money/Money";
import Delta from "../../../primitives/Delta/Delta";
import Sparkline from "../../../primitives/Sparkline/Sparkline";
import { formatMonthLong } from "../../../utils/format/format";
import {
  StyledStrip,
  StyledTile,
  StyledTileHead,
  StyledLabel,
  StyledValue,
  StyledSpark,
  StyledPayoffValue,
  StyledPayoffNum,
  StyledPayoffUnit,
  StyledPayoffHint,
} from "./KpiStrip.styles";

interface Props {
  snapshots: MonthlySnapshot[];
  accounts: AccountWithBalance[];
}

function restschuldOf(
  snapshot: MonthlySnapshot,
  mortgageIds: string[]
): number | null {
  if (mortgageIds.length === 0) return null;
  return mortgageIds.reduce((sum, id) => {
    const entry = snapshot.accounts[id];
    return sum + (entry?.actual ?? entry?.projected ?? 0);
  }, 0);
}

function Tile({
  label,
  kpi,
  sparkColor,
  fill = false,
  sign = false,
}: {
  label: string;
  kpi: Kpi;
  sparkColor: string;
  fill?: boolean;
  sign?: boolean;
}) {
  return (
    <StyledTile data-testid="kpi-tile">
      <StyledTileHead>
        <StyledLabel>{label}</StyledLabel>
        {kpi.delta !== null && <Delta value={kpi.delta} />}
      </StyledTileHead>
      <StyledValue>
        <Money cents={kpi.value} sign={sign} />
      </StyledValue>
      {kpi.spark.length >= 2 && (
        <StyledSpark>
          <Sparkline
            data={kpi.spark}
            color={sparkColor}
            fill={fill}
            width={160}
            height={26}
            stretch
          />
        </StyledSpark>
      )}
    </StyledTile>
  );
}

function ToPayoffTile({ toPayoff }: { toPayoff: ToPayoffKpi | null }) {
  return (
    <StyledTile $accent data-testid="kpi-tile">
      <StyledTileHead>
        <StyledLabel $accent>To Payoff</StyledLabel>
      </StyledTileHead>
      {toPayoff ? (
        <>
          <StyledPayoffValue>
            <StyledPayoffNum>
              {Math.floor(toPayoff.months / 12)}
            </StyledPayoffNum>
            <StyledPayoffUnit>Years</StyledPayoffUnit>
            <StyledPayoffNum>{toPayoff.months % 12}</StyledPayoffNum>
            <StyledPayoffUnit>Months</StyledPayoffUnit>
          </StyledPayoffValue>
          <StyledPayoffHint>
            debt-free in {formatMonthLong(toPayoff.payoffMonth)}
          </StyledPayoffHint>
        </>
      ) : (
        <StyledPayoffHint>No payoff in horizon</StyledPayoffHint>
      )}
    </StyledTile>
  );
}

export default function KpiStrip({ snapshots, accounts }: Props) {
  const theme = useTheme();
  const mortgageIds = accounts
    .filter((a) => a.kind === "Mortgage")
    .map((a) => a.id);

  const points: KpiPoint[] = snapshots.map((s) => ({
    month: s.month,
    totalLiquid: s.totalLiquid,
    restschuld: restschuldOf(s, mortgageIds),
    netCashflow: s.netCashflow,
  }));

  const strip = deriveKpiStrip(points);

  return (
    <StyledStrip data-testid="kpi-strip">
      <Tile
        label="Total Liquid"
        kpi={strip.totalLiquid}
        sparkColor={theme.colors.secondary}
        fill
      />
      <Tile
        label="Restschuld"
        kpi={strip.restschuld}
        sparkColor={theme.colors.debt}
      />
      <Tile
        label="Net Cashflow"
        kpi={strip.netCashflow}
        sparkColor={theme.colors.flow}
        fill
        sign
      />
      <ToPayoffTile toPayoff={strip.toPayoff} />
    </StyledStrip>
  );
}
