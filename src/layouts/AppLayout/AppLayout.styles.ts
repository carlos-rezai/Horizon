import styled from "styled-components";

export const StyledWrapper = styled.div`
  display: flex;
  min-height: 100vh;
`;

export const StyledSidebar = styled.aside`
  position: fixed;
  top: 0;
  left: 0;
  width: ${({ theme }) => theme.layout.sidebarWidth}px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.spacing.space6}px
    ${({ theme }) => theme.spacing.space4}px;
  background-color: ${({ theme }) => theme.colors.surfaceContainer};
  border-right: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledBrand = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
  margin-bottom: ${({ theme }) => theme.spacing.space6}px;
`;

export const StyledWordmark = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.md}px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ theme }) => theme.colors.onSurface};
  letter-spacing: 0.16em;
`;

export const StyledNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space1}px;
`;

export const StyledNavLabel = styled.span`
  padding: 0 ${({ theme }) => theme.spacing.space3}px
    ${({ theme }) => theme.spacing.space2}px;
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  line-height: ${({ theme }) => theme.typography.scale.label.lineHeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceFaint};
`;

export const StyledNavLink = styled.a`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space3}px;
  border-radius: ${({ theme }) => theme.radius.button}px;
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  text-decoration: none;

  &:hover {
    background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
    color: ${({ theme }) => theme.colors.onSurface};
  }

  &[aria-current="page"] {
    background-color: ${({ theme }) => theme.colors.primaryContainer};
    color: ${({ theme }) => theme.colors.onPrimaryContainer};
  }
`;

export const StyledSpacer = styled.div`
  flex: 1;
`;

// Bleeds through the sidebar's horizontal padding so the rule runs the full
// width, separating the nav from what is not navigation.
export const StyledDivider = styled.hr`
  margin-block: ${({ theme }) => theme.spacing.space3}px;
  margin-inline: -${({ theme }) => theme.spacing.space4}px;
  border: none;
  border-top: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;

// Deliberately not StyledNavLink: this opens an overlay rather than going
// somewhere, and it carries no active state on any route — so it is quieter
// than the nav items and offers hover only.
export const StyledManualTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  width: 100%;
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space3}px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.button}px;
  background: transparent;
  font-family: ${({ theme }) => theme.typography.fontFamily.ui};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  font-weight: ${({ theme }) => theme.typography.weights.regular};
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  text-align: left;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.onSurfaceVariant};
  }
`;

export const StyledMain = styled.main`
  margin-left: ${({ theme }) => theme.layout.sidebarWidth}px;
  flex: 1;
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.space6}px
    ${({ theme }) => theme.spacing.space4}px;
`;

export const StyledContent = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.contentMaxWidth}px;
`;
