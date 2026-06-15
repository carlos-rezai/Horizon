import styled from "styled-components";

export const StyledHead = styled.div`
  padding: 16px 20px 0;
`;

export const StyledHeadRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
`;

export const StyledHeadTitle = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.h2.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.h2.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.h2.fontWeight};
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledHeadMeta = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledYearGroup = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledYearHeader = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space4}px;
  width: 100%;
  text-align: left;
  padding: 15px 18px;
  cursor: pointer;
  background: ${({ theme, $open }) =>
    $open ? theme.colors.surfaceContainerLow : "transparent"};
  transition: background ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceContainer};
  }
`;

export const StyledChevron = styled.span<{ $open: boolean }>`
  display: grid;
  place-items: center;
  color: ${({ theme, $open }) =>
    $open ? theme.colors.primary : theme.colors.onSurfaceDim};
  transform: ${({ $open }) => ($open ? "rotate(90deg)" : "none")};
  transition: transform 0.18s ease;
`;

export const StyledYear = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledSpacer = styled.span`
  flex: 1;
`;

export const StyledYearCount = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledYearTotal = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  min-width: 80px;
  text-align: right;
`;

export const StyledYearBody = styled.div`
  padding: 4px 12px 14px 40px;
`;

export const StyledFileRow = styled.div`
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 150px 90px 140px;
  gap: ${({ theme }) => theme.spacing.space4}px;
  align-items: center;
  padding: 12px 16px 12px 8px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  transition: background ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceContainer};
  }
`;

export const StyledFileIcon = styled.div<{ $color: string }>`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background: ${({ $color }) => $color + "1a"};
  color: ${({ $color }) => $color};
`;

export const StyledFileMain = styled.div`
  min-width: 0;
`;

export const StyledFileName = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.onSurface};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const StyledFileSub = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  margin-top: 4px;
`;

export const StyledAccountBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 9px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.onSurface};
  background: ${({ $color }) => $color + "1f"};

  &::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: ${({ $color }) => $color};
  }
`;

export const StyledFileMeta = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledFileRange = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

export const StyledFileCount = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  text-align: right;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.onSurface};

  small {
    color: ${({ theme }) => theme.colors.onSurfaceFaint};
    font-size: 11px;
  }
`;

export const StyledActions = styled.div`
  display: flex;
  gap: 2px;
  justify-content: flex-end;
  opacity: 0.45;

  ${StyledFileRow}:hover & {
    opacity: 1;
  }
`;

export const StyledActionBtn = styled.button<{ $danger?: boolean }>`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme, $danger }) =>
      $danger
        ? theme.colors.errorContainer
        : theme.colors.surfaceContainerHigh};
    color: ${({ theme, $danger }) =>
      $danger ? theme.colors.error : theme.colors.onSurface};
  }
`;
