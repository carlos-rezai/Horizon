import styled from "styled-components";

export const StyledHeaderRow = styled.div<{ $gridTemplate: string }>`
  display: grid;
  grid-template-columns: ${({ $gridTemplate }) => $gridTemplate};
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space4}px;
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space4}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outline};
`;

export const StyledHeaderCell = styled.span`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-size: ${({ theme }) => theme.typography.sizes.xs}px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;
