import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { AccountWithBalance } from "../../../types/account";
import type { MonthlySnapshot } from "../../../types/projection";
import { formatBalance } from "../../../utils/format/format";
import Button from "../../../primitives/Button/Button";
import {
  StyledMonthOverview,
  StyledBalanceSummaryBar,
  StyledBalanceSummaryItem,
  StyledBalanceLabel,
  StyledBalanceValue,
  StyledTabList,
  StyledTab,
} from "./MonthOverview.styles";

interface Props {
  accounts: AccountWithBalance[];
  snapshots?: MonthlySnapshot[];
}

export default function MonthOverview({ accounts, snapshots = [] }: Props) {
  const navigate = useNavigate();
  const { month } = useParams<{ month: string }>();
  const [activeIndex, setActiveIndex] = useState(0);

  const snapshot = snapshots.find((s) => s.month === month);

  return (
    <StyledMonthOverview>
      <Button aria-label="Back" onClick={() => navigate(-1)}>
        Back
      </Button>
      {snapshot && (
        <StyledBalanceSummaryBar>
          {accounts.map((account) => {
            const entry = snapshot.accounts[account.id];
            const balance =
              entry !== undefined ? (entry.actual ?? entry.projected) : null;
            return (
              <StyledBalanceSummaryItem key={account.id}>
                <StyledBalanceLabel>{account.name}</StyledBalanceLabel>
                <StyledBalanceValue>
                  {balance !== null ? formatBalance(balance) : "—"}
                </StyledBalanceValue>
              </StyledBalanceSummaryItem>
            );
          })}
        </StyledBalanceSummaryBar>
      )}
      <StyledTabList role="tablist">
        {accounts.map((account, index) => (
          <StyledTab
            key={account.id}
            role="tab"
            aria-selected={index === activeIndex}
            $isActive={index === activeIndex}
            onClick={() => setActiveIndex(index)}
          >
            {account.name}
          </StyledTab>
        ))}
      </StyledTabList>
    </StyledMonthOverview>
  );
}
