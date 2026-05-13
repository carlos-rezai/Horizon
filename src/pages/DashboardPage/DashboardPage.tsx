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
import PageHeader from "../../components/PageHeader/PageHeader";
import Spinner from "../../primitives/Spinner/Spinner";
import Heading from "../../primitives/Heading/Heading";
import Button from "../../primitives/Button/Button";
import { computeTotalLiquid } from "../../utils/accounts";
import { formatBalance } from "../../utils/format";
import {
  StyledDashboard,
  StyledGrid,
  StyledSection,
  StyledAccountsHeader,
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
      <PageHeader text="Dashboard" />
      <StyledGrid>
        <StyledSection $gridArea="trajectory">
          <Card>
            <TrajectoryHorizon
              snapshots={snapshots}
              accounts={accounts}
              recurringTransactions={recurringTransactions}
              isLoading={projectionLoading}
            />
          </Card>
        </StyledSection>
        <StyledSection $gridArea="accounts">
          <StyledAccountsHeader>
            <Button onClick={() => setShowCreateModal(true)}>
              Add account
            </Button>
            <Heading level={2}>Accounts Summary</Heading>
            <span>Total Liquid: {formatBalance(totalLiquid)}</span>
          </StyledAccountsHeader>
          <AccountOverview accounts={accounts} />
          {showCreateModal && (
            <AccountCreateModal
              onClose={() => setShowCreateModal(false)}
              onSuccess={(accountId) => navigate(`/accounts/${accountId}`)}
            />
          )}
        </StyledSection>
        <StyledSection $gridArea="plan">
          <Card>
            <PlanSummary
              snapshots={snapshots}
              accounts={accounts}
              recurringTransactions={recurringTransactions}
              maxYears={10}
            />
          </Card>
        </StyledSection>
        <StyledSection $gridArea="mortgage-countdown">
          <MortgageCountdown accounts={accounts} snapshots={snapshots} />
        </StyledSection>
      </StyledGrid>
    </StyledDashboard>
  );
}
