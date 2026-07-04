import styled from "styled-components";

export const StyledTabsRoot = styled.div`
  position: relative;
`;

export const StyledTabList = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space1}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};

  /* When the tabs are wider than the card, keep them on one line and let the
     strip scroll sideways rather than spilling out of the card. The scrollbar
     is hidden; the chevron buttons are the scroll affordance on desktop. */
  overflow-x: auto;
  scrollbar-width: none; /* Firefox */
  &::-webkit-scrollbar {
    display: none; /* WebKit */
  }
`;

/**
 * Edge chevron that pages the tab strip. Rendered only when there is more to
 * scroll in that direction; the gradient fades tabs out beneath it so it reads
 * as "more this way" rather than a hard clip.
 */
export const StyledScrollButton = styled.button<{ $side: "left" | "right" }>`
  position: absolute;
  top: 0;
  bottom: 1px; /* clear the tablist's 1px bottom border */
  ${({ $side }) => ($side === "left" ? "left: 0;" : "right: 0;")}
  z-index: 1; /* sit above the tab strip so both chevrons stay clickable */
  display: grid;
  place-items: center;
  width: 44px;
  padding: 0;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  background: ${({ theme, $side }) =>
    `linear-gradient(to ${$side === "left" ? "right" : "left"}, ${
      theme.colors.surfaceContainer
    } 60%, transparent)`};
  transition: color 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.onSurface};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: -2px;
  }
`;

export const StyledTab = styled.button<{ $active: boolean; $color?: string }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  padding: 11px 14px;
  /* Keep each tab at its natural width so the strip scrolls instead of the
     tabs squashing or wrapping out of the card. */
  flex-shrink: 0;
  white-space: nowrap;
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
