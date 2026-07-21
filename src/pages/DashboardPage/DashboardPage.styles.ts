import styled from "styled-components";

export const StyledDashboard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space8}px;
`;

// Lower section: Accounts (wide, left) beside a stacked column of the Mortgage
// Countdown and Plan Summary cards (right). Mirrors the canonical prototype.
export const StyledGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: ${({ theme }) => theme.spacing.space6}px;
  align-items: start;
`;

export const StyledColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space6}px;
`;
