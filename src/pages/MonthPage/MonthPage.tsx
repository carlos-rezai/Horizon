import { useParams } from "react-router-dom";
import MonthOverview from "../../features/months/MonthOverview/MonthOverview";
import { useAccounts } from "../../features/accounts/useAccounts";
import { useProjection } from "../../features/projection/useProjection";

export default function MonthPage() {
  const { month } = useParams<{ month: string }>();
  const { accounts } = useAccounts();
  const { snapshots } = useProjection();

  if (!month) return null;

  return <MonthOverview accounts={accounts} snapshots={snapshots} />;
}
