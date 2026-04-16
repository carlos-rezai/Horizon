import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  StyledTopBar,
  StyledWordmark,
  StyledBackButton,
  StyledMain,
  StyledContent,
} from "./AppLayout.styles";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname === "/";

  return (
    <>
      <StyledTopBar>
        {!isDashboard && (
          <StyledBackButton aria-label="Go back" onClick={() => navigate("/")}>
            <ArrowLeft size={20} />
          </StyledBackButton>
        )}
        <StyledWordmark>Horizon</StyledWordmark>
      </StyledTopBar>
      <StyledMain>
        <StyledContent>{children}</StyledContent>
      </StyledMain>
    </>
  );
}
