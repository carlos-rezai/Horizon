import { useState } from "react";
import { Clock, TriangleAlert } from "lucide-react";
import PageHeader from "../../../components/PageHeader/PageHeader";
import EmptyState from "../../../components/EmptyState/EmptyState";
import Spinner from "../../../primitives/Spinner/Spinner";
import { useAccounts } from "../../accounts/useAccounts/useAccounts";
import { useHistory } from "../useHistory/useHistory";
import HistoryChart from "../HistoryChart/HistoryChart";
import HistoryTrends from "../HistoryTrends/HistoryTrends";
import type { HistoryRange } from "../historyTypes/historyTypes";
import YearArchive from "../YearArchive/YearArchive";
import { StyledPage, StyledCta } from "./HistoryPage.styles";

export default function HistoryPage() {
  // One range for the page: the chart's chips drive the trends card too.
  const [range, setRange] = useState<HistoryRange>("all");
  const {
    points,
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
  const isEmpty = points.length === 0;

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
          hint="Import a bank statement or add your mortgage's origination to see your history"
          action={<StyledCta to="/import">Go to Import</StyledCta>}
        />
      ) : (
        <>
          <HistoryChart
            points={points}
            accounts={accounts}
            isLoading={false}
            range={range}
            onRangeChange={setRange}
          />
          <HistoryTrends points={points} range={range} isLoading={false} />
          <YearArchive points={points} statementCounts={statementCounts} />
        </>
      )}
    </StyledPage>
  );
}
