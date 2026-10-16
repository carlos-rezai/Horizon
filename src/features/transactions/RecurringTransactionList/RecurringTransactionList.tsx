import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { AccountWithBalance } from "../../../types/account";
import type { RecurringTransaction } from "../../../types/recurring";
import { toOrdinal } from "../../../utils/format/format";
import { resolveAccountColor } from "../../../utils/color/color";
import {
  recurringAmountFor,
  transferSideFor,
} from "../../../utils/recurring/recurring";
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
  /** The account being viewed — decides which way a transfer reads. */
  accountId: string;
  accounts?: AccountWithBalance[];
  onRowClick: (rt: RecurringTransaction) => void;
}

export default function RecurringTransactionList({
  recurringTransactions,
  accountId,
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
        // A Mirrored Transfer Row: a transfer viewed from its destination.
        const mirrored = transferSideFor(rt, accountId) === "destination";
        const counterpartId = mirrored ? rt.accountId : rt.linkedAccountId;
        const counterpart = counterpartId
          ? accounts.find((a) => a.id === counterpartId)
          : undefined;
        const last = i === recurringTransactions.length - 1;
        const cells = (
          <>
            <div>
              <StyledName>{rt.description}</StyledName>
              {counterpart && (
                <StyledLinkedLine>
                  {mirrored ? (
                    <ArrowLeft size={12} />
                  ) : (
                    <ArrowRight size={12} />
                  )}
                  <Chip color={resolveAccountColor(counterpart)} size="sm" />
                  <StyledLinkedName>
                    {mirrored ? `from ${counterpart.name}` : counterpart.name}
                  </StyledLinkedName>
                </StyledLinkedLine>
              )}
            </div>
            <StyledRight>
              <Money cents={recurringAmountFor(rt, accountId)} sign />
            </StyledRight>
            <StyledDay>{toOrdinal(rt.dayOfMonth)}</StyledDay>
            <StyledRight>
              <Badge>{rt.frequency}</Badge>
            </StyledRight>
          </>
        );
        return mirrored ? (
          <DataRow
            key={rt.id}
            columns={ROW_COLUMNS}
            last={last}
            as={Link}
            to={`/accounts/${rt.accountId}`}
          >
            {cells}
          </DataRow>
        ) : (
          <DataRow
            key={rt.id}
            columns={ROW_COLUMNS}
            last={last}
            onClick={() => onRowClick(rt)}
          >
            {cells}
          </DataRow>
        );
      })}
    </StyledList>
  );
}
