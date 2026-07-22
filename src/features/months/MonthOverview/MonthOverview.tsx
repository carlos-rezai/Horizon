import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { AccountKind, AccountWithBalance } from "../../../types/account";
import type { Transaction, TransactionDraft } from "../../../types/transaction";
import PageHeader from "../../../components/PageHeader/PageHeader";
import { formatMonthLong } from "../../../utils/format/format";
import type { TransactionChanges } from "../../../utils/optimisticTransactions/optimisticTransactions";
import {
  deriveMonthStats,
  selectVariableSpending,
} from "../../../utils/monthStats/monthStats";
import MonthStatStrip from "../MonthStatStrip/MonthStatStrip";
import SpendingList from "../SpendingList/SpendingList";
import MonthBreakdown from "../MonthBreakdown/MonthBreakdown";
import YearComparison from "../YearComparison/YearComparison";
import MonthYearPicker from "../MonthYearPicker/MonthYearPicker";
import { useAllMonthTransactions } from "../useAllMonthTransactions";
import { useYearComparison } from "../useYearComparison";
import { useImportStartDates } from "../useImportStartDates";
import { useCategories } from "../../categories/useCategories";
import TransactionCreateModal from "../../transactions/TransactionCreateModal/TransactionCreateModal";
import TransactionEditModal from "../../transactions/TransactionEditModal/TransactionEditModal";
import {
  StyledMonthOverview,
  StyledColumns,
  StyledRightColumn,
  StyledStepper,
  StyledStepButton,
} from "./MonthOverview.styles";

// Variable Spending lives only on liquid spending accounts — Mortgage and
// Investment accounts never hold one-off expenses, so they are not tabbed.
const NON_SPENDING_KINDS = new Set<AccountKind>(["Mortgage", "Investment"]);

function shiftMonth(month: string, delta: number): string {
  let [year, mon] = month.split("-").map(Number);
  mon += delta;
  if (mon < 1) {
    mon = 12;
    year -= 1;
  } else if (mon > 12) {
    mon = 1;
    year += 1;
  }
  return `${year}-${String(mon).padStart(2, "0")}`;
}

interface Props {
  accounts: AccountWithBalance[];
}

export default function MonthOverview({ accounts }: Props) {
  const navigate = useNavigate();
  const { month } = useParams<{ month: string }>();
  const monthStr = month ?? "";

  const [createAccountId, setCreateAccountId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const spendingAccounts = accounts.filter(
    (a) => !NON_SPENDING_KINDS.has(a.kind)
  );

  const { transactions, create, update, remove } = useAllMonthTransactions(
    spendingAccounts.map((a) => a.id),
    monthStr
  );
  const { rows: yearComparisonRows, error: yearComparisonError } =
    useYearComparison(monthStr);
  const { startDates: importStartDates } = useImportStartDates();
  const { categories } = useCategories();

  const variableSpending = selectVariableSpending(transactions);
  const stats = deriveMonthStats(transactions, monthStr);
  const monthLabel = formatMonthLong(monthStr).split(" ")[0];

  // The modals collect; the page records. Each one closes on the spot and the
  // change is painted straight away — the hook reconciles with the server
  // behind it, and rolls back with a notification if it is refused.
  function handleCreate(draft: TransactionDraft) {
    const accountId = createAccountId;
    setCreateAccountId(null);
    if (accountId) void create(accountId, draft);
  }

  function handleSave(changes: TransactionChanges) {
    const target = selectedTransaction;
    setSelectedTransaction(null);
    if (target) void update(target.id, changes);
  }

  function handleDelete() {
    const target = selectedTransaction;
    setSelectedTransaction(null);
    if (target) void remove(target.id);
  }

  return (
    <StyledMonthOverview>
      <PageHeader
        overline={formatMonthLong(monthStr)}
        title="Month Overview"
        subtitle="Variable spending · Recurring-Only Model"
        actions={
          <StyledStepper>
            <StyledStepButton
              aria-label="Previous month"
              onClick={() => navigate(`/months/${shiftMonth(monthStr, -1)}`)}
            >
              <ArrowLeft size={16} />
            </StyledStepButton>
            <MonthYearPicker
              month={monthStr}
              importStartDates={importStartDates}
              onJump={(target) => navigate(`/months/${target}`)}
            />
            <StyledStepButton
              aria-label="Next month"
              onClick={() => navigate(`/months/${shiftMonth(monthStr, 1)}`)}
            >
              <ArrowRight size={16} />
            </StyledStepButton>
          </StyledStepper>
        }
      />

      <MonthStatStrip stats={stats} />

      <StyledColumns>
        <SpendingList
          accounts={spendingAccounts}
          transactions={variableSpending}
          categories={categories}
          monthLabel={monthLabel}
          onAddExpense={(accountId) => setCreateAccountId(accountId)}
          onEditTransaction={(tx) => setSelectedTransaction(tx)}
        />
        <StyledRightColumn>
          <MonthBreakdown
            transactions={variableSpending}
            categories={categories}
          />
          <YearComparison
            monthLabel={monthLabel}
            rows={yearComparisonRows}
            categories={categories}
            error={yearComparisonError}
          />
        </StyledRightColumn>
      </StyledColumns>

      {createAccountId !== null && (
        <TransactionCreateModal
          accountId={createAccountId}
          accounts={accounts}
          month={monthStr}
          onClose={() => setCreateAccountId(null)}
          onSubmit={handleCreate}
        />
      )}

      {selectedTransaction && (
        <TransactionEditModal
          transaction={selectedTransaction}
          accounts={accounts}
          onClose={() => setSelectedTransaction(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </StyledMonthOverview>
  );
}
