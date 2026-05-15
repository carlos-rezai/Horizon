import { Home } from "lucide-react";
import type { AccountWithBalance } from "../../../types/account";
import type { MonthlySnapshot } from "../../../types/projection";
import { findMortgagePayoffMonth } from "../../../utils/projection";
import { formatBalance } from "../../../utils/format/format";
import {
  StyledSection,
  StyledCard,
  StyledAccountNameRow,
  StyledHeroAmount,
  StyledTimeLabel,
  StyledCountdownText,
  StyledProgressTrack,
  StyledProgressFill,
} from "./MortgageCountdown.styles";

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
  return `${years} ${yearLabel} ${months} ${monthLabel}`;
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
    <StyledSection>
      {mortgageAccounts.map((account) => {
        const payoffMonth = findMortgagePayoffMonth(snapshots, account.id);
        return (
          <StyledCard key={account.id}>
            <StyledAccountNameRow>
              <Home size={16} />
              {account.name}
            </StyledAccountNameRow>
            <StyledHeroAmount>
              {formatBalance(account.balance)}
            </StyledHeroAmount>
            {payoffMonth === null ? (
              <StyledCountdownText>
                Not paid off within 10-year horizon.
              </StyledCountdownText>
            ) : (
              <>
                <StyledTimeLabel>Time Remaining</StyledTimeLabel>
                <StyledCountdownText>
                  {computeTimeRemaining(now, payoffMonth)}
                </StyledCountdownText>
              </>
            )}
            <StyledProgressTrack
              role="progressbar"
              aria-valuenow={account.openingBalance - account.balance}
              aria-valuemax={account.openingBalance}
            >
              <StyledProgressFill
                $percent={
                  account.openingBalance > 0
                    ? Math.min(
                        100,
                        ((account.openingBalance - account.balance) /
                          account.openingBalance) *
                          100
                      )
                    : 0
                }
              />
            </StyledProgressTrack>
          </StyledCard>
        );
      })}
    </StyledSection>
  );
}
