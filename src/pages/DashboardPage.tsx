import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccounts } from "../features/accounts/useAccounts";
import { useProjection } from "../features/projection/useProjection";
import { useMilestones } from "../features/milestones/useMilestones";
import AccountOverview from "../features/accounts/AccountOverview/AccountOverview";
import AccountCreateModal from "../features/accounts/AccountCreateModal/AccountCreateModal";
import MortgageCountdown from "../features/mortgage/MortgageCountdown/MortgageCountdown";
import MilestoneTracker from "../features/milestones/MilestoneTracker/MilestoneTracker";
import { computeTotalLiquid } from "../utils/accounts";
import { formatBalance } from "../utils/format";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);

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
  const {
    milestones,
    isLoading: milestonesLoading,
    error: milestonesError,
    addMilestone,
    deleteMilestone,
  } = useMilestones();

  if (accountsLoading || projectionLoading || milestonesLoading)
    return <p>Loading…</p>;
  if (accountsError) return <p>Error: {accountsError}</p>;
  if (projectionError) return <p>Error: {projectionError}</p>;
  if (milestonesError) return <p>Error: {milestonesError}</p>;

  const totalLiquid = computeTotalLiquid(accounts);

  return (
    <main>
      <h1>Dashboard</h1>
      <section>
        <h2>Accounts</h2>
        <button onClick={() => setShowCreateModal(true)}>Add account</button>
        <p>Total Liquid: {formatBalance(totalLiquid)}</p>
        <AccountOverview accounts={accounts} />
      </section>
      {showCreateModal && (
        <AccountCreateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(accountId) => navigate(`/accounts/${accountId}`)}
        />
      )}
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
