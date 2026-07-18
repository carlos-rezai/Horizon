import { Clock } from "lucide-react";
import PageHeader from "../../../components/PageHeader/PageHeader";
import EmptyState from "../../../components/EmptyState/EmptyState";
import { useAccounts } from "../../accounts/useAccounts";
import { useHistory } from "../useHistory";
import HistoryChart from "../HistoryChart/HistoryChart";
import YearArchive from "../YearArchive/YearArchive";
import { StyledPage, StyledCta } from "./HistoryPage.styles";

export default function HistoryPage() {
  const { points, years, statementCounts, isLoading } = useHistory();
  const { accounts } = useAccounts();

  // Empty only once the fetches settle — otherwise the initial (still-loading)
  // render would flash the empty state before any imports are known.
  const isEmpty = !isLoading && years.length === 0;
  const hasHistory = years.length > 0;

  return (
    <StyledPage>
      <PageHeader
        overline="Long-term view"
        title="History"
        subtitle="Browse reconstructed balances from your imported statements."
      />
      {isEmpty && (
        <EmptyState
          icon={<Clock size={22} />}
          title="No history yet"
          hint="Import a bank statement to reconstruct past balances and see them here."
          action={<StyledCta to="/import">Go to Import</StyledCta>}
        />
      )}
      {hasHistory && (
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
