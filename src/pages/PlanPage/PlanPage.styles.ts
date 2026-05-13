import styled from "styled-components";

export const StyledPlanPage = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space8}px;
`;

export const StyledCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledCardSubtitle = styled.span`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
`;

export const StyledErrorText = styled.span`
  color: ${({ theme }) => theme.colors.error};
`;
