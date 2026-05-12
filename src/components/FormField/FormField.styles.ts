import styled from "styled-components";

export const StyledFormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  line-height: ${({ theme }) => theme.typography.lineHeights.normal};
`;

export const StyledErrorMessage = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.error};
  line-height: ${({ theme }) => theme.typography.lineHeights.normal};
`;
