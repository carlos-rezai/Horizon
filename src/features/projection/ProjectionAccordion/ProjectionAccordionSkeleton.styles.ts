import styled from "styled-components";
import { accordionColumns } from "./ProjectionAccordion.styles";

// Mirrors `StyledYearHeader`'s grid, gap and padding without its button
// semantics — a placeholder must not be focusable or announce itself as a
// control.
export const StyledYearRow = styled.div<{ $accountCount: number }>`
  display: grid;
  grid-template-columns: ${({ $accountCount }) =>
    accordionColumns($accountCount)};
  gap: 16px;
  align-items: center;
  padding: 15px 18px;
`;

// The figure columns are right-aligned in the real row, so their
// placeholders sit against the same edge.
export const StyledNumCell = styled.div`
  display: flex;
  justify-content: flex-end;
`;
