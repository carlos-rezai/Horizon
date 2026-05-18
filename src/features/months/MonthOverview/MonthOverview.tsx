import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { AccountWithBalance } from "../../../types/account";
import Button from "../../../primitives/Button/Button";
import {
  StyledMonthOverview,
  StyledTabList,
  StyledTab,
} from "./MonthOverview.styles";

interface Props {
  accounts: AccountWithBalance[];
}

export default function MonthOverview({ accounts }: Props) {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <StyledMonthOverview>
      <Button aria-label="Back" onClick={() => navigate(-1)}>
        Back
      </Button>
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
