import type { AccountWithBalance } from "../../types/account";
import type { MonthlySnapshot } from "../../types/projection";
import { findMortgagePayoffMonth } from "../../utils/projection";
import { formatBalance } from "../../utils/format";

interface Props {
  accounts: AccountWithBalance[];
  snapshots: MonthlySnapshot[];
}

function computeTimeRemaining(fromMonth: string, toMonth: string): string {
  const [fromYear, fromMonthNum] = fromMonth.split("-").map(Number);
  const [toYear, toMonthNum] = toMonth.split("-").map(Number);
  const totalMonths = (toYear - fromYear) * 12 + (toMonthNum - fromMonthNum);
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const yearLabel = years === 1 ? "year" : "years";
  const monthLabel = months === 1 ? "month" : "months";
  return `${years} ${yearLabel} ${months} ${monthLabel} remaining`;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function MortgageCountdown({ accounts, snapshots }: Props) {
  const mortgageAccounts = accounts.filter((a) => a.kind === "Mortgage");

  if (mortgageAccounts.length === 0) {
    return null;
  }

  const now = currentMonth();

  return (
    <section>
      <h2>Mortgage Countdown</h2>
      {mortgageAccounts.map((account) => {
        const payoffMonth = findMortgagePayoffMonth(snapshots, account._id);
        return (
          <div key={account._id}>
            <h3>{account.name}</h3>
            <p>{formatBalance(account.balance)}</p>
            {payoffMonth === null ? (
              <p>Not paid off within 10-year horizon.</p>
            ) : (
              <p>{computeTimeRemaining(now, payoffMonth)}</p>
            )}
          </div>
        );
      })}
    </section>
  );
}
