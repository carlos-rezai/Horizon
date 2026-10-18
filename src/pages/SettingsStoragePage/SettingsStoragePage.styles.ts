import styled from "styled-components";

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space6}px;
  /* Page gutters come from AppLayout only; the page adds none of its own. */
  padding: 0;
  max-width: ${({ theme }) => theme.layout.contentMaxWidth}px;
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: ${({ theme }) => theme.spacing.space6}px;
  align-items: start;
`;

export const FullWidth = styled.div`
  grid-column: 1 / -1;
`;
