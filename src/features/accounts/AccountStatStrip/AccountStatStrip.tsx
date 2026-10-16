import StatBlock from "../../../components/StatBlock/StatBlock";
import Money from "../../../primitives/Money/Money";
import {
  StyledStrip,
  StyledCell,
  StyledValue,
} from "./AccountStatStrip.styles";

interface Props {
  anchorBalance: number;
  anchorDate: string;
  recurringCount: number;
  recurringNet: number;
}

/**
 * The Account Detail headline strip: three cells (Balance anchor with its
 * "as of" date, Recurring, Recurring net / mo) sharing one bordered container — the sibling
 * of MonthStatStrip.
 */
export default function AccountStatStrip({
  anchorBalance,
  anchorDate,
  recurringCount,
  recurringNet,
}: Props) {
  return (
    <StyledStrip data-testid="account-stat-strip">
      <StyledCell>
        <StatBlock label="Balance anchor" hint={`as of ${anchorDate}`}>
          <StyledValue $muted>
            <Money cents={anchorBalance} />
          </StyledValue>
        </StatBlock>
      </StyledCell>
      <StyledCell>
        <StatBlock label="Recurring">
          <StyledValue>{recurringCount}</StyledValue>
        </StatBlock>
      </StyledCell>
      <StyledCell $last>
        <StatBlock label="Recurring net / mo">
          <StyledValue>
            <Money cents={recurringNet} sign />
          </StyledValue>
        </StatBlock>
      </StyledCell>
    </StyledStrip>
  );
}
