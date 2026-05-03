import styled from "styled-components";

export const StyledTopBar = styled.header`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
  padding: 0 ${({ theme }) => theme.spacing.space6}px;
  height: ${({ theme }) => theme.layout.topBarHeight}px;
  background-color: ${({ theme }) => theme.colors.bgSurface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

export const StyledWordmark = styled.a`
  font-size: ${({ theme }) => theme.typography.sizes.md}px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: 0.02em;
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.accent};
  }
`;

export const StyledBackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: ${({ theme }) => theme.spacing.space1}px;
  color: ${({ theme }) => theme.colors.textMuted};
  cursor: pointer;
  border-radius: ${({ theme }) => theme.radius.sm}px;

  &:hover {
    color: ${({ theme }) => theme.colors.textPrimary};
    background-color: ${({ theme }) => theme.colors.bgElevated};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 2px;
  }
`;

export const StyledNavLink = styled.a`
  margin-left: auto;
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.textMuted};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.textPrimary};
  }
`;

export const StyledMain = styled.main`
  display: flex;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.space6}px
    ${({ theme }) => theme.spacing.space4}px;
`;

export const StyledContent = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.contentMaxWidth}px;
`;
