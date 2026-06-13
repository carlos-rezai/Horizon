import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  Calendar,
  Upload,
  Settings,
} from "lucide-react";
import UpdateBanner from "../../features/updates/UpdateBanner/UpdateBanner";
import {
  useSettlementWarnings,
  InsufficientFundsWarnings,
} from "../../features/settlements";
import Clock from "../../components/Clock/Clock";
import SnackbarProvider from "../../components/SnackbarProvider/SnackbarProvider";
import {
  StyledWrapper,
  StyledSidebar,
  StyledBrand,
  StyledBrandMark,
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

// The Month nav always points at the current calendar month.
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const warnings = useSettlementWarnings();
  const { pathname } = useLocation();

  return (
    <SnackbarProvider>
      <StyledWrapper>
        <StyledSidebar>
          <StyledBrand>
            <StyledBrandMark
              width={30}
              height={30}
              viewBox="0 0 30 30"
              role="img"
              aria-label="Horizon"
            >
              <circle
                className="ring"
                cx="15"
                cy="15"
                r="13.5"
                fill="none"
                strokeWidth="1.5"
              />
              <path
                className="arc"
                d="M3 18 Q15 9 27 18"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle className="sun" cx="22.5" cy="11" r="2.6" />
            </StyledBrandMark>
            <StyledWordmark>HORIZON</StyledWordmark>
          </StyledBrand>
          <StyledNav>
            <StyledNavLink
              as={Link}
              to="/"
              aria-current={pathname === "/" ? "page" : undefined}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </StyledNavLink>
            <StyledNavLink
              as={Link}
              to="/plan"
              aria-current={pathname === "/plan" ? "page" : undefined}
            >
              <TrendingUp size={16} />
              Outlook
            </StyledNavLink>
            <StyledNavLink
              as={Link}
              to={`/months/${currentMonth()}`}
              aria-current={
                pathname.startsWith("/months/") ? "page" : undefined
              }
            >
              <Calendar size={16} />
              Month
            </StyledNavLink>
            <StyledNavLink
              as={Link}
              to="/import"
              aria-current={pathname === "/import" ? "page" : undefined}
            >
              <Upload size={16} />
              Import
            </StyledNavLink>
          </StyledNav>
          <StyledSpacer />
          <Clock />
          <StyledNavLink
            as={Link}
            to="/settings/storage"
            aria-current={pathname.startsWith("/settings") ? "page" : undefined}
          >
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
    </SnackbarProvider>
  );
}
