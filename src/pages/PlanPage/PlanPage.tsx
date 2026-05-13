import { useLocation } from "react-router-dom";
import { useAccounts } from "../../features/accounts/useAccounts";
import { useProjection } from "../../features/projection/useProjection";
import { useAllRecurringTransactions } from "../../features/projection/useAllRecurringTransactions";
import { ProjectionAccordion } from "../../features/projection";
import TrajectoryHorizon from "../../features/projection/TrajectoryHorizon/TrajectoryHorizon";
import Card from "../../components/Card/Card";
import CardHeader from "../../components/CardHeader/CardHeader";
import PageHeader from "../../components/PageHeader/PageHeader";
import Spinner from "../../primitives/Spinner/Spinner";
import { StyledPlanPage, StyledErrorText } from "./PlanPage.styles";

export default function PlanPage() {
  const location = useLocation();
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

  const initialYear = location.state?.year as number | undefined;

  if (accountsLoading || projectionLoading) return <Spinner />;
  if (accountsError)
    return <StyledErrorText>{`Error: ${accountsError}`}</StyledErrorText>;
  if (projectionError)
    return <StyledErrorText>{`Error: ${projectionError}`}</StyledErrorText>;

  return (
    <StyledPlanPage>
      <PageHeader text="Financial Plan" />
      <CardHeader text="Trajectory Horizon" />
      <Card>
        <TrajectoryHorizon
          snapshots={snapshots}
          accounts={accounts}
          recurringTransactions={recurringTransactions}
          isLoading={projectionLoading}
        />
      </Card>
      <CardHeader text="Plan Detail" />
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
