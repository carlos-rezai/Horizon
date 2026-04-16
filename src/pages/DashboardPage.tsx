import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccounts } from "../features/accounts/useAccounts";
import { useProjection } from "../features/projection/useProjection";
import { useMilestones } from "../features/milestones/useMilestones";
import AccountOverview from "../features/accounts/AccountOverview/AccountOverview";
import AccountCreateModal from "../features/accounts/AccountCreateModal/AccountCreateModal";
import MortgageCountdown from "../features/mortgage/MortgageCountdown/MortgageCountdown";
import MilestoneTracker from "../features/milestones/MilestoneTracker/MilestoneTracker";
import Spinner from "../primitives/Spinner/Spinner";
import Heading from "../primitives/Heading/Heading";
import Text from "../primitives/Text/Text";
import Button from "../primitives/Button/Button";
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
    return <Spinner />;
  if (accountsError) return <Text>{`Error: ${accountsError}`}</Text>;
  if (projectionError) return <Text>{`Error: ${projectionError}`}</Text>;
  if (milestonesError) return <Text>{`Error: ${milestonesError}`}</Text>;

  const totalLiquid = computeTotalLiquid(accounts);

  return (
    <div>
      <Heading level={1}>Dashboard</Heading>
      <section>
        <Heading level={2}>Accounts</Heading>
        <Button onClick={() => setShowCreateModal(true)}>Add account</Button>
        <Text>Total Liquid: {formatBalance(totalLiquid)}</Text>
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
    </div>
  );
}
