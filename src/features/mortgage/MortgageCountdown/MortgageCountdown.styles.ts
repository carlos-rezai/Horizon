import styled from "styled-components";

export const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space5}px;
`;

export const StyledEditButton = styled.button`
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  border: 1px solid transparent;
  background-color: transparent;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  cursor: pointer;
  transition: all 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.onSurface};
    background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
    border-color: ${({ theme }) => theme.colors.outlineVariant};
  }
`;

export const StyledHeroAmount = styled.p`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 30px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.colors.onSurface};
  margin: 0;
`;

export const StyledSubtext = styled.p`
  font-size: ${({ theme }) => theme.typography.sizes.xs}px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin: 4px 0 0;
`;

export const StyledRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: ${({ theme }) => theme.spacing.space5}px;
  margin-bottom: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledPaidLabel = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledPaidPct = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 13px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ theme }) => theme.colors.primary};
`;

export const StyledOriginLine = styled.p`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.onSurfaceFaint};
  margin: ${({ theme }) => theme.spacing.space2}px 0 0;
`;

export const StyledMono = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledFooter = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: ${({ theme }) => theme.spacing.space5}px;
`;

export const StyledToPayoffLabel = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin-bottom: 6px;
`;

export const StyledToPayoff = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
`;

export const StyledToPayoffNum = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 22px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ theme }) => theme.colors.primary};
`;

export const StyledToPayoffUnit = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};

  &:not(:last-child) {
    margin-right: 6px;
  }
`;

export const StyledFlagDate = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: 10px;
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
`;

export const StyledNotPaidOff = styled.p`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  margin: 0;
`;
