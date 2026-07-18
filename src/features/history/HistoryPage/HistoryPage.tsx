import { Clock, TriangleAlert } from "lucide-react";
import PageHeader from "../../../components/PageHeader/PageHeader";
import EmptyState from "../../../components/EmptyState/EmptyState";
import Spinner from "../../../primitives/Spinner/Spinner";
import { useAccounts } from "../../accounts/useAccounts";
import { useHistory } from "../useHistory";
import HistoryChart from "../HistoryChart/HistoryChart";
import YearArchive from "../YearArchive/YearArchive";
import { StyledPage, StyledCta } from "./HistoryPage.styles";

export default function HistoryPage() {
  const {
    points,
    years,
    statementCounts,
    isLoading: historyLoading,
    error: historyError,
  } = useHistory();
  const {
    accounts,
    isLoading: accountsLoading,
    error: accountsError,
  } = useAccounts();

  // Four explicit states, gated in order — loading, error, empty, content — so
  // a failed fetch can never fall through to the empty state and read as
  // "no imports" (the masquerade this composition closes). Mirrors DashboardPage.
  if (historyLoading || accountsLoading) return <Spinner />;

  const hasError = historyError !== null || accountsError !== null;
  const isEmpty = years.length === 0;

  return (
    <StyledPage>
      <PageHeader
        overline="Long-term view"
        title="History"
        subtitle="Browse reconstructed balances from your imported statements."
      />
      {hasError ? (
        <EmptyState
          icon={<TriangleAlert size={22} />}
          title="Couldn't load your history"
          hint="Something went wrong reconstructing your balances. Reopen this page to try again."
        />
      ) : isEmpty ? (
        <EmptyState
          icon={<Clock size={22} />}
          title="No history yet"
          hint="Import a bank statement to reconstruct past balances and see them here."
          action={<StyledCta to="/import">Go to Import</StyledCta>}
        />
      ) : (
        <>
          <HistoryChart points={points} accounts={accounts} isLoading={false} />
          <YearArchive
            points={points}
            years={years}
            statementCounts={statementCounts}
          />
        </>
      )}
    </StyledPage>
  );
}
