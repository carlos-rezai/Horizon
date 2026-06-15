import { useLocation } from "react-router-dom";
import { useAccounts } from "../../features/accounts/useAccounts";
import { useProjection } from "../../features/projection/useProjection";
import { ProjectionAccordion } from "../../features/projection";
import OutlookSummary from "../../features/projection/OutlookSummary/OutlookSummary";
import Card from "../../components/Card/Card";
import PageHeader from "../../components/PageHeader/PageHeader";
import { useSnackbar } from "../../components/SnackbarProvider/useSnackbar";
import Button from "../../primitives/Button/Button";
import Spinner from "../../primitives/Spinner/Spinner";
import { StyledPlanPage, StyledErrorText } from "./PlanPage.styles";

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

  if (accountsLoading || projectionLoading) return <Spinner />;
  if (accountsError)
    return <StyledErrorText>{`Error: ${accountsError}`}</StyledErrorText>;
  if (projectionError)
    return <StyledErrorText>{`Error: ${projectionError}`}</StyledErrorText>;

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
      <OutlookSummary snapshots={snapshots} accounts={accounts} />
      <Card>
        <ProjectionAccordion
          snapshots={snapshots}
          accounts={accounts}
          initialYear={initialYear}
        />
      </Card>
    </StyledPlanPage>
  );
}
