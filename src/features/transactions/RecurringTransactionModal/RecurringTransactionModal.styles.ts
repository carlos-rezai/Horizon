import styled from "styled-components";

export const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space4}px;
  min-width: 400px;
`;

export const StyledActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space3}px;
  justify-content: flex-end;
  padding-top: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledErrorText = styled.p`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.negative};
  margin: 0;
`;
