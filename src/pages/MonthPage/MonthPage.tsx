import { useParams } from "react-router-dom";
import MonthOverview from "../../features/months/MonthOverview/MonthOverview";
import { useAccounts } from "../../features/accounts/useAccounts";

export default function MonthPage() {
  const { month } = useParams<{ month: string }>();
  const { accounts } = useAccounts();

  if (!month) return null;

  return <MonthOverview accounts={accounts} />;
}
