import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import {
  deriveKpiStrip,
  type KpiPoint,
  type Kpi,
} from "../../../utils/kpi/kpi";
import { formatBalance } from "../../../utils/format/format";
import {
  StyledStrip,
  StyledTile,
  StyledLabel,
  StyledValue,
  StyledDelta,
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

function Tile({ label, kpi }: { label: string; kpi: Kpi }) {
  return (
    <StyledTile data-testid="kpi-tile">
      <StyledLabel>{label}</StyledLabel>
      <StyledValue data-testid="money">{formatBalance(kpi.value)}</StyledValue>
      {kpi.delta !== null && (
        <StyledDelta data-testid="delta" $positive={kpi.delta >= 0}>
          {kpi.delta >= 0 ? "▲" : "▼"} {Math.abs(kpi.delta).toFixed(1)}%
        </StyledDelta>
      )}
    </StyledTile>
  );
}

export default function KpiStrip({ snapshots, accounts }: Props) {
  const mortgageIds = accounts
    .filter((a) => a.kind === "Mortgage")
    .map((a) => a.id);

  const points: KpiPoint[] = snapshots.map((s) => ({
    totalLiquid: s.totalLiquid,
    restschuld: restschuldOf(s, mortgageIds),
    netCashflow: s.netCashflow,
  }));

  const strip = deriveKpiStrip(points);

  return (
    <StyledStrip data-testid="kpi-strip">
      <Tile label="Total Liquid" kpi={strip.totalLiquid} />
      <Tile label="Restschuld" kpi={strip.restschuld} />
      <Tile label="Net Cashflow" kpi={strip.netCashflow} />
    </StyledStrip>
  );
}
