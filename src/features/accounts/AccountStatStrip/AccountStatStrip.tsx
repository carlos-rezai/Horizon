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
 * The Account Detail headline strip: four cells (Opening Balance, Opening Date,
 * Recurring, Recurring net / mo) sharing one bordered container — the sibling
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
        <StatBlock label="Opening Balance">
          <StyledValue $muted>
            <Money cents={anchorBalance} />
          </StyledValue>
        </StatBlock>
      </StyledCell>
      <StyledCell>
        <StatBlock label="Opening Date">
          <StyledValue $muted>{anchorDate}</StyledValue>
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
