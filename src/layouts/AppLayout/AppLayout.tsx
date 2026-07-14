import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  Calendar,
  Clock as ClockIcon,
  Upload,
  Settings,
} from "lucide-react";
import UpdateBanner from "../../features/updates/UpdateBanner/UpdateBanner";
import {
  useSettlementWarnings,
  InsufficientFundsWarnings,
} from "../../features/settlements";
import { useMenuDialogs } from "../../features/menu/useMenuDialogs";
import Clock from "../../components/Clock/Clock";
import BrandMark from "../../components/BrandMark/BrandMark";
import SnackbarProvider from "../../components/SnackbarProvider/SnackbarProvider";
import AlertProvider from "../../components/AlertProvider/AlertProvider";
import ConfirmProvider from "../../components/ConfirmProvider/ConfirmProvider";
import {
  StyledWrapper,
  StyledSidebar,
  StyledBrand,
  StyledWordmark,
  StyledNavLabel,
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
  return (
    <SnackbarProvider>
      <AlertProvider>
        <ConfirmProvider>
          <AppLayoutContent>{children}</AppLayoutContent>
        </ConfirmProvider>
      </AlertProvider>
    </SnackbarProvider>
  );
}

// The chrome plus the dialog hosts. Split out so it renders inside the Snackbar,
// Alert, and Confirm providers, which the menu dialog host and update banner
// both depend on.
function AppLayoutContent({ children }: AppLayoutProps) {
  const warnings = useSettlementWarnings();
  const { pathname } = useLocation();
  useMenuDialogs();

  return (
    <StyledWrapper>
      <StyledSidebar>
        <StyledBrand>
          <BrandMark size={30} label="Horizon" />
          <StyledWordmark>HORIZON</StyledWordmark>
        </StyledBrand>
        <StyledNavLabel>Navigation</StyledNavLabel>
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
            aria-current={pathname.startsWith("/months/") ? "page" : undefined}
          >
            <Calendar size={16} />
            Month
          </StyledNavLink>
          <StyledNavLink
            as={Link}
            to="/history"
            aria-current={pathname === "/history" ? "page" : undefined}
          >
            <ClockIcon size={16} />
            History
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
  );
}
