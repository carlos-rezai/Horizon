import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccounts } from "../../features/accounts/useAccounts";
import { useProjection } from "../../features/projection/useProjection";
import { useAllRecurringTransactions } from "../../features/projection/useAllRecurringTransactions";
import PlanSummary from "../../features/projection/PlanSummary/PlanSummary";
import KpiStrip from "../../features/projection/KpiStrip/KpiStrip";
import TrajectoryHorizon from "../../features/projection/TrajectoryHorizon/TrajectoryHorizon";
import AccountOverview from "../../features/accounts/AccountOverview/AccountOverview";
import AccountCreateModal from "../../features/accounts/AccountCreateModal/AccountCreateModal";
import MortgageCountdown from "../../features/mortgage/MortgageCountdown/MortgageCountdown";
import Card from "../../components/Card/Card";
import CardHeader from "../../components/CardHeader/CardHeader";
import PageHeader from "../../components/PageHeader/PageHeader";
import SectionHead from "../../components/SectionHead/SectionHead";
import { useSnackbar } from "../../components/SnackbarProvider/useSnackbar";
import Spinner from "../../primitives/Spinner/Spinner";
import Button from "../../primitives/Button/Button";
import { downloadBackup } from "../../features/settings/downloadBackup";
import {
  StyledDashboard,
  StyledGrid,
  StyledSection,
  StyledErrorText,
} from "./DashboardPage.styles";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { notify } = useSnackbar();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleBackup = async () => {
    try {
      await downloadBackup();
      notify("Backup saved", { variant: "success" });
    } catch {
      notify("Backup failed", { variant: "error" });
    }
  };

  const {
    accounts,
    isLoading: accountsLoading,
    error: accountsError,
    refresh: refreshAccounts,
  } = useAccounts();
  const {
    snapshots,
    isLoading: projectionLoading,
    error: projectionError,
    refetch: refetchProjection,
  } = useProjection();
  const { recurringTransactions } = useAllRecurringTransactions();

  if (accountsLoading || projectionLoading) return <Spinner />;
  if (accountsError)
    return <StyledErrorText>{`Error: ${accountsError}`}</StyledErrorText>;
  if (projectionError)
    return <StyledErrorText>{`Error: ${projectionError}`}</StyledErrorText>;

  return (
    <StyledDashboard>
      <PageHeader
        overline="Overview"
        title="Dashboard"
        subtitle="Your financial horizon at a glance"
        actions={
          <>
            <Button
              variant="secondary"
              icon="Download"
              onClick={() => void handleBackup()}
            >
              Backup
            </Button>
            <Button
              variant="primary"
              icon="Plus"
              onClick={() => setShowCreateModal(true)}
            >
              Add account
            </Button>
          </>
        }
      />
      <KpiStrip snapshots={snapshots} accounts={accounts} />
      <TrajectoryHorizon
        snapshots={snapshots}
        accounts={accounts}
        recurringTransactions={recurringTransactions}
        isLoading={false}
      />
      <StyledGrid>
        <StyledSection $gridArea="accounts">
          <Card>
            <SectionHead label="Accounts" title="Accounts" />
            <AccountOverview accounts={accounts} />
          </Card>
          {showCreateModal && (
            <AccountCreateModal
              onClose={() => setShowCreateModal(false)}
              onSuccess={(accountId) => navigate(`/accounts/${accountId}`)}
              girokontoAccounts={accounts.filter((a) => a.kind === "Girokonto")}
            />
          )}
        </StyledSection>
        <StyledSection $gridArea="plan">
          <CardHeader text="Plan Overview" />
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
          <MortgageCountdown
            accounts={accounts}
            snapshots={snapshots}
            onUpdated={() => {
              refreshAccounts();
              refetchProjection();
            }}
          />
        </StyledSection>
      </StyledGrid>
    </StyledDashboard>
  );
}
