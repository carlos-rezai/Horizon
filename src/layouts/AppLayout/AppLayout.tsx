import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
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
            Dashboard
          </StyledNavLink>
          <StyledNavLink as={NavLink} to="/plan">
            Outlook
          </StyledNavLink>
        </StyledNav>
        <StyledSpacer />
        <StyledNavLink as={NavLink} to="/settings/storage">
          Settings
        </StyledNavLink>
      </StyledSidebar>
      <StyledMain>
        <StyledContent>{children}</StyledContent>
      </StyledMain>
    </StyledWrapper>
  );
}
