import styled from "styled-components";

export const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.space4}px;
`;

export const Label = styled.span`
  color: ${({ theme }) => theme.colors.onSurface};
  font-size: ${({ theme }) => theme.typography.sizes.md}px;
`;
