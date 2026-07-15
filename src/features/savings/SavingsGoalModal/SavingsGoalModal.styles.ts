import styled from "styled-components";

export const StyledBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space5}px;
`;

export const StyledFieldLabel = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin-bottom: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledModeToggle = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledModeChip = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 9px 12px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  border: 1px solid
    ${({ theme, $active }) =>
      $active ? theme.colors.primary : theme.colors.outlineVariant};
  background: ${({ theme, $active }) =>
    $active ? theme.colors.primaryContainer : "transparent"};
  color: ${({ theme, $active }) =>
    $active ? theme.colors.primary : theme.colors.onSurfaceVariant};
  font-family: ${({ theme }) => theme.typography.scale.bodyMd.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.bodyMd.fontSize};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.14s ease;
`;

export const StyledHint = styled.p`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin: 0;
`;

export const StyledAccountRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledAccountRow = styled.div`
  display: grid;
  grid-template-columns: 12px 1fr 140px;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledColorDot = styled.span<{ $color: string }>`
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: ${({ $color }) => $color};
`;

export const StyledAccountName = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.bodyMd.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.bodyMd.fontSize};
  color: ${({ theme }) => theme.colors.onSurface};
`;
