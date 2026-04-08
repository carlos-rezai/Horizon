import { useAccounts } from "../hooks/useAccounts";
import { useProjection } from "../features/projection/useProjection";
import { useMilestones } from "../hooks/useMilestones";
import AccountOverview from "../features/accounts/AccountOverview";
import MortgageCountdown from "../features/mortgage/MortgageCountdown";
import MilestoneTracker from "../features/milestones/MilestoneTracker";
import { computeTotalLiquid } from "../utils/accounts";
import { formatBalance } from "../utils/format";

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
  const { milestones, addMilestone, deleteMilestone } = useMilestones();

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
      <MilestoneTracker
        milestones={milestones}
        accounts={accounts}
        snapshots={snapshots}
        onAdd={addMilestone}
        onDelete={deleteMilestone}
      />
    </main>
  );
}
