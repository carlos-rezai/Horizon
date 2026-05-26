import styled from "styled-components";

export const StyledClock = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space1}px;
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space3}px;
  margin-bottom: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledTime = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.sizes.md}px;
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  color: ${({ theme }) => theme.colors.onSurface};
  line-height: ${({ theme }) => theme.typography.lineHeights.tight};
`;

export const StyledDate = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.xs}px;
  font-weight: ${({ theme }) => theme.typography.weights.regular};
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  line-height: ${({ theme }) => theme.typography.lineHeights.tight};
`;
