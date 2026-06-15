import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import {
  deriveKpiStrip,
  type KpiPoint,
  type Kpi,
} from "../../../utils/kpi/kpi";
import Money from "../../../primitives/Money/Money";
import Delta from "../../../primitives/Delta/Delta";
import {
  StyledStrip,
  StyledTile,
  StyledTileHead,
  StyledLabel,
  StyledValue,
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
  sign = false,
}: {
  label: string;
  kpi: Kpi;
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
      <Tile label="Net Cashflow" kpi={strip.netCashflow} sign />
    </StyledStrip>
  );
}
