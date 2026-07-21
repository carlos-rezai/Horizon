import styled from "styled-components";

// The collapsed card's header row: flame badge, then the overline/title stack.
export const StyledHeaderRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledTitleStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  flex: 1;
  min-width: 0;
`;

// One slot per month, sized like a calendar tile.
export const StyledTileSlot = styled.div`
  flex: 1;
  min-width: 0;
`;
