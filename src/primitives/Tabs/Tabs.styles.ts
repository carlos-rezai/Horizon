import styled from "styled-components";

export const StyledTabList = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space1}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledTab = styled.button<{ $active: boolean; $color?: string }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  padding: 11px 14px;
  border: none;
  background-color: transparent;
  color: ${({ $active, theme }) =>
    $active ? theme.colors.onSurface : theme.colors.onSurfaceDim};
  font-family: ${({ theme }) => theme.typography.fontFamily.ui};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  font-weight: ${({ $active, theme }) =>
    $active
      ? theme.typography.weights.semibold
      : theme.typography.weights.medium};
  cursor: pointer;
  transition: color 0.15s ease;

  /* Underline indicator: inherits the tab's dot colour, or gold for the
     dot-less "All accounts" tab. */
  &::after {
    content: "";
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: -1px;
    height: 2px;
    border-radius: 2px;
    background-color: ${({ $active, $color, theme }) =>
      $active ? ($color ?? theme.colors.primary) : "transparent"};
    transition: background-color 0.15s ease;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const StyledDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ $color }) => $color};
  flex-shrink: 0;
`;

export const StyledCount = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;
