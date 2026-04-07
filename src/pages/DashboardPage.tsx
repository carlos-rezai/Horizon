import { useAccounts } from "../hooks/useAccounts";
import { useProjection } from "../hooks/useProjection";
import AccountOverview from "../features/accounts/AccountOverview";
import MortgageCountdown from "../features/mortgage/MortgageCountdown";
import { computeTotalLiquid } from "../utils/accounts";

function formatBalance(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default function DashboardPage() {
  const {
    accounts,
    isLoading: accountsLoading,
    error: accountsError,
  } = useAccounts();
  const {
    snapshots,
    isLoading: projectionLoading,
    error: projectionError,
  } = useProjection();

  if (accountsLoading || projectionLoading) return <p>Loading…</p>;
  if (accountsError) return <p>Error: {accountsError}</p>;
  if (projectionError) return <p>Error: {projectionError}</p>;

  const totalLiquid = computeTotalLiquid(accounts);

  return (
    <main>
      <h1>Dashboard</h1>
      <section>
        <h2>Accounts</h2>
        <p>Total Liquid: {formatBalance(totalLiquid)}</p>
        <AccountOverview accounts={accounts} />
      </section>
      <MortgageCountdown accounts={accounts} snapshots={snapshots} />
    </main>
  );
}
