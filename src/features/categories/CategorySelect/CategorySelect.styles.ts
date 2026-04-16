import styled from "styled-components";

export const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space1}px;
`;

export const StyledLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const StyledInlineAddRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space2}px;
  align-items: center;
`;

export const StyledErrorText = styled.p`
  color: ${({ theme }) => theme.colors.negative};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  margin: 0;
`;
