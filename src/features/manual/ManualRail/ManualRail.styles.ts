import styled from "styled-components";

export const StyledRail = styled.nav`
  width: 216px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing.space5}px
    ${({ theme }) => theme.spacing.space3}px;
  border-right: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledGroup = styled.div`
  margin-bottom: 18px;
`;

export const StyledGroupLabel = styled.div`
  padding: 0 10px 8px;
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceFaint};
`;

// The active entry is carried by weight, tone and a filled ground at once —
// one signal alone reads as a hover on a dark surface.
export const StyledRailEntry = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background: ${({ theme, $active }) =>
    $active ? theme.colors.surfaceContainerHigh : "transparent"};
  font-family: ${({ theme }) => theme.typography.fontFamily.ui};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.onSurface : theme.colors.onSurfaceVariant};
  text-align: left;
  cursor: pointer;
  transition: background ${({ theme }) => theme.transitions.swap};

  & > svg {
    flex-shrink: 0;
    color: ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.onSurfaceDim};
  }

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceContainerHigh};
  }
`;
