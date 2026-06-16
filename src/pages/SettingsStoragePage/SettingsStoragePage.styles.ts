import styled from "styled-components";

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space6}px;
  padding: ${({ theme }) => theme.spacing.space8}px;
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
