import React from "react";
import { Link } from "react-router-dom";
import {
  StyledTopBar,
  StyledWordmark,
  StyledNavLink,
  StyledMain,
  StyledContent,
} from "./AppLayout.styles";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <StyledTopBar>
        <StyledWordmark as={Link} to="/">
          Horizon
        </StyledWordmark>
        <StyledNavLink as={Link} to="/settings/storage">
          Settings
        </StyledNavLink>
      </StyledTopBar>
      <StyledMain>
        <StyledContent>{children}</StyledContent>
      </StyledMain>
    </>
  );
}
