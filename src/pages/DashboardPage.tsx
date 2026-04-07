import { useAccounts } from "../hooks/useAccounts";
import AccountOverview from "../features/accounts/AccountOverview";
import { computeTotalLiquid } from "../utils/accounts";

function formatBalance(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default function DashboardPage() {
  const { accounts, isLoading, error } = useAccounts();

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Error: {error}</p>;

  const totalLiquid = computeTotalLiquid(accounts);

  return (
    <main>
      <h1>Dashboard</h1>
      <section>
        <h2>Accounts</h2>
        <p>Total Liquid: {formatBalance(totalLiquid)}</p>
        <AccountOverview accounts={accounts} />
      </section>
    </main>
  );
}
