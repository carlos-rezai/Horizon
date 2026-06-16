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
