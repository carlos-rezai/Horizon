import styled from "styled-components";

export const IntegrityBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space1}px;
  padding: ${({ theme }) => theme.spacing.space1}px
    ${({ theme }) => theme.spacing.space3}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background-color: ${({ theme }) => theme.colors.secondaryContainer};
  color: ${({ theme }) => theme.colors.onSecondaryContainer};
  font-size: ${({ theme }) => theme.typography.sizes.xs}px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

export const PathBox = styled.div`
  background-color: ${({ theme }) => theme.colors.surfaceContainerLowest};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.md}px;
  padding: ${({ theme }) => theme.spacing.space3}px
    ${({ theme }) => theme.spacing.space4}px;
  margin-bottom: ${({ theme }) => theme.spacing.space2}px;
`;

export const PathLabel = styled.div`
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  font-size: ${({ theme }) => theme.typography.sizes.xs}px;
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: ${({ theme }) => theme.spacing.space2}px;
`;

export const PathValue = styled.div`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  word-break: break-all;
`;

export const StatRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const Stat = styled.div`
  flex: 1;
  padding: ${({ theme }) => theme.spacing.space3}px
    ${({ theme }) => theme.spacing.space4}px;
  background-color: ${({ theme }) => theme.colors.surfaceContainerLow};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.md}px;
`;

export const StatLabel = styled.div`
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  font-size: ${({ theme }) => theme.typography.sizes.xs}px;
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: ${({ theme }) => theme.spacing.space2}px;
`;

export const StatValue = styled.span<{ $accent?: boolean }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.sizes.lg}px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ $accent, theme }) =>
    $accent ? theme.colors.secondary : theme.colors.onSurface};
`;

export const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space3}px;
  margin-top: ${({ theme }) => theme.spacing.space4}px;

  & > button {
    flex: 1;
  }
`;

export const ConfirmDialog = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space3}px;
  margin-top: ${({ theme }) => theme.spacing.space4}px;
  padding: ${({ theme }) => theme.spacing.space4}px;
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.md}px;
  background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
`;

export const ConfirmActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space3}px;
`;

export const HiddenFileInput = styled.input`
  display: none;
`;
