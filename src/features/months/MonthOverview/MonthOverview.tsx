import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { AccountWithBalance } from "../../../types/account";
import type { MonthlySnapshot } from "../../../types/projection";
import type { RecurringTransaction } from "../../../types/recurring";
import type { Transaction } from "../../../types/transaction";
import { formatBalance } from "../../../utils/format/format";
import Button from "../../../primitives/Button/Button";
import { useMonthTransactions } from "../useMonthTransactions";
import { useAllMonthTransactions } from "../useAllMonthTransactions";
import TransactionCreateModal from "../../transactions/TransactionCreateModal/TransactionCreateModal";
import TransactionEditModal from "../../transactions/TransactionEditModal/TransactionEditModal";
import TableHeader from "../../../components/TableHeader/TableHeader";
import {
  StyledMonthOverview,
  StyledBalanceSummaryBar,
  StyledBalanceSummaryItem,
  StyledBalanceLabel,
  StyledBalanceValue,
  StyledTabList,
  StyledTab,
  StyledSectionHeading,
  StyledTransactionRow,
  StyledOneOffRow,
  StyledEmptyState,
  StyledSignedAmount,
} from "./MonthOverview.styles";

const ONEOFF_GRID = "100px 1fr 160px 100px";
const ONEOFF_COLUMNS = ["Date", "Description", "To account", "Amount"];

function getTransferTarget(
  tx: Transaction,
  allTxs: Transaction[],
  accounts: AccountWithBalance[]
): string | null {
  if (!tx.transferId) return null;
  const otherLeg = allTxs.find(
    (t) => t.transferId === tx.transferId && t.accountId !== tx.accountId
  );
  return accounts.find((a) => a.id === otherLeg?.accountId)?.name ?? null;
}

interface Props {
  accounts: AccountWithBalance[];
  snapshots?: MonthlySnapshot[];
  recurringTransactionsByAccount?: Record<string, RecurringTransaction[]>;
}

export default function MonthOverview({
  accounts,
  snapshots = [],
  recurringTransactionsByAccount,
}: Props) {
  const navigate = useNavigate();
  const { month } = useParams<{ month: string }>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const activeAccount = accounts[activeIndex];
  const snapshot = snapshots.find((s) => s.month === month);
  const monthStr = month ?? "";

  const { transactions, remove, removeTransfer, refetch } =
    useMonthTransactions(activeAccount?.id ?? "", monthStr);

  const { transactions: allMonthTransactions } = useAllMonthTransactions(
    accounts.map((a) => a.id),
    monthStr
  );

  const recurringForAccount =
    recurringTransactionsByAccount?.[activeAccount?.id ?? ""] ?? [];

  function handleDeleted(id: string, transferId?: string) {
    if (transferId) {
      void removeTransfer(transferId);
    } else {
      void remove(id);
    }
    setSelectedTransaction(null);
  }

  return (
    <StyledMonthOverview>
      <Button aria-label="Back" onClick={() => navigate(-1)}>
        Back
      </Button>
      {snapshot && (
        <StyledBalanceSummaryBar>
          {accounts.map((account) => {
            const entry = snapshot.accounts[account.id];
            const balance =
              entry !== undefined ? (entry.actual ?? entry.projected) : null;
            return (
              <StyledBalanceSummaryItem key={account.id}>
                <StyledBalanceLabel>{account.name}</StyledBalanceLabel>
                <StyledBalanceValue>
                  {balance !== null ? formatBalance(balance) : "—"}
                </StyledBalanceValue>
              </StyledBalanceSummaryItem>
            );
          })}
        </StyledBalanceSummaryBar>
      )}
      <StyledTabList role="tablist">
        {accounts.map((account, index) => (
          <StyledTab
            key={account.id}
            role="tab"
            aria-selected={index === activeIndex}
            $isActive={index === activeIndex}
            $color={account.color ?? undefined}
            onClick={() => setActiveIndex(index)}
          >
            {account.name}
          </StyledTab>
        ))}
      </StyledTabList>

      {recurringTransactionsByAccount !== undefined && (
        <>
          <StyledSectionHeading>Recurring this month</StyledSectionHeading>
          {recurringForAccount.map((rt) => (
            <StyledTransactionRow key={rt.id}>
              <span>{rt.description}</span>
              <StyledSignedAmount $isPositive={rt.amount >= 0}>
                {formatBalance(rt.amount)}
              </StyledSignedAmount>
            </StyledTransactionRow>
          ))}
        </>
      )}

      <TableHeader columns={ONEOFF_COLUMNS} gridTemplate={ONEOFF_GRID} />

      {transactions.length === 0 ? (
        <StyledEmptyState>No transactions this month</StyledEmptyState>
      ) : (
        transactions.map((tx) => (
          <StyledOneOffRow
            key={tx.id}
            $gridTemplate={ONEOFF_GRID}
            onClick={() => setSelectedTransaction(tx)}
          >
            <span>{tx.date}</span>
            <span>{tx.description}</span>
            <span>
              {getTransferTarget(tx, allMonthTransactions, accounts) ?? "—"}
            </span>
            <StyledSignedAmount $isPositive={tx.amount >= 0}>
              {formatBalance(tx.amount)}
            </StyledSignedAmount>
          </StyledOneOffRow>
        ))
      )}

      <Button onClick={() => setShowCreateModal(true)}>Add transaction</Button>

      {showCreateModal && (
        <TransactionCreateModal
          accountId={activeAccount?.id ?? ""}
          accounts={accounts}
          month={monthStr}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            refetch();
          }}
        />
      )}

      {selectedTransaction && (
        <TransactionEditModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onSaved={(updated) => {
            setSelectedTransaction(null);
            void Promise.resolve(updated);
          }}
          onDeleted={handleDeleted}
        />
      )}
    </StyledMonthOverview>
  );
}
