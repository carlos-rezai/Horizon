import Card from "../../../components/Card/Card";
import SectionHead from "../../../components/SectionHead/SectionHead";
import Donut from "../../../components/Donut/Donut";
import { deriveBreakdown } from "../../../utils/monthBreakdown/monthBreakdown";
import type { Transaction } from "../../../types/transaction";
import type { Category } from "../../../types/category";
import { StyledEmpty } from "./MonthBreakdown.styles";

interface Props {
  transactions: Transaction[];
  /** Categories, for resolving each slice's authoritative stored colour. */
  categories?: Category[];
}

/**
 * The "Breakdown / By category" card: the month's variable spending grouped
 * into a donut with a per-category legend.
 */
export default function MonthBreakdown({
  transactions,
  categories = [],
}: Props) {
  const { segments } = deriveBreakdown(transactions, categories);

  return (
    <Card>
      <SectionHead label="Breakdown" title="By category" />
      {segments.length > 0 ? (
        <Donut segments={segments} centerLabel="Total" wholeCenter />
      ) : (
        <StyledEmpty>No spending to break down this month.</StyledEmpty>
      )}
    </Card>
  );
}
