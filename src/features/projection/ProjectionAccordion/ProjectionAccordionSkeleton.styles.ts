import styled from "styled-components";
import { ACC_COLS } from "./ProjectionAccordion.styles";

// Mirrors `StyledYearHeader`'s grid, gap and padding without its button
// semantics — a placeholder must not be focusable or announce itself as a
// control.
export const StyledYearRow = styled.div`
  display: grid;
  grid-template-columns: ${ACC_COLS};
  gap: 16px;
  align-items: center;
  padding: 15px 18px;
`;

// The four figure columns are right-aligned in the real row, so their
// placeholders sit against the same edge.
export const StyledNumCell = styled.div`
  display: flex;
  justify-content: flex-end;
`;
