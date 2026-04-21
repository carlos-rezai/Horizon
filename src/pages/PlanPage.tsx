import { useLocation } from "react-router-dom";
import { useAccounts } from "../features/accounts/useAccounts";
import { useProjection } from "../features/projection/useProjection";
import { useAllRecurringTransactions } from "../features/projection/useAllRecurringTransactions";
import { ProjectionAccordion } from "../features/projection";
import TrajectoryHorizon from "../features/projection/TrajectoryHorizon/TrajectoryHorizon";
import Spinner from "../primitives/Spinner/Spinner";
import Heading from "../primitives/Heading/Heading";
import Text from "../primitives/Text/Text";

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
  if (accountsError) return <Text>{`Error: ${accountsError}`}</Text>;
  if (projectionError) return <Text>{`Error: ${projectionError}`}</Text>;

  return (
    <div>
      <Heading level={1}>Financial Plan</Heading>
      <TrajectoryHorizon
        snapshots={snapshots}
        accounts={accounts}
        recurringTransactions={recurringTransactions}
        isLoading={projectionLoading}
      />
      <ProjectionAccordion
        snapshots={snapshots}
        accounts={accounts}
        initialYear={initialYear}
      />
    </div>
  );
}
