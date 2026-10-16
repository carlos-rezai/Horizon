import styled from "styled-components";

export const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space4}px;
  min-width: ${({ theme }) => theme.layout.narrowModalWidth}px;
`;

export const StyledGroup = styled.fieldset`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space3}px;
  border: none;
  margin: 0;
  padding: 0;
`;

export const StyledGroupTitle = styled.legend`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ theme }) => theme.colors.onSurface};
  padding: 0;
  margin-bottom: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledNote = styled.p`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  margin: 0;
`;

export const StyledPreview = styled.p`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  margin: 0;
`;

export const StyledErrorText = styled.p`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.error};
  margin: 0;
`;

export const StyledActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space3}px;
  justify-content: flex-end;
  padding-top: ${({ theme }) => theme.spacing.space2}px;
`;
