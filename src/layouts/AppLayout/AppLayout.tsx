import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, TrendingUp, Settings } from "lucide-react";
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
            Outlook
          </StyledNavLink>
        </StyledNav>
        <StyledSpacer />
        <StyledNavLink as={NavLink} to="/settings/storage">
          <Settings size={16} />
          Settings
        </StyledNavLink>
      </StyledSidebar>
      <StyledMain>
        <StyledContent>{children}</StyledContent>
      </StyledMain>
    </StyledWrapper>
  );
}
