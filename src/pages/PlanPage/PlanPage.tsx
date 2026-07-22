import { useLocation } from "react-router-dom";
import { useAccounts } from "../../features/accounts/useAccounts";
import { useProjection } from "../../features/projection/useProjection";
import { ProjectionAccordion } from "../../features/projection";
import ProjectionAccordionSkeleton from "../../features/projection/ProjectionAccordion/ProjectionAccordionSkeleton";
import OutlookSummary from "../../features/projection/OutlookSummary/OutlookSummary";
import OutlookSummarySkeleton from "../../features/projection/OutlookSummary/OutlookSummarySkeleton";
import Card from "../../components/Card/Card";
import PageHeader from "../../components/PageHeader/PageHeader";
import SectionState from "../../components/SectionState/SectionState";
import { useSnackbar } from "../../components/SnackbarProvider/useSnackbar";
import Button from "../../primitives/Button/Button";
import { StyledPlanPage } from "./PlanPage.styles";

export default function PlanPage() {
  const location = useLocation();
  const { notify } = useSnackbar();
  const {
    accounts,
    isLoading: accountsLoading,
    error: accountsError,
  } = useAccounts();
  const {
    snapshots,
    isLoading: projectionLoading,
    error: projectionError,
    refetch,
  } = useProjection();

  const initialYear = location.state?.year as number | undefined;

  // Both sections read the projection through the accounts that own it, so
  // they share one gate. The page frame is never behind it: the header and the
  // card surfaces are up from the first frame, and each section fills in
  // behind its own skeleton rather than the whole view queuing on a spinner.
  const isLoading = accountsLoading || projectionLoading;
  const error = accountsError ?? projectionError;

  return (
    <StyledPlanPage>
      <PageHeader
        overline="Outlook"
        title="Financial Plan"
        subtitle="240-month projection · Recurring-Only Engine"
        actions={
          <Button
            variant="secondary"
            icon="RefreshCw"
            onClick={() => {
              refetch();
              notify("Recalculated", { variant: "success" });
            }}
          >
            Recalculate
          </Button>
        }
      />
      <SectionState
        testId="plan-section-outlook"
        isLoading={isLoading}
        error={error}
        skeleton={<OutlookSummarySkeleton />}
      >
        <OutlookSummary snapshots={snapshots} accounts={accounts} />
      </SectionState>
      <Card>
        <SectionState
          testId="plan-section-accordion"
          isLoading={isLoading}
          error={error}
          skeleton={<ProjectionAccordionSkeleton />}
        >
          <ProjectionAccordion
            snapshots={snapshots}
            accounts={accounts}
            initialYear={initialYear}
          />
        </SectionState>
      </Card>
    </StyledPlanPage>
  );
}
