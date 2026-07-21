import styled from "styled-components";

// The overline + title stack in the section header.
export const StyledTitleStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
`;

// One placeholder per year row, at the height a real table row occupies
// (`StyledTd` padding plus its line box).
export const StyledRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;
