import styled from "styled-components";

export const StyledFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 456px;
`;

export const StyledOnRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledOnLabel = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceFaint};
`;

export const StyledOnAccount = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
`;

export const StyledDot = styled.span<{ $color: string }>`
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

export const StyledAccountName = styled.span`
  color: ${({ theme }) => theme.colors.onSurface};
  font-weight: 500;
  font-size: 13px;
`;

export const StyledGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
`;

export const StyledChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledTransferNote = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space3}px;
  padding: 12px 14px;
  background: ${({ theme }) => theme.colors.surfaceContainerLow};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.md}px;
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

export const StyledTransferDestination = styled.span`
  color: ${({ theme }) => theme.colors.onSurface};
`;
