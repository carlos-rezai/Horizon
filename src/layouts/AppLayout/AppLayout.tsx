import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, TrendingUp, Settings } from "lucide-react";
import UpdateBanner from "../../features/updates/UpdateBanner/UpdateBanner";
import {
  useSettlementWarnings,
  InsufficientFundsWarnings,
} from "../../features/settlements";
import Clock from "../../components/Clock/Clock";
import {
  StyledWrapper,
  StyledSidebar,
  StyledWordmark,
  StyledNav,
  StyledNavLink,
  StyledSpacer,
  StyledMain,
  StyledContent,
} from "./AppLayout.styles";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const warnings = useSettlementWarnings();

  return (
    <StyledWrapper>
      <StyledSidebar>
        <StyledWordmark>Horizon</StyledWordmark>
        <StyledNav>
          <StyledNavLink as={NavLink} to="/" end>
            <LayoutDashboard size={16} />
            Dashboard
          </StyledNavLink>
          <StyledNavLink as={NavLink} to="/plan">
            <TrendingUp size={16} />
            Financial Plan
          </StyledNavLink>
        </StyledNav>
        <StyledSpacer />
        <Clock />
        <StyledNavLink as={NavLink} to="/settings/storage">
          <Settings size={16} />
          Settings
        </StyledNavLink>
      </StyledSidebar>
      <StyledMain>
        <StyledContent>{children}</StyledContent>
      </StyledMain>
      <UpdateBanner />
      <InsufficientFundsWarnings warnings={warnings} />
    </StyledWrapper>
  );
}
