import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccounts } from "../../features/accounts/useAccounts";
import { useProjection } from "../../features/projection/useProjection";
import { useAllRecurringTransactions } from "../../features/projection/useAllRecurringTransactions";
import PlanSummary from "../../features/projection/PlanSummary/PlanSummary";
import AccountOverview from "../../features/accounts/AccountOverview/AccountOverview";
import AccountCreateModal from "../../features/accounts/AccountCreateModal/AccountCreateModal";
import MortgageCountdown from "../../features/mortgage/MortgageCountdown/MortgageCountdown";
import TrajectoryHorizon from "../../features/projection/TrajectoryHorizon/TrajectoryHorizon";
import Card from "../../components/Card/Card";
import Spinner from "../../primitives/Spinner/Spinner";
import Heading from "../../primitives/Heading/Heading";
import Button from "../../primitives/Button/Button";
import { computeTotalLiquid } from "../../utils/accounts";
import { formatBalance } from "../../utils/format";
import {
  StyledDashboard,
  StyledSection,
  StyledErrorText,
} from "./DashboardPage.styles";

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
  const { recurringTransactions } = useAllRecurringTransactions();

  if (accountsLoading || projectionLoading) return <Spinner />;
  if (accountsError)
    return <StyledErrorText>{`Error: ${accountsError}`}</StyledErrorText>;
  if (projectionError)
    return <StyledErrorText>{`Error: ${projectionError}`}</StyledErrorText>;

  const totalLiquid = computeTotalLiquid(accounts);

  return (
    <StyledDashboard>
      <StyledSection>
        <Card>
          <Heading level={1}>Dashboard</Heading>
          <Heading level={2}>Accounts</Heading>
          <Button onClick={() => setShowCreateModal(true)}>Add account</Button>
          <span>Total Liquid: {formatBalance(totalLiquid)}</span>
          <AccountOverview accounts={accounts} />
          {showCreateModal && (
            <AccountCreateModal
              onClose={() => setShowCreateModal(false)}
              onSuccess={(accountId) => navigate(`/accounts/${accountId}`)}
            />
          )}
        </Card>
      </StyledSection>
      <StyledSection>
        <Card>
          <MortgageCountdown accounts={accounts} snapshots={snapshots} />
        </Card>
      </StyledSection>
      <StyledSection>
        <Card>
          <PlanSummary
            snapshots={snapshots}
            accounts={accounts}
            recurringTransactions={recurringTransactions}
            maxYears={10}
          />
        </Card>
      </StyledSection>
      <StyledSection>
        <Card>
          <TrajectoryHorizon
            snapshots={snapshots}
            accounts={accounts}
            recurringTransactions={recurringTransactions}
            isLoading={projectionLoading}
          />
        </Card>
      </StyledSection>
    </StyledDashboard>
  );
}
