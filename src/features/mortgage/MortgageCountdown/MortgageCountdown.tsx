import { useState } from "react";
import { useTheme } from "styled-components";
import { Pencil, Flag } from "lucide-react";
import type { AccountWithBalance } from "../../../types/account";
import type { MonthlySnapshot } from "../../../types/projection";
import { findMortgagePayoffMonth } from "../../../utils/projection/projection";
import { percentPaidOff } from "../../../utils/mortgage/mortgage";
import { formatBalance } from "../../../utils/format/format";
import Card from "../../../components/Card/Card";
import SectionHead from "../../../components/SectionHead/SectionHead";
import ProgressBar from "../../../primitives/ProgressBar/ProgressBar";
import MortgageModal from "../MortgageModal/MortgageModal";
import {
  StyledSection,
  StyledEditButton,
  StyledHeroAmount,
  StyledSubtext,
  StyledRow,
  StyledPaidLabel,
  StyledPaidPct,
  StyledOriginLine,
  StyledMono,
  StyledFooter,
  StyledToPayoffLabel,
  StyledToPayoff,
  StyledToPayoffNum,
  StyledToPayoffUnit,
  StyledFlagDate,
  StyledNotPaidOff,
} from "./MortgageCountdown.styles";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Whole months from one ISO `YYYY-MM` to another (may be negative). */
function monthsBetween(fromMonth: string, toMonth: string): number {
  const [fy, fm] = fromMonth.split("-").map(Number);
  const [ty, tm] = toMonth.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

interface Props {
  accounts: AccountWithBalance[];
  snapshots: MonthlySnapshot[];
  /** Called after a mortgage's origination details are edited, to refetch data. */
  onUpdated?: () => void;
}

export default function MortgageCountdown({
  accounts,
  snapshots,
  onUpdated,
}: Props) {
  const theme = useTheme();
  const [editing, setEditing] = useState<AccountWithBalance | null>(null);

  const mortgageAccounts = accounts.filter((a) => a.kind === "Mortgage");
  if (mortgageAccounts.length === 0) {
    return null;
  }

  const now = currentMonth();

  return (
    <StyledSection>
      {mortgageAccounts.map((account) => {
        const payoffMonth = findMortgagePayoffMonth(snapshots, account.id);
        const start = account.originalPrincipal ?? account.openingBalance;
        const pct = percentPaidOff(start, account.balance);
        const sd = new Date(account.startDate ?? account.openingDate);
        const startMonthIso = `${sd.getFullYear()}-${String(
          sd.getMonth() + 1
        ).padStart(2, "0")}`;
        const yearInTerm =
          Math.floor(Math.max(0, monthsBetween(startMonthIso, now)) / 12) + 1;

        let years = 0;
        let months = 0;
        let payoffLabel = "";
        if (payoffMonth) {
          const total = Math.max(0, monthsBetween(now, payoffMonth));
          years = Math.floor(total / 12);
          months = total % 12;
          const [py, pm] = payoffMonth.split("-").map(Number);
          payoffLabel = `${MONTHS_SHORT[pm - 1]} ${py}`;
        }

        return (
          <Card key={account.id}>
            <SectionHead
              label="Mortgage Countdown"
              title={account.name}
              right={
                <StyledEditButton
                  type="button"
                  aria-label="Edit mortgage details"
                  onClick={() => setEditing(account)}
                >
                  <Pencil size={16} />
                </StyledEditButton>
              }
            />

            <StyledHeroAmount>
              {formatBalance(account.balance)}
            </StyledHeroAmount>
            <StyledSubtext>remaining Restschuld</StyledSubtext>

            <StyledRow>
              <StyledPaidLabel>Paid off</StyledPaidLabel>
              <StyledPaidPct>{pct.toFixed(0)}%</StyledPaidPct>
            </StyledRow>
            <ProgressBar value={pct} color={theme.colors.primary} />
            <StyledOriginLine>
              of <StyledMono>{formatBalance(start)}</StyledMono> · started{" "}
              {MONTHS_SHORT[sd.getMonth()]} {sd.getFullYear()}
              {account.termYears != null && (
                <>
                  {" "}
                  · year {yearInTerm} of {account.termYears}
                </>
              )}
            </StyledOriginLine>

            <StyledFooter>
              {payoffMonth ? (
                <>
                  <div>
                    <StyledToPayoffLabel>To Payoff</StyledToPayoffLabel>
                    <StyledToPayoff>
                      <StyledToPayoffNum>{years}</StyledToPayoffNum>
                      <StyledToPayoffUnit>yr</StyledToPayoffUnit>
                      <StyledToPayoffNum>{months}</StyledToPayoffNum>
                      <StyledToPayoffUnit>mo</StyledToPayoffUnit>
                    </StyledToPayoff>
                  </div>
                  <StyledFlagDate>
                    <Flag size={13} />
                    {payoffLabel}
                  </StyledFlagDate>
                </>
              ) : (
                <StyledNotPaidOff>
                  Not paid off within 10-year horizon.
                </StyledNotPaidOff>
              )}
            </StyledFooter>
          </Card>
        );
      })}

      {editing && (
        <MortgageModal
          account={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            onUpdated?.();
          }}
        />
      )}
    </StyledSection>
  );
}
