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
import MonthStatStripSkeleton from "../MonthStatStrip/MonthStatStripSkeleton";
import SpendingList from "../SpendingList/SpendingList";
import SpendingListSkeleton from "../SpendingList/SpendingListSkeleton";
import MonthBreakdown from "../MonthBreakdown/MonthBreakdown";
import MonthBreakdownSkeleton from "../MonthBreakdown/MonthBreakdownSkeleton";
import YearComparison from "../YearComparison/YearComparison";
import YearComparisonSkeleton from "../YearComparison/YearComparisonSkeleton";
import MonthYearPicker from "../MonthYearPicker/MonthYearPicker";
import SectionState from "../../../components/SectionState/SectionState";
import FadeSwap from "../../../components/FadeSwap/FadeSwap";
import { useAllMonthTransactions } from "../useAllMonthTransactions";
import { useYearComparison } from "../useYearComparison";
import { useImportStartDates } from "../useImportStartDates";
import { useCategories } from "../../categories/useCategories";
import TransactionCreateModal from "../../transactions/TransactionCreateModal/TransactionCreateModal";
import TransactionEditModal from "../../transactions/TransactionEditModal/TransactionEditModal";
import {
  StyledMonthOverview,
  StyledMonthContent,
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
  /** Accounts are fetched a level up, so their pending state arrives as a prop. */
  accountsLoading?: boolean;
  accountsError?: string | null;
}

export default function MonthOverview({
  accounts,
  accountsLoading = false,
  accountsError = null,
}: Props) {
  const navigate = useNavigate();
  const { month } = useParams<{ month: string }>();
  const monthStr = month ?? "";

  const [createAccountId, setCreateAccountId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const spendingAccounts = accounts.filter(
    (a) => !NON_SPENDING_KINDS.has(a.kind)
  );

  const {
    transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    create,
    update,
    remove,
  } = useAllMonthTransactions(
    spendingAccounts.map((a) => a.id),
    monthStr
  );
  const {
    rows: yearComparisonRows,
    isLoading: yearComparisonLoading,
    error: yearComparisonError,
  } = useYearComparison(monthStr);
  const { startDates: importStartDates } = useImportStartDates();
  const { categories } = useCategories();

  const variableSpending = selectVariableSpending(transactions);
  const stats = deriveMonthStats(transactions, monthStr);
  const monthLabel = formatMonthLong(monthStr).split(" ")[0];

  // The month's own sections cannot read anything until the accounts that own
  // the transactions are known, so they share one gate. The year comparison is
  // a server-side report keyed only by the month, so it reveals on its own —
  // usually well before the per-account reads land.
  const monthLoading = accountsLoading || transactionsLoading;
  const monthError = accountsError ?? transactionsError;

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

      {/* Keyed by the month, so stepping to another month cross-fades its
          figures in. The header stays outside: its stepper and picker are
          under the pointer, and fading the controls the user just clicked
          would read as a page transition rather than a data swap. */}
      <FadeSwap testId="month-content-fade" swapKey={monthStr}>
        <StyledMonthContent>
          <SectionState
            testId="month-section-stats"
            isLoading={monthLoading}
            error={monthError}
            skeleton={<MonthStatStripSkeleton />}
          >
            <MonthStatStrip stats={stats} />
          </SectionState>

          <StyledColumns>
            <SectionState
              testId="month-section-spending"
              isLoading={monthLoading}
              error={monthError}
              skeleton={<SpendingListSkeleton monthLabel={monthLabel} />}
            >
              <SpendingList
                accounts={spendingAccounts}
                transactions={variableSpending}
                categories={categories}
                monthLabel={monthLabel}
                onAddExpense={(accountId) => setCreateAccountId(accountId)}
                onEditTransaction={(tx) => setSelectedTransaction(tx)}
              />
            </SectionState>
            <StyledRightColumn>
              <SectionState
                testId="month-section-breakdown"
                isLoading={monthLoading}
                error={monthError}
                skeleton={<MonthBreakdownSkeleton />}
              >
                <MonthBreakdown
                  transactions={variableSpending}
                  categories={categories}
                />
              </SectionState>
              {/* No `error` here: the card words its own failure, so handing it to
              the wrapper would say the same thing twice. */}
              <SectionState
                testId="month-section-comparison"
                isLoading={yearComparisonLoading}
                skeleton={<YearComparisonSkeleton monthLabel={monthLabel} />}
              >
                <YearComparison
                  monthLabel={monthLabel}
                  rows={yearComparisonRows}
                  categories={categories}
                  error={yearComparisonError}
                />
              </SectionState>
            </StyledRightColumn>
          </StyledColumns>
        </StyledMonthContent>
      </FadeSwap>

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
