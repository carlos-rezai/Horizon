import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccounts } from "../../features/accounts/useAccounts";
import { useProjection } from "../../features/projection/useProjection";
import { useAllRecurringTransactions } from "../../features/projection/useAllRecurringTransactions";
import PlanSummary from "../../features/projection/PlanSummary/PlanSummary";
import PlanSummarySkeleton from "../../features/projection/PlanSummary/PlanSummarySkeleton";
import KpiStrip from "../../features/projection/KpiStrip/KpiStrip";
import KpiStripSkeleton from "../../features/projection/KpiStrip/KpiStripSkeleton";
import TrajectoryHorizon from "../../features/projection/TrajectoryHorizon/TrajectoryHorizon";
import TrajectoryHorizonSkeleton from "../../features/projection/TrajectoryHorizon/TrajectoryHorizonSkeleton";
import AccountOverview from "../../features/accounts/AccountOverview/AccountOverview";
import AccountOverviewSkeleton from "../../features/accounts/AccountOverview/AccountOverviewSkeleton";
import AccountCreateModal from "../../features/accounts/AccountCreateModal/AccountCreateModal";
import MortgageCountdown from "../../features/mortgage/MortgageCountdown/MortgageCountdown";
import SavingsStreakCard from "../../features/savings/SavingsStreakCard/SavingsStreakCard";
import SavingsStreakCardSkeleton from "../../features/savings/SavingsStreakCard/SavingsStreakCardSkeleton";
import { useSavingsGoal } from "../../features/savings/useSavingsGoal";
import Card from "../../components/Card/Card";
import PageHeader from "../../components/PageHeader/PageHeader";
import SectionHead from "../../components/SectionHead/SectionHead";
import SectionState from "../../components/SectionState/SectionState";
import { useSnackbar } from "../../components/SnackbarProvider/useSnackbar";
import Button from "../../primitives/Button/Button";
import { downloadBackup } from "../../features/settings/downloadBackup";
import {
  StyledDashboard,
  StyledGrid,
  StyledColumn,
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
  const {
    goal: savingsGoal,
    points: savingsPoints,
    isLoading: savingsLoading,
    save: saveSavingsGoal,
  } = useSavingsGoal();

  // Each section waits only on the resources it draws from, so the whole page
  // never queues behind its slowest request. Recurring transactions only
  // enrich the chart and the plan (Sondertilgung markers), so neither section
  // holds its reveal for them.
  const projectionBackedLoading = accountsLoading || projectionLoading;
  const projectionBackedError = accountsError ?? projectionError;

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
      <SectionState
        testId="dashboard-section-kpis"
        isLoading={projectionBackedLoading}
        error={projectionBackedError}
        skeleton={<KpiStripSkeleton />}
      >
        <KpiStrip snapshots={snapshots} accounts={accounts} />
      </SectionState>
      <SectionState
        testId="dashboard-section-trajectory"
        isLoading={projectionBackedLoading}
        error={projectionBackedError}
        skeleton={<TrajectoryHorizonSkeleton />}
      >
        <TrajectoryHorizon
          snapshots={snapshots}
          accounts={accounts}
          recurringTransactions={recurringTransactions}
          isLoading={false}
          onViewHistory={() => navigate("/history")}
        />
      </SectionState>
      <SectionState
        testId="dashboard-section-savings"
        isLoading={savingsLoading}
        error={accountsError}
        skeleton={<SavingsStreakCardSkeleton />}
      >
        <SavingsStreakCard
          goal={savingsGoal}
          accounts={accounts}
          points={savingsPoints}
          onSave={saveSavingsGoal}
        />
      </SectionState>
      <StyledGrid>
        <div>
          <Card>
            <SectionHead
              label="Accounts"
              title="Accounts"
              right={
                <Button
                  variant="secondary"
                  size="sm"
                  icon="Plus"
                  onClick={() => setShowCreateModal(true)}
                >
                  Account
                </Button>
              }
            />
            <SectionState
              testId="dashboard-section-accounts"
              isLoading={accountsLoading}
              error={accountsError}
              skeleton={<AccountOverviewSkeleton />}
            >
              <AccountOverview accounts={accounts} />
            </SectionState>
          </Card>
          {showCreateModal && (
            <AccountCreateModal
              onClose={() => setShowCreateModal(false)}
              onSuccess={(accountId) => navigate(`/accounts/${accountId}`)}
              girokontoAccounts={accounts.filter((a) => a.kind === "Girokonto")}
            />
          )}
        </div>
        <StyledColumn>
          <MortgageCountdown
            accounts={accounts}
            snapshots={snapshots}
            onUpdated={() => {
              refreshAccounts();
              refetchProjection();
            }}
          />
          <Card>
            <SectionState
              testId="dashboard-section-plan"
              isLoading={projectionLoading}
              error={projectionError}
              skeleton={<PlanSummarySkeleton />}
            >
              <PlanSummary
                snapshots={snapshots}
                accounts={accounts}
                recurringTransactions={recurringTransactions}
                maxYears={10}
              />
            </SectionState>
          </Card>
        </StyledColumn>
      </StyledGrid>
    </StyledDashboard>
  );
}
