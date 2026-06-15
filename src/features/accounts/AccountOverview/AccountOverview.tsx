import { Link } from "react-router-dom";
import type { AccountWithBalance, AccountKind } from "../../../types/account";
import Avatar from "../../../primitives/Avatar/Avatar";
import Badge from "../../../primitives/Badge/Badge";
import Chip from "../../../primitives/Chip/Chip";
import Money from "../../../primitives/Money/Money";
import DataRow from "../../../components/DataRow/DataRow";
import { resolveAccountColor } from "../../../utils/color/color";
import {
  StyledList,
  StyledMain,
  StyledNameLine,
  StyledName,
  StyledRight,
  StyledBalance,
  StyledEmptyState,
} from "./AccountOverview.styles";

interface Props {
  accounts: AccountWithBalance[];
}

const LIABILITY_KINDS = new Set<AccountKind>(["Mortgage", "CreditCard"]);

const ROW_COLUMNS = ["38px", "1fr", "auto"];

export default function AccountOverview({ accounts }: Props) {
  if (accounts.length === 0) {
    return <StyledEmptyState>No accounts yet.</StyledEmptyState>;
  }

  return (
    <StyledList>
      {accounts.map((account, i) => {
        const isLiability = LIABILITY_KINDS.has(account.kind);
        return (
          <DataRow
            key={account.id}
            as={Link}
            to={`/accounts/${account.id}`}
            columns={ROW_COLUMNS}
            last={i === accounts.length - 1}
          >
            <Avatar account={account} />
            <StyledMain>
              <StyledNameLine>
                <StyledName>{account.name}</StyledName>
                <Chip color={resolveAccountColor(account)} size="sm" />
              </StyledNameLine>
            </StyledMain>
            <StyledRight>
              <StyledBalance $isLiability={isLiability}>
                <Money cents={account.balance} />
              </StyledBalance>
              <Badge kind={account.kind} />
            </StyledRight>
          </DataRow>
        );
      })}
    </StyledList>
  );
}
