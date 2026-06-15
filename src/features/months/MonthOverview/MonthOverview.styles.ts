import styled from "styled-components";

export const StyledMonthOverview = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space6}px;
`;

export const StyledColumns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing.space6}px;
  align-items: start;
`;

export const StyledRightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space6}px;
`;

export const StyledStepper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space1}px;
  background-color: ${({ theme }) => theme.colors.surfaceContainer};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.md}px;
  padding: 3px;
`;

export const StyledStepButton = styled.button`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
    color: ${({ theme }) => theme.colors.onSurface};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

export const StyledStepLabel = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.onSurface};
  padding: 0 10px;
`;
