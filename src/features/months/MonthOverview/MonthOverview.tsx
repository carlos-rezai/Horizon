import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { AccountWithBalance } from "../../../types/account";
import type { MonthlySnapshot } from "../../../types/projection";
import type { RecurringTransaction } from "../../../types/recurring";
import { formatBalance } from "../../../utils/format/format";
import Button from "../../../primitives/Button/Button";
import DatePicker from "../../../primitives/DatePicker/DatePicker";
import { useMonthTransactions } from "../useMonthTransactions";
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
  StyledEmptyState,
} from "./MonthOverview.styles";

interface Props {
  accounts: AccountWithBalance[];
  snapshots?: MonthlySnapshot[];
  recurringTransactionsByAccount?: Record<string, RecurringTransaction[]>;
}

function getMonthBounds(month: string): { first: string; last: string } {
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const first = `${month}-01`;
  const last = `${year}-${String(mon).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { first, last };
}

export default function MonthOverview({
  accounts,
  snapshots = [],
  recurringTransactionsByAccount,
}: Props) {
  const navigate = useNavigate();
  const { month } = useParams<{ month: string }>();
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDate, setNewDate] = useState(month ? `${month}-01` : "");

  const activeAccount = accounts[activeIndex];
  const snapshot = snapshots.find((s) => s.month === month);
  const monthStr = month ?? "";

  const { transactions, create } = useMonthTransactions(
    activeAccount?.id ?? "",
    monthStr
  );

  const recurringForAccount =
    recurringTransactionsByAccount?.[activeAccount?.id ?? ""] ?? [];

  const { first: minDate, last: maxDate } = monthStr
    ? getMonthBounds(monthStr)
    : { first: "", last: "" };

  async function handleCreate() {
    await create({ date: newDate, amount: 0, description: "", category: "" });
    setShowAddForm(false);
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
              <span>{formatBalance(rt.amount)}</span>
            </StyledTransactionRow>
          ))}
        </>
      )}

      {transactions.length === 0 ? (
        <StyledEmptyState>No transactions this month</StyledEmptyState>
      ) : (
        transactions.map((tx) => (
          <StyledTransactionRow key={tx.id}>
            <span>{tx.description}</span>
            <span>{formatBalance(tx.amount)}</span>
          </StyledTransactionRow>
        ))
      )}

      <Button onClick={() => setShowAddForm((v) => !v)}>Add transaction</Button>

      {showAddForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleCreate();
          }}
        >
          <DatePicker
            value={newDate}
            onChange={setNewDate}
            minDate={minDate}
            maxDate={maxDate}
            aria-label="Date"
          />
        </form>
      )}
    </StyledMonthOverview>
  );
}
