import { useState } from "react";
import type { AccountWithBalance } from "../../../types/account";
import type { Transaction } from "../../../types/transaction";
import Button from "../../../primitives/Button/Button";
import Chip from "../../../primitives/Chip/Chip";
import Badge from "../../../primitives/Badge/Badge";
import Money from "../../../primitives/Money/Money";
import Tabs, { type TabItem } from "../../../primitives/Tabs/Tabs";
import Card from "../../../components/Card/Card";
import SectionHead from "../../../components/SectionHead/SectionHead";
import DataRow from "../../../components/DataRow/DataRow";
import { resolveAccountColor } from "../../../utils/color/color";
import { colorForCategoryName } from "../../../utils/categoryColor/categoryColor";
import {
  StyledTabsWrap,
  StyledDay,
  StyledDayNum,
  StyledDayMonth,
  StyledDesc,
  StyledAccountLine,
  StyledAccountName,
  StyledEmpty,
} from "./SpendingList.styles";

const ALL = "all";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const ROW_COLUMNS = ["44px", "1fr", "auto", "auto"];

interface Props {
  /** Accounts shown as tabs (spendable accounts only). */
  accounts: AccountWithBalance[];
  /** Variable spending for the month across all spendable accounts. */
  transactions: Transaction[];
  /** Full month label (e.g. "June") for the section title. */
  monthLabel: string;
  onAddExpense: (accountId: string) => void;
  onEditTransaction: (tx: Transaction) => void;
}

/**
 * The Month Overview spending card: account tabs (with an "All accounts" tab),
 * an "Add expense" action, and a row per variable-spending transaction.
 */
export default function SpendingList({
  accounts,
  transactions,
  monthLabel,
  onAddExpense,
  onEditTransaction,
}: Props) {
  const [tab, setTab] = useState(ALL);

  const tabs: TabItem[] = [
    { id: ALL, label: "All accounts", count: transactions.length },
    ...accounts.map((a) => ({
      id: a.id,
      label: a.name,
      color: resolveAccountColor(a),
      count: transactions.filter((t) => t.accountId === a.id).length,
    })),
  ];

  const rows =
    tab === ALL
      ? transactions
      : transactions.filter((t) => t.accountId === tab);

  const activeAccountId = tab === ALL ? (accounts[0]?.id ?? "") : tab;

  return (
    <Card>
      <SectionHead
        label="Variable Spending"
        title={`Spending in ${monthLabel}`}
        right={
          <Button
            variant="secondary"
            size="sm"
            icon="Plus"
            onClick={() => onAddExpense(activeAccountId)}
          >
            Add expense
          </Button>
        }
      />
      <StyledTabsWrap>
        <Tabs tabs={tabs} activeId={tab} onChange={setTab} />
      </StyledTabsWrap>

      {rows.length === 0 ? (
        <StyledEmpty>No variable spending this month.</StyledEmpty>
      ) : (
        <div>
          {rows.map((t, i) => {
            const account = accounts.find((a) => a.id === t.accountId);
            const day = parseInt(t.date.slice(8, 10), 10);
            const monthIdx = parseInt(t.date.slice(5, 7), 10) - 1;
            return (
              <DataRow
                key={t.id}
                columns={ROW_COLUMNS}
                last={i === rows.length - 1}
                onClick={() => onEditTransaction(t)}
              >
                <StyledDay>
                  <StyledDayNum>{day}</StyledDayNum>
                  <StyledDayMonth>{MONTHS_SHORT[monthIdx]}</StyledDayMonth>
                </StyledDay>
                <div>
                  <StyledDesc>{t.description}</StyledDesc>
                  <StyledAccountLine>
                    {account && (
                      <Chip color={resolveAccountColor(account)} size="sm" />
                    )}
                    <StyledAccountName>
                      {account?.name ?? "—"}
                    </StyledAccountName>
                  </StyledAccountLine>
                </div>
                <Badge color={colorForCategoryName(t.category)}>
                  {t.category}
                </Badge>
                <Money cents={t.amount} sign />
              </DataRow>
            );
          })}
        </div>
      )}
    </Card>
  );
}
