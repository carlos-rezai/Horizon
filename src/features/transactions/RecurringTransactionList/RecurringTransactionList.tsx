import { ArrowRight } from "lucide-react";
import type { AccountWithBalance } from "../../../types/account";
import type { RecurringTransaction } from "../../../types/recurring";
import { toOrdinal } from "../../../utils/format/format";
import { resolveAccountColor } from "../../../utils/color/color";
import DataRow from "../../../components/DataRow/DataRow";
import Badge from "../../../primitives/Badge/Badge";
import Money from "../../../primitives/Money/Money";
import Chip from "../../../primitives/Chip/Chip";
import {
  StyledList,
  StyledHeaderRow,
  StyledHeaderCell,
  StyledName,
  StyledLinkedLine,
  StyledLinkedName,
  StyledRight,
  StyledDay,
  StyledEmptyState,
} from "./RecurringTransactionList.styles";

const ROW_COLUMNS = ["1fr", "150px", "120px", "110px"];

interface Props {
  recurringTransactions: RecurringTransaction[];
  accounts?: AccountWithBalance[];
  onRowClick: (rt: RecurringTransaction) => void;
}

export default function RecurringTransactionList({
  recurringTransactions,
  accounts = [],
  onRowClick,
}: Props) {
  if (recurringTransactions.length === 0) {
    return <StyledEmptyState>No recurring transactions</StyledEmptyState>;
  }

  return (
    <StyledList>
      <StyledHeaderRow>
        <StyledHeaderCell>Name</StyledHeaderCell>
        <StyledHeaderCell $right>Amount</StyledHeaderCell>
        <StyledHeaderCell $right>Day</StyledHeaderCell>
        <StyledHeaderCell $right>Frequency</StyledHeaderCell>
      </StyledHeaderRow>
      {recurringTransactions.map((rt, i) => {
        const linked = rt.linkedAccountId
          ? accounts.find((a) => a.id === rt.linkedAccountId)
          : undefined;
        return (
          <DataRow
            key={rt.id}
            columns={ROW_COLUMNS}
            last={i === recurringTransactions.length - 1}
            onClick={() => onRowClick(rt)}
          >
            <div>
              <StyledName>{rt.description}</StyledName>
              {linked && (
                <StyledLinkedLine>
                  <ArrowRight size={12} />
                  <Chip color={resolveAccountColor(linked)} size="sm" />
                  <StyledLinkedName>{linked.name}</StyledLinkedName>
                </StyledLinkedLine>
              )}
            </div>
            <StyledRight>
              <Money cents={rt.amount} sign />
            </StyledRight>
            <StyledDay>{toOrdinal(rt.dayOfMonth)}</StyledDay>
            <StyledRight>
              <Badge>{rt.frequency}</Badge>
            </StyledRight>
          </DataRow>
        );
      })}
    </StyledList>
  );
}
