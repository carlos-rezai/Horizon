import { useState } from "react";
import { useTheme } from "styled-components";
import { Pencil, Flag, Landmark } from "lucide-react";
import type { AccountWithBalance } from "../../../types/account";
import type { MonthlySnapshot } from "../../../types/projection";
import type { RecurringTransaction } from "../../../types/recurring";
import { findMortgagePayoffMonth } from "../../../utils/projection/projection";
import {
  percentPaidOff,
  hasRepaymentTransfer,
} from "../../../utils/mortgage/mortgage";
import { formatBalance, MONTHS } from "../../../utils/format/format";
import {
  currentMonth,
  monthsBetween,
} from "../../../utils/monthMath/monthMath";
import Card from "../../../components/Card/Card";
import SectionHead from "../../../components/SectionHead/SectionHead";
import EmptyState from "../../../components/EmptyState/EmptyState";
import ProgressBar from "../../../primitives/ProgressBar/ProgressBar";
import Button from "../../../primitives/Button/Button";
import MortgageModal from "../MortgageModal/MortgageModal";
import MortgageSetupModal from "../MortgageSetupModal/MortgageSetupModal";
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

interface Props {
  accounts: AccountWithBalance[];
  snapshots: MonthlySnapshot[];
  /** All recurring transactions — decides whether anything repays a mortgage. */
  recurringTransactions: RecurringTransaction[];
  /** Called after a mortgage is set up or its origination details are edited,
   *  to refetch data. */
  onUpdated?: () => void;
}

export default function MortgageCountdown({
  accounts,
  snapshots,
  recurringTransactions,
  onUpdated,
}: Props) {
  const theme = useTheme();
  const [editing, setEditing] = useState<AccountWithBalance | null>(null);
  const [settingUp, setSettingUp] = useState(false);

  const mortgageAccounts = accounts.filter((a) => a.kind === "Mortgage");
  if (mortgageAccounts.length === 0) {
    return (
      <StyledSection>
        <Card>
          <SectionHead label="Mortgage Countdown" />
          <EmptyState
            icon={<Landmark size={22} />}
            title="No mortgage yet"
            hint="Add your mortgage to see what's paid off and when it's done."
            action={
              <Button
                variant="primary"
                icon="Plus"
                onClick={() => setSettingUp(true)}
              >
                Set up mortgage
              </Button>
            }
          />
        </Card>
        {settingUp && (
          <MortgageSetupModal
            accounts={accounts}
            onClose={() => setSettingUp(false)}
            onSuccess={() => {
              setSettingUp(false);
              onUpdated?.();
            }}
          />
        )}
      </StyledSection>
    );
  }

  const now = currentMonth();

  return (
    <StyledSection>
      {mortgageAccounts.map((account) => {
        const payoffMonth = findMortgagePayoffMonth(snapshots, account.id);
        const hasRepayment = hasRepaymentTransfer(
          recurringTransactions,
          account.id
        );
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
          payoffLabel = `${MONTHS[pm - 1]} ${py}`;
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
              {MONTHS[sd.getMonth()]} {sd.getFullYear()}
              {account.termYears != null && (
                <>
                  {" "}
                  · year {yearInTerm} of {account.termYears}
                </>
              )}
            </StyledOriginLine>

            <StyledFooter>
              {!hasRepayment ? (
                <StyledNotPaidOff>
                  No repayment set up — add a recurring transfer into this
                  mortgage to see the payoff date.
                </StyledNotPaidOff>
              ) : payoffMonth ? (
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
